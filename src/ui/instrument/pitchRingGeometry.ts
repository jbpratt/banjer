/**
 * Geometry for PitchRing: twelve semitone positions on a circle, the tonic at 12 o'clock,
 * rising clockwise. One position per fret, so a whole step skips a position and a half
 * step doesn't. Pure; SVG user units.
 */

export const RING_SIZE = 280
export const RING_CENTER = RING_SIZE / 2
/** Track radius: where note markers sit. */
export const RING_R = 96
/** Note names sit outside the track. */
export const NAME_R = RING_R + 29
/** Step labels (H, 1½) sit just inside the track. */
export const STEP_R = RING_R - 25

export interface Point {
  x: number
  y: number
}

const round = (n: number) => Math.round(n * 100) / 100

/** Where `semis` semitones above the tonic sits at radius `r` (fractions allowed). */
export function ringPoint(semis: number, r: number): Point {
  const a = (semis / 12) * 2 * Math.PI - Math.PI / 2
  return { x: round(RING_CENTER + r * Math.cos(a)), y: round(RING_CENTER + r * Math.sin(a)) }
}

/** Clockwise arc along the track from `from` to `to` semitones (to > from, at most 12 apart). */
export function arcPath(from: number, to: number, r = RING_R): string {
  const a = ringPoint(from, r)
  const b = ringPoint(to, r)
  const large = to - from > 6 ? 1 : 0
  return `M${a.x} ${a.y}A${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`
}

/** Polygon points through these semitone positions, in the order given (a chord's stack). */
export function polygonPoints(semis: readonly number[], r = RING_R): string {
  return semis
    .map((s) => ringPoint(s, r))
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
}

/** Label for a step of `size` semitones: H, 1½ (a minor 3rd gap); whole steps are left unlabelled. */
export function stepLabel(size: number): string | null {
  if (size === 1) return 'H'
  if (size === 3) return '1½'
  return null
}
