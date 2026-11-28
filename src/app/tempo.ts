import { METRONOME_BPM } from '../audio/types.ts'

/** A gap longer than this starts a new run of taps. */
export const TAP_RESET_MS = 2000
/** Intervals fitted for a tap tempo: enough to steady it, few enough to follow a change. */
const TAP_INTERVALS = 8
/** Keep the shown tempo unless the estimate moves by more than this, so steady tapping doesn't flicker. */
const TAP_HOLD_BPM = 0.75

/** A whole BPM inside METRONOME_BPM. */
export function clampBpm(bpm: number): number {
  return Math.min(METRONOME_BPM.max, Math.max(METRONOME_BPM.min, Math.round(bpm)))
}

/**
 * Tap tempo. Adds a tap at `now` (ms) to the run, or starts a new run after a gap over
 * TAP_RESET_MS. With two or more taps, the tempo is the slope of a line fitted through the
 * last few taps: a stray tap moves it a little, where an average of first-to-last intervals
 * swings with every tap. It stays at `current` unless the estimate is more than TAP_HOLD_BPM
 * away. Rounded and clamped; null with fewer than two taps.
 */
export function tapTempo(taps: readonly number[], now: number, current?: number): { taps: number[]; bpm: number | null } {
  const last = taps[taps.length - 1]
  const run = last === undefined || now - last > TAP_RESET_MS || now < last ? [now] : [...taps, now].slice(-(TAP_INTERVALS + 1))
  if (run.length < 2) return { taps: run, bpm: null }
  // Least squares of tap time against tap index; the slope is ms per beat.
  const n = run.length
  const meanI = (n - 1) / 2
  const meanT = run.reduce((a, t) => a + t, 0) / n
  let sxy = 0
  let sxx = 0
  run.forEach((t, i) => {
    sxy += (i - meanI) * (t - meanT)
    sxx += (i - meanI) ** 2
  })
  const ms = sxy / sxx
  if (!(ms > 0)) return { taps: run, bpm: null }
  const raw = 60000 / ms
  const held = current !== undefined && Math.abs(raw - current) <= TAP_HOLD_BPM
  return { taps: run, bpm: held ? current : clampBpm(raw) }
}
