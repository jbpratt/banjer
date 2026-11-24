import { useId } from 'react'
import { enharmonicTwin, pcOf, prettyNote, rootChoices } from '../../theory/index.ts'
import type { SpelledNote } from '../../theory/index.ts'
import styles from './RootPicker.module.css'

interface Props {
  /** Visible group label: "Root", "Key". */
  legend: string
  value: SpelledNote
  onChange: (root: SpelledNote) => void
  /** Appended to each note in its accessible name: " major" reads "G major". */
  suffix?: string
  /**
   * Whether to offer the current root's other spelling (C♯ ↔ D♭) as a button. Default: always
   * when there is one. The chord lab declines spellings it would respell back.
   */
  canRespell?: (twin: SpelledNote) => boolean
}

const ACCIDENTAL_WORD: Readonly<Record<string, string>> = { '': '', '#': ' sharp', b: ' flat', '##': ' double sharp', bb: ' double flat' }
const spoken = (n: SpelledNote) => n[0]! + (ACCIDENTAL_WORD[n.slice(1)] ?? '')

/**
 * Twelve roots as one radio group, laid out like a keyboard: naturals along the bottom,
 * sharps/flats raised between them. There is no key between E–F or B–C, which are the
 * half steps between naturals. Native radios: Tab lands on the checked root, arrow keys
 * step a semitone (one fret) at a time.
 */
export function RootPicker({ legend, value, onChange, suffix = '', canRespell }: Props) {
  const name = useId()
  const choices = rootChoices(value)
  const twin = enharmonicTwin(value)
  const respell = twin && (canRespell?.(twin) ?? true) ? twin : null
  const current = pcOf(value)
  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.keys}>
        {choices.map((c) => (
          <label key={c.pc} className={c.natural ? styles.natural : styles.accidental} data-pc={c.pc}>
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={c.pc === current}
              onChange={() => onChange(c.value)}
            />
            <span className={styles.face} aria-hidden="true">
              <span className={styles.primary}>{prettyNote(c.value)}</span>
              {c.also.length > 0 && <span className={styles.also}>{c.also.map(prettyNote).join(' ')}</span>}
            </span>
            <span className="visually-hidden">
              {spoken(c.value)}
              {suffix}
              {c.also.length > 0 && `, or ${c.also.map(spoken).join(', ')}`}
            </span>
          </label>
        ))}
      </div>
      {respell && (
        <button type="button" className={styles.respell} onClick={() => onChange(respell)}>
          Spell as {prettyNote(respell)}
          <span className="visually-hidden">
            {' '}
            ({spoken(respell)}
            {suffix})
          </span>
        </button>
      )}
    </fieldset>
  )
}
