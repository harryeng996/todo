import { createContext, useContext } from 'react'

export interface ScreensaverValue {
  active: boolean
  /** Shows the screensaver now (e.g. the sidebar button or a preview). */
  start: () => void
  stop: () => void
}

export const ScreensaverContext = createContext<ScreensaverValue | null>(null)

export function useScreensaver(): ScreensaverValue {
  const value = useContext(ScreensaverContext)
  if (!value)
    throw new Error('useScreensaver must be used inside <ScreensaverProvider>')
  return value
}
