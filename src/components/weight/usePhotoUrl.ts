import { useEffect, useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { loadPhoto, loadThumbnail } from '../../lib/photos.ts'

export type PhotoSize = 'thumb' | 'full'

/**
 * An object URL for one day's photo or thumbnail (null `date` loads nothing).
 * Revoked when the day, size or `version` changes, or on unmount.
 */
export function usePhotoUrl(
  date: DateKey | null,
  version: number,
  size: PhotoSize,
): string | undefined {
  const key = date ? `${date}|${size}|${version}` : ''
  // Tagged with what it was loaded for, so a stale URL is never returned.
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(
    null,
  )

  useEffect(() => {
    if (!date) return
    let url: string | undefined
    // Aborted on cleanup: a thumbnail scrolled away stops jumping the queue.
    const gone = new AbortController()
    const load =
      size === 'thumb' ? loadThumbnail(date, gone.signal) : loadPhoto(date)
    void load
      .catch(() => undefined)
      .then((blob) => {
        if (gone.signal.aborted || !blob) return
        url = URL.createObjectURL(blob)
        setLoaded({ key, url })
      })
    return () => {
      gone.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [date, size, key])

  return loaded?.key === key ? loaded.url : undefined
}
