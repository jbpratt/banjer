import { describe, expect, it } from 'vitest'
import { METRONOME_BPM } from '../audio/types.ts'
import { clampBpm, tapTempo } from './tempo.ts'

/** Feed taps at these times through tapTempo, the shown tempo carried along as `current`. */
function tapAll(times: number[], start?: number) {
  let state: ReturnType<typeof tapTempo> = { taps: [], bpm: start ?? null }
  for (const t of times) {
    const next = tapTempo(state.taps, t, state.bpm ?? undefined)
    state = { taps: next.taps, bpm: next.bpm ?? state.bpm }
  }
  return state
}

/** Steady taps every `ms`, each nudged by the matching jitter (ms). */
const taps = (ms: number, jitter: number[]) => jitter.map((j, i) => i * ms + j)

describe('tap tempo', () => {
  it('needs two taps', () => {
    expect(tapTempo([], 1000)).toEqual({ taps: [1000], bpm: null })
    expect(tapAll([1000, 1625]).bpm).toBe(96)
  })

  it('fits the last eight intervals', () => {
    // 500 ms apart, then settling at 600 ms: once eight 600s are in, only they count.
    const t = [0, 500, 1000, ...Array.from({ length: 8 }, (_, i) => 1600 + i * 600)]
    expect(tapAll(t).bpm).toBe(100)
    expect(tapAll(t).taps).toHaveLength(9)
    expect(tapAll([0, 610, 1220]).bpm).toBe(98)
  })

  it('holds steady through ordinary jitter', () => {
    // 100 BPM tapped ±25 ms: the shown tempo settles and stops moving.
    const jitter = [0, 20, -15, 25, -20, 10, -25, 15, -10, 20, -5, -20, 25, -15, 10, 0]
    const shown: number[] = []
    let state: ReturnType<typeof tapTempo> = { taps: [], bpm: null }
    for (const t of taps(600, jitter)) {
      state = tapTempo(state.taps, t, state.bpm ?? undefined)
      if (state.bpm !== null) shown.push(state.bpm)
    }
    const settled = shown.slice(7)
    expect(new Set(settled).size).toBe(1)
    expect(Math.abs(settled[0]! - 100)).toBeLessThanOrEqual(1)
  })

  it('shrugs off one stray tap', () => {
    // One tap 120 ms late among steady 600s moves the tempo by a few BPM, not 20.
    const t = taps(600, [0, 0, 0, 0, 0, 0, 0, 0, 120])
    expect(Math.abs(tapAll(t).bpm! - 100)).toBeLessThanOrEqual(5)
  })

  it('keeps the current tempo when the estimate is within TAP_HOLD_BPM', () => {
    expect(tapTempo([0, 600, 1200], 1806, 100).bpm).toBe(100)
    expect(tapTempo([0, 600, 1200], 1806).bpm).toBe(100)
    expect(tapTempo([0, 600], 1200, 96).bpm).toBe(100)
  })

  it('follows a deliberate change of tempo', () => {
    const t = [...taps(600, Array(9).fill(0)), ...Array.from({ length: 9 }, (_, i) => 5300 + i * 500)]
    expect(tapAll(t).bpm).toBe(120)
  })

  it('starts a new run after a long gap', () => {
    expect(tapAll([0, 500, 3000])).toEqual({ taps: [3000], bpm: 120 })
    expect(tapAll([0, 500, 2500]).bpm).toBe(48)
    expect(tapAll([0, 500, 3000, 3600]).bpm).toBe(100)
  })

  it('resets when the clock goes backwards', () => {
    expect(tapTempo([5000], 1000)).toEqual({ taps: [1000], bpm: null })
  })

  it('clamps to the metronome range', () => {
    expect(tapAll([0, 100]).bpm).toBe(METRONOME_BPM.max)
    expect(tapAll([0, 1900]).bpm).toBe(METRONOME_BPM.min)
  })
})

describe('clampBpm', () => {
  it('rounds and clamps', () => {
    expect(clampBpm(96.4)).toBe(96)
    expect(clampBpm(10)).toBe(METRONOME_BPM.min)
    expect(clampBpm(999)).toBe(METRONOME_BPM.max)
  })
})
