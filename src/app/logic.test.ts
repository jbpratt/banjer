import { describe, expect, it } from 'vitest'
import { chordToneMarkers, cycleLabels, resolveLabels, scaleMarkers, shapeMarkers } from './markers.ts'
import { formatRoute, parseRoute } from './routes.ts'
import type { Route } from './routes.ts'
import { DEFAULT_SETTINGS, parseSettings } from './settings.ts'
import type { Setup } from '../domain/types.ts'
import { CHORD_QUALITIES, LAB_QUALITIES, isClose, majorKey } from '../theory/index.ts'
import {
  cardFocus,
  cardName,
  cardPosition,
  cardsTopFret,
  degreeText,
  degreeWord,
  exploreTitle,
  formulaText,
  fretSpan,
  keyChordText,
  keyMarkers,
  labCards,
  labMarkers,
  labRoot,
  moveText,
  QUALITY_GROUPS,
  QUALITY_NAMES,
  qualityGroups,
  resolveChord,
  resolveKey,
  chordRing,
  keyRing,
  scaleRing,
  spellingText,
} from './views/explore/lab.ts'

const OPEN_G = { tuning: 'open-g' as const, capo: 0 }

describe('markers', () => {
  it('builds shape markers with root vs chord, fingers and mutes', () => {
    const c = shapeMarkers(
      { id: 'open-g:C', tuning: 'open-g', symbol: 'C', frets: [2, 1, 0, 2, null], fingers: [3, 1, null, 2, null] },
      'interval',
    )
    expect(c.map((m) => [m.role, m.label, m.finger])).toEqual([
      ['chord', '3', 3],
      ['root', 'R', 1],
      ['chord', '5', undefined],
      ['chord', '3', 2],
      ['muted', undefined, undefined],
    ])
  })
  it('builds scale and chord-tone markers', () => {
    const s = scaleMarkers(OPEN_G, 'G', 'major-pentatonic', [0, 3], 'interval')
    expect(s.find((m) => m.pos.string === 3 && m.pos.fret === 0)).toMatchObject({ role: 'root', label: 'R' })
    expect(s.every((m) => m.role === 'root' || m.role === 'scale')).toBe(true)
    expect(chordToneMarkers(OPEN_G, 'Xyz', [0, 5], 'note')).toBeNull()
    const d7 = chordToneMarkers(OPEN_G, 'D7', [0, 2], 'interval')!
    expect(d7.find((m) => m.pos.string === 1 && m.pos.fret === 0)).toMatchObject({ role: 'root' })
  })
  it('chooses label kinds', () => {
    expect(resolveLabels('auto', 'shape')).toBe('interval')
    expect(resolveLabels('finger', 'shape')).toBe('finger')
    expect([cycleLabels('interval'), cycleLabels('note'), cycleLabels('finger'), cycleLabels('none')]).toEqual(['note', 'finger', 'interval', 'interval'])
  })
})

describe('chord lab', () => {
  it('spells degrees and moves in words', () => {
    expect(moveText({ string: 3, from: '5', to: '7', delta: 4 })).toBe('Raise the 5th on string 3 four frets → 7')
    expect(['1', 'b3', '#5', 'bb7', '9'].map(degreeText)).toEqual(['R', '♭3', '♯5', '𝄫7', '9'])
    expect(['1', '3', '5', 'b7'].map(degreeWord)).toEqual(['root', '3rd', '5th', '♭7'])
    expect(formulaText('7')).toBe('R 3 5 ♭7')
    expect(moveText({ string: 1, from: '1', to: 'b7', delta: -2 })).toBe('Lower the root on string 1 two frets → ♭7')
  })

  it('marks the selected voicing, ghosts where moved notes came from, and dims the rest', () => {
    const cards = labCards(OPEN_G, 'G', '7')
    const m = labMarkers(OPEN_G, 'G', '7', cards, 1, 'degree') // F shape: 5345 → 3345
    expect(m.find((x) => x.pos.string === 1 && x.pos.fret === 3)).toMatchObject({ role: 'chord', label: '♭7' })
    expect(m.find((x) => x.pos.string === 1 && x.pos.fret === 5)).toMatchObject({ role: 'root', state: 'next', label: 'R' })
    expect(m.find((x) => x.pos.string === 2 && x.pos.fret === 8)).toMatchObject({ state: 'dim' })
    expect(m.find((x) => x.pos.string === 5)).toMatchObject({ role: 'thumb', label: 'R' })
  })

  it('mutes the drone when it clashes', () => {
    const cards = labCards(OPEN_G, 'D', '7')
    expect(labMarkers(OPEN_G, 'D', '7', cards, 0, 'note').find((x) => x.pos.string === 5)).toMatchObject({ role: 'muted' })
  })

  it('numbers the key and highlights a chord inside it', () => {
    const plain = keyMarkers(OPEN_G, 'G', [0, 2], null, 'degree')
    expect(plain.find((x) => x.pos.string === 3 && x.pos.fret === 0)).toMatchObject({ role: 'root', label: '1' })
    const withD7 = keyMarkers(OPEN_G, 'G', [0, 2], 'D7', 'degree')
    expect(withD7.find((x) => x.pos.string === 4 && x.pos.fret === 0)).toMatchObject({ role: 'root', label: '5' })
    expect(withD7.find((x) => x.pos.string === 2 && x.pos.fret === 0)).toMatchObject({ state: 'dim' })
  })
})

