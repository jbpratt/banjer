import { createAudioEngine } from '../audio/index.ts'
import type { AudioEngine } from '../audio/index.ts'

let engine: AudioEngine | null = null

/** The one engine for the whole app, created on first use. */
export function getEngine(): AudioEngine {
  return (engine ??= createAudioEngine())
}

/** Unlock audio on the first pointer or key gesture. */
export function installUnlock(): () => void {
  const unlock = () => {
    void getEngine().unlock().catch(() => {})
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
  return unlock
}

if (import.meta.hot) {
  // A new engine module means a new engine; silence the old one.
  import.meta.hot.dispose(() => engine?.stop())
}
