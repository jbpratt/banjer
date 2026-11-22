import { useId } from 'react'
import type { Settings as S } from '../settings.ts'
import { updateSettings } from '../settingsStore.ts'
import styles from './Views.module.css'

export function Settings({ settings }: { settings: S }) {
  const volumeId = useId()
  const percent = `${Math.round(settings.volume * 100)}%`
  return (
    <section className={styles.page} aria-labelledby="settings-title">
      <header className={styles.pageHeader}>
        <h1 id="settings-title">Settings</h1>
      </header>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <fieldset className={styles.fieldset}>
          <legend>Theme</legend>
          {(['auto', 'light', 'dark'] as const).map((t) => (
            <label key={t} className={styles.choice}>
              <input type="radio" name="theme" checked={settings.theme === t} onChange={() => updateSettings({ theme: t })} />
              {t === 'auto' ? 'Match system' : t === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </fieldset>

        <label className={styles.choice}>
          <input type="checkbox" checked={settings.leftHanded} onChange={(e) => updateSettings({ leftHanded: e.target.checked })} />
          Left-handed (mirror the fretboard)
        </label>

        <label className={styles.field}>
          Fretboard labels
          <select value={settings.labels} onChange={(e) => updateSettings({ labels: e.target.value as S['labels'] })}>
            <option value="auto">Automatic (intervals)</option>
            <option value="note">Note names</option>
            <option value="interval">Intervals</option>
            <option value="finger">Fingers</option>
            <option value="none">None</option>
          </select>
        </label>

        {/* A label wrapping the <output> would name the slider "Volume 80%" and repeat it. */}
        <div className={styles.field}>
          <span>
            <label htmlFor={volumeId}>Volume</label> <output htmlFor={volumeId}>{percent}</output>
          </span>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            aria-valuetext={percent}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
          />
        </div>

      </form>
    </section>
  )
}
