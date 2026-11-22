/**
 * Movable chord forms on strings 1–4, and how every chord quality is a small edit of a
 * major triad form: move the 3rd down a fret for minor, a root down two for a 7th, and so on.
 *
 * All frets here are relative to the capo, like tab. The 5th string is the drone and is
 * reported separately (`droneDegree`), not voiced.
 */
import type { NoteName, PitchClass, Setup, StringNum } from '../domain/types.ts'
import { CHORD_FORMULAS, CHORD_QUALITIES, DEGREE_SEMITONES, chordDegree } from './chords.ts'
import { openMidi } from './neck.ts'
import { pcOf, pitchClass, spell } from './pitch.ts'
import { scalePitchClasses } from './scales.ts'

/** Frets for strings 1, 2, 3, 4 (index 0 = string 1). */
export type Frets4 = readonly [number, number, number, number]

const INNER: readonly StringNum[] = [1, 2, 3, 4]

export interface TriadForm {
  frets: Frets4
  /** Chord degree on each string, index 0 = string 1. */
  degrees: readonly string[]
  /** Degrees from the lowest string up (4 → 1), the way you'd write them over a chord box. */
  stack: string
  /** Lowest fret the form uses. */
  position: number
  /** Common name in open G banjo teaching, when there is one. */
  nickname?: string
}

/** Open-G names for the three major-triad forms (shared with standard C on strings 1–3). */
const OPEN_G_NICKNAMES: Readonly<Record<string, string>> = {
  '5 1 3 5': 'Barre',
  '1 3 5 1': 'F shape',
  '3 5 1 3': 'D shape',
}

function stackOf(degrees: readonly string[]): string {
  return [3, 2, 1, 0].map((i) => degrees[i]).join(' ')
}

function degreesOf(setup: Setup, frets: Frets4, rootPc: PitchClass, quality: string): (string | null)[] {
  return INNER.map((s, i) => chordDegree(quality, pitchClass(openMidi(setup, s) + frets[i]! - rootPc)))
}

/**
 * Close voicing: going up from string 4, each string takes the next chord tone
 * (5 1 3 5, 1 3 5 1, 3 5 1 3 for a major triad). These are the forms that cycle up the neck.
 */
export function isClose(quality: string, degrees: readonly string[]): boolean {
  const formula = CHORD_FORMULAS[quality]
  if (!formula) return false
  const cycle = [...formula].sort((a, b) => DEGREE_SEMITONES[a]! - DEGREE_SEMITONES[b]!)
  const idx = [3, 2, 1, 0].map((i) => cycle.indexOf(degrees[i]!))
  return idx.every((v, k) => v >= 0 && (k === 0 || v === (idx[k - 1]! + 1) % cycle.length))
}

/**
 * Every form of `quality` rooted on `root` that fits four strings in a 4-fret window,
 * starting at fret 0 through `lastPosition`, sorted up the neck. All tones present; the
 * perfect 5th is optional in four-note chords. With `closeOnly`, only close voicings
 * (`isClose`) are kept, unless that would leave none.
 */
export function chordForms(setup: Setup, root: NoteName, quality = '', lastPosition = 12, closeOnly = true): TriadForm[] {
  const formula = CHORD_FORMULAS[quality]
  if (!formula) return []
  const rootPc = pcOf(root)
  const seen = new Set<string>()
  const out: TriadForm[] = []
  for (let w = 0; w <= lastPosition; w++) {
    const range = [w, w + 1, w + 2, w + 3]
    for (const a of range)
      for (const b of range)
        for (const c of range)
          for (const d of range) {
            const frets: Frets4 = [a, b, c, d]
            if (Math.min(a, b, c, d) !== w) continue
            const key = frets.join(',')
            if (seen.has(key)) continue
            seen.add(key)
            const degrees = degreesOf(setup, frets, rootPc, quality)
            if (degrees.some((x) => x === null)) continue
            if (!complete(formula, degrees as string[])) continue
            out.push(makeForm(setup, frets, degrees as string[]))
          }
  }
  const close = out.filter((f) => isClose(quality, f.degrees))
  return closeOnly && close.length > 0 ? close : out
}

