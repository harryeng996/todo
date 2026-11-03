import { createContext, useContext } from 'react'
import type { QuoteItem, QuoteLibrary } from './quoteLibrary.ts'

export interface QuoteContextValue {
  library: QuoteLibrary
  /** The quote on the card, or null when none are in rotation. */
  current: QuoteItem | null
  next: () => void
  addQuote: (text: string, author: string) => void
  removeQuote: (id: string) => void
  setEnabled: (id: string, enabled: boolean) => void
  moveQuote: (id: string, delta: -1 | 1) => void
  updateLibrary: (
    patch: Partial<
      Pick<QuoteLibrary, 'order' | 'includeBuiltIn' | 'rotate' | 'intervalSec'>
    >,
  ) => void
}

// Lives apart from <QuoteProvider> so that file only exports components (fast refresh).
export const QuoteContext = createContext<QuoteContextValue | null>(null)

export function useQuoteLibrary(): QuoteContextValue {
  const value = useContext(QuoteContext)
  if (!value)
    throw new Error('useQuoteLibrary must be used inside <QuoteProvider>')
  return value
}
