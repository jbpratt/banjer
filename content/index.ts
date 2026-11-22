import type { ChordShape, TuningId } from '../src/domain/types.ts'
import { SHAPES } from './shapes.ts'

export { SHAPES }

export function findShape(id: string): ChordShape | undefined {
  return SHAPES.find((s) => s.id === id)
}

/** The default shape for a chord symbol in a tuning: the first one listed. */
export function defaultShape(tuning: TuningId, symbol: string): ChordShape | undefined {
  return SHAPES.find((s) => s.tuning === tuning && s.symbol === symbol)
}
