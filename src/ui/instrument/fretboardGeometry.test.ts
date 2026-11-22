import { describe, expect, it } from 'vitest'
import type { Setup } from '../../domain/types.ts'
import {
  BOARD_COMPACT,
  BOARD_DESKTOP,
  BOARD_MEDIUM,
  MIN_TEXT_PX,
  boardGeometry,
  boardViewBox,
  capoGeometry,
  cellCenterX,
  cellWidth,
  chooseBoard,
  displayLabel,
  fifthStringGeometry,
  fretWireX,
  fretWires,
  haloRadius,
  hitTargets,
  inlays,
  markerPoint,
  markerRadius,
  mirrorX,
  navigateTarget,
  normalizeWindow,
  roundedPolygonPath,
  rulerFrets,
  spikeGeometry,
  spokenLabel,
  spokenNote,
  stringY,
  targetName,
  trianglePoints,
} from './fretboardGeometry.ts'

const openG: Setup = { tuning: 'open-g', capo: 0 }
const capo2: Setup = { tuning: 'open-g', capo: 2 }

describe('fret spacing', () => {
  const g = boardGeometry(BOARD_DESKTOP, [0, 12])

  it('maps the window onto X0–X1', () => {
    expect(fretWireX(g, 0)).toBeCloseTo(102)
    expect(fretWireX(g, 12)).toBeCloseTo(1104)
  })

  it('matches the spec cell widths (desktop [0,12])', () => {
    expect(cellWidth(g, 1)).toBeCloseTo(112.5, 0)
    expect(cellWidth(g, 12)).toBeCloseTo(59.6, 0)
  })

  it('matches the spec cell widths (compact [0,7])', () => {
    const c = boardGeometry(BOARD_COMPACT, [0, 7])
    expect(cellWidth(c, 1)).toBeCloseTo(48.3, 0)
    expect(cellWidth(c, 7)).toBeCloseTo(34.1, 0)
  })

  it('cells shrink monotonically toward the bridge', () => {
    for (let n = 2; n <= 12; n++) expect(cellWidth(g, n)).toBeLessThan(cellWidth(g, n - 1))
  })

  it('centres a cell between its wires', () => {
    expect(cellCenterX(g, 1)).toBeCloseTo(102 + cellWidth(g, 1) / 2)
  })

  it('uses the base marker diameter when cells are wide enough', () => {
    expect(g.d).toBeCloseTo(0.76 * 52)
  })

  it('shrinks the marker for the full neck', () => {
    const full = boardGeometry(BOARD_DESKTOP, [0, 22])
    expect(cellWidth(full, 22)).toBeCloseTo(23, 0)
    expect(full.d).toBeCloseTo(Math.max(26, 0.92 * cellWidth(full, 22)))
  })

  it('normalizes bad windows', () => {
    expect(normalizeWindow([12, 0])).toEqual([0, 12])
    expect(normalizeWindow([0, 40])).toEqual([0, 22])
    expect(normalizeWindow([5, 5])).toEqual([4, 5])
  })
})

describe('windows above the nut', () => {
  const g = boardGeometry(BOARD_DESKTOP, [5, 12])

  it('drops the nut and starts the board at x 52 with cell a visible', () => {
    expect(g.hasNut).toBe(false)
    expect(g.X0).toBe(52)
    expect(g.lo).toBe(5)
    expect(fretWireX(g, 4)).toBeCloseTo(52)
    expect(fretWires(g)[0]).toEqual({ n: 4, x: 52 })
  })

  it('shows the window start on the ruler', () => {
    expect(rulerFrets(boardGeometry(BOARD_DESKTOP, [6, 12])).map((r) => r.n)).toEqual([6, 7, 10, 12])
    expect(rulerFrets(g).map((r) => r.n)).toEqual([5, 7, 10, 12])
  })

  it('has no open lane for open strings 1–4', () => {
    expect(markerPoint(g, openG, { string: 3, fret: 0 })).toBeNull()
  })
})

