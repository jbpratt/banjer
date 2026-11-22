import { describe, expect, test } from 'vitest'
import type { Setup } from '../domain/types.ts'
import { chordDegree, isVoicingOf } from './chords.ts'
import { soundingMidi } from './neck.ts'
import {
  LAB_QUALITIES,
  QUALITY_RULES,
  chordForms,
  deriveFromMajor,
  deriveWithReason,
  droneDegree,
  isClose,
  majorForms,
  majorKey,
  relativeMajor,
  relativeMinor,
} from './voicings.ts'
import type { Frets4 } from './voicings.ts'

const OPEN_G: Setup = { tuning: 'open-g', capo: 0 }

function midis(setup: Setup, frets: Frets4): number[] {
  return frets.map((f, i) => soundingMidi(setup, { string: (i + 1) as 1 | 2 | 3 | 4, fret: f }))
}

describe('chord degrees', () => {
  test('spelled by quality', () => {
    expect(chordDegree('aug', 8)).toBe('#5')
    expect(chordDegree('dim7', 9)).toBe('bb7')
    expect(chordDegree('6', 9)).toBe('6')
    expect(chordDegree('7', 5)).toBeNull()
  })
})

describe('major forms in open G', () => {
  test('G cycles barre → F shape → D shape → barre an octave up', () => {
    const forms = majorForms(OPEN_G, 'G')
    expect(forms.map((f) => [f.frets.join(''), f.stack, f.nickname])).toEqual([
      ['0000', '5 1 3 5', 'Barre'],
      ['5345', '1 3 5 1', 'F shape'],
      ['9879', '3 5 1 3', 'D shape'],
      ['12121212', '5 1 3 5', 'Barre'],
    ])
  })

  test('D starts with the D shape at fret 2', () => {
    expect(majorForms(OPEN_G, 'D').map((f) => f.frets.join(','))).toEqual(['4,3,2,4', '7,7,7,7', '12,10,11,12'])
  })

  test('without the close filter, doubled-3rd forms appear too', () => {
    expect(majorForms(OPEN_G, 'G', 12, false).length).toBeGreaterThan(4)
  })

  test('double C keeps a form per position, open 2000 included', () => {
    const dc: Setup = { tuning: 'double-c', capo: 0 }
    expect(majorForms(dc, 'C').map((f) => [f.frets.join(','), f.stack])).toEqual([
      ['2,0,0,0', '1 5 1 3'],
      ['5,4,5,7', '5 1 3 5'],
      ['10,7,9,7', '5 3 5 1'],
      ['14,12,12,12', '1 5 1 3'],
    ])
    expect(majorForms(dc, 'G')[0]!.frets).toEqual([5, 2, 4, 2])
    expect(majorForms(dc, 'C').every((f) => f.nickname === undefined)).toBe(true)
  })

  test('double D and standard C get their open forms', () => {
    expect(majorForms({ tuning: 'double-d', capo: 0 }, 'D')[0]!.frets).toEqual([2, 0, 0, 0])
    expect(majorForms({ tuning: 'standard-c', capo: 0 }, 'C')[0]!.frets).toEqual([2, 1, 0, 0])
  })

  test('every tuning has at least three major forms for its home key, all real', () => {
    for (const tuning of ['open-g', 'double-c', 'sawmill', 'standard-c', 'double-d', 'open-d'] as const) {
      const setup: Setup = { tuning, capo: 0 }
      const home = tuning === 'double-c' || tuning === 'standard-c' ? 'C' : tuning.endsWith('-d') ? 'D' : 'G'
      const forms = majorForms(setup, home)
      expect(forms.length, tuning).toBeGreaterThanOrEqual(3)
      for (const f of forms) expect(isVoicingOf(midis(setup, f.frets), home), `${tuning} ${f.frets}`).toBe(true)
    }
  })

  test('close voicing check', () => {
    expect(isClose('', ['5', '3', '1', '5'])).toBe(true)
    expect(isClose('', ['3', '3', '1', '5'])).toBe(false)
    expect(isClose('7', ['1', 'b7', '5', '3'])).toBe(true)
  })
})

