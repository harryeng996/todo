import { createContext, useContext } from 'react'

export const ConfettiContext = createContext<(() => void) | null>(null)

/** Returns a function that throws a short burst of confetti. */
export function useConfetti(): () => void {
  const fire = useContext(ConfettiContext)
  if (!fire)
    throw new Error('useConfetti must be used inside <ConfettiProvider>')
  return fire
}
