import { useCallback, useEffect, useState, type UIEvent } from 'react'

/** Guesses until a row and the list have been measured (or without layout). */
const GUESS_ROW_PX = 48
const GUESS_VIEW_PX = 320

export interface RowRange {
  /** First and last row index to render. */
  start: number
  end: number
  /**
   * Space standing in for the rows not rendered above and below. Put it on
   * the list inside the scroll box, never on the scroll box itself: a box is
   * at least as tall as its padding, so it would stop scrolling.
   */
  padTop: number
  padBottom: number
}

/**
 * Renders only the rows of a long scrolling list that are in view, plus 1.5
 * screens above and below (rows there mount, and load their thumbnails,
 * before they scroll in). Collapsed rows share one height, measured from a
 * rendered row; the `expanded` row (-1 for none) may be taller.
 */
export function useWindowedRows(count: number, expanded: number) {
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [view, setView] = useState(0)
  const [rowPx, setRowPx] = useState(GUESS_ROW_PX)
  const [extraPx, setExtraPx] = useState(0) // expanded row's height beyond rowPx

  // The scroll box's visible height.
  useEffect(() => {
    if (!scroller) return
    const measure = () => setView(scroller.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [scroller])

  /**
   * Ref for row `index`: a collapsed row sets the row height; the expanded
   * one is watched (its editor can change size) for its extra height.
   */
  const measureRow = useCallback(
    (index: number) => (row: HTMLLIElement | null) => {
      if (!row) return
      if (index !== expanded) {
        const height = row.offsetHeight
        if (height > 0) setRowPx(height)
        return
      }
      const observer = new ResizeObserver(() =>
        setExtraPx(Math.max(0, row.offsetHeight - rowPx)),
      )
      observer.observe(row)
      return () => observer.disconnect()
    },
    [expanded, rowPx],
  )

  // Kept to whole rows: scroll events within a row change nothing rendered,
  // and an unchanged value skips the re-render (a screen of overscan absorbs
  // the rounding).
  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) =>
      setScrollTop(Math.floor(event.currentTarget.scrollTop / rowPx) * rowPx),
    [rowPx],
  )

  const extra = expanded >= 0 ? extraPx : 0
  const top = (index: number) =>
    index * rowPx + (expanded >= 0 && index > expanded ? extra : 0)
  const indexAt = (y: number) => {
    const plain = Math.floor(y / rowPx)
    let index = plain
    if (expanded >= 0 && plain > expanded) {
      const below = top(expanded + 1)
      index =
        y < below ? expanded : expanded + 1 + Math.floor((y - below) / rowPx)
    }
    return Math.min(count - 1, Math.max(0, index))
  }

  // Rows within 1.5 screens either side are rendered (and load their photos).
  const shown = view || GUESS_VIEW_PX
  const overscan = 1.5 * shown
  const start = indexAt(scrollTop - overscan)
  const end = indexAt(scrollTop + shown + overscan)
  const range: RowRange = {
    start,
    end,
    padTop: top(start),
    padBottom: Math.max(0, top(count) - top(end + 1)),
  }

  return { scrollerRef: setScroller, onScroll, measureRow, range }
}
