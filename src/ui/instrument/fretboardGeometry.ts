/**
 * Pure fretboard geometry (no React, no DOM). Spec: docs/research/design.md §4–5.
 * All values are SVG user units in the design viewBox.
 */
import type { Position, Setup, StringNum } from '../../domain/types.ts'
import {
  DOUBLE_INLAYS,
  FIFTH_STRING_START,
  FRET_COUNT,
  INLAYS,
  STRINGS,
  fifthRaise,
  fretX,
  neckFret,
} from '../../theory/index.ts'
import type { MarkerRole } from './types.ts'

export interface BoardLayout {
  width: number
  height: number
  /** String gap. */
  s: number
  /** Right edge of the open-string name gutter; strings start here. */
  gutter: number
  /** Open-string name x. */
  nameX: number
  /** Headstock stub / open lane, x range. */
  laneStart: number
  laneEnd: number
  /** Open markers for strings 1–4 when there is no capo. */
  openX: number
  /** Nut x range. */
  nutStart: number
  nutEnd: number
  /** Fingerboard x range for a window starting at the nut. */
  x0: number
  x1: number
  /** Fingerboard start when the window starts above the nut (a > 0). */
  x0Up: number
  /** Break gap end / strike zone start. */
  breakEnd: number
  strikeEnd: number
  boardTop: number
  boardBottom: number
  rulerBaseline: number
  /** Horizontal lean of the slanted break edges (top edge is further right). */
  slant: number
  /** Gutter width kept when open names are hidden. */
  narrowGutter: number
}

export const BOARD_DESKTOP: BoardLayout = {
  width: 1200,
  height: 300,
  s: 52,
  gutter: 44,
  nameX: 22,
  laneStart: 44,
  laneEnd: 92,
  openX: 68,
  nutStart: 92,
  nutEnd: 102,
  x0: 102,
  x1: 1104,
  x0Up: 52,
  breakEnd: 1116,
  strikeEnd: 1188,
  boardTop: 24,
  boardBottom: 284,
  rulerBaseline: 17,
  slant: 8,
  narrowGutter: 12,
}

export const BOARD_COMPACT: BoardLayout = {
  width: 400,
  height: 230,
  s: 40,
  gutter: 28,
  nameX: 14,
  laneStart: 28,
  laneEnd: 60,
  openX: 44,
  nutStart: 60,
  nutEnd: 66,
  x0: 66,
  x1: 352,
  x0Up: 34,
  breakEnd: 360,
  strikeEnd: 396,
  boardTop: 18,
  boardBottom: 218,
  rulerBaseline: 13,
  slant: 5,
  narrowGutter: 8,
}

export const DEFAULT_FRETS: readonly [number, number] = [0, 12]

export interface BoardGeometry {
  layout: BoardLayout
  /** Window as requested (absolute frets, inclusive). */
  a: number
  b: number
  /** First and last fret cells drawn. Cell n lies between wires n−1 and n. */
  lo: number
  hi: number
  /** The fret wire at the board's left edge (0 = nut). */
  left: number
  /** Whether the nut, open lane, and headstock stub are drawn. */
  hasNut: boolean
  X0: number
  X1: number
  /** Marker base diameter for the whole view. */
  d: number
}

/** Clamp and order a requested window to the physical neck. */
export function normalizeWindow(frets: readonly [number, number] = DEFAULT_FRETS): [number, number] {
  let a = Math.max(0, Math.min(FRET_COUNT, Math.round(Math.min(frets[0], frets[1]))))
  let b = Math.max(0, Math.min(FRET_COUNT, Math.round(Math.max(frets[0], frets[1]))))
  if (b < 1) b = 1
  if (a >= b) a = b - 1
  return [a, b]
}

export function boardGeometry(layout: BoardLayout, frets?: readonly [number, number]): BoardGeometry {
  const [a, b] = normalizeWindow(frets)
  const hasNut = a === 0
  const left = hasNut ? 0 : a - 1
  const X0 = hasNut ? layout.x0 : layout.x0Up
  const X1 = layout.x1
  const base: BoardGeometry = { layout, a, b, lo: hasNut ? 1 : a, hi: b, left, hasNut, X0, X1, d: 0 }
  const narrowest = cellWidth(base, b)
  const d0 = 0.76 * layout.s
  const d = narrowest < d0 ? Math.max(0.5 * layout.s, 0.92 * narrowest) : d0
  return { ...base, d }
}

