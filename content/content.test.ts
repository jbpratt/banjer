import { describe, expect, it } from 'vitest'
import { validateShape } from '../src/theory/index.ts'
import { SHAPES } from './index.ts'

describe('shapes', () => {
  it('have unique ids', () => {
    const ids = SHAPES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(SHAPES.map((s) => [s.id, s] as const))('%s is playable and spells its chord', (_id, shape) => {
    expect(validateShape(shape)).toEqual([])
  })
})
