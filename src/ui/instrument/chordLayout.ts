/**
 * Pure chord-box geometry. Spec: docs/research/design.md §6. Design viewBox is 120 wide.
 *
 * Banjo convention: strings 4-3-2-1 left to right and the 5th string omitted, unless the
 * shape frets it (frets[4] > 0). Then it gets a short column on the left that starts at
 * the 5th fret, where the string does.
 */
import type { ChordShape, Finger, StringNum } from '../../domain/types.ts'
import { FIFTH_STRING_START, intervalLabel, parseChord, pcOf, pitchClass, soundingMidi } from '../../theory/index.ts'
import { spokenNote } from './fretboardGeometry.ts'

export const CHORD_VIEW_WIDTH = 120
export const CHORD_GRID_TOP = 24
export const CHORD_ROW = 26
export const CHORD_INDICATOR_Y = 12
export const CHORD_FIFTH_X = 16
const MAX_ROWS = 7

export function chordStringX(string: StringNum): number {
  return string === 5 ? CHORD_FIFTH_X : 38 + (4 - string) * 22
}

export type ChordDotRole = 'root' | 'chord'

export interface ChordDot {
  string: StringNum
  fret: number
  x: number
  y: number
  role: ChordDotRole
  finger?: Finger
}

export interface ChordIndicator {
  string: StringNum
  x: number
  kind: 'open-root' | 'open-chord' | 'muted'
}

export interface ChordBarre {
  fret: number
  x1: number
  x2: number
  y: number
  finger?: Finger
}

export interface ChordLayout {
  width: number
  height: number
  /** First fret row shown (1 = at the nut). */
  start: number
  rows: number
  hasNut: boolean
  gridTop: number
  gridBottom: number
  /** "5fr" when the window starts above the nut. */
  positionLabel?: { text: string; x: number; y: number }
  /** Short 5th-string column, only when the shape frets the 5th string. */
  fifth: { x: number; top: number; bottom: number } | null
  dots: ChordDot[]
  indicators: ChordIndicator[]
  barre: ChordBarre | null
  intervals: { x: number; label: string }[]
  intervalY: number
  ariaLabel: string
}

/** Fret window rows for a shape: [start, rows]. */
export function chordWindow(shape: ChordShape): [number, number] {
  const fretted: number[] = []
  shape.frets.forEach((f, i) => {
    if (f !== null && f > 0 && (i < 4 || f > FIFTH_STRING_START)) fretted.push(f)
  })
  if (shape.barre) fretted.push(shape.barre.fret)
  if (fretted.length === 0) return [1, 4]
  const max = Math.max(...fretted)
  const min = Math.min(...fretted)
  if (max <= 5) return [1, Math.max(4, max)]
  const start = min
  return [start, Math.min(MAX_ROWS, Math.max(4, max - start + 1))]
}

