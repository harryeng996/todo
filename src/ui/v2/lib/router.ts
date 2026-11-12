import { useSyncExternalStore } from 'react'

export type Screen = 'home' | 'tasks' | 'focus' | 'body' | 'settings'

export interface Route {
  screen: Screen
  /** e.g. a Settings section: #/settings/quotes */
  section?: string
}

const SCREENS: readonly Screen[] = [
  'home',
  'tasks',
  'focus',
  'body',
  'settings',
]

/** '#/settings/quotes' → { screen: 'settings', section: 'quotes' }; unknown → home. */
export function parseHash(hash: string): Route {
  const [first = '', second] = hash.replace(/^#\/?/, '').split('/')
  const screen = (SCREENS as readonly string[]).includes(first)
    ? (first as Screen)
    : 'home'
  return second ? { screen, section: second } : { screen }
}

export function routeHref(screen: Screen, section?: string): string {
  if (screen === 'home') return '#/'
  return section ? `#/${screen}/${section}` : `#/${screen}`
}

export function navigate(screen: Screen, section?: string): void {
  location.hash = routeHref(screen, section)
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

/** Hash routing works on GitHub Pages and offline without server rewrites. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parseHash(hash)
}
