import type { Midi, NoteName, PitchClass } from '../domain/types.ts'

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Accidental = '' | '#' | 'b' | '##' | 'bb'

/**
 * A note spelled as a letter plus up to a double accidental: 'E#', 'Bbb', 'F##'.
 * Every NoteName is one. Spelled notes come from a root and a degree (`spellDegree`), so
 * the 7th of F♯ major reads E♯ and the 𝄫7 of Bdim7 reads A♭.
 */
export type SpelledNote = `${Letter}${Accidental}`

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const NAME_TO_PC: Record<NoteName, PitchClass> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PC: readonly PitchClass[] = [0, 2, 4, 5, 7, 9, 11]
const ACCIDENTAL_SEMIS: Readonly<Record<Accidental, number>> = { '': 0, '#': 1, b: -1, '##': 2, bb: -2 }
const SEMIS_ACCIDENTAL: Readonly<Record<number, Accidental>> = { 0: '', 1: '#', [-1]: 'b', 2: '##', [-2]: 'bb' }
/** Semitones above the root of each natural degree 1–7 (the major scale). */
const MAJOR_STEPS: readonly number[] = [0, 2, 4, 5, 7, 9, 11]

/** Major keys (and their relative minors) conventionally spelled with flats. */
const FLAT_KEYS: ReadonlySet<PitchClass> = new Set([5, 10, 3, 8, 1, 6]) // F Bb Eb Ab Db Gb

