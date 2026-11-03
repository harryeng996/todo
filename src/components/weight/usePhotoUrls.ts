import { useEffect, useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { loadPhoto } from '../../lib/photos.ts'

type PhotoUrls = Record<DateKey, string>

/** Object URLs for these days' photos; revoked when the set or a photo changes. */
export function usePhotoUrls(dates: DateKey[], version: number): PhotoUrls {
  // Compared by value: callers build a new array on every render.
  const dateList = dates.join()
  const key = `${dateList}|${version}`
  // Tagged with the set it belongs to, so stale URLs are never returned.
  const [loaded, setLoaded] = useState<{ key: string; urls: PhotoUrls } | null>(
    null,
  )

  useEffect(() => {
    if (!dateList) return
    const wanted = dateList.split(',')
    const created: string[] = []
    let cancelled = false
    void Promise.all(
      wanted.map((date) => loadPhoto(date).catch(() => undefined)),
    ).then((blobs) => {
      if (cancelled) return
      const urls: PhotoUrls = {}
      blobs.forEach((blob, i) => {
        if (!blob) return
        urls[wanted[i]] = URL.createObjectURL(blob)
        created.push(urls[wanted[i]])
      })
      setLoaded({ key, urls })
    })
    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [dateList, key])

  return loaded?.key === key ? loaded.urls : {}
}
