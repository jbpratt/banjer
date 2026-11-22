import type { Finger } from '../../domain/types.ts'
import {
  badgeOffset,
  diamondPoints,
  displayLabel,
  haloRadius,
  roundedPolygonPath,
  trianglePoints,
} from './fretboardGeometry.ts'
import type { MarkerRole, MarkerState } from './types.ts'
import styles from './Marker.module.css'

interface MarkerGlyphProps {
  role: MarkerRole
  /** Base diameter. */
  d: number
  state?: MarkerState | undefined
  label?: string | undefined
  finger?: Finger | undefined
  leftHanded?: boolean
}

/**
 * One fretboard marker centred at 0,0 (the caller translates it). Shape, fill, and
 * label follow design.md §5; state changes size, fill, and edge, never only hue.
 */
export function MarkerGlyph({ role, d, state, label, finger, leftHanded = false }: MarkerGlyphProps) {
  const ghost = state === 'next'
  const dim = state === 'dim'
  const active = state === 'active'
  const cls = [styles.marker, styles[role], ghost && styles.ghost, dim && styles.dim, active && styles.active]
    .filter(Boolean)
    .join(' ')
  const text = label ? displayLabel(label) : ''
  const fontSize = (text.length > 1 ? 0.42 : 0.5) * d
  const badge = badgeOffset(d, leftHanded)
  const showBadge = finger !== undefined && !dim

  let shape
  let labelY = 0
  switch (role) {
    case 'root': {
      const side = 0.9 * d
      shape = <rect className={styles.shape} x={-side / 2} y={-side / 2} width={side} height={side} rx={0.16 * side} />
      break
    }
    case 'chord':
      shape = <circle className={styles.shape} r={d / 2} />
      break
    case 'scale':
      shape = <circle className={styles.shape} r={0.45 * d} style={{ strokeWidth: ghost ? undefined : 0.1 * d }} />
      break
    case 'melody':
      shape = <path className={styles.shape} d={roundedPolygonPath(diamondPoints(1.2 * d), 0.06 * d)} />
      break
    case 'thumb':
      shape = <path className={styles.shape} d={roundedPolygonPath(trianglePoints(1.2 * d), 0.05 * d)} />
      labelY = 0.06 * d
      break
    case 'muted': {
      const a = 0.28 * d
      const xPath = `M${-a} ${-a} L${a} ${a} M${a} ${-a} L${-a} ${a}`
      shape = (
        <>
          <path className={styles.crossBack} d={xPath} style={{ strokeWidth: 0.12 * d + 1.5 }} />
          <path className={styles.cross} d={xPath} style={{ strokeWidth: 0.12 * d }} />
        </>
      )
      break
    }
  }

  return (
    <g className={cls} aria-hidden="true">
      {active && <circle className={styles.halo} r={haloRadius(role, d)} />}
      <g className={styles.body}>
        {shape}
        {text && role !== 'muted' && !dim && (
          <text
            className={styles.label}
            y={labelY}
            fontSize={role === 'thumb' ? 0.42 * d : fontSize}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {text}
          </text>
        )}
      </g>
      {showBadge && (
        <g transform={`translate(${badge.dx} ${badge.dy})`}>
          <circle className={styles.badge} r={badge.r} />
          <text className={styles.badgeText} fontSize={0.34 * d} textAnchor="middle" dominantBaseline="central">
            {finger}
          </text>
        </g>
      )}
    </g>
  )
}