describe('spelling', () => {
  it('spells note labels by letter in chords, keys and scales', () => {
    const notes = (ms: { label?: string }[]) => new Set(ms.map((m) => m.label))
    expect(notes(chordToneMarkers(OPEN_G, 'Gm7', [0, 5], 'note')!)).toEqual(new Set(['G', 'B♭', 'D', 'F']))
    const bdim7 = labMarkers(OPEN_G, 'B', 'dim7', labCards(OPEN_G, 'B', 'dim7'), 0, 'note')
    expect(notes(bdim7).has('A♭')).toBe(true)
    expect(notes(bdim7).has('G♯')).toBe(false)
    expect(notes(keyMarkers(OPEN_G, 'F#', [0, 12], null, 'note')).has('E♯')).toBe(true)
    expect(notes(scaleMarkers(OPEN_G, 'D', 'natural-minor', [0, 12], 'note')).has('B♭')).toBe(true)
  })
  it('gives every labelled marker the other label to peek at', () => {
    const pairs = (ms: { label?: string; altLabel?: string }[]) => new Set(ms.filter((m) => m.label).map((m) => `${m.label}/${m.altLabel}`))
    const cards = labCards(OPEN_G, 'G', 'm7')
    const sel = cards.findIndex((c) => c.voicing)
    expect(pairs(labMarkers(OPEN_G, 'G', 'm7', cards, sel, 'degree')).has('♭3/B♭')).toBe(true)
    expect(pairs(labMarkers(OPEN_G, 'G', 'm7', cards, sel, 'note')).has('B♭/♭3')).toBe(true)
    expect(pairs(keyMarkers(OPEN_G, 'F#', [0, 12], null, 'degree')).has('7/E♯')).toBe(true)
    expect(pairs(chordToneMarkers(OPEN_G, 'Gm7', [0, 5], 'note')!)).toEqual(new Set(['G/R', 'B♭/♭3', 'D/5', 'F/♭7']))
    expect(pairs(scaleMarkers(OPEN_G, 'G', 'major', [0, 5], 'interval')).has('R/G')).toBe(true)
  })
  it('gives markers a spoken note and what their state means', () => {
    const cards = labCards(OPEN_G, 'G', 'm7')
    const m = labMarkers(OPEN_G, 'G', 'm7', cards, cards.findIndex((c) => c.voicing), 'degree')
    expect(m.find((x) => x.label === '♭3' && !x.state)).toMatchObject({ spoken: 'B flat', stateText: 'selected shape' })
    expect(m.find((x) => x.state === 'dim')).toMatchObject({ stateText: 'other position' })
    expect(m.find((x) => x.state === 'next')).toMatchObject({ stateText: 'moved from here' })
  })
  it('spells chords and key chords', () => {
    expect(spellingText('G', '7')).toBe('G7 = G B D F')
    expect(spellingText('G', 'm7')).toBe('Gm7 = G B♭ D F')
    const g = majorKey('G')
    expect(keyChordText(g, g.chords[4]!, true)).toBe('D7 = D F♯ A C — degrees 5 7 2 4 of G')
    expect(keyChordText(g, g.chords[1]!, false)).toBe('Am = A C E — degrees 2 4 6 of G')
  })
})