/** x of fret wire n (0 = nut), equal-tempered and normalized to the window. */
export function fretWireX(g: BoardGeometry, n: number): number {
  const fa = fretX(g.left)
  const fb = fretX(g.b)
  return g.X0 + ((g.X1 - g.X0) * (fretX(n) - fa)) / (fb - fa)
}

export function cellWidth(g: BoardGeometry, n: number): number {
  return fretWireX(g, n) - fretWireX(g, n - 1)
}

/** Centre of fret cell n (n ≥ 1). */
export function cellCenterX(g: BoardGeometry, n: number): number {
  return (fretWireX(g, n - 1) + fretWireX(g, n)) / 2
}

export function cellVisible(g: BoardGeometry, n: number): boolean {
  return n >= g.lo && n <= g.hi
}

export function stringY(layout: BoardLayout, string: StringNum | number): number {
  return layout.boardTop + layout.s / 2 + (string - 1) * layout.s
}

/** Frets wires drawn on the board (excluding the nut). */
export function fretWires(g: BoardGeometry): { n: number; x: number }[] {
  const out: { n: number; x: number }[] = []
  for (let n = g.hasNut ? 1 : g.left; n <= g.b; n++) out.push({ n, x: fretWireX(g, n) })
  return out
}

export interface Inlay {
  n: number
  x: number
  y: number
  r: number
}

export function inlays(g: BoardGeometry): Inlay[] {
  const { layout } = g
  const r = 0.16 * layout.s
  const out: Inlay[] = []
  for (const n of INLAYS) {
    if (!cellVisible(g, n)) continue
    const x = cellCenterX(g, n)
    if (DOUBLE_INLAYS.includes(n)) {
      out.push({ n, x, y: layout.boardTop + layout.s, r }, { n, x, y: layout.boardTop + 4 * layout.s, r })
    } else {
      out.push({ n, x, y: stringY(layout, 3), r })
    }
  }
  return out
}

/** Absolute fret numbers for the ruler: inlay frets in the window, plus the window start when a > 0. */
export function rulerFrets(g: BoardGeometry): { n: number; x: number }[] {
  const ns = new Set(INLAYS.filter((n) => cellVisible(g, n)))
  if (!g.hasNut) ns.add(g.a)
  return [...ns].sort((p, q) => p - q).map((n) => ({ n, x: cellCenterX(g, n) }))
}

export interface CapoGeometry {
  fret: number
  x: number
  width: number
  top: number
  bottom: number
  /** Shade behind the capo, rows 1–4. */
  shadeStart: number
  shadeEnd: number
}

export function capoGeometry(g: BoardGeometry, setup: Setup): CapoGeometry | null {
  const c = setup.capo
  if (c <= 0 || !cellVisible(g, c)) return null
  const { layout } = g
  const width = 12
  const x = fretWireX(g, c) - 0.3 * cellWidth(g, c)
  return {
    fret: c,
    x,
    width,
    top: layout.boardTop - 6,
    bottom: stringY(layout, 4) + layout.s / 2,
    shadeStart: g.hasNut ? layout.gutter : g.X0,
    shadeEnd: x - width / 2,
  }
}

export interface FifthStringGeometry {
  /** Pip (the 5th string's nut) centre; null when fret 5 is outside the window. */
  pip: { x: number; y: number } | null
  peg: { x: number; y: number; r: number } | null
  /** Where the 5th string line starts. */
  stringStart: number
  y: number
}

export function fifthStringGeometry(g: BoardGeometry): FifthStringGeometry {
  const { layout } = g
  const n = FIFTH_STRING_START
  const y = stringY(layout, 5)
  const boardStart = g.hasNut ? layout.gutter : g.X0
  if (n < g.left || n > g.b) return { pip: null, peg: null, stringStart: boardStart, y }
  const x = fretWireX(g, n)
  const peg = n === g.left ? null : { x: x - 0.45 * cellWidth(g, n), y: layout.boardBottom + 2, r: 0.26 * layout.s }
  return { pip: { x, y }, peg, stringStart: x, y }
}

