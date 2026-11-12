import { createContext, useContext } from 'react'

export interface VideoDockValue {
  /** The element the full-size player covers (the Focus screen's slot), or null. */
  setSlot: (element: HTMLElement | null) => void
  /** Plays a saved video straight away. */
  play: (id: string) => void
  playing: boolean
}

export const VideoDockContext = createContext<VideoDockValue | null>(null)

export function useVideoDock(): VideoDockValue {
  const value = useContext(VideoDockContext)
  if (!value)
    throw new Error('useVideoDock must be used inside <VideoDockProvider>')
  return value
}
