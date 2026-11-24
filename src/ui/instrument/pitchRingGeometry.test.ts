import { describe, expect, it } from 'vitest'
import { RING_CENTER, RING_R, arcPath, polygonPoints, ringPoint, stepLabel } from './pitchRingGeometry.ts'

describe('pitch ring geometry', () => {
  it('puts the tonic at 12 o’clock and rises clockwise', () => {
    expect(ringPoint(0, RING_R)).toEqual({ x: RING_CENTER, y: RING_CENTER - RING_R })
    expect(ringPoint(3, RING_R)).toEqual({ x: RING_CENTER + RING_R, y: RING_CENTER })
    expect(ringPoint(6, RING_R)).toEqual({ x: RING_CENTER, y: RING_CENTER + RING_R })
    expect(ringPoint(9, RING_R)).toEqual({ x: RING_CENTER - RING_R, y: RING_CENTER })
    expect(ringPoint(12, RING_R)).toEqual(ringPoint(0, RING_R))
  })

  it('draws step arcs clockwise, with the large-arc flag past half the ring', () => {
    expect(arcPath(0, 2)).toMatch(/A96 96 0 0 1 /)
    expect(arcPath(0, 7)).toMatch(/A96 96 0 1 1 /)
    expect(arcPath(11, 12).startsWith(`M${ringPoint(11, RING_R).x} `)).toBe(true)
  })

  it('joins chord tones in stacking order', () => {
    // D7 in G: degrees 5 7 2 4 → 7, 11, 2, 5 semitones above G.
    const pts = polygonPoints([7, 11, 2, 5]).split(' ')
    expect(pts).toHaveLength(4)
    const p = ringPoint(7, RING_R)
    expect(pts[0]).toBe(`${p.x},${p.y}`)
  })

  it('labels half steps and minor-3rd gaps only', () => {
    expect([1, 2, 3, 4].map(stepLabel)).toEqual(['H', null, '1½', null])
  })
})