export interface SpikeGeometry {
  fret: number
  x: number
  y: number
  size: number
  /** Shade on row 5 from the pip to the spike. */
  shadeStart: number
  shadeEnd: number
  shadeTop: number
  shadeHeight: number
}

export function spikeGeometry(g: BoardGeometry, setup: Setup): SpikeGeometry | null {
  const r = fifthRaise(setup)
  const k = FIFTH_STRING_START + r
  if (r <= 0 || !cellVisible(g, k)) return null
  const { layout } = g
  const y5 = stringY(layout, 5)
  const x = fretWireX(g, k) - 0.25 * cellWidth(g, k)
  const pipX = FIFTH_STRING_START >= g.left ? fretWireX(g, FIFTH_STRING_START) : g.X0
  return {
    fret: k,
    x,
    y: y5 + 0.2 * layout.s,
    size: 7,
    shadeStart: pipX,
    shadeEnd: x - 3.5,
    shadeTop: y5 - 0.4 * layout.s,
    shadeHeight: 0.8 * layout.s,
  }
}

/**
 * Centre of a marker for a tab position, or null when it falls outside the window.
 * Open strings sit at their nut: the open lane, the capo bar, the 5th string's pip cell,
 * or the spike.
 */
export function markerPoint(g: BoardGeometry, setup: Setup, pos: Position): { x: number; y: number } | null {
  const y = stringY(g.layout, pos.string)
  if (pos.string !== 5 && pos.fret === 0) {
    if (setup.capo <= 0) return g.hasNut ? { x: g.layout.openX, y } : null
    const capo = capoGeometry(g, setup)
    return capo ? { x: capo.x, y } : null
  }
  const n = neckFret(setup, pos)
  if (!cellVisible(g, n)) return null
  return { x: cellCenterX(g, n), y }
}

export interface HitTarget {
  pos: Position
  x: number
  y: number
  w: number
  h: number
}

/** Every selectable position in the window, string 1 first, nut to bridge. */
export function hitTargets(g: BoardGeometry, setup: Setup): HitTarget[] {
  const out: HitTarget[] = []
  const h = g.layout.s
  for (const string of STRINGS) {
    const first = string === 5 ? FIFTH_STRING_START + fifthRaise(setup) : setup.capo
    for (let neck = first; neck <= g.hi; neck++) {
      const fret = neck === first ? 0 : string === 5 ? neck : neck - setup.capo
      const pos: Position = { string, fret }
      const p = markerPoint(g, setup, pos)
      if (!p) continue
      let w: number
      if (fret === 0 && string !== 5) {
        w = setup.capo > 0 ? Math.min(cellWidth(g, setup.capo), g.layout.laneEnd - g.layout.laneStart) : g.layout.laneEnd - g.layout.laneStart
      } else {
        w = cellWidth(g, neck)
      }
      out.push({ pos, x: p.x, y: p.y, w, h })
    }
  }
  return out
}

/**
 * Keyboard navigation between hit targets. Arrows are visual: left/right follow the
 * screen, so in a left-handed view "right" moves toward the nut.
 */
export function navigateTarget(
  targets: readonly HitTarget[],
  from: number,
  key: 'up' | 'down' | 'left' | 'right',
  leftHanded = false,
): number {
  const cur = targets[from]
  if (!cur) return targets.length > 0 ? 0 : -1
  if (key === 'left' || key === 'right') {
    const towardBridge = (key === 'right') !== leftHanded
    const same = targets
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.pos.string === cur.pos.string)
      .sort((p, q) => p.t.x - q.t.x)
    const at = same.findIndex(({ i }) => i === from)
    const next = same[at + (towardBridge ? 1 : -1)]
    return next ? next.i : from
  }
  const string = cur.pos.string + (key === 'down' ? 1 : -1)
  let best = -1
  let bestDist = Infinity
  targets.forEach((t, i) => {
    if (t.pos.string !== string) return
    const dist = Math.abs(t.x - cur.x)
    if (dist < bestDist) {
      best = i
      bestDist = dist
    }
  })
  return best >= 0 ? best : from
}

