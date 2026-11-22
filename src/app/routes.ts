/** Hash routes. No router: the hash is the whole navigation state. */

export type ExploreMode = 'chords' | 'keys' | 'scales'
const EXPLORE_MODES: readonly ExploreMode[] = ['chords', 'keys', 'scales']

export type Route =
  /** `subject`: a chord symbol in chords mode ('D7'), a key in keys mode ('G'). */
  | { view: 'explore'; mode?: ExploreMode; subject?: string }
  | { view: 'settings' }
  | { view: 'gallery' }

function seg(s: string | undefined): string | undefined {
  if (s === undefined || s === '') return undefined
  try {
    return decodeURIComponent(s)
  } catch {
    return undefined
  }
}

export function parseRoute(hash: string): Route {
  const [head, a, b] = hash.replace(/^#\/?/, '').split('/')
  switch (head) {
    case 'settings':
      return { view: 'settings' }
    case 'gallery':
      return { view: 'gallery' }
    case 'explore': {
      const mode = EXPLORE_MODES.find((m) => m === a)
      const subject = mode ? seg(b) : undefined
      return { view: 'explore', ...(mode ? { mode } : {}), ...(subject ? { subject } : {}) }
    }
    default:
      return { view: 'explore' }
  }
}

export function formatRoute(r: Route): string {
  switch (r.view) {
    case 'settings':
      return '#/settings'
    case 'gallery':
      return '#gallery'
    case 'explore':
      if (!r.mode) return '#/explore'
      return r.subject ? `#/explore/${r.mode}/${encodeURIComponent(r.subject)}` : `#/explore/${r.mode}`
  }
}
