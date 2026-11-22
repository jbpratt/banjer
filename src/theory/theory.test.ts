import { describe, expect, it } from 'vitest'
import type { ChordShape, Setup } from '../domain/types.ts'
import {
  chordNotes,
  identifyChord,
  isValidPosition,
  isVoicingOf,
  neckFret,
  noteName,
  parseChord,
  parseNote,
  positionsForMidi,
  prefersFlats,
  sameNotesAs,
  scaleNotes,
  scalePositions,
  simplifyNote,
  spellDegree,
  spellInChord,
  spellInScale,
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

  it('spells degrees by letter, with double accidentals where the letter demands', () => {
    expect(spellDegree('G', 'b3')).toBe('Bb')
    expect(spellDegree('F#', '7')).toBe('E#')
    expect(spellDegree('B', 'bb7')).toBe('Ab')
    expect(spellDegree('C', 'bb7')).toBe('Bbb')
    expect(spellDegree('D#', '7')).toBe('C##')
    expect(spellDegree('C', '9')).toBe('D')
    expect(spellDegree('Eb', '#5')).toBe('B')
    expect(spellDegree('Gb', '4')).toBe('Cb')
  })

  it('spells within a key by letter', () => {
    expect(spell(5, 'F#')).toBe('E#') // not F
    expect(spell(10, 'G')).toBe('Bb') // the blue ♭3, not A♯
    expect(spell(11, 'Gb')).toBe('Cb')
    expect(spell(2, 'E', true)).toBe('D')
    expect(spell(3, 'E', true)).toBe('D#') // raised 7th in minor
  })

  it('names octaves by letter and simplifies enharmonics', () => {
    expect(noteName(60, 'C#')).toBe('B#3')
    expect(parseNote('B#3')).toBe(60)
    expect(parseNote('Cb4')).toBe(59)
    expect(simplifyNote('E#')).toBe('F')
    expect(simplifyNote('Bbb')).toBe('A')
    expect(simplifyNote('Cb')).toBe('B')
    expect(simplifyNote('Bb')).toBe('Bb')
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

  it('spells scales by letter', () => {
    expect(scaleNotes('D', 'natural-minor')).toEqual(['D', 'E', 'F', 'G', 'A', 'Bb', 'C'])
    expect(scaleNotes('E', 'blues')).toEqual(['E', 'G', 'A', 'Bb', 'B', 'D'])
    expect(scaleNotes('A', 'dorian')).toEqual(['A', 'B', 'C', 'D', 'E', 'F#', 'G'])
    expect(scaleNotes('F', 'mixolydian')).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'Eb'])
    expect(spellInScale('D', 'natural-minor', 10)).toBe('Bb')
    const dMinor = scalePositions(openG, 'D', 'natural-minor', [0, 4])
    expect(dMinor.find((p) => p.pos.string === 3 && p.pos.fret === 3)).toMatchObject({ degree: 'b6', note: 'Bb' })
    expect(dMinor.some((p) => p.pos.string === 2 && p.pos.fret === 0)).toBe(false) // open B isn't in D minor
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

  it('spells chord tones by degree', () => {
    expect(chordNotes('G', 'm7')).toEqual(['G', 'Bb', 'D', 'F'])
    expect(chordNotes('C', '7')).toEqual(['C', 'E', 'G', 'Bb'])
    expect(chordNotes('C', 'm')).toEqual(['C', 'Eb', 'G'])
    expect(chordNotes('B', 'dim7')).toEqual(['B', 'D', 'F', 'Ab'])
    expect(chordNotes('E#', 'm7b5')).toEqual(['E#', 'G#', 'B', 'D#'])
    expect(spellInChord('G', 'm7', 10)).toBe('Bb')
    expect(spellInChord('B', 'dim7', 8)).toBe('Ab')
    expect(spellInChord('G', 'm', 8)).toBe('Ab') // not a chord tone: G minor's ♭2
  })

  it('finds chords with the same notes', () => {
    const names = (root: Parameters<typeof sameNotesAs>[0], q: string) => sameNotesAs(root, q).map((c) => c.symbol)
    expect(names('E', 'm7')).toEqual(['G6'])
    expect(names('A', 'm7')).toEqual(['C6'])
    expect(names('C', '6')).toEqual(['Am7'])
    expect(names('B', 'm7b5')).toEqual(['Dm6'])
    expect(names('C', 'dim7')).toEqual(['Ebdim7', 'Gbdim7', 'Adim7'])
    expect(names('C', 'sus2')).toEqual(['Gsus4'])
    expect(names('G', '')).toEqual([])
  })

  it('parses spelled roots', () => {
    expect(parseChord('E#dim')).toMatchObject({ root: 'E#', quality: 'dim', pitchClasses: [5, 8, 11] })
    expect(parseChord('Bbm7b5')).toMatchObject({ root: 'Bb', quality: 'm7b5' })
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
