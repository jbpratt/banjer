import { useId } from 'react'
import styles from './Segmented.module.css'

interface Props<T extends string> {
  legend: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** A two-or-three-way switch (Labels: Degrees | Notes) as native radios under a legend. */
export function Segmented<T extends string>({ legend, options, value, onChange }: Props<T>) {
  const name = useId()
  return (
    <fieldset className={styles.segmented}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={styles.segment}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
