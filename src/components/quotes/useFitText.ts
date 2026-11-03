import { useLayoutEffect, useRef } from 'react'

interface FitOptions {
  max: number // px
  min: number // px
}

/**
 * Shrinks an element's font size (from `max` down to `min`, 1 px at a time)
 * until its text fits the height the layout gives it. Refits when the element
 * is resized, when `key` changes, and once the web fonts have loaded.
 */
export function useFitText<T extends HTMLElement>(
  { max, min }: FitOptions,
  key: unknown,
) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const fit = () => {
      let size = max
      element.style.fontSize = `${size}px`
      while (size > min && element.scrollHeight > element.clientHeight + 1) {
        size -= 1
        element.style.fontSize = `${size}px`
      }
    }
    fit()
    // Changing the font size doesn't resize the element (its height comes from
    // the card), so this can't loop.
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    let active = true
    void document.fonts?.ready.then(() => active && fit())
    return () => {
      active = false
      observer.disconnect()
    }
  }, [max, min, key])

  return ref
}
