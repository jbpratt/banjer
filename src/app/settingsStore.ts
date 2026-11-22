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

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
  writeStorage(KEY, JSON.stringify(current))
  for (const fn of listeners) fn()
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
