// Pure, deterministic sound rendering. No Web Audio here: every function takes numbers and
// returns samples, so the same input always yields the same buffer and tests run in Node.
import type { Midi } from '../domain/types.ts'
import { midiToHz } from '../theory/index.ts'
import { TONE, type Variant } from './tone.ts'

/** Seeded PRNG (mulberry32), uniform in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const VARIANT_SEED: Record<Variant, number> = { bright: 1, round: 2, legato: 3 }

function seedFor(midi: Midi, variant: Variant): number {
  return Math.imul(Math.round(midi * 100) + 1, 0x9e3779b1) ^ Math.imul(VARIANT_SEED[variant], 0x85ebca6b)
}

/** Seconds for the fundamental of `midi` to fall 60 dB. */
export function sustainFor(midi: Midi): number {
  const { sustainLow, sustainHigh } = TONE.string
  const x = Math.min(1, Math.max(0, (midi - 48) / 40))
  return sustainLow * (sustainHigh / sustainLow) ** x
}

function onePoleGain(p: number, w: number): number {
  return (1 - p) / Math.sqrt(1 - 2 * p * Math.cos(w) + p * p)
}

function onePoleDelay(p: number, w: number): number {
  return Math.atan2(p * Math.sin(w), 1 - p * Math.cos(w)) / w
}

/**
 * Loop filter for one pitch: a one-pole lowpass `p` and loss `rho` chosen so the fundamental
 * decays in `sustain` seconds and a partial at `sparkleHz` in `sparkleSustain` seconds.
 */
function loopFilter(f0: number, sustain: number, sampleRate: number): { p: number; rho: number } {
  const { sparkleHz, sparkleSustain } = TONE.string
  const w0 = (2 * Math.PI * f0) / sampleRate
  const wh = Math.min((2 * Math.PI * sparkleHz) / sampleRate, 0.9 * Math.PI)
  // Per-period loop gain that gives a 60 dB fall in T seconds at f0 periods per second.
  const g0 = 10 ** (-3 / (sustain * f0))
  const gh = 10 ** (-3 / (Math.max(sparkleSustain, 1e-3) * f0))
  let p = 0
  if (wh > w0 * 1.01 && gh < g0) {
    const target = gh / g0
    const ratio = (q: number) => onePoleGain(q, wh) / onePoleGain(q, w0)
    let lo = 0
    let hi = 0.95
    if (ratio(hi) >= target) p = hi
    else {
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (ratio(mid) > target) lo = mid
        else hi = mid
      }
      p = (lo + hi) / 2
    }
  }
  const rho = Math.min(0.99999, g0 / onePoleGain(p, w0))
  return { p, rho }
}

/** RBJ bandpass (0 dB peak), in place over a copy of `x`. */
function bandpass(x: Float64Array, hz: number, q: number, sampleRate: number): Float64Array {
  const w = (2 * Math.PI * Math.min(hz, sampleRate * 0.45)) / sampleRate
  const alpha = Math.sin(w) / (2 * q)
  const a0 = 1 + alpha
  const b0 = alpha / a0
  const b2 = -alpha / a0
  const a1 = (-2 * Math.cos(w)) / a0
  const a2 = (1 - alpha) / a0
  const y = new Float64Array(x.length)
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < x.length; i++) {
    const xi = x[i]!
    const yi = b0 * xi + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = xi
    y2 = y1
    y1 = yi
    y[i] = yi
  }
  return y
}

function peakOf(x: ArrayLike<number>): number {
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]!))
  return peak
}

function scale(x: Float64Array, to: number): void {
  const peak = peakOf(x)
  if (peak === 0) return
  const k = to / peak
  for (let i = 0; i < x.length; i++) x[i]! *= k
}

/**
 * Render one plucked banjo note as mono samples in [-1, 1].
 *
 * Karplus–Strong: a one-period noise burst (shaped by pick position and finger softness)
 * circulates through a delay line with a one-pole lowpass and a first-order allpass. The
 * allpass is solved for the exact fractional delay at the fundamental, so the pitch is exact.
 * The string then passes through two resonant bands for the drum head and the pot's twang,
 * and gets a short head thump and nail tick at the attack.
 */
