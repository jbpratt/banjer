import { METRONOME_BPM } from '../audio/types.ts'

/** A gap longer than this starts a new run of taps. */
export const TAP_RESET_MS = 2000
/** Intervals averaged for a tap tempo: the last few, so the tempo follows a change quickly. */
const TAP_INTERVALS = 4

/** A whole BPM inside METRONOME_BPM. */
export function clampBpm(bpm: number): number {
  return Math.min(METRONOME_BPM.max, Math.max(METRONOME_BPM.min, Math.round(bpm)))
}

/**
 * Tap tempo. Adds a tap at `now` (ms) to the run, or starts a new run after a gap over
 * TAP_RESET_MS. With two or more taps, the BPM is the average of the last few intervals,
 * rounded and clamped; otherwise null.
 */
export function tapTempo(taps: readonly number[], now: number): { taps: number[]; bpm: number | null } {
  const last = taps[taps.length - 1]
  const run = last === undefined || now - last > TAP_RESET_MS || now < last ? [now] : [...taps, now].slice(-(TAP_INTERVALS + 1))
  if (run.length < 2) return { taps: run, bpm: null }
  const first = run[0] as number
  const ms = (now - first) / (run.length - 1)
  return { taps: run, bpm: ms > 0 ? clampBpm(60000 / ms) : null }
}
