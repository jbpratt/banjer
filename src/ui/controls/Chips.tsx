import { useId } from 'react'
import type { ReactNode } from 'react'
import styles from './Chips.module.css'

/**
 * Chips: one look for every pick-one control below the root picker.
 *
 * - ChoiceChips: a required single choice (chord quality, scale) as native radios, so Tab
 *   lands on the checked chip and arrow keys step through every group in order.
 * - ChipSet + ChipGroup + ToggleChip: chips that can all be off (a chord in the key), as
 *   aria-pressed buttons.
 *
 * Groups carry a visible label. In a wide set the labels share one column (subgrid), so
 * the chips of every group start on the same line; in a narrow one each label sits above.
 */

type Layout = 'grid' | 'wide' | 'fill'

interface SetProps {
  /** Visible label for the whole set. Omit when `labelledBy` names an existing heading. */
  legend?: string
  labelledBy?: string
  children: ReactNode
}

/** A labelled set of chip groups (role=group), for toggle chips. */
export function ChipSet({ legend, labelledBy, children }: SetProps) {
  const id = useId()
  return (
    <div className={styles.set} role="group" aria-labelledby={legend ? id : labelledBy}>
      {legend && (
        <span id={id} className={styles.legend}>
          {legend}
        </span>
      )}
      <div className={styles.rows}>{children}</div>
    </div>
  )
}

interface GroupProps {
  label: string
  /**
   * grid: equal columns that line up across groups (short names). wide: the same, with
   * room for long names (scales). fill: a fixed run sharing the row evenly (seven degrees).
   */
  layout?: Layout
  children: ReactNode
}

export function ChipGroup({ label, layout = 'grid', children }: GroupProps) {
  const id = useId()
  return (
    <div className={styles.group} role="group" aria-labelledby={id}>
      <span id={id} className={styles.groupLabel}>
        {label}
      </span>
      <div className={styles.chips} data-layout={layout}>
        {children}
      </div>
    </div>
  )
}

interface ToggleProps {
  pressed: boolean
  onClick: () => void
  /** tile: two lines (numeral over chord name). */
  variant?: 'chip' | 'tile'
  children: ReactNode
}

export function ToggleChip({ pressed, onClick, variant = 'chip', children }: ToggleProps) {
  return (
    <button type="button" className={styles.chip} data-variant={variant} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}

export interface ChoiceOption<T extends string> {
  value: T
  label: ReactNode
}

interface ChoiceProps<T extends string> {
  legend: string
  groups: readonly { label: string; options: readonly ChoiceOption<T>[] }[]
  value: T
  onChange: (value: T) => void
  layout?: Layout
}

/** A required single choice in labelled groups: one radio group across all of them. */
export function ChoiceChips<T extends string>({ legend, groups, value, onChange, layout = 'grid' }: ChoiceProps<T>) {
  const name = useId()
  return (
    <fieldset className={styles.set}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.rows}>
        {groups.map((g) => (
          <ChipGroup key={g.label} label={g.label} layout={layout}>
            {g.options.map((o) => (
              <label key={o.value} className={styles.chip} data-variant="choice">
                <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </ChipGroup>
        ))}
      </div>
    </fieldset>
  )
}