const SPELLED_RE = /^([A-G])(##|bb|#|b)?$/
const DEGREE_RE = /^(bb|b|##|#)?([1-9]\d*)$/

export function pitchClass(midi: Midi): PitchClass {
  return ((midi % 12) + 12) % 12
}

export function octaveOf(midi: Midi): number {
  return Math.floor(midi / 12) - 1
}

function split(name: SpelledNote): [letter: number, accidental: number] {
  const m = SPELLED_RE.exec(name)
  if (!m) throw new Error(`bad note name: ${name}`)
  return [LETTERS.indexOf(m[1] as Letter), ACCIDENTAL_SEMIS[(m[2] ?? '') as Accidental]]
}

export function pcOf(name: SpelledNote): PitchClass {
  const [l, acc] = split(name)
  return pitchClass(LETTER_PC[l]! + acc)
}

/** One of the 17 plain names used for roots and keys (no E♯, C♭ or doubles). */
export function isNoteName(s: string): s is NoteName {
  return s in NAME_TO_PC
}

/** Any letter with up to a double accidental: 'E#', 'Cb', 'Bbb'. */
export function isSpelledNote(s: string): s is SpelledNote {
  return SPELLED_RE.test(s)
}

/** The enharmonic plain name: E♯ → F, C♭ → B, B𝄫 → A. Plain names pass through. */
export function simplifyNote(name: SpelledNote): NoteName {
  if (isNoteName(name)) return name
  const pc = pcOf(name)
  return (split(name)[1] > 0 ? SHARP_NAMES : FLAT_NAMES)[pc]!
}

/** 'Bb' → 'B♭', 'F##' → 'F𝄪', 'Bbm7b5' → 'B♭m7♭5'. */
export function prettyNote(s: string): string {
  return s.replace(/##/g, '𝄪').replace(/bb/g, '𝄫').replace(/#/g, '♯').replace(/b/g, '♭')
}

/** Semitones above the root for a degree like '1', 'b3', '#5', 'bb7', '9', '#11'. Null if malformed. */
export function degreeSemitones(degree: string): number | null {
  const m = DEGREE_RE.exec(degree)
  if (!m) return null
  const n = Number(m[2]) - 1
  return MAJOR_STEPS[n % 7]! + 12 * Math.floor(n / 7) + ACCIDENTAL_SEMIS[(m[1] ?? '') as Accidental]
}

/** The degree's letter above `root`, and the accidental it needs (undefined past a double). */
function degreeLetter(root: SpelledNote, degree: string): [letter: number, accidental: Accidental | undefined] {
  const semis = degreeSemitones(degree)
  if (semis === null) throw new Error(`bad degree: ${degree}`)
  const [l, acc] = split(root)
  const letter = (l + Number(DEGREE_RE.exec(degree)![2]) - 1) % 7
  const target = pitchClass(LETTER_PC[l]! + acc + semis)
  return [letter, SEMIS_ACCIDENTAL[((target - LETTER_PC[letter]! + 18) % 12) - 6]]
}

/**
 * The root to spell these degrees from: `root` itself, unless one of them would need a
 * triple accidental on its letter (F♭'s 𝄫7 is E♭𝄫), in which case its plain enharmonic (E).
 * Spell a whole chord from one root so its letters stay consistent.
 */
export function spellingRoot(root: SpelledNote, degrees: readonly string[]): SpelledNote {
  return degrees.every((d) => degreeLetter(root, d)[1] !== undefined) ? root : simplifyNote(root)
}

/**
 * Spell a degree above a root by letter: the letter is the root's letter plus (degree − 1),
 * and the accidental is whatever makes the interval right.
 * spellDegree('G', 'b3') = 'Bb', spellDegree('B', 'bb7') = 'Ab', spellDegree('F#', '7') = 'E#'.
 * A root that can't carry the degree (see `spellingRoot`) is spelled from its plain
 * enharmonic: the letter always follows a root, never a guess.
 */
export function spellDegree(root: SpelledNote, degree: string): SpelledNote {
  const r = spellingRoot(root, [degree])
  const [letter, accidental] = degreeLetter(r, degree)
  // Plain roots have at most one accidental, so a double always covers their degrees.
  if (accidental === undefined) throw new Error(`can't spell ${degree} above ${root}`)
  return `${LETTERS[letter]!}${accidental}`
}

/** Accidentals written in a spelling: 0 for G, 1 for B♭, 2 for B𝄫. */
export function accidentalCount(name: SpelledNote): number {
  return Math.abs(split(name)[1])
}

/** The plain names for a pitch class: ['C#', 'Db'], or ['G']. */
export function plainNames(pc: PitchClass): NoteName[] {
  const p = pitchClass(pc)
  return [...new Set([SHARP_NAMES[p]!, FLAT_NAMES[p]!])]
}

/** Whether notes in this key should be spelled with flats. */
export function prefersFlats(key: SpelledNote, minor = false): boolean {
  const acc = split(key)[1]
  if (acc !== 0) return acc < 0
  const pc = pcOf(key)
  // A minor key spells like its relative major, three semitones up.
  return FLAT_KEYS.has(minor ? (pc + 3) % 12 : pc)
}

// How each semitone above a key's tonic is named. Covers both the major and the natural
// minor scale by degree; chromatic notes read the way they usually show up (♭3 and ♭7 blue
// notes in major, the raised 7th in minor, ♯4 leading into the 5th).
const KEY_DEGREES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'] as const

/**
 * Spell a pitch class. With no key, sharps. With a key, by letter within that key
 * (F♯ major's 7th is E♯; G's ♭3 is B♭); chromatic notes that would need a double
 * accidental fall back to the key's sharps or flats.
 */
export function spell(pc: PitchClass): NoteName
export function spell(pc: PitchClass, key: SpelledNote | undefined, minor?: boolean): SpelledNote
export function spell(pc: PitchClass, key?: SpelledNote, minor = false): SpelledNote {
  if (!key) return SHARP_NAMES[pitchClass(pc)]!
  const s = spellDegree(key, KEY_DEGREES[pitchClass(pc - pcOf(key))]!)
  if (!s.endsWith('##') && !s.endsWith('bb')) return s
  return (prefersFlats(key, minor) ? FLAT_NAMES : SHARP_NAMES)[pitchClass(pc)]!
}

/** "D4", "Bb3", "B#3" (B♯3 is MIDI 60: the octave number follows the letter). */
export function noteName(midi: Midi, key?: SpelledNote, minor = false): string {
  return spelledName(midi, spell(pitchClass(midi), key, minor))
}

/** Scientific pitch name of `midi` written as `name`, which must be an enharmonic of it. */
export function spelledName(midi: Midi, name: SpelledNote): string {
  return `${name}${octaveOf(midi - split(name)[1])}`
}

/** Parse scientific pitch notation ("D4", "f#3", "Bb2", "B#3") to MIDI. Throws on bad input. */
export function parseNote(s: string): Midi {
  const m = /^([A-Ga-g])(##|bb|#|b)?(-?\d+)$/.exec(s.trim())
  if (!m) throw new Error(`bad note: ${s}`)
  const [l, acc] = split((m[1]!.toUpperCase() + (m[2] ?? '')) as SpelledNote)
  return (Number(m[3]) + 1) * 12 + LETTER_PC[l]! + acc
}

export function midiToHz(midi: Midi, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

const INTERVAL_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'] as const

/** Scale-degree label of `pc` above `root`: '1', 'b3', '5', 'b7', … */
export function intervalLabel(root: PitchClass, pc: PitchClass): string {
  return INTERVAL_LABELS[pitchClass(pc - root)]!
}