describe('strings, inlays, ruler', () => {
  it('places strings per spec', () => {
    expect([1, 2, 3, 4, 5].map((s) => stringY(BOARD_DESKTOP, s))).toEqual([50, 102, 154, 206, 258])
    expect([1, 2, 3, 4, 5].map((s) => stringY(BOARD_COMPACT, s))).toEqual([38, 78, 118, 158, 198])
  })

  it('draws single inlays on string 3 and a double at 12', () => {
    const g = boardGeometry(BOARD_DESKTOP, [0, 12])
    const all = inlays(g)
    expect(all.map((i) => i.n)).toEqual([3, 5, 7, 10, 12, 12])
    expect(all.find((i) => i.n === 7)?.y).toBe(154)
    expect(all.filter((i) => i.n === 12).map((i) => i.y)).toEqual([76, 232])
    expect(all[0]?.r).toBeCloseTo(8.32)
  })

  it('ruler lists inlay frets in the window', () => {
    expect(rulerFrets(boardGeometry(BOARD_DESKTOP, [0, 12])).map((r) => r.n)).toEqual([3, 5, 7, 10, 12])
  })
})

describe('marker coordinates', () => {
  const g = boardGeometry(BOARD_DESKTOP, [0, 12])

  it('puts open strings 1–4 in the open lane', () => {
    expect(markerPoint(g, openG, { string: 3, fret: 0 })).toEqual({ x: 68, y: 154 })
  })

  it('puts fretted notes at the cell centre', () => {
    expect(markerPoint(g, openG, { string: 1, fret: 2 })?.x).toBeCloseTo(cellCenterX(g, 2))
  })

  it('puts the open 5th string in the cell left of its pip', () => {
    expect(markerPoint(g, openG, { string: 5, fret: 0 })).toEqual({ x: cellCenterX(g, 5), y: 258 })
  })

  it('moves open markers onto the capo and spike', () => {
    const capo = capoGeometry(g, capo2)!
    expect(markerPoint(g, capo2, { string: 1, fret: 0 })?.x).toBeCloseTo(capo.x)
    expect(markerPoint(g, capo2, { string: 5, fret: 0 })?.x).toBeCloseTo(cellCenterX(g, 7))
    // Strings 1–4 are capo-relative; the 5th string is absolute.
    expect(markerPoint(g, capo2, { string: 3, fret: 2 })?.x).toBeCloseTo(cellCenterX(g, 4))
    expect(markerPoint(g, capo2, { string: 5, fret: 9 })?.x).toBeCloseTo(cellCenterX(g, 9))
  })

  it('returns null outside the window', () => {
    expect(markerPoint(g, openG, { string: 1, fret: 15 })).toBeNull()
  })
})

describe('capo, spike, fifth string', () => {
  const g = boardGeometry(BOARD_DESKTOP, [0, 12])

  it('draws the capo bar over strings 1–4 only', () => {
    const c = capoGeometry(g, capo2)!
    expect(c.x).toBeCloseTo(fretWireX(g, 2) - 0.3 * cellWidth(g, 2))
    expect(c.top).toBe(18)
    expect(c.bottom).toBe(232)
    expect(c.shadeStart).toBe(44)
    expect(c.shadeEnd).toBeCloseTo(c.x - 6)
    expect(capoGeometry(g, openG)).toBeNull()
  })

  it('spikes the 5th string at 5 + raise, defaulting to the capo', () => {
    const s = spikeGeometry(g, capo2)!
    expect(s.fret).toBe(7)
    expect(s.x).toBeCloseTo(fretWireX(g, 7) - 0.25 * cellWidth(g, 7))
    expect(s.y).toBeCloseTo(258 + 10.4)
    expect(spikeGeometry(g, { tuning: 'open-g', capo: 2, fifthRaise: 0 })).toBeNull()
    expect(spikeGeometry(g, { tuning: 'open-g', capo: 0, fifthRaise: 3 })?.fret).toBe(8)
  })

  it('puts the 5th-string pip at fret 5 and the peg below the board', () => {
    const f = fifthStringGeometry(g)
    expect(f.pip?.x).toBeCloseTo(fretWireX(g, 5))
    expect(f.peg?.y).toBe(286)
    expect(f.peg?.r).toBeCloseTo(13.52)
    expect(f.peg!.x).toBeLessThan(f.pip!.x)
  })
})

