import type { NoteName, PitchClass, Position, ScaleId, Setup } from '../domain/types.ts'
import { positionsWhere, soundingMidi } from './neck.ts'
import { pcOf, pitchClass } from './pitch.ts'

export interface ScaleDef {
  id: ScaleId
  name: string
  /** Semitones above the root. */
  intervals: readonly number[]
  minor: boolean
}

export const SCALES: Readonly<Record<ScaleId, ScaleDef>> = {
  major: { id: 'major', name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], minor: false },
  'natural-minor': { id: 'natural-minor', name: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10], minor: true },
  'major-pentatonic': { id: 'major-pentatonic', name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9], minor: false },
  'minor-pentatonic': { id: 'minor-pentatonic', name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10], minor: true },
  mixolydian: { id: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], minor: false },
  dorian: { id: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], minor: true },
  blues: { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], minor: true },
}

export function scalePitchClasses(root: NoteName, scale: ScaleId): PitchClass[] {
  const r = pcOf(root)
  return SCALES[scale].intervals.map((i) => pitchClass(r + i))
}

export interface ScalePosition {
  pos: Position
  midi: number
  /** Semitones above the root, 0–11. */
  interval: number
  isRoot: boolean
}

/** Every position in `frets` (absolute neck frets, inclusive) that belongs to the scale. */
export function scalePositions(
  setup: Setup,
  root: NoteName,
  scale: ScaleId,
  frets: readonly [number, number],
): ScalePosition[] {
  const r = pcOf(root)
  const pcs = new Set(scalePitchClasses(root, scale))
  return positionsWhere(setup, frets, (m) => pcs.has(pitchClass(m))).map((pos) => {
    const midi = soundingMidi(setup, pos)
    const interval = pitchClass(midi - r)
    return { pos, midi, interval, isRoot: interval === 0 }
  })
}
