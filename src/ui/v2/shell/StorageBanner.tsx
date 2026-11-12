import { HardDrive, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, useSyncExternalStore } from 'react'
import { isStorageFull, subscribeStorageFull } from '../../../lib/storage.ts'
import { navigate } from '../lib/router.ts'

/** Shown once when the browser refuses a save because storage is full (as in v1). */
export function StorageBanner() {
  const full = useSyncExternalStore(subscribeStorageFull, isStorageFull)
  const [dismissed, setDismissed] = useState(false)

  return (
    <AnimatePresence>
      {full && !dismissed && (
        <motion.div
          className="storage-banner"
          role="alert"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
        >
          <HardDrive size={18} aria-hidden="true" />
          <p>
            <strong>Storage is full.</strong> Your latest changes may be lost
            when you close this page. Deleting old photos or quotes frees up
            space.
          </p>
          <button
            type="button"
            className="storage-banner__link"
            onClick={() => navigate('settings', 'data')}
          >
            See storage
          </button>
          <button
            type="button"
            className="storage-banner__close"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss storage warning"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