export function chordLayout(shape: ChordShape, withIntervals = false, labels?: readonly (string | null)[]): ChordLayout {
  const [start, rows] = chordWindow(shape)
  const hasNut = start === 1
  const gridTop = CHORD_GRID_TOP
  const gridBottom = gridTop + rows * CHORD_ROW
  const rowY = (fret: number) => gridTop + (fret - start) * CHORD_ROW + CHORD_ROW / 2
  const setup = { tuning: shape.tuning, capo: 0 }
  const parsed = parseChord(shape.symbol)
  const rootPc = parsed ? pcOf(parsed.root) : null
  const roleOf = (string: StringNum, fret: number): ChordDotRole =>
    rootPc !== null && pitchClass(soundingMidi(setup, { string, fret })) === rootPc ? 'root' : 'chord'

  const fifthFret = shape.frets[4] ?? null
  const showFifth = fifthFret !== null && fifthFret > 0
  const fifth = showFifth
    ? {
        x: CHORD_FIFTH_X,
        top: FIFTH_STRING_START >= start - 1 ? gridTop + (FIFTH_STRING_START - (start - 1)) * CHORD_ROW : gridTop,
        bottom: gridBottom,
      }
    : null

  const barre = shape.barre
  const inBarre = (string: StringNum, fret: number) =>
    barre !== undefined &&
    fret === barre.fret &&
    string >= Math.min(barre.from, barre.to) &&
    string <= Math.max(barre.from, barre.to)

  const dots: ChordDot[] = []
  const indicators: ChordIndicator[] = []
  shape.frets.forEach((fret, i) => {
    const string = (i + 1) as StringNum
    if (string === 5 && !showFifth) return
    const x = chordStringX(string)
    if (fret === null) {
      indicators.push({ string, x, kind: 'muted' })
      return
    }
    if (fret === 0) {
      indicators.push({ string, x, kind: roleOf(string, 0) === 'root' ? 'open-root' : 'open-chord' })
      return
    }
    if (fret < start || fret >= start + rows) return
    if (inBarre(string, fret)) return
    const finger = shape.fingers?.[i] ?? undefined
    dots.push({ string, fret, x, y: rowY(fret), role: roleOf(string, fret), ...(finger !== undefined ? { finger } : {}) })
  })

  let barreGeom: ChordBarre | null = null
  if (barre) {
    const xa = chordStringX(barre.from)
    const xb = chordStringX(barre.to)
    const fingerIdx = shape.fingers?.findIndex((f, i) => f !== null && shape.frets[i] === barre.fret) ?? -1
    const finger = fingerIdx >= 0 ? shape.fingers?.[fingerIdx] ?? undefined : undefined
    barreGeom = {
      fret: barre.fret,
      x1: Math.min(xa, xb) - 9,
      x2: Math.max(xa, xb) + 9,
      y: rowY(barre.fret),
      ...(finger !== undefined && finger !== null ? { finger } : {}),
    }
  }

  const positionLabel = hasNut
    ? undefined
    : fifth && fifth.top <= gridTop
      ? { text: `${start}fr`, x: CHORD_FIFTH_X - 6, y: CHORD_INDICATOR_Y + 4 }
      : { text: `${start}fr`, x: 28, y: gridTop + CHORD_ROW / 2 + 5 }

  const intervals: { x: number; label: string }[] = []
  if (withIntervals && (rootPc !== null || labels)) {
    shape.frets.forEach((fret, i) => {
      const string = (i + 1) as StringNum
      if (fret === null || (string === 5 && !showFifth)) return
      const label = labels
        ? labels[i]
        : intervalLabel(rootPc!, pitchClass(soundingMidi(setup, { string, fret })))
      if (label) intervals.push({ x: chordStringX(string), label })
    })
  }

  return {
    width: CHORD_VIEW_WIDTH,
    height: gridBottom + 22,
    start,
    rows,
    hasNut,
    gridTop,
    gridBottom,
    ...(positionLabel ? { positionLabel } : {}),
    fifth,
    dots,
    indicators,
    barre: barreGeom,
    intervals,
    intervalY: gridBottom + 18,
    ariaLabel: chordAriaLabel(shape),
  }
}

const QUALITY_WORDS: Readonly<Record<string, string>> = {
  '': 'major',
  m: 'minor',
  '7': 'seven',
  m7: 'minor seven',
  maj7: 'major seven',
  '6': 'six',
  m6: 'minor six',
  sus2: 'sus two',
  sus4: 'sus four',
  '7sus4': 'seven sus four',
  add9: 'add nine',
  dim: 'diminished',
  aug: 'augmented',
  '5': 'five',
  m7b5: 'minor seven flat five',
  dim7: 'diminished seven',
}

export function spokenChord(symbol: string): string {
  const p = parseChord(symbol)
  if (!p) return symbol
  return `${spokenNote(p.root)} ${QUALITY_WORDS[p.quality] ?? p.quality}`
}

function spokenFret(fret: number | null): string {
  return fret === null ? 'not played' : fret === 0 ? 'open' : `fret ${fret}`
}

/** "G major. Strings 4 to 1 open; 5th string open. Root on string 3." */
export function chordAriaLabel(shape: ChordShape): string {
  const inner = shape.frets.slice(0, 4)
  const parts: string[] = []
  if (inner.every((f) => f === 0)) parts.push('Strings 4 to 1 open')
  else {
    const strings = [4, 3, 2, 1].map((s) => {
      const f = inner[s - 1] ?? null
      const finger = shape.fingers?.[s - 1]
      return `string ${s} ${spokenFret(f)}${finger !== null && finger !== undefined && f ? `, finger ${finger === 'T' ? 'thumb' : finger}` : ''}`
    })
    const text = strings.join(', ')
    parts.push(text.charAt(0).toUpperCase() + text.slice(1))
  }
  const sentence = `${parts.join('')}; 5th string ${spokenFret(shape.frets[4] ?? null)}.`
  let barre = ''
  if (shape.barre) barre = ` Barre at fret ${shape.barre.fret}, strings ${shape.barre.from} to ${shape.barre.to}.`
  const p = parseChord(shape.symbol)
  let roots = ''
  if (p) {
    const rootPc = pcOf(p.root)
    const setup = { tuning: shape.tuning, capo: 0 }
    const rs: number[] = []
    shape.frets.forEach((f, i) => {
      if (f !== null && pitchClass(soundingMidi(setup, { string: (i + 1) as StringNum, fret: f })) === rootPc) rs.push(i + 1)
    })
    if (rs.length === 1) roots = ` Root on string ${rs[0]}.`
    else if (rs.length > 1) roots = ` Roots on strings ${rs.slice(0, -1).join(', ')} and ${rs[rs.length - 1]}.`
  }
  return `${spokenChord(shape.symbol)}. ${sentence}${barre}${roots}`
}
