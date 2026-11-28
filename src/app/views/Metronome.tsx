import { useEffect, useId, useRef, useState } from 'react'
import { METRONOME_BPM } from '../../audio/index.ts'
import type { MetronomeConfig } from '../../audio/index.ts'
import { Segmented } from '../../ui/controls/Segmented.tsx'
import { getEngine, startMetronome, stopMetronome } from '../audio.ts'
import type { MetronomeSettings } from '../settings.ts'
import { updateSettings } from '../settingsStore.ts'
import { clampBpm, tapTempo } from '../tempo.ts'
import styles from './Metronome.module.css'

const METER_OPTIONS = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
] as const

const CLICK_OPTIONS = [
  { value: '1', label: 'Beats' },
  { value: '2', label: 'Eighths' },
] as const

function toConfig({ bpm, beatsPerBar, subdivision, accent }: MetronomeSettings): MetronomeConfig {
  return { bpm, beatsPerBar, subdivision, accent }
}

interface Props {
  settings: MetronomeSettings
  running: boolean
}

/**
 * The metronome dock: a pill fixed to the bottom corner (a bar along the bottom on phones)
 * with play/stop, the tempo and the beat, and a panel above it for the rest. It lives in the
 * shell, so the click keeps going across routes, and it stays clear of the Explore toolbar.
 */
export function Metronome({ settings, running }: Props) {
  const panelId = useId()
  const sliderId = useId()
  const accentId = useId()
  const dock = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const taps = useRef<number[]>([])
  /** The press already counted this tap, so the click that follows it mustn't count it again. */
  const pressed = useRef(false)
  const { bpm, beatsPerBar, subdivision, accent, open } = settings

  // The store is the one source of truth; this hands every change to the click (a no-op when
  // stopped), including changes made in another tab.
  useEffect(() => {
    getEngine().metronome.update({ bpm, beatsPerBar, subdivision, accent })
  }, [bpm, beatsPerBar, subdivision, accent])

  const apply = (patch: Partial<MetronomeSettings>) => updateSettings({ metronome: { ...settings, ...patch } })
  const setBpm = (value: number) => {
    const b = clampBpm(value)
    if (b !== bpm) apply({ bpm: b })
  }
  const setOpen = (o: boolean) => apply({ open: o })
  const tap = (at = performance.now()) => {
    const t = tapTempo(taps.current, at, bpm)
    taps.current = t.taps
    if (t.bpm !== null) setBpm(t.bpm)
  }

  // An open panel closes on Escape or a press outside the dock, like any popover.
  useEffect(() => {
    if (!open) return
    const close = (refocus: boolean) => {
      updateSettings({ metronome: { ...settings, open: false } })
      if (refocus) toggle.current?.focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dock.current?.contains(document.activeElement)) close(true)
    }
    const onPointer = (e: PointerEvent) => {
      if (!dock.current?.contains(e.target as Node)) close(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open, settings])

  return (
    <section ref={dock} className={styles.dock} aria-label="Metronome">
      <div id={panelId} className={styles.panel} hidden={!open}>
        <div className={styles.tempo}>
          <button
            type="button"
            className={styles.step}
            aria-label="Slower"
            disabled={bpm <= METRONOME_BPM.min}
            onClick={() => setBpm(bpm - 1)}
          >
            −
          </button>
          <label htmlFor={sliderId} className="visually-hidden">
            Tempo
          </label>
          <input
            id={sliderId}
            className={styles.slider}
            type="range"
            min={METRONOME_BPM.min}
            max={METRONOME_BPM.max}
            step={1}
            value={bpm}
            aria-valuetext={`${bpm} BPM`}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <button
            type="button"
            className={styles.step}
            aria-label="Faster"
            disabled={bpm >= METRONOME_BPM.max}
            onClick={() => setBpm(bpm + 1)}
          >
            +
          </button>
          <button
            type="button"
            className={styles.button}
            aria-label="Tap tempo"
            // Time the tap on the press (the beat), not the release, which lands later and less evenly.
            onPointerDown={(e) => {
              if (e.button !== 0) return
              pressed.current = true
              tap(e.timeStamp)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              // A held key would autorepeat taps ~30 ms apart and pin the tempo at the maximum.
              if (e.repeat) return e.preventDefault()
              pressed.current = true
              tap(e.timeStamp)
            }}
            // Activation with no press first (e.g. a screen reader's click) still taps.
            onClick={() => {
              if (pressed.current) pressed.current = false
              else tap()
            }}
          >
            Tap
          </button>
        </div>

        <div className={styles.options}>
          <Segmented
            legend="Beats per bar"
            options={METER_OPTIONS}
            value={String(beatsPerBar) as '2' | '3' | '4'}
            onChange={(v) => apply({ beatsPerBar: Number(v) as 2 | 3 | 4 })}
          />
          <Segmented
            legend="Clicks"
            options={CLICK_OPTIONS}
            value={String(subdivision) as '1' | '2'}
            onChange={(v) => apply({ subdivision: v === '2' ? 2 : 1 })}
          />
          <label htmlFor={accentId} className={styles.check}>
            <input id={accentId} type="checkbox" checked={accent} onChange={(e) => apply({ accent: e.target.checked })} />
            Accent beat 1
          </label>
        </div>
      </div>

      <div className={styles.pill}>
        <button
          type="button"
          className={styles.play}
          aria-label={running ? 'Stop metronome' : 'Start metronome'}
          data-running={running || undefined}
          onClick={() => (running ? stopMetronome() : startMetronome(toConfig(settings)))}
        >
          <span className={styles.icon} aria-hidden="true" />
        </button>
        <button
          ref={toggle}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`Metronome settings, ${bpm} BPM`}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.bpm}>{bpm}</span>
          <span className={styles.unit} aria-hidden="true">
            BPM
          </span>
          <span className={styles.chevron} aria-hidden="true" />
        </button>
        <BeatDots beats={beatsPerBar} accent={accent} />
      </div>
    </section>
  )
}

/** One dot per beat, the current one filled. Visual only: a screen reader isn't told each beat. */
function BeatDots({ beats, accent }: { beats: number; accent: boolean }) {
  const [current, setCurrent] = useState<number | null>(null)
  useEffect(() => getEngine().metronome.onTick((t) => setCurrent(t === null ? null : t.beat)), [])
  return (
    <ol className={styles.dots} role="list" aria-hidden="true" data-accent={accent || undefined}>
      {Array.from({ length: beats }, (_, i) => (
        <li key={i} className={styles.dot} data-on={current === i || undefined} />
      ))}
    </ol>
  )
}
