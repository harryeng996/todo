import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { quotes } from '../data/quotes.ts'
import { createJsonStore } from '../lib/storage.ts'
import {
  activeIds,
  advanceCursor,
  mergeLibrary,
  moveItem,
  syncCursor,
  type QuoteCursor,
  type QuoteLibrary,
} from './quoteLibrary.ts'
import { QuoteContext, type QuoteContextValue } from './useQuoteLibrary.ts'

interface QuoteState {
  library: QuoteLibrary
  cursor: QuoteCursor
}

const DEFAULTS: Omit<QuoteLibrary, 'items'> = {
  order: 'shuffle',
  includeBuiltIn: true,
  rotate: true,
  intervalSec: 60,
}

const libraryStore = createJsonStore<Partial<QuoteLibrary> | null>(
  'todoapp.quoteLibrary.v1',
  () => null,
)
const cursorStore = createJsonStore<QuoteCursor | null>(
  'todoapp.quotes.v2',
  () => null,
)

function load(): QuoteState {
  const saved = libraryStore.load()
  const library: QuoteLibrary = {
    ...DEFAULTS,
    ...saved,
    items: mergeLibrary(saved?.items ?? null, quotes),
  }
  return {
    library,
    cursor: syncCursor(cursorStore.load(), activeIds(library), library.order),
  }
}

/** The quote library (built-in + your own), its order and rotation settings. */
export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    libraryStore.save(state.library)
    cursorStore.save(state.cursor)
  }, [state])

  // Every library change re-fits the cursor, keeping the quote on screen if it can.
  const change = useCallback(
    (update: (library: QuoteLibrary) => QuoteLibrary) => {
      setState((s) => {
        const library = update(s.library)
        return {
          library,
          cursor: syncCursor(s.cursor, activeIds(library), library.order),
        }
      })
    },
    [],
  )

  const next = useCallback(() => {
    setState((s) => ({
      ...s,
      cursor: advanceCursor(s.cursor, s.library.order),
    }))
  }, [])

  const value = useMemo((): QuoteContextValue => {
    const currentId = state.cursor.order[state.cursor.position]
    return {
      library: state.library,
      current:
        state.library.items.find((item) => item.id === currentId) ?? null,
      next,
      addQuote: (text, author) =>
        change((lib) => ({
          ...lib,
          items: [
            ...lib.items,
            {
              id: crypto.randomUUID(),
              text,
              author,
              builtIn: false,
              enabled: true,
            },
          ],
        })),
      removeQuote: (id) =>
        change((lib) => ({
          ...lib,
          items: lib.items.filter((item) => item.id !== id || item.builtIn),
        })),
      setEnabled: (id, enabled) =>
        change((lib) => ({
          ...lib,
          items: lib.items.map((item) =>
            item.id === id ? { ...item, enabled } : item,
          ),
        })),
      moveQuote: (id, delta) =>
        change((lib) => ({ ...lib, items: moveItem(lib.items, id, delta) })),
      updateLibrary: (patch) => change((lib) => ({ ...lib, ...patch })),
    }
  }, [state, change, next])

  return <QuoteContext value={value}>{children}</QuoteContext>
}
