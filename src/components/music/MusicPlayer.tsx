import {
  FolderOpen,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useRef } from 'react'
import { supportsFolderAccess } from '../../lib/musicFolder.ts'
import type { Track } from '../../types/track.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchProgress } from '../sketch/SketchProgress.tsx'
import { Playlist } from './Playlist.tsx'
import { useAudioPlayer } from './useAudioPlayer.ts'
import { useMusicFolder, type FolderState } from './useMusicFolder.ts'

const NO_TRACKS: Track[] = []

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function emptyMessage(state: FolderState): string {
  switch (state.status) {
    case 'loading':
      return 'Looking for your music folder…'
    case 'reconnect':
      return `The browser needs your OK to read “${state.name}” again.`
    case 'missing':
      return `Folder “${state.name}” wasn't found. Choose it again.`
    case 'ready':
      return `No playable audio in “${state.name}”.`
    case 'empty':
      return 'No music yet.'
  }
}

export function MusicPlayer() {
  const folder = useMusicFolder()
  const { state } = folder
  const tracks = state.status === 'ready' ? state.tracks : NO_TRACKS
  const { audioRef, ...player } = useAudioPlayer(tracks)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const chooseFolder = () =>
    supportsFolderAccess() ? void folder.pick() : fileInput.current?.click()

  const icon = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const

  return (
    <SketchBox seed={37} className="music">
      <audio ref={audioRef} {...player.audioProps} />
      <input
        ref={(el) => {
          fileInput.current = el
          // Fallback folder picker; React has no prop for this attribute.
          if (el) el.webkitdirectory = true
        }}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length)
            folder.openFiles([...event.target.files])
          event.target.value = ''
        }}
      />
      <h2 className="music__heading">
        <Music {...icon} /> Music
      </h2>

      {player.track ? (
        <>
          <p className="music__title" title={player.track.path}>
            {player.track.name}
          </p>
          <div className="music__controls">
            <SketchButton
              variant="ghost"
              onClick={player.prev}
              aria-label="Previous track"
            >
              <SkipBack {...icon} />
            </SketchButton>
            <SketchButton
              variant="primary"
              onClick={player.toggle}
              aria-label={player.playing ? 'Pause' : 'Play'}
            >
              {player.playing ? <Pause {...icon} /> : <Play {...icon} />}
            </SketchButton>
            <SketchButton
              variant="ghost"
              onClick={player.next}
              aria-label="Next track"
            >
              <SkipForward {...icon} />
            </SketchButton>
          </div>
          <SketchProgress
            value={player.duration ? player.time / player.duration : 0}
            label="Seek"
            valueText={`${formatTime(player.time)} of ${formatTime(player.duration)}`}
            onSeek={player.seek}
            disabled={!player.duration}
            seed={31}
          />
          <div className="music__row">
            <span className="music__time">
              {formatTime(player.time)} / {formatTime(player.duration)}
            </span>
            <span className="music__volume">
              <SketchButton
                variant="ghost"
                onClick={player.toggleMute}
                aria-label={player.muted ? 'Unmute' : 'Mute'}
              >
                {player.muted ? <VolumeX {...icon} /> : <Volume2 {...icon} />}
              </SketchButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={player.volume}
                onChange={(event) =>
                  player.setVolume(Number(event.target.value))
                }
                aria-label="Volume"
              />
            </span>
          </div>
          <Playlist
            folderName={state.status === 'ready' ? state.name : ''}
            tracks={tracks}
            current={player.index}
            remembered={state.status === 'ready' && state.handle !== undefined}
            isFailed={player.isFailed}
            onSelect={player.select}
            onRescan={() => void folder.rescan()}
            onChangeFolder={chooseFolder}
          />
        </>
      ) : (
        <div className="music__empty">
          <p>{emptyMessage(state)}</p>
          {state.status === 'reconnect' && (
            <SketchButton
              variant="primary"
              onClick={() => void folder.reconnect()}
            >
              <FolderOpen {...icon} />
              Reconnect “{state.name}”
            </SketchButton>
          )}
          {state.status !== 'loading' && (
            <SketchButton
              variant={state.status === 'reconnect' ? 'ghost' : 'primary'}
              onClick={chooseFolder}
            >
              <FolderOpen {...icon} />
              {state.status === 'empty'
                ? 'Choose music folder'
                : 'Choose a folder'}
            </SketchButton>
          )}
        </div>
      )}
    </SketchBox>
  )
}
