import { useLayoutEffect, useRef, useState } from 'react'

/** The element's content width, kept up to date (charts draw at real pixel size). */
export function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setWidth(w)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
