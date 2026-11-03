import { get, set } from 'idb-keyval'
import type { Track } from '../types/track.ts'

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg; codecs=opus',
  wav: 'audio/wav',
  flac: 'audio/flac',
  webm: 'audio/webm',
}

export type CanPlay = (mime: string) => boolean

let probe: HTMLAudioElement | undefined
export const browserCanPlay: CanPlay = (mime) => {
  probe ??= document.createElement('audio')
  return probe.canPlayType(mime) !== ''
}

export function isPlayable(path: string, canPlay: CanPlay): boolean {
  if (path.split('/').some((part) => part.startsWith('.'))) return false // hidden
  const dot = path.lastIndexOf('.')
  const mime = MIME_BY_EXTENSION[path.slice(dot + 1).toLowerCase()]
  return dot > 0 && mime !== undefined && canPlay(mime)
}

export function makeTrack(path: string, open: () => Promise<File>): Track {
  const slash = path.lastIndexOf('/')
  return {
    path,
    name: path.slice(slash + 1).replace(/\.[^.]+$/, ''),
    folder: slash >= 0 ? path.slice(0, slash) : '',
    open,
  }
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export function sortTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => collator.compare(a.path, b.path))
}

/** All playable files in the folder and its subfolders, sorted by path. */
export async function scanFolder(
  folder: FileSystemDirectoryHandle,
  canPlay: CanPlay = browserCanPlay,
): Promise<Track[]> {
  const tracks: Track[] = []
  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const entry of dir.values()) {
      const path = prefix + entry.name
      if (entry.kind === 'directory') {
        if (!entry.name.startsWith('.')) await walk(entry, `${path}/`)
      } else if (isPlayable(path, canPlay)) {
        tracks.push(makeTrack(path, () => entry.getFile()))
      }
    }
  }
  await walk(folder, '')
  return sortTracks(tracks)
}

/**
 * Tracks from an `<input webkitdirectory>` pick (browsers without folder access).
 * webkitRelativePath is 'Chosen/Sub/song.mp3'; paths are made relative to 'Chosen'.
 */
export function tracksFromFiles(
  files: File[],
  canPlay: CanPlay = browserCanPlay,
): { folderName: string; tracks: Track[] } {
  const folderName = files[0]?.webkitRelativePath.split('/')[0] ?? ''
  const tracks = files.flatMap((file) => {
    const path =
      file.webkitRelativePath.split('/').slice(1).join('/') || file.name
    return isPlayable(path, canPlay)
      ? [makeTrack(path, () => Promise.resolve(file))]
      : []
  })
  return { folderName, tracks: sortTracks(tracks) }
}

const FOLDER_KEY = 'music.folder'

/** Chrome/Edge can open a folder and remember it; Firefox/Safari can't. */
export function supportsFolderAccess(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const folder = await window.showDirectoryPicker({
    id: 'music',
    mode: 'read',
    startIn: 'music',
  })
  await set(FOLDER_KEY, folder)
  return folder
}

export function loadSavedFolder(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return get<FileSystemDirectoryHandle>(FOLDER_KEY)
}

/** After a reload the browser may need a click (`ask`) to grant read access again. */
export async function hasReadAccess(
  folder: FileSystemDirectoryHandle,
  ask = false,
): Promise<boolean> {
  const options = { mode: 'read' } as const
  if ((await folder.queryPermission(options)) === 'granted') return true
  return ask && (await folder.requestPermission(options)) === 'granted'
}
