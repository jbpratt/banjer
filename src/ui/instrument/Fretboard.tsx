import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { StringNum } from '../../domain/types.ts'
import { STRINGS, noteName, openMidi, pitchClass, soundingMidi, spell } from '../../theory/index.ts'
import {
  BOARD_COMPACT,
  BOARD_DESKTOP,
  boardGeometry,
  boardViewBox,
  capoGeometry,
  displayLabel,
  fifthStringGeometry,
  fretWires,
  hitTargets,
  inlays,
  markerPoint,
  markerRadius,
  mirrorX,
  navigateTarget,
  rulerFrets,
  spikeGeometry,
  spokenNote,
  stringY,
  type BoardGeometry,
} from './fretboardGeometry.ts'
import { useIsNarrow } from './hooks.ts'
import { MarkerGlyph } from './Marker.tsx'
import { RoleLegend } from './RoleLegend.tsx'
import type { FretMarker, FretboardProps, MarkerRole } from './types.ts'
import styles from './Fretboard.module.css'

const STRING_WIDTH: Readonly<Record<StringNum, string>> = {
  1: 'var(--fb-string-1-width)',
  2: 'var(--fb-string-2-width)',
  3: 'var(--fb-string-3-width)',
  4: 'var(--fb-string-4-width)',
  5: 'var(--fb-string-5-width)',
}

const Z_ORDER: Record<string, number> = { dim: 0, rest: 1, next: 2, active: 3 }

const ROLE_WORD: Readonly<Record<MarkerRole, string>> = {
  root: 'root',
  chord: 'chord tone',
  scale: 'scale tone',
  melody: 'melody',
  thumb: 'thumb',
  muted: 'muted',
}

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
  onSelect,
  label,
  className,
}: FretboardProps) {
  const figRef = useRef<HTMLElement>(null)
  const narrow = useIsNarrow(figRef)
  const layout = narrow ? BOARD_COMPACT : BOARD_DESKTOP
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
    .sort((a, b) => (Z_ORDER[a.m.state ?? 'rest'] ?? 1) - (Z_ORDER[b.m.state ?? 'rest'] ?? 1))

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
        targetRefs.current[next]?.focus()
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
  const markerAt = (string: number, fret: number) => markers.find((m) => m.pos.string === string && m.pos.fret === fret)

  return (
    <figure ref={figRef} className={[styles.figure, className].filter(Boolean).join(' ')}>
      {rolesShown.length > 0 && <RoleLegend roles={rolesShown} className={styles.legend} />}
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
            const midi = soundingMidi(setup, t.pos)
            const mk = markerAt(t.pos.string, t.pos.fret)
            const name = `string ${t.pos.string}, ${t.pos.fret === 0 ? 'open' : `fret ${t.pos.fret}`}, ${spokenNote(noteName(midi))}${mk ? `, ${ROLE_WORD[mk.role]}` : ''}`
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
    </figure>
  )
}
