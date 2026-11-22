import { describe, expect, it } from 'vitest'
import type { ChordShape } from '../../domain/types.ts'
import { chordAriaLabel, chordLayout, chordStringX, chordWindow, spokenChord } from './chordLayout.ts'

const G: ChordShape = { id: 'open-g:G', tuning: 'open-g', symbol: 'G', frets: [0, 0, 0, 0, 0] }
const C: ChordShape = {
  id: 'open-g:C',
  tuning: 'open-g',
  symbol: 'C',
  frets: [2, 1, 0, 2, 0],
  fingers: [3, 1, null, 2, null],
}
const D7barre: ChordShape = {
  id: 'open-g:D-7fr',
  tuning: 'open-g',
  symbol: 'D',
  frets: [7, 7, 7, 7, 0],
  fingers: [1, 1, 1, 1, null],
  barre: { fret: 7, from: 1, to: 4 },
}
const fifthFretted: ChordShape = {
  id: 'open-g:C-5th',
  tuning: 'open-g',
  symbol: 'C',
  frets: [2, 1, 0, 2, 7],
}

describe('string positions', () => {
  it('runs 4 → 1 left to right, with the 5th slot on the left', () => {
    expect([4, 3, 2, 1].map((s) => chordStringX(s as 1 | 2 | 3 | 4))).toEqual([38, 60, 82, 104])
    expect(chordStringX(5)).toBe(16)
  })
})

describe('window', () => {
  it('starts at the nut for low shapes', () => {
    expect(chordWindow(G)).toEqual([1, 4])
    expect(chordWindow(C)).toEqual([1, 4])
  })

  it('moves up the neck for high shapes', () => {
    expect(chordWindow(D7barre)).toEqual([7, 4])
  })

  it('stretches to include a fretted 5th string', () => {
    expect(chordWindow(fifthFretted)).toEqual([1, 7])
  })
})

describe('layout', () => {
  it('shows open indicators by role and omits an open 5th string', () => {
    const L = chordLayout(G)
    expect(L.hasNut).toBe(true)
    expect(L.fifth).toBeNull()
    expect(L.indicators.map((i) => [i.string, i.kind])).toEqual([
      [1, 'open-chord'],
      [2, 'open-chord'],
      [3, 'open-root'],
      [4, 'open-chord'],
    ])
    expect(L.height).toBe(150)
  })

  it('places dots with roles and fingers', () => {
    const L = chordLayout(C)
    expect(L.dots.map((d) => [d.string, d.fret, d.role, d.finger])).toEqual([
      [1, 2, 'chord', 3],
      [2, 1, 'root', 1],
      [4, 2, 'chord', 2],
    ])
    expect(L.dots[1]!.y).toBe(24 + 13)
    expect(L.dots[0]!.y).toBe(24 + 26 + 13)
  })

  it('marks unplayed strings', () => {
    const L = chordLayout({ ...C, frets: [2, 1, 0, null, 0] })
    expect(L.indicators.find((i) => i.string === 4)?.kind).toBe('muted')
  })

  it('draws a barre once and a position label up the neck', () => {
    const L = chordLayout(D7barre)
    expect(L.hasNut).toBe(false)
    expect(L.positionLabel?.text).toBe('7fr')
    expect(L.dots).toHaveLength(0)
    expect(L.barre).toEqual({ fret: 7, x1: 29, x2: 113, y: 37, finger: 1 })
  })

  it('shows a fretted 5th string as a short column from fret 5', () => {
    const L = chordLayout(fifthFretted)
    expect(L.fifth).toEqual({ x: 16, top: 24 + 5 * 26, bottom: 24 + 7 * 26 })
    expect(L.dots.find((d) => d.string === 5)?.y).toBe(24 + 6 * 26 + 13)
  })

  it('adds an interval row only when asked', () => {
    expect(chordLayout(C).intervals).toHaveLength(0)
    expect(chordLayout(C, true).intervals.map((i) => i.label)).toEqual(['3', '1', '5', '3'])
  })
})

describe('accessible names', () => {
  it('speaks chord symbols', () => {
    expect(spokenChord('G')).toBe('G major')
    expect(spokenChord('Bbm7')).toBe('B flat minor seven')
    expect(spokenChord('D7')).toBe('D seven')
  })

  it('describes an open chord', () => {
    expect(chordAriaLabel(G)).toBe('G major. Strings 4 to 1 open; 5th string open. Roots on strings 3 and 5.')
  })

  it('describes fretted strings with fingers', () => {
    expect(chordAriaLabel(C)).toBe(
      'C major. String 4 fret 2, finger 2, string 3 open, string 2 fret 1, finger 1, string 1 fret 2, finger 3; 5th string open. Root on string 2.',
    )
  })
})
