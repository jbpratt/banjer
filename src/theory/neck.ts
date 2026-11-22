import type { Midi, Position, Setup, StringNum } from '../domain/types.ts'
import { TUNINGS } from './tunings.ts'

/** Frets on a typical 5-string neck. */
export const FRET_COUNT = 22

/** The 5th string starts at this neck fret. */
export const FIFTH_STRING_START = 5

/** Neck frets with position-marker inlays. 12 is the double inlay. */
export const INLAYS: readonly number[] = [3, 5, 7, 10, 12, 15, 17, 19, 22]
export const DOUBLE_INLAYS: readonly number[] = [12]

export const STRINGS: readonly StringNum[] = [1, 2, 3, 4, 5]

export function fifthRaise(setup: Setup): number {
  return setup.fifthRaise ?? setup.capo
}

/** Open-string pitch for a string under this setup (capo and spike applied). */
export function openMidi(setup: Setup, string: StringNum): Midi {
  const base = TUNINGS[setup.tuning].strings[string - 1]!
  return string === 5 ? base + fifthRaise(setup) : base + setup.capo
}

/**
 * Sounding pitch of a tab position.
 * A fretted 5th string sounds at its neck fret regardless of the spike.
 */
export function soundingMidi(setup: Setup, pos: Position): Midi {
  if (pos.string === 5) {
    const base = TUNINGS[setup.tuning].strings[4]
    return pos.fret === 0 ? base + fifthRaise(setup) : base + (pos.fret - FIFTH_STRING_START)
  }
  return openMidi(setup, pos.string) + pos.fret
}

/**
 * Absolute neck fret where a position is played, for drawing.
 * For an open string this is its nut: 0, the capo, or the 5th-string nut/spike.
 */
export function neckFret(setup: Setup, pos: Position): number {
  if (pos.string === 5) return pos.fret === 0 ? FIFTH_STRING_START + fifthRaise(setup) : pos.fret
  return setup.capo + pos.fret
}

/** Whether a tab position exists on this setup's neck. */
export function isValidPosition(setup: Setup, pos: Position, maxFret = FRET_COUNT): boolean {
  if (!Number.isInteger(pos.fret) || pos.fret < 0) return false
  if (pos.string === 5) {
    if (pos.fret === 0) return FIFTH_STRING_START + fifthRaise(setup) <= maxFret
    return pos.fret > FIFTH_STRING_START + fifthRaise(setup) && pos.fret <= maxFret
  }
  return setup.capo + pos.fret <= maxFret
}

/**
 * Every position whose neck fret falls in `[lo, hi]` (absolute, inclusive) and whose
 * sounding pitch passes `keep`. Open strings count when their nut is in range.
 */
export function positionsWhere(
  setup: Setup,
  [lo, hi]: readonly [number, number],
  keep: (midi: Midi) => boolean,
): Position[] {
  const out: Position[] = []
  for (const string of STRINGS) {
    const first = string === 5 ? FIFTH_STRING_START + fifthRaise(setup) : setup.capo
    for (let neck = Math.max(lo, first); neck <= Math.min(hi, FRET_COUNT); neck++) {
      const fret = neck === first ? 0 : string === 5 ? neck : neck - setup.capo
      const pos: Position = { string, fret }
      if (keep(soundingMidi(setup, pos))) out.push(pos)
    }
  }
  return out
}

/** Every position that sounds exactly `midi`. */
export function positionsForMidi(setup: Setup, midi: Midi, frets: readonly [number, number] = [0, FRET_COUNT]): Position[] {
  return positionsWhere(setup, frets, (m) => m === midi)
}

/**
 * Relative x-coordinate (0 at nut, 1 at bridge) of a neck fret, equal-tempered.
 * Useful for physically plausible fretboard drawing.
 */
export function fretX(fret: number): number {
  return 1 - 2 ** (-fret / 12)
}
