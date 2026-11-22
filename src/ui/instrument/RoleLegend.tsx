import { diamondPoints, roundedPolygonPath, trianglePoints } from './fretboardGeometry.ts'
import type { MarkerRole } from './types.ts'
import styles from './RoleLegend.module.css'

const ORDER: readonly MarkerRole[] = ['root', 'chord', 'scale', 'melody', 'thumb', 'muted']

/** 14 px role swatch, drawn on a page surface. */
export function RoleSwatch({ role }: { role: MarkerRole }) {
  const d = 10
  let shape
  switch (role) {
    case 'root':
      shape = <rect x={-4.5} y={-4.5} width={9} height={9} rx={1.5} />
      break
    case 'chord':
      shape = <circle r={5} />
      break
    case 'scale':
      shape = <circle r={4.5} />
      break
    case 'melody':
      shape = <path d={roundedPolygonPath(diamondPoints(1.2 * d), 0.6)} />
      break
    case 'thumb':
      shape = <path d={roundedPolygonPath(trianglePoints(1.2 * d), 0.5)} transform="translate(0 0.8)" />
      break
    case 'muted':
      shape = <path d="M-4 -4 L4 4 M4 -4 L-4 4" />
      break
  }
  return (
    <svg className={`${styles.swatch} ${styles[role] ?? ''}`} viewBox="-7 -7 14 14" width="14" height="14" aria-hidden="true">
      {shape}
    </svg>
  )
}

/** Lists only the roles present. aria-hidden: the board's label names the roles. */
export function RoleLegend({ roles, className }: { roles: readonly MarkerRole[]; className?: string | undefined }) {
  const present = ORDER.filter((r) => roles.includes(r))
  return (
    <ul className={[styles.legend, className].filter(Boolean).join(' ')} aria-hidden="true">
      {present.map((r) => (
        <li key={r}>
          <RoleSwatch role={r} />
          {r}
        </li>
      ))}
    </ul>
  )
}
