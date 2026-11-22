import type { ChordShape, StringNum } from '../domain/types.ts'
import { parseChord, shapeMidis } from './chords.ts'
import { pcOf, pitchClass } from './pitch.ts'
import { isValidPosition } from './neck.ts'

export interface Issue {
  severity: 'error' | 'warning'
  message: string
}

/** Check that a chord shape is playable and actually spells its symbol. */
export function validateShape(shape: ChordShape): Issue[] {
  const issues: Issue[] = []
  const setup = { tuning: shape.tuning, capo: 0 }
  shape.frets.forEach((fret, i) => {
    const string = (i + 1) as StringNum
    if (fret !== null && !isValidPosition(setup, { string, fret })) {
      issues.push({ severity: 'error', message: `no such position: string ${string} fret ${fret}` })
    }
  })
  if (!parseChord(shape.symbol)) {
    issues.push({ severity: 'error', message: `unknown chord symbol: ${shape.symbol}` })
  } else {
    // Strings 1–4 may only sound chord tones. The 5th string is a drone: it may sound a
    // non-chord tone, but when it is a chord tone it counts toward completing the chord.
    const chord = parseChord(shape.symbol)!
    const tones = new Set(chord.pitchClasses)
    const fifth = pitchClass(pcOf(chord.root) + 7)
    const all = shapeMidis(setup, shape).map(pitchClass)
    const fourMidis = shapeMidis(setup, { ...shape, frets: [...shape.frets.slice(0, 4), null] as unknown as ChordShape['frets'] })
    const extra = fourMidis.map(pitchClass).filter((pc) => !tones.has(pc))
    const missing = [...tones].filter((pc) => !all.includes(pc) && !(pc === fifth && tones.size > 2))
    if (fourMidis.length === 0) {
      issues.push({ severity: 'error', message: 'no strings played' })
    } else if (extra.length || missing.length) {
      issues.push({ severity: 'error', message: `does not spell ${shape.symbol}` })
    }
  }
  return issues
}
