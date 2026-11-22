import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { StringNum } from '../../domain/types.ts'
import { STRINGS, neckFret, noteName, openMidi, pitchClass, soundingMidi, spell } from '../../theory/index.ts'
import {
  BOARD_DESKTOP,
  boardGeometry,
  boardViewBox,
  capoGeometry,
  chooseBoard,
  displayLabel,
  fifthStringGeometry,
  fretWireX,
  fretWires,
  hitTargets,
  inlays,
  markerPoint,
  markerRadius,
  mirrorX,
  navigateTarget,
  rulerFrets,
  spikeGeometry,
  stringY,
  targetName,
  type BoardGeometry,
} from './fretboardGeometry.ts'
import { useElementWidth, usePrefersReducedMotion } from './hooks.ts'
import { MarkerGlyph } from './Marker.tsx'
import { RoleLegend } from './RoleLegend.tsx'
import type { FretMarker, FretboardProps } from './types.ts'
import styles from './Fretboard.module.css'

const STRING_WIDTH: Readonly<Record<StringNum, string>> = {
  1: 'var(--fb-string-1-width)',
  2: 'var(--fb-string-2-width)',
  3: 'var(--fb-string-3-width)',
  4: 'var(--fb-string-4-width)',
  5: 'var(--fb-string-5-width)',
}

const Z_ORDER: Record<string, number> = { dim: 0, rest: 1, next: 2, active: 3 }
const z = (m: FretMarker) => Z_ORDER[m.state ?? 'rest'] ?? 1


/** x of the board's slanted right edge at height y. */
function rightEdgeAt(g: BoardGeometry, y: number): number {
  const { layout } = g
  return g.X1 + 2 + (layout.slant * (layout.boardBottom - y)) / (layout.boardBottom - layout.boardTop)
}

/** x of the board's left edge at height y (slanted when the window starts above the nut). */
function leftEdgeAt(g: BoardGeometry, y: number): number {
  const { layout } = g
  if (g.hasNut) return layout.nutStart
  return g.X0 - (layout.slant * (y - layout.boardTop)) / (layout.boardBottom - layout.boardTop)
}

function strikeEdgeAt(g: BoardGeometry, y: number): number {
  const { layout } = g
  return layout.breakEnd + (layout.slant * (layout.boardBottom - y)) / (layout.boardBottom - layout.boardTop)
}