function makeForm(setup: Setup, frets: Frets4, degrees: readonly string[]): TriadForm {
  const stack = stackOf(degrees)
  const nickname = setup.tuning === 'open-g' ? OPEN_G_NICKNAMES[stack] : undefined
  return { frets, degrees, stack, position: Math.min(...frets), ...(nickname ? { nickname } : {}) }
}

function complete(formula: readonly string[], degrees: readonly string[]): boolean {
  const have = new Set(degrees)
  return formula.every((d) => have.has(d) || (d === '5' && formula.length > 3))
}

/** The major-triad forms for `root`: the starting point every other quality is derived from. */
export function majorForms(setup: Setup, root: NoteName, lastPosition = 12, closeOnly = true): TriadForm[] {
  return chordForms(setup, root, '', lastPosition, closeOnly)
}

/** Which degrees each major-triad tone may turn into, and nothing else. */
const SUBSTITUTIONS: Readonly<Record<string, readonly string[]>> = {
  '1': ['1', 'b7', '7', 'bb7', '9'],
  '3': ['3', 'b3', '4', '2'],
  '5': ['5', 'b5', '#5', '6', 'bb7', 'b7'],
}

export interface Move {
  string: StringNum
  from: string
  to: string
  /** Frets moved: negative = toward the nut. */
  delta: number
}

export interface DerivedVoicing {
  frets: Frets4
  degrees: readonly string[]
  /** The notes that moved, string 1 first. Empty for the major form itself. */
  moves: readonly Move[]
}

/** Signed semitone distance from degree `a` to degree `b`, in −6..5. */
function stepBetween(a: string, b: string): number {
  return ((DEGREE_SEMITONES[b]! - DEGREE_SEMITONES[a]! + 18) % 12) - 6
}

/**
 * Turn a major form into `quality` by moving as few notes as possible, as little as possible.
 * Prefers keeping the bass (string 4) in place. Null when no edit within reach works
 * (e.g. a 7th by lowering the only root, which would drop the root).
 */
export function deriveFromMajor(form: TriadForm, quality: string): DerivedVoicing | null {
  const formula = CHORD_FORMULAS[quality]
  if (!formula) return null
  const options = form.degrees.map((from, i) =>
    (SUBSTITUTIONS[from] ?? [from])
      .filter((to) => formula.includes(to))
      .map((to) => ({ to, delta: stepBetween(from, to), fret: form.frets[i]! + stepBetween(from, to) }))
      .filter((o) => Math.abs(o.delta) <= 3 && o.fret >= 0),
  )
  let best: { score: number[]; v: DerivedVoicing } | null = null
  const pick: { to: string; delta: number; fret: number }[] = []
  const visit = (i: number) => {
    if (i === 4) {
      const degrees = pick.map((p) => p.to)
      if (!complete(formula, degrees)) return
      const fretted = pick.map((p) => p.fret).filter((f) => f > 0)
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 4) return
      const moves: Move[] = pick.flatMap((p, k) =>
        p.delta === 0 ? [] : [{ string: (k + 1) as StringNum, from: form.degrees[k]!, to: p.to, delta: p.delta }],
      )
      const score = [moves.length, moves.reduce((n, m) => n + Math.abs(m.delta), 0), moves.some((m) => m.string === 4) ? 1 : 0]
      if (!best || lexLess(score, best.score)) {
        best = { score, v: { frets: pick.map((p) => p.fret) as unknown as Frets4, degrees, moves } }
      }
      return
    }
    for (const o of options[i]!) {
      pick.push(o)
      visit(i + 1)
      pick.pop()
    }
  }
  visit(0)
  return (best as { v: DerivedVoicing } | null)?.v ?? null
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]!
  return false
}

