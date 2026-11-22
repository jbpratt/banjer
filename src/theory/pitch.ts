import type { Midi, NoteName, PitchClass } from '../domain/types.ts'

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const NAME_TO_PC: Record<NoteName, PitchClass> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

/** Major keys (and their relative minors) conventionally spelled with flats. */
const FLAT_KEYS: ReadonlySet<PitchClass> = new Set([5, 10, 3, 8, 1, 6]) // F Bb Eb Ab Db Gb

export function pitchClass(midi: Midi): PitchClass {
  return ((midi % 12) + 12) % 12
}

export function octaveOf(midi: Midi): number {
  return Math.floor(midi / 12) - 1
}

export function pcOf(name: NoteName): PitchClass {
  return NAME_TO_PC[name]
}

export function isNoteName(s: string): s is NoteName {
  return s in NAME_TO_PC
}

/** Whether notes in this key should be spelled with flats. */
export function prefersFlats(key: NoteName, minor = false): boolean {
  if (key.includes('b')) return true
  if (key.includes('#')) return false
  const pc = pcOf(key)
  // A minor key spells like its relative major, three semitones up.
  return FLAT_KEYS.has(minor ? (pc + 3) % 12 : pc)
}

/** Spell a pitch class, using flats when the key calls for them. Defaults to sharps. */
export function spell(pc: PitchClass, key?: NoteName, minor = false): NoteName {
  const names = key && prefersFlats(key, minor) ? FLAT_NAMES : SHARP_NAMES
  return names[pitchClass(pc)]!
}

/** "D4", "Bb3". */
export function noteName(midi: Midi, key?: NoteName, minor = false): string {
  return `${spell(pitchClass(midi), key, minor)}${octaveOf(midi)}`
}

/** Parse scientific pitch notation ("D4", "f#3", "Bb2") to MIDI. Throws on bad input. */
export function parseNote(s: string): Midi {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(s.trim())
  if (!m) throw new Error(`bad note: ${s}`)
  const name = (m[1]!.toUpperCase() + m[2]) as NoteName
  return (Number(m[3]) + 1) * 12 + pcOf(name)
}

export function midiToHz(midi: Midi, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

const INTERVAL_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'] as const

/** Scale-degree label of `pc` above `root`: '1', 'b3', '5', 'b7', … */
export function intervalLabel(root: PitchClass, pc: PitchClass): string {
  return INTERVAL_LABELS[pitchClass(pc - root)]!
}
