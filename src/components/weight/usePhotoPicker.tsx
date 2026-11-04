import { useRef, useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { MAX_PHOTOS_PER_DAY } from '../../lib/limits.ts'
import { isQuotaError } from '../../lib/storage.ts'
import type { PhotoKey } from '../../lib/weight.ts'
import { useWeights } from '../../state/useWeights.ts'

const FULL_MESSAGE =
  'Storage is full, so the photo was not saved. Remove some older photos and try again.'

interface Target {
  date: DateKey
  /** The photo to swap out; adds photos when absent. */
  replace?: PhotoKey
}

/**
 * Opens the file picker to add photos to a day (several at once, up to
 * MAX_PHOTOS_PER_DAY) or to replace one. Render `input` once in the component.
 * `onReplaced` hears a replaced photo's new key (e.g. to keep showing it).
 */
export function usePhotoPicker(
  onReplaced?: (old: PhotoKey, key: PhotoKey) => void,
) {
  const { log, addPhoto, replacePhoto } = useWeights()
  const inputRef = useRef<HTMLInputElement>(null)
  const target = useRef<Target | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number }>()
  const [error, setError] = useState('')

  const room = (date: DateKey) =>
    Math.max(0, MAX_PHOTOS_PER_DAY - (log[date]?.photos.length ?? 0))

  async function save(files: File[], { date, replace }: Target) {
    setError('')
    if (replace) {
      setProgress({ done: 0, total: 1 })
      try {
        onReplaced?.(replace, await replacePhoto(date, replace, files[0]))
      } catch (error) {
        setError(
          isQuotaError(error)
            ? FULL_MESSAGE
            : "That photo couldn't be read. Try a JPEG or PNG.",
        )
      } finally {
        setProgress(undefined)
      }
      return
    }

    // One at a time: each resize decodes a full camera photo.
    const chosen = files.slice(0, room(date))
    const problems: string[] = []
    let unreadable = 0
    try {
      for (const [index, file] of chosen.entries()) {
        setProgress({ done: index, total: chosen.length })
        try {
          await addPhoto(date, file)
        } catch (error) {
          if (isQuotaError(error)) {
            problems.push(FULL_MESSAGE)
            break
          }
          unreadable++
        }
      }
    } finally {
      setProgress(undefined)
    }
    if (unreadable)
      problems.push(
        unreadable === 1
          ? "One photo couldn't be read. Try a JPEG or PNG."
          : `${unreadable} photos couldn't be read. Try JPEG or PNG.`,
      )
    const skipped = files.length - chosen.length
    if (skipped)
      problems.push(
        `A day holds up to ${MAX_PHOTOS_PER_DAY} photos, so ${skipped} ${skipped === 1 ? 'was' : 'were'} not added.`,
      )
    setError(problems.join(' '))
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(event) => {
        const files = [...(event.target.files ?? [])]
        event.target.value = ''
        if (files.length && target.current) void save(files, target.current)
      }}
    />
  )

  function open(next: Target) {
    const picker = inputRef.current
    if (!picker) return
    target.current = next
    picker.multiple = !next.replace
    picker.click()
  }

  return {
    /** Adds photos to `date`. */
    add: (date: DateKey) => open({ date }),
    replace: (date: DateKey, photo: PhotoKey) => open({ date, replace: photo }),
    /** How many more photos `date` can take. */
    room,
    busy: progress !== undefined,
    status: progress
      ? progress.total > 1
        ? `Saving photo ${progress.done + 1} of ${progress.total}…`
        : 'Saving photo…'
      : '',
    error,
    input,
  }
}
