import { useEffect, useState, type ReactNode } from 'react'
import { createJsonStore } from '../lib/storage.ts'
import { parseYouTube, sameVideo, type YouTubeRef } from '../lib/youtube.ts'
import { VideoContext, type SavedVideo } from './useVideos.ts'

interface VideoState {
  videos: SavedVideo[]
  currentId: string | null
}

const videoStore = createJsonStore<VideoState>('todoapp.videos.v1', () => ({
  videos: [],
  currentId: null,
}))

function defaultName(ref: YouTubeRef): string {
  return ref.videoId ? `Video ${ref.videoId}` : `Playlist ${ref.playlistId}`
}

export function VideoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => videoStore.load())

  useEffect(() => {
    videoStore.save(state)
  }, [state])

  const current =
    state.videos.find((video) => video.id === state.currentId) ??
    state.videos[0]

  function add(input: string, name: string): string | null {
    const ref = parseYouTube(input)
    if (!ref) return "That doesn't look like a YouTube link or embed code."
    const existing = state.videos.find((video) => sameVideo(video, ref))
    if (existing) {
      setState((s) => ({ ...s, currentId: existing.id }))
      return null
    }
    const video = {
      ...ref,
      id: crypto.randomUUID(),
      name: name.trim() || defaultName(ref),
    }
    setState((s) => ({ videos: [...s.videos, video], currentId: video.id }))
    return null
  }

  function select(id: string) {
    setState((s) => ({ ...s, currentId: id }))
  }

  function remove(id: string) {
    setState((s) => {
      const videos = s.videos.filter((video) => video.id !== id)
      const currentId =
        s.currentId === id ? (videos[0]?.id ?? null) : s.currentId
      return { videos, currentId }
    })
  }

  return (
    <VideoContext
      value={{ videos: state.videos, current, add, select, remove }}
    >
      {children}
    </VideoContext>
  )
}
