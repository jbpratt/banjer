import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

const REDUCED = '(prefers-reduced-motion: reduce)'

function subscribeReduced(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(REDUCED)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function getReduced(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches
}

/** Live `prefers-reduced-motion: reduce`. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, () => false)
}

/**
 * Live content-box width of an element in CSS px (0 until measured), plus the root font size,
 * so callers can size SVG text in px. Re-measures when the element resizes.
 */
export function useElementWidth(ref: RefObject<Element | null>): { width: number; rem: number } {
  const [size, setSize] = useState({ width: 0, rem: 16 })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0)
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      if (width > 0) setSize((s) => (s.width === width && s.rem === rem ? s : { width, rem }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}