export function Fretboard({
  setup,
  markers,
  frets,
  leftHanded = false,
  showOpenNames = true,
  focus,
  onSelect,
  label,
  className,
}: FretboardProps) {
  const figRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const measured = useElementWidth(figRef)
  const labelChars = Math.max(0, ...markers.map((m) => (m.label && m.role !== 'muted' && m.state !== 'dim' ? displayLabel(m.label).length : 0)))
  // Until measured, draw the desktop board at 100% (the pre-measure default).
  const choice = measured.width
    ? chooseBoard(measured.width, frets, labelChars, measured.rem)
    : { layout: BOARD_DESKTOP, scroll: false, width: 0 }
  const { layout, scroll } = choice
  const g = useMemo(() => boardGeometry(layout, frets), [layout, frets])
  const uid = useId().replace(/:/g, '')
  const gradId = `fb-wood-${uid}`
  const { s, boardTop, boardBottom, width: W } = layout
  const X = (x: number) => mirrorX(layout, x, leftHanded)
  const mirror = leftHanded ? `matrix(-1 0 0 1 ${W} 0)` : undefined
  const d = g.d

  const capo = capoGeometry(g, setup)
  const spike = spikeGeometry(g, setup)
  const fifth = fifthStringGeometry(g)
  const boardLeft = g.hasNut ? layout.nutStart : g.X0

  const mutedStrings = new Set(markers.filter((m) => m.role === 'muted').map((m) => m.pos.string))

  const placed = markers
    .map((m, i) => ({ m, i, p: markerPoint(g, setup, m.pos) }))
    .filter((e): e is { m: FretMarker; i: number; p: { x: number; y: number } } => e.p !== null)
    .sort((a, b) => z(a.m) - z(b.m))

  // Hit targets (explorer mode).
  const targets = useMemo(() => (onSelect ? hitTargets(g, setup) : []), [onSelect, g, setup])
  const [cursor, setCursor] = useState(0)
  const targetRefs = useRef<(SVGGElement | null)[]>([])
  const cur = Math.min(cursor, Math.max(0, targets.length - 1))

  const onTargetKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    const dir =
      e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : null
    if (dir) {
      e.preventDefault()
      const next = navigateTarget(targets, i, dir, leftHanded)
      if (next >= 0) {
        setCursor(next)
        const el = targetRefs.current[next]
        el?.focus({ preventScroll: true })
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const t = targets[i]
      if (t) onSelect?.(t.pos)
    }
  }

  const rolesShown = [...new Set(markers.map((m) => m.role))]
  // Several markers can share a cell (a dim shape under the selected one): name the most prominent.
  const markerAt = (string: number, fret: number) =>
    markers.filter((m) => m.pos.string === string && m.pos.fret === fret).sort((p, q) => z(q) - z(p))[0]

  // On a scrolling board, keep the interesting frets in view: [lo, hi] neck frets.
  const focusRange = useMemo((): readonly [number, number] | undefined => {
    if (focus) return focus
    const active = markers.filter((m) => m.state === 'active')
    const bold = markers.some((m) => m.state === 'dim') ? markers.filter((m) => m.state === undefined) : []
    const set = active.length > 0 ? active : bold
    if (set.length === 0) return undefined
    // The 5th string's open drone sits at its peg wherever the shape is; leave it out.
    const ns = set.filter((m) => m.pos.string !== 5 || m.pos.fret > 0).map((m) => neckFret(setup, m.pos))
    if (ns.length === 0) return undefined
    const lo = Math.min(...ns)
    const hi = Math.max(...ns)
    return hi - lo <= 5 ? [lo, hi] : undefined
  }, [focus, markers, setup])

  const crop = showOpenNames ? 0 : layout.gutter - layout.narrowGutter
  const vbMinX = leftHanded ? 0 : crop
  const vbWidth = W - crop
  // Screen-space span of a fret range, as fractions of the board's width. Fret 0 runs from
  // the board's outer edge, so the open-string names come into view with the nut.
  const frac = (x: number) => (X(x) - vbMinX) / vbWidth
  const fretEdges = (n: number): [number, number] => {
    if (n <= 0 || n < g.lo) return g.hasNut ? [0, layout.nutEnd] : [g.X0, g.X0]
    const k = Math.min(g.hi, Math.round(n))
    return [fretWireX(g, k - 1), fretWireX(g, k)]
  }
  const span = focusRange && [...fretEdges(focusRange[0]), ...fretEdges(focusRange[1])].map(frac)
  // Where to scroll, as a fraction of the track. Worked out here rather than in the effect so
  // a snap point can sit there too: the board's proximity snapping would otherwise pull a
  // shape near the nut back to fret 0 and clip it.
  const focusLeft = useMemo(() => {
    if (!scroll || !span || !choice.width || !measured.width) return undefined
    const sw = choice.width
    const cw = measured.width
    const pad = 48
    const lo = Math.min(...span) * sw
    const hi = Math.max(...span) * sw
    // Centre the range, but never push its start (or, if it fits, its end) out of view. Near
    // the nut four frets fill a phone, so the padding shrinks before the shape is clipped.
    const centred = (lo + hi) / 2 - cw / 2
    const room = cw - (hi - lo)
    const p = Math.min(pad, room / 2)
    const left = room >= 0 ? Math.min(lo - p, Math.max(hi + p - cw, centred)) : lo - pad
    return Math.min(Math.max(0, left), sw - cw) / sw
    // span is fresh each render; its endpoints are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroll, span?.[0], span?.[1], span?.[2], span?.[3], choice.width, measured.width])
  const scrolledOnce = useRef(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || focusLeft === undefined) return
    el.scrollTo({ left: focusLeft * el.scrollWidth, behavior: scrolledOnce.current && !reduced ? 'smooth' : 'auto' })
    scrolledOnce.current = true
  }, [focusLeft, reduced])

  return (
    <figure ref={figRef} className={[styles.figure, className].filter(Boolean).join(' ')}>
      {rolesShown.length > 0 && <RoleLegend roles={rolesShown} className={styles.legend} />}
      <div ref={scrollRef} className={styles.scroller} data-scroll={scroll || undefined}>
      <div className={styles.track} style={scroll ? { minInlineSize: `${choice.width}px` } : undefined}>
      <svg
        className={styles.svg}
        viewBox={boardViewBox(layout, showOpenNames, leftHanded)}
        preserveAspectRatio="xMidYMid meet"
        role={onSelect ? 'group' : 'img'}
        aria-roledescription={onSelect ? 'fretboard' : undefined}
        aria-label={label}
      >
        <title>{label}</title>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--fb-wood-edge)" />
            <stop offset="0.12" stopColor="var(--fb-wood)" />
            <stop offset="0.88" stopColor="var(--fb-wood)" />
            <stop offset="1" stopColor="var(--fb-wood-edge)" />
          </linearGradient>
        </defs>

        <g transform={mirror} aria-hidden="true">
          {/* 1. Board, headstock stub, strike zone, binding */}
          {g.hasNut && (
            <rect className={styles.edge} x={layout.laneStart} y={boardTop} width={layout.nutStart - layout.laneStart} height={boardBottom - boardTop} />
          )}
          <polygon
            fill={`url(#${gradId})`}
            points={[
              [boardLeft, boardTop],
              [rightEdgeAt(g, boardTop), boardTop],
              [rightEdgeAt(g, boardBottom), boardBottom],
              [g.hasNut ? boardLeft : boardLeft - layout.slant, boardBottom],
            ]
              .map((p) => p.join(','))
              .join(' ')}
          />
          <polygon
            className={styles.edge}
            points={[
              [strikeEdgeAt(g, boardTop), boardTop],
              [layout.strikeEnd, boardTop],
              [layout.strikeEnd, boardBottom],
              [strikeEdgeAt(g, boardBottom), boardBottom],
            ]
              .map((p) => p.join(','))
              .join(' ')}
          />
          {[boardTop + 1, boardBottom - 1].map((y) => (
            <g key={y} className={styles.binding}>
              <line x1={leftEdgeAt(g, y)} x2={rightEdgeAt(g, y)} y1={y} y2={y} />
              <line x1={strikeEdgeAt(g, y)} x2={layout.strikeEnd} y1={y} y2={y} />
            </g>
          ))}

          {/* 2. Inlays */}
          {inlays(g).map((p) => (
            <circle key={`${p.n}-${p.y}`} className={styles.inlay} cx={p.x} cy={p.y} r={p.r} />
          ))}

          {/* 3. Frets */}
          {fretWires(g).map(({ n, x }) => (
            <g key={n}>
              <rect className={styles.fret} x={x - 1.5} y={boardTop + 1} width={3} height={boardBottom - boardTop - 2} />
              <rect className={styles.fretHi} x={x - 1.5} y={boardTop + 1} width={1} height={boardBottom - boardTop - 2} />
            </g>
          ))}

          {/* 4. Nut */}
          {g.hasNut && (
            <rect className={styles.nut} x={layout.nutStart} y={boardTop} width={layout.nutEnd - layout.nutStart} height={boardBottom - boardTop} />
          )}

          {/* 5. Fifth-string peg and pip */}
          {fifth.peg && fifth.pip && (
            <>
              <line className={styles.string} x1={fifth.peg.x} y1={fifth.peg.y} x2={fifth.pip.x} y2={fifth.pip.y} strokeWidth={2.25} />
              <circle className={styles.peg} cx={fifth.peg.x} cy={fifth.peg.y} r={fifth.peg.r} />
            </>
          )}

          {/* 6. Strings, broken at the break */}
          {STRINGS.map((string) => {
            const y = stringY(layout, string)
            const x1 = string === 5 ? Math.max(fifth.stringStart, leftEdgeAt(g, y)) : g.hasNut ? layout.gutter : leftEdgeAt(g, y)
            const cls = [styles.string, string === 4 && styles.wound, mutedStrings.has(string) && styles.mutedString].filter(Boolean).join(' ')
            return (
              <g key={string} className={cls} style={{ strokeWidth: STRING_WIDTH[string] }}>
                <line x1={x1} x2={rightEdgeAt(g, y)} y1={y} y2={y} />
                <line x1={strikeEdgeAt(g, y)} x2={layout.strikeEnd} y1={y} y2={y} />
              </g>
            )
          })}
          {fifth.pip && (
            <rect className={styles.nut} x={fifth.pip.x - 4} y={fifth.pip.y - 6} width={8} height={12} rx={2} />
          )}

          {/* 7. Capo */}
          {capo && (
            <>
              <rect
                className={styles.shade}
                x={capo.shadeStart}
                y={boardTop}
                width={Math.max(0, capo.shadeEnd - capo.shadeStart)}
                height={stringY(layout, 4) + s / 2 - boardTop}
              />
              <rect
                className={styles.capo}
                x={capo.x - capo.width / 2}
                y={capo.top}
                width={capo.width}
                height={capo.bottom - capo.top}
                rx={6}
              />
            </>
          )}

          {/* 8. Spike */}
          {spike && (
            <>
              <rect
                className={styles.shade}
                x={spike.shadeStart}
                y={spike.shadeTop}
                width={Math.max(0, spike.shadeEnd - spike.shadeStart)}
                height={spike.shadeHeight}
              />
              <line className={styles.spikeStem} x1={spike.x} x2={spike.x} y1={stringY(layout, 5)} y2={spike.y} />
              <rect className={styles.spike} x={spike.x - 3.5} y={spike.y - 3.5} width={7} height={7} rx={2} />
            </>
          )}
        </g>

        {/* Text: never mirrored */}
        <g aria-hidden="true">
          {showOpenNames &&
            STRINGS.map((string) => {
              const name = displayLabel(spell(pitchClass(openMidi(setup, string))))
              return (
                <text
                  key={string}
                  className={styles.openName}
                  x={X(layout.nameX)}
                  y={stringY(layout, string)}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {string === 5 ? name.toLowerCase() : name}
                </text>
              )
            })}
          {rulerFrets(g).map(({ n, x }) => (
            <text key={n} className={styles.ruler} x={X(x)} y={layout.rulerBaseline} textAnchor="middle">
              {n}
            </text>
          ))}
        </g>

        {/* 10. Markers: dim, rest, next, active */}
        <g aria-hidden="true">
          {placed.map(({ m, i, p }) => (
            <g key={i} transform={`translate(${X(p.x)} ${p.y})`}>
              <MarkerGlyph role={m.role} d={d} state={m.state} label={m.label} finger={m.finger} leftHanded={leftHanded} />
            </g>
          ))}
        </g>

        {/* 11. Hit targets and keyboard cursor */}
        {onSelect &&
          targets.map((t, i) => {
            const mk = markerAt(t.pos.string, t.pos.fret)
            const name = targetName(t.pos.string, t.pos.fret, noteName(soundingMidi(setup, t.pos)), mk)
            const ringR = (mk ? markerRadius(mk.role, d) : d / 2) + 6
            return (
              <g
                key={`${t.pos.string}-${t.pos.fret}`}
                ref={(el) => {
                  targetRefs.current[i] = el
                }}
                className={styles.target}
                role="button"
                tabIndex={i === cur ? 0 : -1}
                aria-label={name}
                onClick={() => {
                  setCursor(i)
                  onSelect(t.pos)
                }}
                onFocus={() => setCursor(i)}
                onKeyDown={(e) => onTargetKey(e, i)}
              >
                <rect className={styles.hit} x={X(t.x) - t.w / 2} y={t.y - t.h / 2} width={t.w} height={t.h} />
                <circle className={styles.cursor} cx={X(t.x)} cy={t.y} r={ringR} />
              </g>
            )
          })}
      </svg>
      {scroll && (
        <div className={styles.snaps} aria-hidden="true">
          {[{ n: 0, x: g.hasNut ? layout.gutter : g.X0 }, ...rulerFrets(g)].map(({ n, x }) => (
            <span key={n} style={{ insetInlineStart: `${((mirrorX(layout, x, leftHanded) - vbMinX) / vbWidth) * 100}%` }} />
          ))}
          {/* Snapping aligns a point to the scroll padding (the fade), so offset by it. */}
          {focusLeft !== undefined && <span key="focus" style={{ insetInlineStart: `calc(${focusLeft * 100}% + var(--fade-size))` }} />}
        </div>
      )}
      </div>
      </div>
    </figure>
  )
}

