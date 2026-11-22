/**
 * Banjer domain contract. Every layer builds against these types.
 * Conventions are explained in docs/PRINCIPLES.md.
 */

// ── Pitch ──────────────────────────────────────────────────────────────────

/** MIDI note number. 60 = C4 (middle C), 69 = A4 (440 Hz). */
export type Midi = number

/** Pitch class 0–11 where C = 0, C♯/D♭ = 1, … B = 11. */
export type PitchClass = number

/** A spelled note name without octave. Used for keys, roots, and display. */
export type NoteName =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F'
  | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B'

// ── Instrument ─────────────────────────────────────────────────────────────

/** Banjo string number as in tab: 1 = highest long string, 5 = short drone string. */
export type StringNum = 1 | 2 | 3 | 4 | 5

/** Left-hand finger: 1 index, 2 middle, 3 ring, 4 pinky, 'T' thumb. */
export type Finger = 1 | 2 | 3 | 4 | 'T'

/**
 * A place on the neck, written as in tab.
 * - Strings 1–4: `fret` is relative to the capo (0 = open, or at the capo).
 * - String 5: 0 = open (at its nut or spike); otherwise the absolute neck fret, ≥ 6.
 */
export interface Position {
  string: StringNum
  fret: number
}

export type TuningId = 'open-g' | 'double-c' | 'sawmill' | 'standard-c' | 'double-d' | 'open-d'

export interface Tuning {
  id: TuningId
  name: string
  /** How players write it, string 5 → 1, e.g. "gDGBD". */
  short: string
  /** Open-string pitches; index 0 = string 1 … index 4 = string 5. */
  strings: readonly [Midi, Midi, Midi, Midi, Midi]
  /** Keys this tuning is usually played in without a capo. */
  homeKeys: readonly NoteName[]
}

/** How the instrument must be set up before playing an item. */
export interface Setup {
  tuning: TuningId
  /** Capo fret for strings 1–4. 0 = no capo. */
  capo: number
  /** Semitones the 5th string is raised by a spike or retune. Defaults to `capo`. */
  fifthRaise?: number
}

// ── Shapes and scales ──────────────────────────────────────────────────────

type PerString<T> = readonly [T, T, T, T, T]

export interface ChordShape {
  /** Unique id, by convention `${tuning}:${symbol}`, plus a suffix for alternates (`open-g:D7-alt`). */
  id: string
  tuning: TuningId
  /** Chord symbol, e.g. 'G', 'Em', 'D7'. */
  symbol: string
  /** Fret per string, index 0 = string 1. null = not played. Same fret rules as `Position`. */
  frets: PerString<number | null>
  fingers?: PerString<Finger | null>
  /** Inclusive string range held by one finger at `fret`. */
  barre?: { fret: number; from: StringNum; to: StringNum }
  /** Can be slid up the neck to make other chords. */
  movable?: boolean
  /** Short teaching note. */
  note?: string
}

export type ScaleId =
  | 'major'
  | 'natural-minor'
  | 'major-pentatonic'
  | 'minor-pentatonic'
  | 'mixolydian'
  | 'dorian'
  | 'blues'