describe('deriving qualities from major', () => {
  const [barre, fShape, dShape] = majorForms(OPEN_G, 'G')

  test('minor lowers every 3rd one fret', () => {
    const gm = deriveFromMajor(fShape!, 'm')!
    expect(gm.frets).toEqual([5, 3, 3, 5])
    expect(gm.moves).toEqual([{ string: 3, from: '3', to: 'b3', delta: -1 }])
    const dShapeMinor = deriveFromMajor(dShape!, 'm')!
    expect(dShapeMinor.moves.map((m) => m.string)).toEqual([1, 4])
  })

  test('minor of the open barre needs fret −1, so there is none', () => {
    expect(deriveFromMajor(barre!, 'm')).toBeNull()
  })

  test('G7: raise a 5th three frets on the barre, lower a root two on the F shape', () => {
    expect(deriveFromMajor(barre!, '7')!.frets).toEqual([3, 0, 0, 0])
    const f7 = deriveFromMajor(fShape!, '7')!
    expect(f7.frets).toEqual([3, 3, 4, 5])
    expect(f7.moves).toEqual([{ string: 1, from: '1', to: 'b7', delta: -2 }])
  })

  test('maj7: lower a doubled root one fret, or raise a 5th four', () => {
    expect(deriveFromMajor(barre!, 'maj7')!.frets).toEqual([4, 0, 0, 0])
    expect(deriveFromMajor(fShape!, 'maj7')!.frets).toEqual([4, 3, 4, 5])
    for (const root of ['C', 'G'] as const) {
      const reachable = majorForms(OPEN_G, root).filter((f) => deriveFromMajor(f, 'maj7'))
      expect(reachable.length, root).toBeGreaterThanOrEqual(3)
    }
  })

  test('unreachable forms say why', () => {
    expect(deriveWithReason(barre!, 'm').unreachable).toMatchObject({ reason: 'below-nut' })
    const m7b5 = deriveWithReason(dShape!, 'm7b5')
    expect(m7b5.voicing).toBeNull()
    expect(m7b5.unreachable).toMatchObject({ reason: 'no-spare-tone', missing: ['1', 'b5', 'b7'] })
    expect(m7b5.unreachable!.text).toContain('one root and one 5th')
    expect(deriveWithReason(fShape!, 'nope').unreachable!.reason).toBe('unknown-quality')
    expect(deriveWithReason(fShape!, '7').unreachable).toBeNull()
  })

  test('voicings report the fret the diagram starts at', () => {
    const v = deriveFromMajor(majorForms(OPEN_G, 'G').at(-1)!, 'm')!
    expect(v.frets).toEqual([12, 11, 12, 12])
    expect([v.position, v.lowestFret]).toEqual([11, 11])
    const g7 = deriveFromMajor(barre!, '7')!
    expect([g7.position, g7.lowestFret]).toEqual([0, 3])
  })

  test('the major form itself has no moves', () => {
    expect(deriveFromMajor(fShape!, '')!.moves).toEqual([])
  })

  test('every derived voicing really is that chord', () => {
    for (const tuning of ['open-g', 'double-c', 'double-d', 'standard-c'] as const) {
      const setup: Setup = { tuning, capo: 0 }
      for (const root of ['G', 'C', 'D', 'A', 'E', 'F', 'Bb'] as const) {
        for (const form of majorForms(setup, root)) {
          for (const q of LAB_QUALITIES) {
            const v = deriveFromMajor(form, q)
            if (v) expect(isVoicingOf(midis(setup, v.frets), root + q), `${tuning} ${root}${q} from ${form.frets}`).toBe(true)
          }
        }
      }
    }
  })

  test('every lab quality has a rule', () => {
    for (const q of LAB_QUALITIES) expect(QUALITY_RULES[q]).toBeTruthy()
  })
})

describe('direct forms', () => {
  test('D7 forms are all D7', () => {
    const forms = chordForms(OPEN_G, 'D', '7')
    expect(forms.length).toBeGreaterThan(0)
    for (const f of forms) expect(isVoicingOf(midis(OPEN_G, f.frets), 'D7')).toBe(true)
  })
})

describe('drone', () => {
  test('open G drone is the root of G, the 5th of C, and clashes with D', () => {
    expect(droneDegree(OPEN_G, 'G', '')).toBe('1')
    expect(droneDegree(OPEN_G, 'C', '')).toBe('5')
    expect(droneDegree(OPEN_G, 'D', '')).toBeNull()
    expect(droneDegree(OPEN_G, 'D', 'sus4')).toBe('4')
  })
})

describe('major key', () => {
  test('G major: W W H W W W H and I ii iii IV V vi vii°', () => {
    const g = majorKey('G')
    expect(g.notes).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
    expect(g.steps.join('')).toBe('WWHWWWH')
    expect(g.chords.map((c) => c.numeral)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(g.chords.map((c) => c.root + c.triad)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'])
  })

  test('sevenths: V7 is the only dominant 7th', () => {
    const g = majorKey('G')
    expect(g.chords.map((c) => c.numeral7)).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'])
    expect(g.chords[4]!.root + g.chords[4]!.seventh).toBe('D7')
  })

  test('flat keys spell with flats', () => {
    expect(majorKey('F').notes).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'])
  })

  test('sharp keys spell by letter: E♯ and B♯, not F and C', () => {
    const fs = majorKey('F#')
    expect(fs.notes).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
    expect(fs.chords[6]!.root + fs.chords[6]!.triad).toBe('E#dim')
    expect(fs.chords[6]!.root + fs.chords[6]!.seventh).toBe('E#m7b5')
    expect(majorKey('C#').notes).toEqual(['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'])
    expect(majorKey('Gb').notes[3]).toBe('Cb')
  })

  test('relative keys', () => {
    expect(relativeMinor('G')).toBe('E')
    expect(relativeMinor('F')).toBe('D')
    expect(relativeMinor('F#')).toBe('D#')
    expect(relativeMajor('E')).toBe('G')
    expect(relativeMajor('D')).toBe('F')
  })
})
