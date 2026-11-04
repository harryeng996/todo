import type { DateKey } from '../../lib/date.ts'
import { usePhotoUrl } from './usePhotoUrl.ts'

interface PhotoThumbProps {
  date: DateKey
  version: number
}

/**
 * A day's thumbnail. The history only mounts rows in or near view, so this
 * loads about a screen ahead of scrolling and is released once far away.
 */
export function PhotoThumb({ date, version }: PhotoThumbProps) {
  const url = usePhotoUrl(date, version, 'thumb')
  return (
    <span className="photo-thumb">
      {url && <img src={url} alt="" decoding="async" />}
    </span>
  )
}
