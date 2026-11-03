import { describe, expect, it } from 'vitest'
import {
  isPlayable,
  scanFolder,
  tracksFromFiles,
  type CanPlay,
} from './musicFolder.ts'

// jsdom can't play audio, so pretend the browser supports everything except FLAC.
const canPlay: CanPlay = (mime) => mime !== 'audio/flac'

type FakeEntry =
  FakeFolder | { kind: 'file'; name: string; getFile: () => Promise<File> }
interface FakeFolder {
  kind: 'directory'
  name: string
  values: () => AsyncGenerator<FakeEntry>
}

function folder(name: string, entries: FakeEntry[]): FakeFolder {
  return {
    kind: 'directory',
    name,
    async *values() {
      yield* entries
    },
  }
}

function file(name: string): FakeEntry {
  return { kind: 'file', name, getFile: async () => new File(['x'], name) }
}

describe('isPlayable', () => {
  it('keeps supported audio files and skips the rest', () => {
    expect(isPlayable('song.MP3', canPlay)).toBe(true)
    expect(isPlayable('Lofi/song.opus', canPlay)).toBe(true)
    expect(isPlayable('song.flac', canPlay)).toBe(false) // unsupported here
    expect(isPlayable('cover.jpg', canPlay)).toBe(false)
    expect(isPlayable('mp3', canPlay)).toBe(false)
    expect(isPlayable('.hidden.mp3', canPlay)).toBe(false)
    expect(isPlayable('.Trash/song.mp3', canPlay)).toBe(false)
  })
})

describe('scanFolder', () => {
  it('walks subfolders, filters and sorts naturally by path', async () => {
    const music = folder('Music', [
      file('10 - ten.mp3'),
      file('2 - two.mp3'),
      file('notes.txt'),
      folder('Lofi', [file('rain walk.ogg'), file('cover.png')]),
      folder('.cache', [file('junk.mp3')]),
    ])
    const tracks = await scanFolder(
      music as unknown as FileSystemDirectoryHandle,
      canPlay,
    )
    expect(tracks.map((t) => t.path)).toEqual([
      '2 - two.mp3',
      '10 - ten.mp3',
      'Lofi/rain walk.ogg',
    ])
    expect(tracks[2]).toMatchObject({ name: 'rain walk', folder: 'Lofi' })
    expect((await tracks[0].open()).name).toBe('2 - two.mp3')
  })
})

describe('tracksFromFiles (fallback picker)', () => {
  it('makes paths relative to the chosen folder', async () => {
    const pick = (path: string) => {
      const f = new File(['x'], path.split('/').pop()!)
      Object.defineProperty(f, 'webkitRelativePath', { value: path })
      return f
    }
    const { folderName, tracks } = tracksFromFiles(
      [pick('Music/b.mp3'), pick('Music/Lofi/a.mp3'), pick('Music/readme.md')],
      canPlay,
    )
    expect(folderName).toBe('Music')
    expect(tracks.map((t) => t.path)).toEqual(['b.mp3', 'Lofi/a.mp3'])
    expect((await tracks[1].open()).name).toBe('a.mp3')
  })
})
