import { createAudioEngine } from '../audio/index.ts'
import type { AudioEngine } from '../audio/index.ts'

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

if (import.meta.hot) {
  // A new engine module means a new engine; silence the old one.
  import.meta.hot.dispose(() => engine?.stop())
}
