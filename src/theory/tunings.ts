import type { Tuning, TuningId } from '../domain/types.ts'

// MIDI reference: C3 48, D3 50, F#3 54, G3 55, A3 57, B3 59, C4 60, D4 62, E4 64, F#4 66, G4 67, A4 69.
// Per-string order is 1, 2, 3, 4, 5 (string 5 is the short drone).

export const TUNINGS: Readonly<Record<TuningId, Tuning>> = {
  'open-g': {
    id: 'open-g',
    name: 'Open G',
    short: 'gDGBD',
    strings: [62, 59, 55, 50, 67],
    homeKeys: ['G'],
  },
  'double-c': {
    id: 'double-c',
    name: 'Double C',
    short: 'gCGCD',
    strings: [62, 60, 55, 48, 67],
    homeKeys: ['C'],
  },
  sawmill: {
    id: 'sawmill',
    name: 'Sawmill (G modal)',
    short: 'gDGCD',
    strings: [62, 60, 55, 50, 67],
    homeKeys: ['G'],
  },
  'standard-c': {
    id: 'standard-c',
    name: 'Standard C',
    short: 'gCGBD',
    strings: [62, 59, 55, 48, 67],
    homeKeys: ['C'],
  },
  'double-d': {
    id: 'double-d',
    name: 'Double D',
    short: 'aDADE',
    strings: [64, 62, 57, 50, 69],
    homeKeys: ['D'],
  },
  'open-d': {
    id: 'open-d',
    name: 'Open D',
    short: 'f#DF#AD',
    strings: [62, 57, 54, 50, 66],
    homeKeys: ['D'],
  },
}

export function getTuning(id: TuningId): Tuning {
  return TUNINGS[id]
}
