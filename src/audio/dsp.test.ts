import { describe, expect, it } from 'vitest'
import { midiToHz } from '../theory/index.ts'
import { mulberry32, renderPluck, sustainFor } from './dsp.ts'
import type { Variant } from './tone.ts'

/**
 * Fundamental by normalized autocorrelation: past the first zero crossing, take the shortest
 * lag whose peak is within 10% of the best (avoids octave errors), then refine parabolically.
 */
function detectHz(x: Float32Array, sampleRate: number, start: number, size: number): number {
  const minLag = Math.floor(sampleRate / 2000)
  const maxLag = Math.ceil(sampleRate / 60)
  const r = new Float64Array(maxLag + 2)
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let sum = 0
    let e1 = 0
    let e2 = 0
    for (let i = 0; i < size; i++) {
      const a = x[start + i]!
      const b = x[start + i + lag]!
      sum += a * b
      e1 += a * a
      e2 += b * b
    }
    r[lag] = sum / Math.sqrt(e1 * e2)
  }
  let lag = minLag
  while (lag < maxLag && r[lag]! > 0) lag++
  let best = 0
  for (let l = lag; l <= maxLag; l++) best = Math.max(best, r[l]!)
  for (let l = lag + 1; l <= maxLag; l++) {
    if (r[l]! >= 0.9 * best && r[l]! >= r[l - 1]! && r[l]! >= r[l + 1]!) {
      const a = r[l - 1]!
      const b = r[l]!
      const c = r[l + 1]!
      const shift = (0.5 * (a - c)) / (a - 2 * b + c)
      return sampleRate / (l + shift)
    }
  }
  return NaN
}

function rms(x: Float32Array, from: number, to: number): number {
  let sum = 0
  for (let i = from; i < to; i++) sum += x[i]! ** 2
  return Math.sqrt(sum / (to - from))
}

const VARIANTS: Variant[] = ['bright', 'round', 'legato']

describe('renderPluck', () => {
  for (const sampleRate of [44100, 48000]) {
    it(`tunes within 1% of midiToHz at ${sampleRate} Hz`, () => {
      for (const midi of [48, 50, 55, 59, 62, 67, 72, 79, 84, 88]) {
        for (const variant of VARIANTS) {
          const x = renderPluck(midi, variant, sampleRate)
          const hz = detectHz(x, sampleRate, Math.round(0.15 * sampleRate), 4096)
          const cents = Math.abs(hz / midiToHz(midi) - 1)
          expect(cents, `midi ${midi} ${variant}: ${hz.toFixed(2)} Hz`).toBeLessThan(0.01)
        }
      }
    })
  }

  it('is finite, peaks at or below 1, and starts and ends quietly', () => {
    for (const midi of [48, 62, 74, 88]) {
      for (const variant of VARIANTS) {
        const x = renderPluck(midi, variant, 48000)
        let peak = 0
        for (const v of x) {
          expect(Number.isFinite(v)).toBe(true)
          peak = Math.max(peak, Math.abs(v))
        }
        expect(peak).toBeLessThanOrEqual(1)
        expect(peak).toBeGreaterThan(0.5)
        expect(Math.abs(x[x.length - 1]!)).toBeLessThan(1e-3)
      }
    }
  })

  it('decays: steadily falling level and a quiet tail', () => {
    const sampleRate = 48000
    const block = Math.round(0.05 * sampleRate)
    for (const midi of [50, 62, 79]) {
      const x = renderPluck(midi, 'bright', sampleRate)
      const levels: number[] = []
      for (let i = 0; i + block <= x.length; i += block) levels.push(rms(x, i, i + block))
      const first = levels[0]!
      const last = levels[levels.length - 1]!
      expect(last / first, `midi ${midi}`).toBeLessThan(0.02)
      // After the first 100 ms, no block is louder than 10% above the one before (beating aside).
      for (let k = 3; k < levels.length; k++) expect(levels[k]!).toBeLessThanOrEqual(levels[k - 1]! * 1.1)
    }
  })

  it('sustains longest on low strings', () => {
    expect(sustainFor(48)).toBeGreaterThanOrEqual(1.5)
    expect(sustainFor(48)).toBeLessThanOrEqual(2.5)
    expect(sustainFor(62)).toBeLessThan(sustainFor(50))
    expect(sustainFor(88)).toBeLessThan(sustainFor(62))
    const low = renderPluck(50, 'bright', 48000).length
    const high = renderPluck(74, 'bright', 48000).length
    expect(high).toBeLessThan(low)
  })

  it('is deterministic per pitch and variant', () => {
    const a = renderPluck(62, 'bright', 48000)
    const b = renderPluck(62, 'bright', 48000)
    expect(a).toEqual(b)
    const round = renderPluck(62, 'round', 48000)
    expect(round.slice(0, 2000)).not.toEqual(a.slice(0, 2000))
  })

  it('makes the round and legato variants darker than bright', () => {
    // Brightness proxy: energy of the first difference relative to the signal.
    const brightness = (x: Float32Array) => {
      const n = 4800
      let d = 0
      let s = 0
      for (let i = 1; i < n; i++) {
        d += (x[i]! - x[i - 1]!) ** 2
        s += x[i]! ** 2
      }
      return d / s
    }
    const bright = brightness(renderPluck(62, 'bright', 48000))
    expect(brightness(renderPluck(62, 'round', 48000))).toBeLessThan(bright)
    expect(brightness(renderPluck(62, 'legato', 48000))).toBeLessThan(bright)
  })
})

describe('mulberry32', () => {
  it('repeats for a seed and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