export function renderPluck(midi: Midi, variant: Variant, sampleRate: number): Float32Array<ArrayBuffer> {
  const s = TONE.string
  const v = TONE.variants[variant]
  const body = TONE.body
  const rand = mulberry32(seedFor(midi, variant))

  const f0 = midiToHz(midi)
  const period = sampleRate / f0
  const w0 = (2 * Math.PI * f0) / sampleRate
  const sustain = sustainFor(midi)
  const { p, rho } = loopFilter(f0, sustain, sampleRate)
  const lpDelay = p === 0 ? 0 : onePoleDelay(p, w0)
  const n = Math.max(1, Math.floor(period - lpDelay - 0.1))
  const frac = period - lpDelay - n
  const c = Math.sin((w0 * (1 - frac)) / 2) / Math.sin((w0 * (1 + frac)) / 2)
  const length = Math.ceil((sustain * s.length + s.tailFadeMs / 1000) * sampleRate)

  // Excitation: one period built from harmonics with seeded random phases. Shaping the
  // spectrum directly (instead of white noise) keeps every pitch's fundamental present;
  // one period of raw noise can leave it 20 dB down, and the note then sounds an octave up.
  const burst = Math.max(2, Math.round(period))
  const exc = new Float64Array(burst)
  const harmonics = Math.max(1, Math.floor((0.45 * sampleRate) / f0))
  for (let k = 1; k <= harmonics; k++) {
    const comb = Math.abs(Math.sin(Math.PI * k * v.pickPosition))
    const soft = 1 / Math.sqrt(1 + ((k * f0) / v.softHz) ** 2)
    const amp = (comb * soft * (0.85 + 0.3 * rand())) / k ** v.tilt
    const phase = 2 * Math.PI * rand()
    const wk = (2 * Math.PI * k) / period
    for (let i = 0; i < burst; i++) exc[i]! += amp * Math.sin(wk * i + phase)
  }

  // The string loop.
  const str = new Float64Array(length)
  let wPrev = 0
  let uPrev = 0
  for (let i = 0; i < length; i++) {
    const delayed = i >= n ? str[i - n]! : 0
    const w = (1 - p) * delayed + p * wPrev
    const u = c * w + wPrev - c * uPrev
    wPrev = w
    uPrev = u
    str[i] = (i < exc.length ? exc[i]! : 0) + rho * u
  }
  scale(str, 1)

  // Pot: string plus head and twang resonances.
  const head = bandpass(str, body.head.hz, body.head.q, sampleRate)
  const twang = bandpass(str, body.twang.hz, body.twang.q, sampleRate)
  const out = new Float64Array(length)
  for (let i = 0; i < length; i++) out[i] = str[i]! + body.head.gain * head[i]! + body.twang.gain * twang[i]!
  scale(out, 1)

  // Head thump and nail tick.
  const plunkGain = body.plunk.gain * v.plunk
  if (plunkGain > 0) {
    const tau = (body.plunk.decayMs / 1000) * sampleRate
    const end = Math.min(length, Math.ceil(tau * 8))
    const wp = (2 * Math.PI * body.plunk.hz) / sampleRate
    for (let i = 0; i < end; i++) out[i]! += plunkGain * Math.exp(-i / tau) * Math.sin(wp * i)
  }
  if (v.snap > 0) {
    const tau = 0.0005 * sampleRate
    const end = Math.min(length, Math.ceil(0.003 * sampleRate))
    let prev = 0
    for (let i = 0; i < end; i++) {
      const r = rand() * 2 - 1
      out[i]! += v.snap * 0.5 * (r - prev) * Math.exp(-i / tau)
      prev = r
    }
  }

  // Envelope: early "ping" fall, optional fade-in, tail fade, DC block.
  const dropTau = (s.attackDropMs / 1000) * sampleRate
  const fadeIn = Math.round((v.fadeInMs / 1000) * sampleRate)
  const fadeOut = Math.min(length, Math.round((s.tailFadeMs / 1000) * sampleRate))
  let x1 = 0
  let y1 = 0
  const dc = 1 - (2 * Math.PI * 20) / sampleRate
  for (let i = 0; i < length; i++) {
    let g = 1 - s.attackDrop + s.attackDrop * Math.exp(-i / dropTau)
    if (i < fadeIn) g *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeIn)
    const k = length - 1 - i
    if (k < fadeOut) g *= 0.5 - 0.5 * Math.cos((Math.PI * k) / fadeOut)
    const xi = out[i]! * g
    const yi = xi - x1 + dc * y1
    x1 = xi
    y1 = yi
    out[i] = yi
  }
  scale(out, Math.min(1, s.peak))
  return Float32Array.from(out)
}
