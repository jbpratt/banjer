import { describe, expect, it } from 'vitest'
import { METRONOME_BPM } from '../audio/types.ts'
import { clampBpm, tapTempo } from './tempo.ts'

/** Feed taps at these times through tapTempo, returning the last result. */
function tapAll(times: number[]) {
  let state: ReturnType<typeof tapTempo> = { taps: [], bpm: null }
  for (const t of times) state = tapTempo(state.taps, t)
  return state
}

describe('tap tempo', () => {
  it('needs two taps', () => {
    expect(tapTempo([], 1000)).toEqual({ taps: [1000], bpm: null })
    expect(tapAll([1000, 1625]).bpm).toBe(96)
  })

  it('averages the last four intervals and rounds', () => {
    // 500 ms apart, then the player settles at 600 ms: only the last four count.
    expect(tapAll([0, 500, 1000, 1600, 2200, 2800, 3400]).bpm).toBe(100)
    expect(tapAll([0, 500, 1000, 1600, 2200, 2800, 3400]).taps).toEqual([1000, 1600, 2200, 2800, 3400])
    expect(tapAll([0, 610, 1220]).bpm).toBe(98)
  })

  it('starts a new run after a long gap', () => {
    expect(tapAll([0, 500, 3000])).toEqual({ taps: [3000], bpm: null })
    expect(tapAll([0, 500, 2500]).bpm).toBe(48)
    expect(tapAll([0, 500, 3000, 3600]).bpm).toBe(100)
  })

  it('resets when the clock goes backwards', () => {
    expect(tapAll([5000, 1000])).toEqual({ taps: [1000], bpm: null })
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