describe('hit targets and navigation', () => {
  const g = boardGeometry(BOARD_DESKTOP, [0, 12])
  const targets = hitTargets(g, openG)

  it('covers every position in range', () => {
    // Strings 1–4: frets 0–12 (13 each). String 5: open + 6–12.
    expect(targets).toHaveLength(13 * 4 + 8)
    expect(targets.filter((t) => t.pos.string === 5).map((t) => t.pos.fret)).toEqual([0, 6, 7, 8, 9, 10, 11, 12])
  })

  it('respects the capo', () => {
    const t = hitTargets(g, capo2)
    expect(t.filter((x) => x.pos.string === 1).map((x) => x.pos.fret)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(t.filter((x) => x.pos.string === 5).map((x) => x.pos.fret)).toEqual([0, 8, 9, 10, 11, 12])
  })

  it('moves along a string and across strings', () => {
    const i = targets.findIndex((t) => t.pos.string === 1 && t.pos.fret === 0)
    const right = targets[navigateTarget(targets, i, 'right')]!
    expect(right.pos).toEqual({ string: 1, fret: 1 })
    expect(targets[navigateTarget(targets, i, 'down')]!.pos).toEqual({ string: 2, fret: 0 })
    expect(navigateTarget(targets, i, 'up')).toBe(i)
    expect(navigateTarget(targets, i, 'left')).toBe(i)
  })

  it('flips left/right for left-handed views', () => {
    const i = targets.findIndex((t) => t.pos.string === 1 && t.pos.fret === 3)
    expect(targets[navigateTarget(targets, i, 'left', true)]!.pos.fret).toBe(4)
    expect(targets[navigateTarget(targets, i, 'right', true)]!.pos.fret).toBe(2)
  })

  it('snaps to the nearest position on the short 5th string', () => {
    const i = targets.findIndex((t) => t.pos.string === 4 && t.pos.fret === 1)
    expect(targets[navigateTarget(targets, i, 'down')]!.pos).toEqual({ string: 5, fret: 0 })
  })
})

describe('mirroring and viewBox', () => {
  it('mirrors x only when left-handed', () => {
    expect(mirrorX(BOARD_DESKTOP, 68, false)).toBe(68)
    expect(mirrorX(BOARD_DESKTOP, 68, true)).toBe(1132)
  })

  it('narrows the gutter when names are hidden', () => {
    expect(boardViewBox(BOARD_DESKTOP, true, false)).toBe('0 0 1200 300')
    expect(boardViewBox(BOARD_DESKTOP, false, false)).toBe('32 0 1168 300')
    expect(boardViewBox(BOARD_DESKTOP, false, true)).toBe('0 0 1168 300')
  })
})

describe('marker shapes and labels', () => {
  it('centres the triangle on its centroid', () => {
    const pts = trianglePoints(12)
    const cy = pts.reduce((s, p) => s + p[1], 0) / 3
    expect(cy).toBeCloseTo(0)
  })

  it('builds a closed rounded path', () => {
    const p = roundedPolygonPath(trianglePoints(10), 1)
    expect(p.startsWith('M')).toBe(true)
    expect(p.endsWith('Z')).toBe(true)
  })

  it('sizes halos from the shape', () => {
    expect(markerRadius('chord', 40)).toBe(20)
    expect(haloRadius('chord', 40)).toBeCloseTo(20 * 1.12 + 4.5)
    expect(markerRadius('melody', 40)).toBeGreaterThan(markerRadius('chord', 40))
  })

  it('formats accidentals for display and speech', () => {
    expect(displayLabel('Bb')).toBe('B♭')
    expect(displayLabel('b7')).toBe('♭7')
    expect(displayLabel('C#')).toBe('C♯')
    expect(displayLabel('B')).toBe('B')
    expect(displayLabel('Bm7b5')).toBe('Bm7♭5')
    expect(displayLabel('bb7')).toBe('♭♭7')
    expect(spokenNote('A#3')).toBe('A sharp 3')
    expect(spokenNote('Bb')).toBe('B flat')
    expect(spokenNote('G3')).toBe('G3')
  })
})

describe('chooseBoard', () => {
  const lab: [number, number] = [0, 15]

  it('uses the desktop board when it renders text at full size', () => {
    expect(chooseBoard(1152, lab)).toMatchObject({ layout: BOARD_DESKTOP, scroll: false })
  })

  it('never squeezes the desktop board below readable text (the old 768px bug)', () => {
    const c = chooseBoard(720, lab)
    expect(c.scroll || c.layout !== BOARD_DESKTOP).toBe(true)
    expect(c.width / c.layout.width).toBeGreaterThanOrEqual(0.85)
    expect(chooseBoard(976, lab).layout).toBe(BOARD_MEDIUM)
  })

  it('keeps every fitted choice at ≥ 12px text', () => {
    for (let w = 360; w <= 1400; w += 20) {
      for (const frets of [lab, [0, 12], [0, 7], [5, 12]] as [number, number][]) {
        const c = chooseBoard(w, frets)
        const g = boardGeometry(c.layout, frets)
        const scale = c.width / c.layout.width
        expect(Math.min(14, 0.42 * g.d) * scale).toBeGreaterThanOrEqual(MIN_TEXT_PX - 1e-9)
      }
    }
  })

  it('scrolls on phones, with tappable cells', () => {
    const c = chooseBoard(343, lab)
    expect(c.scroll).toBe(true)
    expect(c.width).toBeGreaterThan(343)
    const g = boardGeometry(c.layout, lab)
    expect((cellWidth(g, 15) * c.width) / c.layout.width).toBeGreaterThanOrEqual(36 - 0.5)
  })

  it('fits a short window on a phone without scrolling', () => {
    expect(chooseBoard(400, [0, 5]).scroll).toBe(false)
  })

  it('accounts for the root font size (ruler numerals are 0.875rem)', () => {
    expect(chooseBoard(1152, lab, 2, 10).layout).not.toBe(BOARD_DESKTOP)
  })
})

describe('accessible names for positions', () => {
  it('speaks labels', () => {
    expect(spokenLabel('B♭')).toBe('B flat')
    expect(spokenLabel('F#')).toBe('F sharp')
    expect(spokenLabel('♭7')).toBe('flat 7th')
    expect(spokenLabel('b3')).toBe('flat 3rd')
    expect(spokenLabel('R')).toBe('root')
    expect(spokenLabel('5')).toBe('5th')
    expect(spokenLabel('2')).toBe('2nd')
    expect(spokenLabel('𝄫7')).toBe('double flat 7th')
  })

  it('spells from the marker, with degree and state', () => {
    expect(targetName(1, 3, 'F4', { pos: { string: 1, fret: 3 }, role: 'chord', label: '♭7', spoken: 'F' })).toBe(
      'string 1, fret 3, F 4, flat 7th, chord tone',
    )
    expect(
      targetName(2, 3, 'A#3', { pos: { string: 2, fret: 3 }, role: 'chord', label: 'B♭', state: 'dim', stateText: 'other position' }),
    ).toBe('string 2, fret 3, B flat 3, chord tone, other position')
    expect(targetName(3, 0, 'G3', { pos: { string: 3, fret: 0 }, role: 'root', label: 'R' })).toBe('string 3, open, G 3, root')
    expect(targetName(1, 1, 'D#4', undefined)).toBe('string 1, fret 1, D sharp 4')
    expect(targetName(1, 1, 'D#4', { pos: { string: 1, fret: 1 }, role: 'chord', spoken: 'E flat', state: 'next' })).toBe(
      'string 1, fret 1, E flat 4, chord tone, ghost',
    )
  })
})