/** Mirror an x coordinate for left-handed views. */
export function mirrorX(layout: BoardLayout, x: number, leftHanded: boolean): number {
  return leftHanded ? layout.width - x : x
}

/** viewBox string, narrowing the gutter when open names are hidden. */
export function boardViewBox(layout: BoardLayout, showOpenNames: boolean, leftHanded: boolean): string {
  const crop = showOpenNames ? 0 : layout.gutter - layout.narrowGutter
  const minX = leftHanded ? 0 : crop
  return `${minX} 0 ${layout.width - crop} ${layout.height}`
}

// ── Marker shapes ────────────────────────────────────────────────────────────

/** Path for a polygon with rounded corners (radius r), centred wherever its points are. */
export function roundedPolygonPath(points: readonly (readonly [number, number])[], r: number): string {
  const n = points.length
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const p = points[i]!
    const prev = points[(i - 1 + n) % n]!
    const next = points[(i + 1) % n]!
    const toPrev = unit(prev[0] - p[0], prev[1] - p[1])
    const toNext = unit(next[0] - p[0], next[1] - p[1])
    const a: [number, number] = [p[0] + toPrev[0] * r, p[1] + toPrev[1] * r]
    const b: [number, number] = [p[0] + toNext[0] * r, p[1] + toNext[1] * r]
    parts.push(`${i === 0 ? 'M' : 'L'}${fmt(a[0])} ${fmt(a[1])}`, `Q${fmt(p[0])} ${fmt(p[1])} ${fmt(b[0])} ${fmt(b[1])}`)
  }
  return parts.join(' ') + ' Z'
}

function unit(x: number, y: number): [number, number] {
  const len = Math.hypot(x, y) || 1
  return [x / len, y / len]
}

function fmt(v: number): string {
  return String(Math.round(v * 100) / 100)
}

/** Diamond (square at 45°) with the given full diagonal, centred at 0,0. */
export function diamondPoints(diagonal: number): [number, number][] {
  const h = diagonal / 2
  return [
    [0, -h],
    [h, 0],
    [0, h],
    [-h, 0],
  ]
}

/** Equilateral triangle, apex up, with its centroid at 0,0. */
export function trianglePoints(side: number): [number, number][] {
  const height = (side * Math.sqrt(3)) / 2
  return [
    [0, (-2 * height) / 3],
    [side / 2, height / 3],
    [-side / 2, height / 3],
  ]
}

/** Distance from a marker's centre to its outermost point, for halos and focus rings. */
export function markerRadius(role: MarkerRole, d: number): number {
  switch (role) {
    case 'root':
      return (0.9 * d * Math.SQRT2) / 2
    case 'chord':
      return d / 2
    case 'scale':
      return 0.45 * d + 0.05 * d
    case 'melody':
      return 0.6 * d
    case 'thumb':
      return (1.2 * d) / Math.sqrt(3)
    case 'muted':
      return 0.28 * d * Math.SQRT2
  }
}

/** Halo ring radius around an active marker: the shape's radius (scaled) + 4.5. */
export function haloRadius(role: MarkerRole, d: number, activeScale = 1.12): number {
  return Math.min(markerRadius(role, d), 0.6 * d) * activeScale + 4.5
}

/** Finger badge centre and radius relative to the marker centre (top right). */
export function badgeOffset(d: number, leftHanded = false): { dx: number; dy: number; r: number } {
  return { dx: (leftHanded ? -0.42 : 0.42) * d, dy: -0.42 * d, r: 0.26 * d }
}

/** Display form of a label: ASCII accidentals become ♯/♭ ("Bb" → "B♭", "b7" → "♭7"). */
export function displayLabel(label: string): string {
  return label.replace(/#/g, '♯').replace(/(^|[A-G])b/g, '$1♭')
}

/** Spoken form of a note name: "A#3" → "A sharp 3", "Bb" → "B flat". */
export function spokenNote(name: string): string {
  return name.replace(/^([A-G])#/, '$1 sharp ').replace(/^([A-G])b/, '$1 flat ').replace(/\s+$/, '').replace(/ (\d)/, ' $1')
}
