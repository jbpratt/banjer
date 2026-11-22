import { describe, expect, it } from 'vitest'
import { chordToneMarkers, cycleLabels, resolveLabels, scaleMarkers, shapeMarkers } from './markers.ts'
import { formatRoute, parseRoute } from './routes.ts'
import type { Route } from './routes.ts'
import { DEFAULT_SETTINGS, parseSettings } from './settings.ts'
import { degreeText, degreeWord, formulaText, keyMarkers, labCards, labMarkers, moveText } from './views/explore/lab.ts'

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
  it('spells degrees and moves', () => {
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

describe('routes and settings', () => {
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
})
