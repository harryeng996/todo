import { X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { isStorageFull, subscribeStorageFull } from '../lib/storage.ts'
import { SketchButton } from './sketch/SketchButton.tsx'

/**
 * Shown once when the browser refuses a save because storage is full, so
 * changes aren't lost without a word. Dismissed for the rest of the visit.
 */
export function StorageNotice() {
  const full = useSyncExternalStore(subscribeStorageFull, isStorageFull)
  const [dismissed, setDismissed] = useState(false)
  if (!full || dismissed) return null

  return (
    <div className="storage-notice sketch-border" role="alert">
      <p>
        <strong>Storage is full.</strong> Your latest changes may be lost when
        you close this page. Deleting old photos or quotes frees up space.
      </p>
      <SketchButton
        variant="ghost"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss storage warning"
      >
        <X size={18} strokeWidth={1.75} aria-hidden="true" />
      </SketchButton>
    </div>
  )
}
