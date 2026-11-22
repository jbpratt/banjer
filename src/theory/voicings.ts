/**
 * Movable chord forms on strings 1–4, and how every chord quality is a small edit of a
 * major triad form: move the 3rd down a fret for minor, a root down two for a 7th, and so on.
 *
 * All frets here are relative to the capo, like tab. The 5th string is the drone and is
 * reported separately (`droneDegree`), not voiced.
 */
import type { PitchClass, Setup, StringNum } from '../domain/types.ts'
import { CHORD_FORMULAS, CHORD_QUALITIES, DEGREE_SEMITONES, chordDegree } from './chords.ts'
import { openMidi } from './neck.ts'
import { pcOf, pitchClass, prettyNote, spellDegree } from './pitch.ts'
import type { SpelledNote } from './pitch.ts'
import { scaleNotes, scalePitchClasses } from './scales.ts'

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
 * perfect 5th is optional in four-note chords.
 *
 * With `closeOnly` (the default), the list is trimmed to one form per hand position: every
 * close voicing (`isClose`), plus the best other form wherever the close ones leave a gap.
 * In open G and open D the close forms cover the neck; in double C or double D, whose open
 * strings aren't a triad, the gaps hold forms like double C's open 2000 (1 5 1 3).
 */
export function chordForms(setup: Setup, root: SpelledNote, quality = '', lastPosition = 12, closeOnly = true): TriadForm[] {
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
  return closeOnly ? onePerPosition(quality, out) : out
}

/** Average fret: where the hand sits. Forms closer than this share a position. */
const center = (f: TriadForm) => f.frets.reduce((a, b) => a + b, 0) / 4
const SAME_POSITION = 2

function onePerPosition(quality: string, forms: readonly TriadForm[]): TriadForm[] {
  // Close first; then forms that don't double the 3rd, then the most compact.
  const rank = (f: TriadForm) => [
    isClose(quality, f.degrees) ? 0 : 1,
    f.degrees.filter((d) => d.endsWith('3')).length > 1 ? 1 : 0,
    Math.max(...f.frets) - f.position,
    f.position,
  ]
  const kept: TriadForm[] = []
  for (const f of [...forms].sort((a, b) => (lexLess(rank(a), rank(b)) ? -1 : lexLess(rank(b), rank(a)) ? 1 : 0))) {
    if (isClose(quality, f.degrees) || kept.every((k) => Math.abs(center(k) - center(f)) >= SAME_POSITION)) kept.push(f)
  }
  return kept.sort((a, b) => a.position - b.position || center(a) - center(b))
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
export function majorForms(setup: Setup, root: SpelledNote, lastPosition = 12, closeOnly = true): TriadForm[] {
  return chordForms(setup, root, '', lastPosition, closeOnly)
}

/** Which degrees each major-triad tone may turn into, and nothing else. */
const SUBSTITUTIONS: Readonly<Record<string, readonly string[]>> = {
  '1': ['1', 'b7', '7', 'bb7', '9'],
  '3': ['3', 'b3', '4', '2'],
  '5': ['5', 'b5', '#5', '6', 'bb7', 'b7', '7'],
}

/** Farthest a single note moves, in frets (5 → 7 for maj7 is four). */
const MAX_MOVE = 4
/** Widest fretted span a voicing may use (lowest to highest fretted string). */
const MAX_SPAN = 4

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
  /** Lowest fret used, open strings included (0), like `TriadForm.position`. */
  position: number
  /** Lowest fretted (non-open) fret, or null if every string is open. Chord boxes label this ("11fr"). */
  lowestFret: number | null
}

/**
 * Why a major form can't become a quality:
 * - 'below-nut': the move would need a fret below the nut or capo (Gm from the open barre).
 * - 'stretch': every working edit spans more than four frets.
 * - 'no-spare-tone': not enough doubled notes to turn into the new tones; e.g. m7♭5 from
 *   3 5 1 3 needs its single 5th to be both the ♭5 and the ♭7.
 * - 'unknown-quality': no formula for the quality.
 */
export type UnreachableReason = 'below-nut' | 'stretch' | 'no-spare-tone' | 'unknown-quality'

export interface Unreachable {
  reason: UnreachableReason
  /** For 'no-spare-tone': chord degrees that some string would have to give up, formula order. */
  missing: readonly string[]
  /** One sentence for the learner. */
  text: string
}

export type Derivation =
  | { voicing: DerivedVoicing; unreachable: null }
  | { voicing: null; unreachable: Unreachable }

/** Short, form-independent sentence per reason. `Unreachable.text` is the specific one. */
export const UNREACHABLE_SUMMARY: Readonly<Record<UnreachableReason, string>> = {
  'below-nut': 'The move would go below the nut. Try this shape higher up the neck.',
  stretch: 'The edit works, but stretches more than four frets.',
  'no-spare-tone': 'Not enough doubled notes to turn into the new chord tones.',
  'unknown-quality': 'Unknown chord quality.',
}

function degreeName(d: string): string {
  return d === '1' ? 'root' : prettyNote(d)
}

