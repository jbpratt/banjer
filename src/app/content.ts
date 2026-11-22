/**
 * The app's only runtime import of `content/`. Content edits hot-reload here and are
 * pushed to subscribers, so the update stops at this module and the current view
 * (route, Explore state) survives.
 */
import { useSyncExternalStore } from 'react'
import * as initial from '../../content/index.ts'

export type Content = typeof initial

let current: Content = initial
const listeners = new Set<() => void>()

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function get(): Content {
  return current
}

export function useContent(): Content {
  return useSyncExternalStore(subscribe, get, get)
}

if (import.meta.hot) {
  import.meta.hot.accept('../../content/index.ts', (mod) => {
    if (!mod) return
    current = mod as unknown as Content
    for (const fn of listeners) fn()
  })
}
