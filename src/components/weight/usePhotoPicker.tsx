import { useRef, useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { isQuotaError } from '../../lib/storage.ts'
import { useWeights } from '../../state/useWeights.ts'

/** Opens the file picker for a given day's photo; render `input` once in the component. */
export function usePhotoPicker() {
  const { setPhoto } = useWeights()
  const inputRef = useRef<HTMLInputElement>(null)
  const target = useRef<DateKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(file: File) {
    if (!target.current) return
    setBusy(true)
    setError('')
    try {
      await setPhoto(target.current, file)
    } catch (error) {
      setError(
        isQuotaError(error)
          ? 'Storage is full, so the photo was not saved. Remove some older photos and try again.'
          : "That photo couldn't be read. Try a JPEG or PNG.",
      )
    } finally {
      setBusy(false)
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) void save(file)
        event.target.value = ''
      }}
    />
  )

  return {
    pick(date: DateKey) {
      target.current = date
      inputRef.current?.click()
    },
    busy,
    error,
    input,
  }
}
