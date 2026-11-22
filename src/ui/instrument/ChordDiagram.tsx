import { useMemo } from 'react'
import { chordLayout, chordStringX, CHORD_INDICATOR_Y, CHORD_ROW } from './chordLayout.ts'
import { displayLabel } from './fretboardGeometry.ts'
import type { ChordDiagramProps } from './types.ts'
import styles from './ChordDiagram.module.css'

export function ChordDiagram({
  shape,
  emphasis = 'none',
  size = 'md',
  showFingers = true,
  intervalLabels,
  highlight,
  className,
}: ChordDiagramProps) {
  const L = useMemo(() => chordLayout(shape, size === 'lg', intervalLabels), [shape, size, intervalLabels])
  const lit = (s: number) => highlight?.includes(s as 1 | 2 | 3 | 4 | 5) ?? false
  const ghost = emphasis === 'next'
  const stringsShown = [4, 3, 2, 1] as const
  const fretLines = Array.from({ length: L.rows + 1 }, (_, i) => L.gridTop + i * CHORD_ROW)

  return (
    <figure
      className={[styles.figure, styles[size], styles[emphasis], className].filter(Boolean).join(' ')}
      data-emphasis={emphasis}
    >
      <figcaption className={styles.caption}>
        {ghost && <span className={styles.eyebrow}>Next</span>}
        <span className={styles.name}>{displayLabel(shape.symbol)}</span>
      </figcaption>
      <svg className={styles.svg} viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label={L.ariaLabel}>
        {/* Strings */}
        {stringsShown.map((s) => (
          <line key={s} className={styles.line} x1={chordStringX(s)} x2={chordStringX(s)} y1={L.gridTop} y2={L.gridBottom} />
        ))}
        {L.fifth && <line className={styles.line} x1={L.fifth.x} x2={L.fifth.x} y1={L.fifth.top} y2={L.fifth.bottom} />}
        {L.fifth && L.fifth.top > L.gridTop && (
          <rect className={styles.pip} x={L.fifth.x - 4} y={L.fifth.top - 2.5} width={8} height={5} rx={1.5} />
        )}

        {/* Frets and nut */}
        {fretLines.map((y, i) =>
          i === 0 && L.hasNut ? null : (
            <line key={y} className={styles.line} x1={chordStringX(4)} x2={chordStringX(1)} y1={y} y2={y} />
          ),
        )}
        {L.hasNut && <rect className={styles.nut} x={chordStringX(4) - 0.75} y={L.gridTop - 2.5} width={chordStringX(1) - chordStringX(4) + 1.5} height={5} />}
        {L.positionLabel && (
          <text className={styles.position} x={L.positionLabel.x} y={L.positionLabel.y} textAnchor="end">
            {L.positionLabel.text}
          </text>
        )}

        {/* Open / muted indicators */}
        {L.indicators.map((ind) =>
          ind.kind === 'muted' ? (
            <path
              key={ind.string}
              className={styles.mutedInd}
              d={`M${ind.x - 5} ${CHORD_INDICATOR_Y - 5} L${ind.x + 5} ${CHORD_INDICATOR_Y + 5} M${ind.x + 5} ${CHORD_INDICATOR_Y - 5} L${ind.x - 5} ${CHORD_INDICATOR_Y + 5}`}
            />
          ) : ind.kind === 'open-root' ? (
            <rect key={ind.string} className={[styles.openRoot, lit(ind.string) && styles.litOpen].filter(Boolean).join(' ')} x={ind.x - 5.5} y={CHORD_INDICATOR_Y - 5.5} width={11} height={11} rx={2} />
          ) : (
            <circle key={ind.string} className={[styles.openChord, lit(ind.string) && styles.litOpen].filter(Boolean).join(' ')} cx={ind.x} cy={CHORD_INDICATOR_Y} r={6} />
          ),
        )}

        {/* Barre */}
        {L.barre && (
          <g className={styles.dotChord}>
            <rect className={styles.dot} x={L.barre.x1} y={L.barre.y - 9} width={L.barre.x2 - L.barre.x1} height={18} rx={9} />
            {showFingers && L.barre.finger !== undefined && (
              <text className={styles.finger} x={(L.barre.x1 + L.barre.x2) / 2} y={L.barre.y} textAnchor="middle" dominantBaseline="central">
                {L.barre.finger}
              </text>
            )}
          </g>
        )}

        {/* Dots */}
        {L.dots.map((dot) => (
          <g
            key={dot.string}
            className={[dot.role === 'root' ? styles.dotRoot : styles.dotChord, lit(dot.string) && styles.lit].filter(Boolean).join(' ')}
          >
            {dot.role === 'root' ? (
              <rect className={styles.dot} x={dot.x - 8} y={dot.y - 8} width={16} height={16} rx={2.5} />
            ) : (
              <circle className={styles.dot} cx={dot.x} cy={dot.y} r={9} />
            )}
            {showFingers && dot.finger !== undefined && (
              <text className={styles.finger} x={dot.x} y={dot.y} textAnchor="middle" dominantBaseline="central">
                {dot.finger}
              </text>
            )}
          </g>
        ))}

        {/* Interval row (lg) */}
        {L.intervals.map((iv) => (
          <text key={iv.x} className={styles.interval} x={iv.x} y={L.intervalY} textAnchor="middle">
            {intervalLabels ? iv.label : iv.label === '1' ? 'R' : displayLabel(iv.label)}
          </text>
        ))}
      </svg>
    </figure>
  )
}
