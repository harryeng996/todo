import { createContext, useContext } from 'react'
import type { YouTubeRef } from '../lib/youtube.ts'

export interface SavedVideo extends YouTubeRef {
  id: string
  name: string
}

export interface VideoContextValue {
  videos: SavedVideo[]
  current: SavedVideo | undefined
  /** Returns an error message, or null when the video was added (or already saved). */
  add: (input: string, name: string) => string | null
  select: (id: string) => void
  remove: (id: string) => void
}

// Lives apart from <VideoProvider> so that file only exports components (fast refresh).
export const VideoContext = createContext<VideoContextValue | null>(null)

/** Saved YouTube links, shared by the player and Settings → Videos. */
export function useVideos(): VideoContextValue {
  const value = useContext(VideoContext)
  if (!value) throw new Error('useVideos must be used inside <VideoProvider>')
  return value
}
