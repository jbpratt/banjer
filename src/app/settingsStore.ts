import { useEffect, useSyncExternalStore } from 'react'
import { parseSettings } from './settings.ts'
import type { Settings, Theme } from './settings.ts'
import { readStorage, writeStorage } from './storage.ts'

const KEY = 'banjer:settings'

let current: Settings = parseSettings(readStorage(KEY))
const listeners = new Set<() => void>()

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const get = () => current
const notify = () => {
  for (const fn of listeners) fn()
}

// Another tab saved settings: adopt them (the event only fires in the tabs that didn't write).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return
    current = parseSettings(readStorage(KEY))
    notify()
  })
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
  writeStorage(KEY, JSON.stringify(current))
  notify()
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, get, get)
}

/** Sets `data-theme` on <html>; `auto` removes it so the OS preference applies. */
export function useTheme(theme: Theme): void {
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])
}
