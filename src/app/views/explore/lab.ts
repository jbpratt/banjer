/** Pure helpers for the Explore chord lab and key view. */
import type { ChordShape, NoteName, Position, Setup, StringNum } from '../../../domain/types.ts'
import {
  CHORD_FORMULAS,
  chordDegree,
  deriveFromMajor,
  droneDegree,
  majorForms,
  openMidi,
  parseChord,
  pcOf,
  pitchClass,
  scalePositions,
  soundingMidi,
} from '../../../theory/index.ts'
import type { DerivedVoicing, Frets4, Move, TriadForm } from '../../../theory/index.ts'
import type { FretMarker } from '../../../ui/instrument/types.ts'
import { noteText, prettyAccidentals } from '../../markers.ts'

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
  /** Null when this shape can't reach the quality at this position. */
  voicing: DerivedVoicing | null
}

export function labCards(setup: Setup, root: NoteName, quality: string): LabCard[] {
  return majorForms(setup, root).map((form) => ({ form, voicing: deriveFromMajor(form, quality) }))
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

function labelFor(setup: Setup, pos: Position, rootPc: number, quality: string, kind: LabLabels, key: NoteName): string {
  const midi = soundingMidi(setup, pos)
  if (kind === 'note') return noteText(midi, key)
  const d = chordDegree(quality, pitchClass(midi - rootPc))
  return d ? degreeText(d) : '?'
}

/**
 * Board for the lab: the selected voicing in full, the other voicings dimmed, ghosts where
 * moved notes came from, and the drone as a thumb note (or muted when it clashes).
 */
export function labMarkers(
  setup: Setup,
  root: NoteName,
  quality: string,
  cards: readonly LabCard[],
  selected: number,
  kind: LabLabels,
): FretMarker[] {
  const rootPc = pcOf(root)
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
      add({ pos, role: sel.degrees[i] === '1' ? 'root' : 'chord', label: labelFor(setup, pos, rootPc, quality, kind, root) })
    })
    for (const m of sel.moves) {
      const pos = { string: m.string, fret: cards[selected]!.form.frets[m.string - 1]! }
      add({ pos, role: m.from === '1' ? 'root' : 'chord', state: 'next', label: kind === 'note' ? noteText(soundingMidi(setup, pos), root) : degreeText(m.from) })
    }
  }
  cards.forEach((c, k) => {
    if (k === selected || !c.voicing) return
    c.voicing.frets.forEach((fret, i) => {
      const pos = { string: (i + 1) as StringNum, fret }
      add({ pos, role: c.voicing!.degrees[i] === '1' ? 'root' : 'chord', state: 'dim', label: labelFor(setup, pos, rootPc, quality, kind, root) })
    })
  })
  const drone = droneDegree(setup, root, quality)
  const dronePos = { string: 5 as StringNum, fret: 0 }
  out.push(
    drone
      ? { pos: dronePos, role: 'thumb', label: kind === 'note' ? noteText(openMidi(setup, 5), root) : degreeText(drone) }
      : { pos: dronePos, role: 'muted' },
  )
  return out
}

/** Key view board: the major scale numbered 1–7, with `chord`'s tones (if any) standing out. */
export function keyMarkers(
  setup: Setup,
  key: NoteName,
  frets: readonly [number, number],
  chord: string | null,
  kind: LabLabels,
): FretMarker[] {
  const keyPc = pcOf(key)
  const parsed = chord ? parseChord(chord) : null
  const tones = parsed ? new Set(parsed.pitchClasses) : null
  const degreeOf = (pc: number) => [0, 2, 4, 5, 7, 9, 11].indexOf(pitchClass(pc - keyPc)) + 1
  return scalePositions(setup, key, 'major', frets).map((p) => {
    const pc = pitchClass(p.midi)
    const inChord = tones?.has(pc) ?? false
    const isChordRoot = parsed ? pc === pcOf(parsed.root) : p.isRoot
    const label = kind === 'note' ? noteText(p.midi, key) : String(degreeOf(pc))
    if (!tones) return { pos: p.pos, role: p.isRoot ? 'root' : 'scale', label }
    if (!inChord) return { pos: p.pos, role: 'scale', state: 'dim', label }
    return { pos: p.pos, role: isChordRoot ? 'root' : 'chord', label }
  })
}

export function chordTitle(root: NoteName, quality: string): string {
  return prettyAccidentals(root + quality)
}

export const LAB_ROOTS: readonly NoteName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

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
