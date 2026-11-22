/** Pure helpers for the Explore chord lab and key view. */
import type { ChordShape, Position, Setup, StringNum } from '../../../domain/types.ts'
import {
  CHORD_FORMULAS,
  chordDegree,
  chordNotes,
  deriveWithReason,
  droneDegree,
  isSpelledNote,
  majorForms,
  openMidi,
  parseChord,
  pcOf,
  pitchClass,
  prettyNote,
  scalePositions,
  soundingMidi,
  spellInChord,
} from '../../../theory/index.ts'
import type { DerivedVoicing, DiatonicChord, Frets4, KeyInfo, Move, SpelledNote, TriadForm, Unreachable } from '../../../theory/index.ts'
import type { FretMarker } from '../../../ui/instrument/types.ts'
import { spokenNote } from '../../markers.ts'
import type { ExploreMode } from '../../routes.ts'

export type LabLabels = 'degree' | 'note'

/** '1' → 'R', 'b7' → '♭7', '#5' → '♯5', 'bb7' → '𝄫7'. */
export function degreeText(d: string): string {
  if (d === '1') return 'R'
  return d.replace(/^bb/, '𝄫').replace(/^b/, '♭').replace(/^#/, '♯')
}

/** Spoken-ish words for a degree, for move descriptions: 'root', '♭7', '3rd'. */
export function degreeWord(d: string): string {
  if (d === '1') return 'root'
  const n = d.replace(/^(bb|b|#)/, '')
  const suffix = n === '2' ? 'nd' : n === '3' ? 'rd' : 'th'
  return d.length > n.length ? degreeText(d) : `${n}${suffix}`
}

export function formulaText(quality: string): string {
  return (CHORD_FORMULAS[quality] ?? []).map(degreeText).join(' ')
}

/** "Lower the root (string 1) two frets → ♭7". */
export function moveText(m: Move): string {
  const n = Math.abs(m.delta)
  const frets = n === 1 ? 'one fret' : n === 2 ? 'two frets' : n === 3 ? 'three frets' : `${n} frets`
  return `${m.delta < 0 ? 'Lower' : 'Raise'} the ${degreeWord(m.from)} on string ${m.string} ${frets} → ${degreeText(m.to)}`
}

export interface LabCard {
  form: TriadForm
  /** Null when this shape can't reach the quality at this position; `unreachable` says why. */
  voicing: DerivedVoicing | null
  unreachable: Unreachable | null
}

export function labCards(setup: Setup, root: SpelledNote, quality: string): LabCard[] {
  return majorForms(setup, root).map((form) => ({ form, ...deriveWithReason(form, quality) }))
}

/** Lowest fretted (non-open) fret: what a chord box labels "Nfr". Null if all open. */
export function lowestFretted(frets: readonly number[]): number | null {
  const f = frets.filter((x) => x > 0)
  return f.length ? Math.min(...f) : null
}

/** Lowest to highest fretted fret. Four (Cmaj7 9555) is a stretch for most hands. */
export function fretSpan(frets: readonly number[]): number {
  const f = frets.filter((x) => x > 0)
  return f.length ? Math.max(...f) - Math.min(...f) : 0
}

export const STRETCH_SPAN = 4

/**
 * Where a card sits, matching its diagram's "Nfr": "fret 11 (from the barre at 12)" when the
 * edit moved the lowest note, "open" when nothing is fretted.
 */
export function cardPosition(card: LabCard): string {
  const from = lowestFretted(card.form.frets)
  const at = card.voicing ? card.voicing.lowestFret : from
  const here = at === null ? 'open' : `fret ${at}`
  if (!card.voicing || at === from) return here
  if (from === null) return `${here} (from the open strings)`
  const name = card.form.nickname ? card.form.nickname.replace(/^Barre/, 'barre') : 'major shape'
  return `${here} (from the ${name} at ${from})`
}

/** A voicing as a ChordShape for ChordDiagram; the drone is open when it fits the chord. */
export function voicingShape(setup: Setup, symbol: string, frets: Frets4, droneFits: boolean): ChordShape {
  return { id: `lab:${symbol}:${frets.join('-')}`, tuning: setup.tuning, symbol, frets: [...frets, droneFits ? 0 : null] }
}

/** Pitches to strum: drone (if it fits) then strings 4 → 1. */
export function strumMidis(setup: Setup, frets: Frets4, droneFits: boolean): number[] {
  const inner = [4, 3, 2, 1].map((s) => soundingMidi(setup, { string: s as StringNum, fret: frets[s - 1]! }))
  return droneFits ? [openMidi(setup, 5), ...inner] : inner
}

function samePos(a: Position, b: Position): boolean {
  return a.string === b.string && a.fret === b.fret
}

/** Label and spoken name for a lab marker; notes spelled as chord tones (B♭ in Gm7). */
function tone(setup: Setup, pos: Position, root: SpelledNote, quality: string, kind: LabLabels): Pick<FretMarker, 'label' | 'spoken'> {
  const pc = pitchClass(soundingMidi(setup, pos))
  const note = spellInChord(root, quality, pc)
  if (kind === 'note') return { label: prettyNote(note), spoken: spokenNote(note) }
  const d = chordDegree(quality, pitchClass(pc - pcOf(root)))
  return { label: d ? degreeText(d) : '?', spoken: spokenNote(note) }
}

/**
 * Board for the lab: the selected voicing in full, the other voicings dimmed, ghosts where
 * moved notes came from, and the drone as a thumb note (or muted when it clashes).
 */
export function labMarkers(
  setup: Setup,
  root: SpelledNote,
  quality: string,
  cards: readonly LabCard[],
  selected: number,
  kind: LabLabels,
): FretMarker[] {
  const out: FretMarker[] = []
  const add = (m: FretMarker) => {
    const i = out.findIndex((o) => samePos(o.pos, m.pos))
    if (i < 0) out.push(m)
    else if (out[i]!.state === 'dim' && m.state !== 'dim') out[i] = m
  }
  const sel = cards[selected]?.voicing
  if (sel) {
    sel.frets.forEach((fret, i) => {
      const pos = { string: (i + 1) as StringNum, fret }
      add({ pos, role: sel.degrees[i] === '1' ? 'root' : 'chord', stateText: 'selected shape', ...tone(setup, pos, root, quality, kind) })
    })
    for (const m of sel.moves) {
      const pos = { string: m.string, fret: cards[selected]!.form.frets[m.string - 1]! }
      // The ghost is the major shape's note, so spell and number it in the major chord.
      add({ pos, role: m.from === '1' ? 'root' : 'chord', state: 'next', stateText: 'moved from here', ...tone(setup, pos, root, '', kind) })
    }
  }
  cards.forEach((c, k) => {
    if (k === selected || !c.voicing) return
    c.voicing.frets.forEach((fret, i) => {
      const pos = { string: (i + 1) as StringNum, fret }
      add({ pos, role: c.voicing!.degrees[i] === '1' ? 'root' : 'chord', state: 'dim', stateText: 'other position', ...tone(setup, pos, root, quality, kind) })
    })
  })
  const drone = droneDegree(setup, root, quality)
  const dronePos = { string: 5 as StringNum, fret: 0 }
  out.push(drone ? { pos: dronePos, role: 'thumb', ...tone(setup, dronePos, root, quality, kind) } : { pos: dronePos, role: 'muted' })
  return out
}

/** Key view board: the major scale numbered 1–7, with `chord`'s tones (if any) standing out. */
export function keyMarkers(
  setup: Setup,
  key: SpelledNote,
  frets: readonly [number, number],
  chord: string | null,
  kind: LabLabels,
): FretMarker[] {
  const parsed = chord ? parseChord(chord) : null
  const tones = parsed ? new Set(parsed.pitchClasses) : null
  return scalePositions(setup, key, 'major', frets).map((p): FretMarker => {
    const pc = pitchClass(p.midi)
    const inChord = tones?.has(pc) ?? false
    const isChordRoot = parsed ? pc === pcOf(parsed.root) : p.isRoot
    const text = { label: kind === 'note' ? prettyNote(p.note) : p.degree, spoken: spokenNote(p.note) }
    if (!tones) return { pos: p.pos, role: p.isRoot ? 'root' : 'scale', ...text }
    if (!inChord) return { pos: p.pos, role: 'scale', state: 'dim', stateText: 'not in the chord', ...text }
    return { pos: p.pos, role: isChordRoot ? 'root' : 'chord', ...text }
  })
}

export function chordTitle(root: SpelledNote, quality: string): string {
  return prettyNote(root + quality)
}

/** "G7 = G B D F", spelled by letter (Gm7 = G B♭ D F). */
export function spellingText(root: SpelledNote, quality: string): string {
  return `${chordTitle(root, quality)} = ${chordNotes(root, quality).map(prettyNote).join(' ')}`
}

/** "D7 = D F♯ A C — degrees 5 7 2 4 of G": a diatonic chord's notes as steps of its key. */
export function keyChordText(info: KeyInfo, c: DiatonicChord, seventh: boolean): string {
  const steps = (seventh ? [0, 2, 4, 6] : [0, 2, 4]).map((k) => (c.degree - 1 + k) % 7)
  const notes = steps.map((i) => prettyNote(info.notes[i]!)).join(' ')
  return `${chordTitle(c.root, seventh ? c.seventh : c.triad)} = ${notes} — degrees ${steps.map((i) => i + 1).join(' ')} of ${prettyNote(info.key)}`
}

export const LAB_ROOTS: readonly SpelledNote[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/**
 * Root/key select options: the usual twelve, plus `current` beside its enharmonic twin when
 * the route spells it another way (C♯ next to D♭, E♯ next to F), so the select shows it.
 */
export function rootOptions(current: SpelledNote): SpelledNote[] {
  if (LAB_ROOTS.includes(current)) return [...LAB_ROOTS]
  const out = [...LAB_ROOTS]
  const twin = out.findIndex((r) => pcOf(r) === pcOf(current))
  // Sharps and naturals read before their flat twin, flats after.
  out.splice(twin + (current.includes('b') ? 1 : 0), 0, current)
  return out
}

export interface Resolved<T> {
  value: T
  /** The route's subject when it couldn't be read ('G13'), so the view can say so. */
  unknown: string | null
  /** The subject to put back in the URL when it differs from the route's: 'g7' → 'G7', 'H9' → 'G'. */
  replace: string | null
}

const upperRoot = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A chord route's subject: 'G7', 'g7' (read as G7), or unknown ('G13', 'H9') → G major. */
export function resolveChord(subject: string | undefined): Resolved<{ root: SpelledNote; quality: string }> {
  const fallback = { root: 'G' as SpelledNote, quality: '' }
  if (subject === undefined) return { value: fallback, unknown: null, replace: null }
  const symbol = upperRoot(subject.trim())
  const parsed = parseChord(symbol)
  if (!parsed) return { value: fallback, unknown: subject, replace: 'G' }
  return { value: { root: parsed.root, quality: parsed.quality }, unknown: null, replace: symbol === subject ? null : symbol }
}

/** A key route's subject: 'G', 'f#', 'E#'; no double accidentals. Unknown → G. */
export function resolveKey(subject: string | undefined): Resolved<SpelledNote> {
  if (subject === undefined) return { value: 'G', unknown: null, replace: null }
  const k = upperRoot(subject.trim())
  if (!isSpelledNote(k) || k.endsWith('##') || k.endsWith('bb')) return { value: 'G', unknown: subject, replace: 'G' }
  return { value: k, unknown: null, replace: k === subject ? null : k }
}

/** document.title for an Explore view. */
export function exploreTitle(mode: ExploreMode, chord: string, key: SpelledNote): string {
  if (mode === 'chords') return `${prettyNote(chord)} · Chord lab · Banjer`
  if (mode === 'keys') return `${prettyNote(key)} major · Keys · Banjer`
  return 'Scales · Banjer'
}

export const QUALITY_NAMES: Readonly<Record<string, string>> = {
  '': 'Major',
  m: 'Minor',
  '7': '7',
  maj7: 'maj7',
  m7: 'm7',
  '6': '6',
  m6: 'm6',
  sus2: 'sus2',
  sus4: 'sus4',
  '7sus4': '7sus4',
  dim: 'dim',
  aug: 'aug',
  m7b5: 'm7♭5',
  dim7: 'dim7',
}
