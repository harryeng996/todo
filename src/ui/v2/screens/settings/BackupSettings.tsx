import { Download, HardDrive, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  downloadBackupFile,
  readBackupFile,
} from '../../../../lib/backup/file.ts'
import {
  applySnapshot,
  photoKeysOf,
  type Snapshot,
} from '../../../../lib/backup/snapshot.ts'
import { Button } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/toastContext.ts'

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Export this browser's data to a JSON file, and import one back. */
export function BackupSettings({ id }: { id: string }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Snapshot | null>(null)
  const [applying, setApplying] = useState(false)

  async function exportFile() {
    try {
      await downloadBackupFile()
    } catch (error) {
      toast({ tone: 'danger', message: messageOf(error) })
    }
  }

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = '' // the same file can be picked again
    if (!file) return
    try {
      setPending(await readBackupFile(file))
    } catch (error) {
      toast({ tone: 'danger', message: messageOf(error) })
    }
  }

  async function apply() {
    if (!pending) return
    setApplying(true)
    try {
      await applySnapshot(pending)
      location.reload()
    } catch (error) {
      setApplying(false)
      toast({ tone: 'danger', message: `Couldn’t import: ${messageOf(error)}` })
    }
  }

  const photos = pending ? photoKeysOf(pending).length : 0

  return (
    <Card
      id={id}
      icon={<HardDrive size={16} />}
      title="Backup"
      subtitle="Save your data as a file, or bring it back from one. The file stays wherever you keep it."
    >
      <div className="field-row">
        <div>
          <p className="field-row__label">Backup file</p>
          <p className="field-row__hint">
            Tasks, focus sessions, weight log, targets, quotes and settings as a
            JSON file. Photos aren’t included.
          </p>
        </div>
        <div className="backup-actions">
          <Button
            size="sm"
            icon={<Download size={14} />}
            onClick={() => void exportFile()}
          >
            Export
          </Button>
          <Button
            size="sm"
            icon={<Upload size={14} />}
            onClick={() => input.current?.click()}
          >
            Import…
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Backup file to import"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </div>
      </div>
      <p className="field-row__hint">
        The file isn’t encrypted: keep it somewhere private.
      </p>

      <Sheet
        open={pending !== null}
        onClose={() => !applying && setPending(null)}
        title="Import this backup?"
        description="Replaces the tasks, focus sessions, weight log, targets, quotes and settings in this browser. The page reloads afterwards."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={applying}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void apply()}
              disabled={applying}
            >
              {applying ? 'Importing…' : 'Replace my data'}
            </Button>
          </>
        }
      >
        {pending && (
          <dl className="data-counts">
            <div>
              <dt>Made</dt>
              <dd className="backup-made">
                {dateTime.format(new Date(pending.createdAt))}
              </dd>
            </div>
            <div>
              <dt>Tasks</dt>
              <dd className="num">{pending.todos.length}</dd>
            </div>
            <div>
              <dt>Focus sessions</dt>
              <dd className="num">{pending.sessions.length}</dd>
            </div>
          </dl>
        )}
        {photos > 0 && (
          <p className="field-row__hint">
            The file lists {photos} photo{photos === 1 ? '' : 's'}; only those
            already in this browser will show.
          </p>
        )}
      </Sheet>
    </Card>
  )
}
