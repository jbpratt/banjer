import { describe, expect, test } from 'vitest'
import type { Setup } from '../domain/types.ts'
import { chordDegree, isVoicingOf } from './chords.ts'
import { soundingMidi } from './neck.ts'
import { LAB_QUALITIES, QUALITY_RULES, chordForms, deriveFromMajor, droneDegree, isClose, majorForms, majorKey } from './voicings.ts'
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

  test('the major form itself has no moves', () => {
    expect(deriveFromMajor(fShape!, '')!.moves).toEqual([])
  })

  test('every derived voicing really is that chord', () => {
    for (const root of ['G', 'C', 'D', 'A', 'E', 'F', 'Bb'] as const) {
      for (const form of majorForms(OPEN_G, root)) {
        for (const q of LAB_QUALITIES) {
          const v = deriveFromMajor(form, q)
          if (v) expect(isVoicingOf(midis(OPEN_G, v.frets), root + q), `${root}${q} from ${form.frets}`).toBe(true)
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
})
