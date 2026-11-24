import type { PitchClass, Position, ScaleId, Setup } from '../domain/types.ts'
import { positionsWhere, soundingMidi } from './neck.ts'
import { pcOf, pitchClass, spell, spellDegree } from './pitch.ts'
import type { SpelledNote } from './pitch.ts'

export interface ScaleDef {
  id: ScaleId
  name: string
  /** Semitones above the root. */
  intervals: readonly number[]
  /** The same notes as degrees, which fix their letters: D natural minor has B♭ (♭6), not A♯. */
  degrees: readonly string[]
  minor: boolean
}

export const SCALES: Readonly<Record<ScaleId, ScaleDef>> = {
  major: { id: 'major', name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'], minor: false },
  'natural-minor': { id: 'natural-minor', name: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10], degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], minor: true },
  'major-pentatonic': { id: 'major-pentatonic', name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9], degrees: ['1', '2', '3', '5', '6'], minor: false },
  'minor-pentatonic': { id: 'minor-pentatonic', name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10], degrees: ['1', 'b3', '4', '5', 'b7'], minor: true },
  mixolydian: { id: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], degrees: ['1', '2', '3', '4', '5', '6', 'b7'], minor: false },
  dorian: { id: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'], minor: true },
  blues: { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], degrees: ['1', 'b3', '4', 'b5', '5', 'b7'], minor: true },
}

export function scalePitchClasses(root: SpelledNote, scale: ScaleId): PitchClass[] {
  const r = pcOf(root)
  return SCALES[scale].intervals.map((i) => pitchClass(r + i))
}

/** The scale's notes spelled by letter: D natural minor = D E F G A B♭ C. */
export function scaleNotes(root: SpelledNote, scale: ScaleId): SpelledNote[] {
  return SCALES[scale].degrees.map((d) => spellDegree(root, d))
}

/**
 * Semitones from each pitch class to the next, wrapping back to the first an octave up:
 * the major scale's [2, 2, 1, 2, 2, 2, 1] (W W H W W W H). Input in scale order.
 */
export function stepSizes(pcs: readonly PitchClass[]): number[] {
  return pcs.map((pc, i) => pitchClass(pcs[(i + 1) % pcs.length]! - pc) || 12)
}

/** Degree of `pc` in the scale ('b3', '5'), or null if it isn't a scale note. */
export function scaleDegree(root: SpelledNote, scale: ScaleId, pc: PitchClass): string | null {
  const def = SCALES[scale]
  const i = def.intervals.indexOf(pitchClass(pc - pcOf(root)))
  return i < 0 ? null : def.degrees[i]!
}

/** Spell `pc` in the scale's context: by its degree if it's a scale note, else by the key. */
export function spellInScale(root: SpelledNote, scale: ScaleId, pc: PitchClass): SpelledNote {
  const d = scaleDegree(root, scale, pc)
  return d ? spellDegree(root, d) : spell(pc, root, SCALES[scale].minor)
}

export interface ScalePosition {
  pos: Position
  midi: number
  /** Semitones above the root, 0–11. */
  interval: number
  /** Scale degree, e.g. 'b3', 'b5' in the blues scale. */
  degree: string
  /** The note spelled in this scale, e.g. 'Bb' in D minor. */
  note: SpelledNote
  isRoot: boolean
}

/** Every position in `frets` (absolute neck frets, inclusive) that belongs to the scale. */
export function scalePositions(
  setup: Setup,
  root: SpelledNote,
  scale: ScaleId,
  frets: readonly [number, number],
): ScalePosition[] {
  const r = pcOf(root)
  const pcs = new Set(scalePitchClasses(root, scale))
  return positionsWhere(setup, frets, (m) => pcs.has(pitchClass(m))).map((pos) => {
    const midi = soundingMidi(setup, pos)
    const interval = pitchClass(midi - r)
    const degree = scaleDegree(root, scale, midi)!
    return { pos, midi, interval, degree, note: spellDegree(root, degree), isRoot: interval === 0 }
  })
}
