import type { ChordShape, Midi, PitchClass, Setup, StringNum } from '../domain/types.ts'
import { soundingMidi } from './neck.ts'
import { isSpelledNote, pcOf, pitchClass, simplifyNote, spell, spellDegree } from './pitch.ts'
import type { SpelledNote } from './pitch.ts'

/** Chord qualities by symbol suffix, as semitones above the root. */
export const CHORD_QUALITIES: Readonly<Record<string, readonly number[]>> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 2],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '5': [0, 7],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
}

/** Semitones above the root for a spelled degree: '1', 'b3', '#5', 'bb7', '9'. */
export const DEGREE_SEMITONES: Readonly<Record<string, number>> = {
  '1': 0, b2: 1, '2': 2, '9': 2, b3: 3, '3': 4, '4': 5, b5: 6, '5': 7, '#5': 8, b6: 8, '6': 9, bb7: 9, b7: 10, '7': 11,
}

/** Each quality spelled as chord degrees, in the same order as CHORD_QUALITIES. */
export const CHORD_FORMULAS: Readonly<Record<string, readonly string[]>> = {
  '': ['1', '3', '5'],
  m: ['1', 'b3', '5'],
  '7': ['1', '3', '5', 'b7'],
  m7: ['1', 'b3', '5', 'b7'],
  maj7: ['1', '3', '5', '7'],
  '6': ['1', '3', '5', '6'],
  m6: ['1', 'b3', '5', '6'],
  sus2: ['1', '2', '5'],
  sus4: ['1', '4', '5'],
  '7sus4': ['1', '4', '5', 'b7'],
  add9: ['1', '3', '5', '9'],
  dim: ['1', 'b3', 'b5'],
  aug: ['1', '3', '#5'],
  '5': ['1', '5'],
  m7b5: ['1', 'b3', 'b5', 'b7'],
  dim7: ['1', 'b3', 'b5', 'bb7'],
}

/** Spelled degree of `semitones` above the root within `quality`, e.g. 8 in aug → '#5'. */
export function chordDegree(quality: string, semitones: number): string | null {
  const pc = pitchClass(semitones)
  return CHORD_FORMULAS[quality]?.find((d) => DEGREE_SEMITONES[d] === pc) ?? null
}

export interface ParsedChord {
  /** As written: 'E#dim' keeps E♯ (`simplifyNote` gives F). */
  root: SpelledNote
  quality: string
  pitchClasses: PitchClass[]
}

/** Parse a chord symbol like 'G', 'Em', 'D7', 'Bbmaj7', 'E#dim'. Returns null if unknown. */
export function parseChord(symbol: string): ParsedChord | null {
  const m = /^([A-G](?:##|bb|#|b)?)(.*)$/.exec(symbol.trim())
  if (!m || !isSpelledNote(m[1]!)) return null
  const root = m[1]
  const quality = m[2]!
  const intervals = CHORD_QUALITIES[quality]
  if (!intervals) return null
  const r = pcOf(root)
  return { root, quality, pitchClasses: intervals.map((i) => pitchClass(r + i)) }
}

/** The chord's notes spelled by letter, in formula order: Gm7 = G B♭ D F, Bdim7 = B D F A♭. */
export function chordNotes(root: SpelledNote, quality: string): SpelledNote[] {
  return (CHORD_FORMULAS[quality] ?? []).map((d) => spellDegree(root, d))
}

/**
 * Spell `pc` against a chord: a chord tone by its degree (B♭ in Gm7, A♭ in Bdim7), anything
 * else by the root's key (minor qualities spell like the minor key).
 */
export function spellInChord(root: SpelledNote, quality: string, pc: PitchClass): SpelledNote {
  const d = chordDegree(quality, pitchClass(pc - pcOf(root)))
  if (d) return spellDegree(root, d)
  return spell(pc, root, (CHORD_QUALITIES[quality] ?? []).includes(3))
}

export interface ChordName {
  root: SpelledNote
  quality: string
  symbol: string
}

/**
 * Other chord symbols with exactly the same notes: Em7 = G6, Bm7♭5 = Dm6,
 * Cdim7 = E♭dim7 = G♭dim7 = Adim7, Csus2 = Gsus4. Each root is spelled as the chord tone
 * it is in the original, unless that would need a double accidental (B𝄫 → A).
 */
export function sameNotesAs(root: SpelledNote, quality: string): ChordName[] {
  const intervals = CHORD_QUALITIES[quality]
  const formula = CHORD_FORMULAS[quality]
  if (!intervals || !formula) return []
  const r = pcOf(root)
  const want = new Set(intervals.map((i) => pitchClass(r + i)))
  const out: ChordName[] = []
  formula.forEach((degree, k) => {
    const pc = pitchClass(r + intervals[k]!)
    let name = spellDegree(root, degree)
    if (name.endsWith('##') || name.endsWith('bb')) name = simplifyNote(name)
    for (const [q, iv] of Object.entries(CHORD_QUALITIES)) {
      if (pc === r && q === quality) continue
      const tones = new Set(iv.map((i) => pitchClass(pc + i)))
      if (tones.size === want.size && [...tones].every((t) => want.has(t))) out.push({ root: name, quality: q, symbol: name + q })
    }
  })
  return out
}

/** Sounding pitches of a shape under a setup, string 1 first; unplayed strings are skipped. */
export function shapeMidis(setup: Setup, shape: ChordShape): Midi[] {
  const out: Midi[] = []
  shape.frets.forEach((fret, i) => {
    if (fret !== null) out.push(soundingMidi(setup, { string: (i + 1) as StringNum, fret }))
  })
  return out
}

/**
 * Name the chord formed by a set of pitches, or null if no known quality matches exactly.
 * Prefers the bass note as root, then simpler qualities. Fifths may be omitted.
 */
export function identifyChord(midis: readonly Midi[], key?: SpelledNote): string | null {
  if (midis.length === 0) return null
  const played = new Set(midis.map(pitchClass))
  const bass = pitchClass(Math.min(...midis))
  const roots = [bass, ...[...played].filter((pc) => pc !== bass)]
  for (const root of roots) {
    for (const [quality, intervals] of Object.entries(CHORD_QUALITIES)) {
      const tones = new Set(intervals.map((i) => pitchClass(root + i)))
      const fifth = pitchClass(root + 7)
      const allPlayedAreTones = [...played].every((pc) => tones.has(pc))
      const allTonesPlayed = [...tones].every((pc) => played.has(pc) || (pc === fifth && tones.size > 2))
      if (allPlayedAreTones && allTonesPlayed) return spell(root, key) + quality
    }
  }
  return null
}

/** Whether a set of pitches is a voicing of `symbol` (every tone present, fifth optional, nothing extra). */
export function isVoicingOf(midis: readonly Midi[], symbol: string): boolean {
  const chord = parseChord(symbol)
  if (!chord) return false
  const played = new Set(midis.map(pitchClass))
  const tones = new Set(chord.pitchClasses)
  const fifth = pitchClass(pcOf(chord.root) + 7)
  return (
    [...played].every((pc) => tones.has(pc)) &&
    [...tones].every((pc) => played.has(pc) || (pc === fifth && tones.size > 2))
  )
}
