import { describe, expect, it } from 'vitest'
import type { ChordShape, Setup } from '../domain/types.ts'
import {
  identifyChord,
  isValidPosition,
  isVoicingOf,
  neckFret,
  noteName,
  parseNote,
  positionsForMidi,
  prefersFlats,
  scalePositions,
  shapeMidis,
  soundingMidi,
  spell,
  TUNINGS,
  validateShape,
} from './index.ts'

const openG: Setup = { tuning: 'open-g', capo: 0 }
const capo2: Setup = { tuning: 'open-g', capo: 2 }

describe('pitch', () => {
  it('round-trips scientific pitch notation', () => {
    expect(parseNote('C4')).toBe(60)
    expect(parseNote('A4')).toBe(69)
    expect(parseNote('f#3')).toBe(54)
    expect(parseNote('Bb2')).toBe(46)
    expect(noteName(62)).toBe('D4')
  })

  it('spells by key', () => {
    expect(spell(10)).toBe('A#')
    expect(spell(10, 'F')).toBe('Bb')
    expect(spell(6, 'G')).toBe('F#')
    expect(prefersFlats('D', true)).toBe(true) // D minor ~ F major
    expect(prefersFlats('E', true)).toBe(false) // E minor ~ G major
    expect(spell(3, 'C', true)).toBe('Eb')
  })
})

describe('tunings', () => {
  it('open G is g4 D3 G3 B3 D4 (strings 5..1)', () => {
    expect(TUNINGS['open-g'].strings.map((m) => noteName(m))).toEqual(['D4', 'B3', 'G3', 'D3', 'G4'])
  })

  it('double C is g4 C3 G3 C4 D4 (strings 5..1)', () => {
    expect(TUNINGS['double-c'].strings.map((m) => noteName(m))).toEqual(['D4', 'C4', 'G3', 'C3', 'G4'])
  })
})

describe('neck', () => {
  it('computes sounding pitch, including the short 5th string', () => {
    expect(soundingMidi(openG, { string: 3, fret: 2 })).toBe(parseNote('A3'))
    expect(soundingMidi(openG, { string: 5, fret: 0 })).toBe(parseNote('G4'))
    expect(soundingMidi(openG, { string: 5, fret: 7 })).toBe(parseNote('A4'))
  })

  it('applies capo to strings 1–4 and raises the 5th by default', () => {
    expect(soundingMidi(capo2, { string: 1, fret: 0 })).toBe(parseNote('E4'))
    expect(soundingMidi(capo2, { string: 5, fret: 0 })).toBe(parseNote('A4'))
    expect(soundingMidi({ ...capo2, fifthRaise: 0 }, { string: 5, fret: 0 })).toBe(parseNote('G4'))
  })

  it('maps tab positions to neck frets for drawing', () => {
    expect(neckFret(capo2, { string: 1, fret: 0 })).toBe(2)
    expect(neckFret(capo2, { string: 1, fret: 3 })).toBe(5)
    expect(neckFret(capo2, { string: 5, fret: 0 })).toBe(7)
    expect(neckFret(openG, { string: 5, fret: 9 })).toBe(9)
  })

  it('rejects positions that do not exist', () => {
    expect(isValidPosition(openG, { string: 5, fret: 3 })).toBe(false)
    expect(isValidPosition(openG, { string: 5, fret: 6 })).toBe(true)
    expect(isValidPosition(capo2, { string: 5, fret: 7 })).toBe(false)
    expect(isValidPosition(capo2, { string: 5, fret: 8 })).toBe(true)
    expect(isValidPosition(openG, { string: 1, fret: 23 })).toBe(false)
    expect(isValidPosition(capo2, { string: 1, fret: 21 })).toBe(false)
    expect(isValidPosition(openG, { string: 1, fret: 1.5 })).toBe(false)
  })

  it('finds every place to play a pitch', () => {
    expect(positionsForMidi(openG, parseNote('D4'), [0, 12])).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 3 },
      { string: 3, fret: 7 },
      { string: 4, fret: 12 },
    ])
  })

  it('finds positions relative to the capo', () => {
    expect(positionsForMidi(capo2, parseNote('E4'), [0, 5])).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 3 },
    ])
  })
})

describe('scales', () => {
  it('lays out G major in first position on open G', () => {
    // The open 5th string counts once its nut (neck fret 5) is in range.
    const found = scalePositions(openG, 'G', 'major', [0, 5])
    const roots = found.filter((p) => p.isRoot).map((p) => p.pos)
    expect(roots).toEqual(
      expect.arrayContaining([
        { string: 3, fret: 0 },
        { string: 5, fret: 0 },
      ]),
    )
    expect(found.filter((p) => p.pos.string === 5)).toEqual([expect.objectContaining({ pos: { string: 5, fret: 0 } })])
    expect(scalePositions(openG, 'G', 'major', [0, 4]).some((p) => p.pos.string === 5)).toBe(false)
    expect(found.every((p) => [0, 2, 4, 5, 7, 9, 11].includes(p.interval))).toBe(true)
  })
})

describe('chords', () => {
  it('names the open G strum', () => {
    const shape: ChordShape = { id: 'g', tuning: 'open-g', symbol: 'G', frets: [0, 0, 0, 0, 0] }
    expect(identifyChord(shapeMidis(openG, shape))).toBe('G')
  })

  it('names common shapes', () => {
    const c: ChordShape = { id: 'c', tuning: 'open-g', symbol: 'C', frets: [2, 1, 0, 2, null] }
    expect(identifyChord(shapeMidis(openG, c))).toBe('C')
    expect(identifyChord([62, 66, 69, 72])).toBe('D7')
    expect(identifyChord([64, 67, 71])).toBe('Em')
  })

  it('accepts voicings that omit the fifth, but not extra tones', () => {
    expect(isVoicingOf([67, 71], 'G')).toBe(true)
    expect(isVoicingOf([67, 71, 74, 76], 'G')).toBe(false)
  })
})

describe('shape validation', () => {
  it('checks that a shape spells its chord', () => {
    expect(validateShape({ id: 'c', tuning: 'open-g', symbol: 'C', frets: [2, 1, 0, 2, 0] })).toEqual([])
    expect(validateShape({ id: 'x', tuning: 'open-g', symbol: 'C', frets: [0, 0, 0, 0, 0] })).toHaveLength(1)
    expect(validateShape({ id: 'y', tuning: 'open-g', symbol: 'G', frets: [0, 0, 0, 0, 3] })).toHaveLength(1)
    // Double C G chord: no G on strings 1–4, the 5th-string drone supplies the root.
    expect(validateShape({ id: 'dc', tuning: 'double-c', symbol: 'G', frets: [0, 2, 4, 2, 0] })).toEqual([])
    expect(validateShape({ id: 'dc2', tuning: 'double-c', symbol: 'G', frets: [0, 2, 4, 2, null] })).toHaveLength(1)
    // Open-G D chord with the g drone ringing is still a D chord.
    expect(validateShape({ id: 'd', tuning: 'open-g', symbol: 'D', frets: [4, 3, 2, 0, 0] })).toEqual([])
  })
})
