import { FolderOpen, RefreshCw } from 'lucide-react'
import type { Track } from '../../types/track.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'

interface PlaylistProps {
  folderName: string
  tracks: Track[]
  current: number
  remembered: boolean
  isFailed: (path: string) => boolean
  onSelect: (index: number) => void
  onRescan: () => void
  onChangeFolder: () => void
}

export function Playlist({
  folderName,
  tracks,
  current,
  remembered,
  isFailed,
  onSelect,
  onRescan,
  onChangeFolder,
}: PlaylistProps) {
  return (
    <details className="playlist">
      <summary className="playlist__summary">
        <FolderOpen size={18} strokeWidth={1.75} aria-hidden="true" />
        {folderName} · {tracks.length}{' '}
        {tracks.length === 1 ? 'track' : 'tracks'}
      </summary>
      <ol className="playlist__tracks">
        {tracks.map((track, i) => {
          const broken = isFailed(track.path)
          return (
            <li key={track.path}>
              <button
                type="button"
                className={[
                  'playlist__track',
                  i === current && 'playlist__track--current',
                  broken && 'playlist__track--failed',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(i)}
                aria-current={i === current ? 'true' : undefined}
                title={broken ? "Couldn't play this file" : track.path}
              >
                {track.folder && (
                  <span className="playlist__folder">{track.folder}/</span>
                )}
                {track.name}
              </button>
            </li>
          )
        })}
      </ol>
      <div className="playlist__actions">
        {remembered && (
          <SketchButton variant="ghost" onClick={onRescan}>
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
            Rescan
          </SketchButton>
        )}
        <SketchButton variant="ghost" onClick={onChangeFolder}>
          <FolderOpen size={16} strokeWidth={1.75} aria-hidden="true" />
          Change folder
        </SketchButton>
      </div>
      {!remembered && (
        <p className="playlist__note">
          This browser can't remember folders, so you'll choose it again next
          visit.
        </p>
      )}
    </details>
  )
}
