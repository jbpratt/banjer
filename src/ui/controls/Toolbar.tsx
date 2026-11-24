import type { ReactNode } from 'react'
import styles from './Toolbar.module.css'

interface Props {
  /** What the page is about: the root or key picker. */
  subject: ReactNode
  /** What to build on it: quality or scale chips. Beside the subject when there is room. */
  detail?: ReactNode
  /** How the board is set up (tuning, labels, capo, frets): a quieter row after the rest. */
  setup: ReactNode
}

/**
 * The one control layout every Explore view uses. Narrow: subject, detail, setup stacked
 * in reading (and Tab) order. Wide: subject and detail side by side, setup in a row below;
 * with no detail, setup sits beside the subject instead.
 */
export function Toolbar({ subject, detail, setup }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.grid}>
        <div className={styles.subject}>{subject}</div>
        {detail && <div className={styles.detail}>{detail}</div>}
        <div className={styles.setup} role="group" aria-label="Board setup">
          {setup}
        </div>
      </div>
    </div>
  )
}