/** Degree the open 5th-string drone plays against this chord, or null if it clashes. */
export function droneDegree(setup: Setup, root: NoteName, quality: string): string | null {
  return chordDegree(quality, pitchClass(openMidi(setup, 5) - pcOf(root)))
}

/** One rule per quality: how to get there from a major shape. */
export const QUALITY_RULES: Readonly<Record<string, string>> = {
  '': 'The home shape: root, 3rd and 5th.',
  m: 'Lower every 3rd one fret.',
  '7': 'Add the ♭7: lower a root two frets, or raise a 5th three.',
  maj7: 'Add the 7: lower a root one fret.',
  m7: 'Minor and 7 together: lower the 3rd one fret, and add the ♭7.',
  '6': 'Raise a 5th two frets.',
  m6: 'Lower the 3rd one fret and raise a 5th two.',
  sus2: 'Swap the 3rd for the 2nd: lower it two frets.',
  sus4: 'Swap the 3rd for the 4th: raise it one fret.',
  '7sus4': 'Raise the 3rd one fret and add the ♭7.',
  add9: 'Raise a doubled root two frets.',
  dim: 'Lower the 3rd and the 5th one fret each.',
  aug: 'Raise the 5th one fret.',
  m7b5: 'Diminished plus the ♭7: lower the 3rd and the 5th one fret, and add the ♭7.',
  dim7: 'Every note a minor 3rd apart, so the shape repeats every three frets.',
}

/** Qualities the chord lab offers, in teaching order. */
export const LAB_QUALITIES: readonly string[] = ['', 'm', '7', 'maj7', 'm7', '6', 'm6', 'sus2', 'sus4', '7sus4', 'dim', 'aug', 'm7b5', 'dim7']

// ── Keys ────────────────────────────────────────────────────────────────────

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

export interface DiatonicChord {
  /** 1–7. */
  degree: number
  root: NoteName
  /** Triad quality suffix: '', 'm', 'dim', 'aug'. */
  triad: string
  /** 'I', 'ii', 'vii°'. */
  numeral: string
  /** Seventh-chord quality: 'maj7', '7', 'm7', 'm7b5', 'dim7'. */
  seventh: string
  /** 'Imaj7', 'V7', 'viiø7'. */
  numeral7: string
}

export interface KeyInfo {
  key: NoteName
  notes: NoteName[]
  /** Whole (W) or half (H) step from each note to the next, ending back at the root. */
  steps: ('W' | 'H')[]
  chords: DiatonicChord[]
}

function matchQuality(intervals: number[], candidates: readonly string[]): string {
  const want = intervals.join(',')
  return candidates.find((q) => CHORD_QUALITIES[q]!.join(',') === want) ?? '?'
}

/** The major key: its notes, step pattern, and the chord built on each degree by stacking 3rds. */
export function majorKey(key: NoteName): KeyInfo {
  const pcs = scalePitchClasses(key, 'major')
  const notes = pcs.map((pc) => spell(pc, key))
  const steps = pcs.map((pc, i) => (pitchClass(pcs[(i + 1) % 7]! - pc) === 1 ? 'H' : 'W'))
  const chords = pcs.map((pc, i): DiatonicChord => {
    const tones = [0, 2, 4, 6].map((k) => pitchClass(pcs[(i + k) % 7]! - pc))
    const triad = matchQuality(tones.slice(0, 3), ['', 'm', 'dim', 'aug'])
    const seventh = matchQuality(tones, ['maj7', '7', 'm7', 'm7b5', 'dim7'])
    const minorish = triad === 'm' || triad === 'dim'
    const base = minorish ? ROMAN[i]!.toLowerCase() : ROMAN[i]!
    const numeral = base + (triad === 'dim' ? '°' : triad === 'aug' ? '+' : '')
    const numeral7 = base + (seventh === 'maj7' ? 'maj7' : seventh === 'm7b5' ? 'ø7' : seventh === 'dim7' ? '°7' : '7')
    return { degree: i + 1, root: notes[i]!, triad, numeral, seventh, numeral7 }
  })
  return { key, notes, steps, chords }
}