function listText(xs: readonly string[]): string {
  return xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`
}

/** Signed semitone distance from degree `a` to degree `b`, in −6..5. */
function stepBetween(a: string, b: string): number {
  return ((DEGREE_SEMITONES[b]! - DEGREE_SEMITONES[a]! + 18) % 12) - 6
}

/**
 * Turn a major form into `quality` by moving as few notes as possible, as little as possible.
 * Prefers keeping the bass (string 4) in place. Null when no edit within reach works;
 * `deriveWithReason` says why.
 */
export function deriveFromMajor(form: TriadForm, quality: string): DerivedVoicing | null {
  return deriveWithReason(form, quality).voicing
}

/** `deriveFromMajor`, plus why it failed when it does. */
export function deriveWithReason(form: TriadForm, quality: string): Derivation {
  const formula = CHORD_FORMULAS[quality]
  if (!formula) return fail('unknown-quality', [], UNREACHABLE_SUMMARY['unknown-quality'])
  const options = form.degrees.map((from, i) =>
    (SUBSTITUTIONS[from] ?? [from])
      .filter((to) => formula.includes(to))
      .map((to) => ({ to, delta: stepBetween(from, to), fret: form.frets[i]! + stepBetween(from, to) }))
      .filter((o) => Math.abs(o.delta) <= MAX_MOVE),
  )
  let best: { score: number[]; v: DerivedVoicing } | null = null
  let belowNut = false
  let stretch = false
  let fewestMissing = Infinity
  const missing = new Set<string>()
  const pick: { to: string; delta: number; fret: number }[] = []
  const visit = (i: number) => {
    if (i === 4) {
      const degrees = pick.map((p) => p.to)
      if (!complete(formula, degrees)) {
        const gone = formula.filter((d) => !degrees.includes(d) && !(d === '5' && formula.length > 3))
        if (gone.length < fewestMissing) missing.clear()
        if (gone.length <= fewestMissing) gone.forEach((d) => missing.add(d))
        fewestMissing = Math.min(fewestMissing, gone.length)
        return
      }
      const frets = pick.map((p) => p.fret)
      if (frets.some((f) => f < 0)) return void (belowNut = true)
      const fretted = frets.filter((f) => f > 0)
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > MAX_SPAN) return void (stretch = true)
      const moves: Move[] = pick.flatMap((p, k) =>
        p.delta === 0 ? [] : [{ string: (k + 1) as StringNum, from: form.degrees[k]!, to: p.to, delta: p.delta }],
      )
      const score = [moves.length, moves.reduce((n, m) => n + Math.abs(m.delta), 0), moves.some((m) => m.string === 4) ? 1 : 0]
      if (!best || lexLess(score, best.score)) {
        const v: DerivedVoicing = {
          frets: frets as unknown as Frets4,
          degrees,
          moves,
          position: Math.min(...frets),
          lowestFret: fretted.length ? Math.min(...fretted) : null,
        }
        best = { score, v }
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
  const found = best as { v: DerivedVoicing } | null
  if (found) return { voicing: found.v, unreachable: null }
  if (belowNut) return fail('below-nut', [], UNREACHABLE_SUMMARY['below-nut'])
  if (stretch) return fail('stretch', [], UNREACHABLE_SUMMARY.stretch)
  const gone = formula.filter((d) => missing.has(d))
  const singles = (['1', '5'] as const).filter((d) => form.degrees.filter((x) => x === d).length === 1)
  const have = singles.length === 2 ? 'only one root and one 5th' : singles.length === 1 ? `only one ${degreeName(singles[0]!)}` : 'no spare note'
  return fail('no-spare-tone', gone, `This shape has ${have} to move, so it can't hold the ${listText(gone.map(degreeName))} at once.`)
}

function fail(reason: UnreachableReason, missing: readonly string[], text: string): Derivation {
  return { voicing: null, unreachable: { reason, missing, text } }
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]!
  return false
}

/** Degree the open 5th-string drone plays against this chord, or null if it clashes. */
export function droneDegree(setup: Setup, root: SpelledNote, quality: string): string | null {
  return chordDegree(quality, pitchClass(openMidi(setup, 5) - pcOf(root)))
}

/** One rule per quality: how to get there from a major shape. */
export const QUALITY_RULES: Readonly<Record<string, string>> = {
  '': 'The home shape: root, 3rd and 5th.',
  m: 'Lower every 3rd one fret.',
  '7': 'Add the ♭7: lower a root two frets, or raise a 5th three.',
  maj7: 'Add the 7: lower a root one fret, or raise a 5th four.',
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
  /** Spelled in the key, so it may be E♯ or C♭; `simplifyNote` gives a plain NoteName. */
  root: SpelledNote
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
  key: SpelledNote
  /** Spelled by letter: F♯ major has E♯, never F. */
  notes: SpelledNote[]
  /** Whole (W) or half (H) step from each note to the next, ending back at the root. */
  steps: ('W' | 'H')[]
  chords: DiatonicChord[]
}

function matchQuality(intervals: number[], candidates: readonly string[]): string {
  const want = intervals.join(',')
  return candidates.find((q) => CHORD_QUALITIES[q]!.join(',') === want) ?? '?'
}

/** The major key: its notes, step pattern, and the chord built on each degree by stacking 3rds. */
export function majorKey(key: SpelledNote): KeyInfo {
  const pcs = scalePitchClasses(key, 'major')
  const notes = scaleNotes(key, 'major')
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

/** The minor key sharing this major key's notes: its 6th (G → E, F → D, F♯ → D♯). */
export function relativeMinor(majorKey: SpelledNote): SpelledNote {
  return spellDegree(majorKey, '6')
}

/** The major key sharing this minor key's notes: its ♭3 (E → G, D → F). */
export function relativeMajor(minorKey: SpelledNote): SpelledNote {
  return spellDegree(minorKey, 'b3')
}