describe('lab cards', () => {
  it('places cards where their diagrams say, and flags a 4-fret reach', () => {
    const gm = labCards(OPEN_G, 'G', 'm')
    const barre12 = gm.find((c) => c.form.frets.every((f) => f === 12))!
    expect(barre12.voicing?.frets).toEqual([12, 11, 12, 12])
    expect(cardPosition(barre12)).toBe('fret 11 (from the barre at 12)')
    expect(cardPosition(labCards(OPEN_G, 'G', '7').find((c) => c.form.position === 7)!)).toBe('fret 8 (from the D shape at 7)')
    const g7 = labCards(OPEN_G, 'G', '7')[0]!
    expect([cardName(g7), cardPosition(g7)]).toEqual(['Open', 'fret 3'])
    expect(cardName(labCards(OPEN_G, 'G', '7').at(-1)!)).toBe('Barre')
    const cmaj7 = labCards(OPEN_G, 'C', 'maj7').find((c) => c.form.frets.every((f) => f === 5))!
    expect(cmaj7.voicing?.frets).toEqual([9, 5, 5, 5])
    expect(cardPosition(cmaj7)).toBe('fret 5')
    expect(fretSpan(cmaj7.voicing!.frets)).toBe(4)
  })
  it('says why a card is unreachable', () => {
    const gm = labCards(OPEN_G, 'G', 'm').find((c) => !c.voicing)
    expect(gm?.unreachable?.reason).toBe('below-nut')
    expect(cardPosition(gm!)).toBe('at the nut')
  })
  it('names non-open-G forms by degree and drops unreachable filler forms', () => {
    const dc: Setup = { tuning: 'double-c', capo: 0 }
    expect(cardName(labCards(dc, 'C', '')[0]!)).toBe('R 5 R 3 shape')
    // Every unreachable card left is a close form, whose reason teaches something.
    for (const q of ['m', '7', 'maj7', 'm7', 'dim', 'm7b5', 'dim7'])
      for (const r of ['C', 'G', 'D', 'A'] as const)
        for (const c of labCards(dc, r, q)) if (!c.voicing) expect(isClose('', c.form.degrees)).toBe(true)
  })
  it('respells a lab root only to avoid double accidentals', () => {
    expect(labRoot('Db', 'dim7')).toBe('C#')
    expect(labRoot('Db', 'm')).toBe('Db')
    expect(labRoot('C', 'dim7')).toBe('C') // C E♭ G♭ B𝄫: no plainer root
    expect(labRoot('C#', '')).toBe('C#')
  })
  it('extends the board to the highest voicing and focuses the whole selected shape', () => {
    const cards = labCards(OPEN_G, 'C', 'maj7')
    expect(cardsTopFret(OPEN_G, cards)).toBe(16)
    expect(cardFocus(OPEN_G, labCards(OPEN_G, 'G', '7')[0])).toEqual([0, 3])
  })
})

describe('pitch rings', () => {
  it('numbers the key and joins a focused chord in stacking order', () => {
    const g = majorKey('G')
    const plain = keyRing(g, null)
    expect(plain.label).toBe('G major: G A B C D E F♯')
    expect(plain.notes.map((n) => [n.semis, n.name, n.label, n.role])).toEqual([
      [0, 'G', '1', 'root'],
      [2, 'A', '2', 'scale'],
      [4, 'B', '3', 'scale'],
      [5, 'C', '4', 'scale'],
      [7, 'D', '5', 'scale'],
      [9, 'E', '6', 'scale'],
      [11, 'F♯', '7', 'scale'],
    ])
    expect(plain.chord).toBeUndefined()
    const d7 = keyRing(g, { chord: g.chords[4]!, seventh: true })
    expect(d7.chord).toEqual([7, 11, 2, 5])
    expect(d7.title).toBe('D7')
    expect(d7.subtitle).toBe('V7 in G')
    expect(d7.notes.filter((n) => n.role !== 'scale').map((n) => `${n.name}:${n.role}`)).toEqual(['A:chord', 'C:chord', 'D:root', 'F♯:chord'])
    expect(d7.label).toBe('G major: G A B C D E F♯; D7 highlighted: D F♯ A C, degrees 5 7 2 4')
    // The relative minor's chord wraps past the octave: Em = E G B.
    expect(keyRing(g, { chord: g.chords[5]!, seventh: false }).chord).toEqual([9, 0, 4])
  })

  it('spells scales by letter and chords from their root', () => {
    const f = scaleRing('F', 'mixolydian')
    expect(f.label).toBe('F mixolydian: F G A B♭ C D E♭')
    expect(f.notes.at(-1)).toMatchObject({ semis: 10, name: 'E♭', label: '♭7' })
    expect(f.notes[0]!.label).toBe('R')
    const gm7 = chordRing('G', 'm7')
    expect(gm7.label).toBe('Gm7: G B♭ D F')
    expect(gm7.chord).toEqual([0, 3, 7, 10])
    expect(gm7.notes.map((n) => n.label)).toEqual(['R', '♭3', '5', '♭7'])
    expect(chordRing('B', 'dim7').notes.map((n) => n.name)).toEqual(['B', 'D', 'F', 'A♭'])
  })
})

