import type { PhotoKey } from '../../lib/weight.ts'
import { usePhotoUrl } from './usePhotoUrl.ts'

/** Cells in the grid: 2 × 2. */
const CELLS = 4

/**
 * A day's photos as a 2 × 2 grid of thumbnails: one photo fills it, two sit
 * side by side, three put the first on the left. Past four, the last cell
 * shows how many more there are. The history only mounts rows in or near
 * view, so these load about a screen ahead of scrolling.
 */
export function PhotoGrid({ photos }: { photos: readonly PhotoKey[] }) {
  const shown = photos.slice(0, CELLS)
  const more = photos.length - shown.length
  return (
    <span className={`photo-grid photo-grid--${shown.length}`}>
      {shown.map((photo, index) => (
        <GridCell
          key={photo}
          photo={photo}
          more={index === CELLS - 1 ? more : 0}
        />
      ))}
    </span>
  )
}

function GridCell({ photo, more }: { photo: PhotoKey; more: number }) {
  const url = usePhotoUrl(photo, 'thumb')
  return (
    <span className="photo-grid__cell">
      {url && <img src={url} alt="" decoding="async" />}
      {more > 0 && <span className="photo-grid__more">+{more}</span>}
    </span>
  )
}
