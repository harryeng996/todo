import { useEffect, useState } from 'react'
import { loadPhoto, loadThumbnail } from '../../lib/photos.ts'
import type { PhotoKey } from '../../lib/weight.ts'

export type PhotoSize = 'thumb' | 'full'

/**
 * An object URL for a photo or its thumbnail (null `photo` loads nothing).
 * Revoked when the photo or size changes, or on unmount. Photo keys are never
 * reused, so a URL never goes stale while its key is shown.
 */
export function usePhotoUrl(
  photo: PhotoKey | null,
  size: PhotoSize,
): string | undefined {
  const key = photo ? `${size}|${photo}` : ''
  // Tagged with what it was loaded for, so a stale URL is never returned.
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(
    null,
  )

  useEffect(() => {
    if (!photo) return
    let url: string | undefined
    // Aborted on cleanup: a thumbnail scrolled away stops jumping the queue.
    const gone = new AbortController()
    const load =
      size === 'thumb' ? loadThumbnail(photo, gone.signal) : loadPhoto(photo)
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
  }, [photo, size, key])

  return loaded?.key === key ? loaded.url : undefined
}
