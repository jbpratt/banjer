import { useSyncExternalStore } from 'react'
import { createAudioEngine } from '../audio/index.ts'
import type { AudioEngine, MetronomeConfig } from '../audio/index.ts'

let engine: AudioEngine | null = null

/** The one engine for the whole app, created on first use. */
export function getEngine(): AudioEngine {
  return (engine ??= createAudioEngine())
}

/** Unlock audio on the first pointer or key gesture. Returns a remover for the listeners. */
export function installUnlock(): () => void {
  const remove = () => {
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
  }
  const unlock = () => {
    remove()
    void getEngine().unlock().catch(() => {})
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
  // Removing must not unlock: StrictMode runs this cleanup at mount, with no gesture.
  return remove
}

const metronomeListeners = new Set<() => void>()

function subscribeMetronome(fn: () => void): () => void {
  metronomeListeners.add(fn)
  // Ticks catch a stop from anywhere (onTick(null)); start/stop below notify at once.
  const off = getEngine().metronome.onTick(() => fn())
  return () => {
    metronomeListeners.delete(fn)
    off()
  }
}

const getMetronomeRunning = () => getEngine().metronome.isRunning()

function notifyMetronome(): void {
  for (const fn of metronomeListeners) fn()
}

/** Live "is the metronome running". Re-renders only when that changes, not per click. */
export function useMetronomeRunning(): boolean {
  return useSyncExternalStore(subscribeMetronome, getMetronomeRunning, () => false)
}

/** Start the click from a gesture; unlocks audio too, without waiting for it. */
export function startMetronome(config: MetronomeConfig): void {
  const e = getEngine()
  void e.unlock().catch(() => {})
  e.metronome.start(config)
  notifyMetronome()
}

export function stopMetronome(): void {
  getEngine().metronome.stop()
  notifyMetronome()
}

if (import.meta.hot) {
  // A new engine module means a new engine; silence the old one.
  import.meta.hot.dispose(() => {
    engine?.stop()
    engine?.metronome.stop()
  })
}