describe('routes and settings', () => {
  it('resolves chord and key subjects, falling back to G', () => {
    expect(resolveChord(undefined)).toEqual({ value: { root: 'G', quality: '' }, unknown: null, replace: null })
    expect(resolveChord('G#m7')).toEqual({ value: { root: 'G#', quality: 'm7' }, unknown: null, replace: null })
    expect(resolveChord('E#dim').value.root).toBe('E#')
    expect(resolveChord('g7')).toEqual({ value: { root: 'G', quality: '7' }, unknown: null, replace: 'G7' })
    for (const bad of ['G13', 'H9', 'xyz']) expect(resolveChord(bad)).toEqual({ value: { root: 'G', quality: '' }, unknown: bad, replace: 'G' })
    expect(resolveKey('C#')).toEqual({ value: 'C#', unknown: null, replace: null })
    expect(resolveKey('f#')).toEqual({ value: 'F#', unknown: null, replace: 'F#' })
    expect(resolveKey('xyz')).toMatchObject({ value: 'G', unknown: 'xyz', replace: 'G' })
    expect(resolveKey('C##')).toMatchObject({ value: 'G', unknown: 'C##' })
  })
  it('titles Explore views', () => {
    expect(exploreTitle('chords', 'Bm7b5', 'G')).toBe('Bm7♭5 · Chord lab · Banjer')
    expect(exploreTitle('keys', 'G', 'F#')).toBe('F♯ major · Keys · Banjer')
    expect(exploreTitle('scales', 'G', 'G')).toBe('Scales · Banjer')
  })
  it('persists a valid tuning only', () => {
    expect(parseSettings(JSON.stringify({ tuning: 'double-c' })).tuning).toBe('double-c')
    expect(parseSettings(JSON.stringify({ tuning: 'banjolele' })).tuning).toBe('open-g')
    expect(parseSettings(JSON.stringify({ tuning: 7 })).tuning).toBe('open-g')
  })

  it('round-trips routes', () => {
    const routes: Route[] = [
      { view: 'explore' },
      { view: 'explore', mode: 'keys' },
      { view: 'explore', mode: 'keys', subject: 'Bb' },
      { view: 'explore', mode: 'chords', subject: 'D7' },
      { view: 'explore', mode: 'chords', subject: 'F#m7b5' },
      { view: 'settings' },
      { view: 'gallery' },
    ]
    for (const r of routes) expect(parseRoute(formatRoute(r))).toEqual(r)
    expect(parseRoute('')).toEqual({ view: 'explore' })
    expect(parseRoute('#/today')).toEqual({ view: 'explore' })
    expect(parseRoute('#/explore/bogus/G')).toEqual({ view: 'explore' })
  })
  it('parses settings defensively', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(JSON.stringify({ theme: 'dark', volume: 3, labels: 'bogus', leftHanded: true, pedal: 'x' }))).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      volume: 1,
      leftHanded: true,
    })
  })
  it('parses metronome settings defensively', () => {
    const m = (metronome: unknown) => parseSettings(JSON.stringify({ metronome })).metronome
    expect(m(undefined)).toEqual(DEFAULT_SETTINGS.metronome)
    expect(m('fast')).toEqual(DEFAULT_SETTINGS.metronome)
    expect(m(null)).toEqual(DEFAULT_SETTINGS.metronome)
    expect(m({ bpm: 120.6, beatsPerBar: 3, subdivision: 2, accent: false, open: true })).toEqual({
      bpm: 121,
      beatsPerBar: 3,
      subdivision: 2,
      accent: false,
      open: true,
    })
    expect(m({ bpm: 1000, beatsPerBar: 5, subdivision: 3, accent: 'yes', open: 1 })).toEqual({ ...DEFAULT_SETTINGS.metronome, bpm: 240 })
    expect(m({ bpm: 5 }).bpm).toBe(40)
    expect(m({ bpm: '96' }).bpm).toBe(DEFAULT_SETTINGS.metronome.bpm)
    expect(m({ beatsPerBar: '3' }).beatsPerBar).toBe(DEFAULT_SETTINGS.metronome.beatsPerBar)
  })
})

describe('quality chips', () => {
  it('groups every chord quality exactly once, each with a chip name', () => {
    const grouped = QUALITY_GROUPS.flatMap((g) => g.qualities)
    expect([...grouped].sort()).toEqual(Object.keys(CHORD_QUALITIES).sort())
    for (const q of grouped) expect(QUALITY_NAMES[q], q).toBeTruthy()
  })

  it('narrows to the lab qualities without losing or reordering any', () => {
    const lab = qualityGroups(LAB_QUALITIES).flatMap((g) => g.qualities)
    expect([...lab].sort()).toEqual([...LAB_QUALITIES].sort())
    expect(qualityGroups(LAB_QUALITIES).map((g) => g.label)).toEqual(['Triads', '7ths', 'Other'])
    expect(qualityGroups(['m', '7'])).toEqual([
      { label: 'Triads', qualities: ['m'] },
      { label: '7ths', qualities: ['7'] },
    ])
  })
})
