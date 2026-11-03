import { useCallback, useEffect, useState } from 'react'
import {
  hasReadAccess,
  loadSavedFolder,
  pickFolder,
  scanFolder,
  supportsFolderAccess,
  tracksFromFiles,
} from '../../lib/musicFolder.ts'
import type { Track } from '../../types/track.ts'

export type FolderState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'reconnect'; name: string; handle: FileSystemDirectoryHandle }
  | { status: 'missing'; name: string }
  // `handle` is missing when the browser can't remember the folder (fallback input).
  | {
      status: 'ready'
      name: string
      tracks: Track[]
      handle?: FileSystemDirectoryHandle
    }

export function useMusicFolder() {
  const [state, setState] = useState<FolderState>(() =>
    supportsFolderAccess() ? { status: 'loading' } : { status: 'empty' },
  )

  const open = useCallback(async (handle: FileSystemDirectoryHandle) => {
    try {
      setState({
        status: 'ready',
        name: handle.name,
        handle,
        tracks: await scanFolder(handle),
      })
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setState(
        denied
          ? { status: 'reconnect', name: handle.name, handle }
          : { status: 'missing', name: handle.name },
      )
    }
  }, [])

  // Reopen the remembered folder (Chrome/Edge).
  useEffect(() => {
    if (!supportsFolderAccess()) return
    let cancelled = false
    async function restore() {
      const handle = await loadSavedFolder()
      if (cancelled) return
      if (!handle) setState({ status: 'empty' })
      else if (await hasReadAccess(handle)) {
        if (!cancelled) await open(handle)
      } else if (!cancelled)
        setState({ status: 'reconnect', name: handle.name, handle })
    }
    restore().catch(() => setState({ status: 'empty' }))
    return () => {
      cancelled = true
    }
  }, [open])

  async function pick() {
    try {
      await open(await pickFolder())
    } catch {
      // The user closed the picker: keep the current state.
    }
  }

  async function reconnect() {
    if (state.status !== 'reconnect') return
    if (await hasReadAccess(state.handle, true)) await open(state.handle)
  }

  async function rescan() {
    if (state.status === 'ready' && state.handle) await open(state.handle)
  }

  function openFiles(files: File[]) {
    const { folderName, tracks } = tracksFromFiles(files)
    setState({ status: 'ready', name: folderName, tracks })
  }

  return { state, pick, reconnect, rescan, openFiles }
}
