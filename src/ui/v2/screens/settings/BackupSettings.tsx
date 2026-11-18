import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Copy,
  Download,
  Eye,
  EyeOff,
  History,
  LoaderCircle,
  Unplug,
  Upload,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  downloadBackupFile,
  readBackupFile,
} from '../../../../lib/backup/file.ts'
import type { SnapshotInfo } from '../../../../lib/backup/provider.ts'
import {
  applySnapshot,
  type Snapshot,
} from '../../../../lib/backup/snapshot.ts'
import {
  DEFAULT_BUCKET,
  isValidBucket,
  normalizeProjectUrl,
} from '../../../../lib/backup/supabase.ts'
import { normalizeLog, slidesOf } from '../../../../lib/weight.ts'
import {
  backUpNow,
  connect,
  disconnect,
  listBackups,
  restoreNow,
  updateBackupOptions,
  useBackup,
  type Activity,
} from '../../../../state/backup.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import { Switch } from '../../components/Switch.tsx'
import { useToast } from '../../components/toastContext.ts'

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** 'just now', '5 minutes ago', 'yesterday'… */
function timeAgo(then: number, now = Date.now()): string {
  const minutes = Math.round((now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relative.format(-hours, 'hour')
  return relative.format(-Math.round(hours / 24), 'day')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 ** 2).toFixed(1)} MB`
}

function activityText(activity: Activity): string {
  if (activity.kind === 'idle') return ''
  const { step, done = 0, total = 0 } = activity.progress
  const restoring = activity.kind === 'restore'
  if (step === 'photos')
    return `${restoring ? 'Downloading' : 'Uploading'} photos ${done} of ${total}…`
  if (step === 'finishing')
    return restoring ? 'Restoring your data…' : 'Saving the backup…'
  return restoring ? 'Downloading the backup…' : 'Reading your data…'
}

const setupSql = (
  bucket: string,
) => `-- Lets the app's key use only the "${bucket}" bucket.
create policy "todoapp backup read" on storage.objects
  for select to anon using (bucket_id = '${bucket}');
create policy "todoapp backup insert" on storage.objects
  for insert to anon with check (bucket_id = '${bucket}');
create policy "todoapp backup update" on storage.objects
  for update to anon using (bucket_id = '${bucket}');
create policy "todoapp backup delete" on storage.objects
  for delete to anon using (bucket_id = '${bucket}');`

/** Backup to the person's own Supabase bucket, and backup files. */
export function BackupSettings({ id }: { id: string }) {
  const { connection } = useBackup()
  return (
    <Card
      id={id}
      icon={<CloudUpload size={16} />}
      title="Backup"
      subtitle="Keep a copy of your data in your own Supabase project (the free plan is enough)."
    >
      {connection ? <Connected /> : <ConnectForm />}
      <FileBackup />
    </Card>
  )
}

function SetupGuide({ bucket }: { bucket: string }) {
  const toast = useToast()
  const sql = setupSql(isValidBucket(bucket) ? bucket : DEFAULT_BUCKET)
  return (
    <details className="backup-guide">
      <summary>How to set up Supabase (about 5 minutes)</summary>
      <ol>
        <li>
          Create a free project at{' '}
          <a href="https://supabase.com" target="_blank" rel="noreferrer">
            supabase.com
          </a>
          .
        </li>
        <li>
          <strong>Storage → New bucket</strong>: name it “
          {isValidBucket(bucket) ? bucket : DEFAULT_BUCKET}”, leave{' '}
          <em>Public bucket</em> off.
        </li>
        <li>
          <strong>SQL Editor</strong>: run this, so the app’s key can use that
          bucket and nothing else:
          <pre className="backup-guide__sql">{sql}</pre>
          <Button
            size="sm"
            variant="ghost"
            icon={<Copy size={14} />}
            onClick={() =>
              void navigator.clipboard
                ?.writeText(sql)
                .then(() => toast({ message: 'SQL copied' }))
                .catch(() =>
                  toast({ message: 'Couldn’t copy; select it instead' }),
                )
            }
          >
            Copy SQL
          </Button>
        </li>
        <li>
          <strong>Project Settings → API Keys</strong>: copy the Project URL and
          the <em>anon</em> (or <em>publishable</em>) key into the form above.
          Never use the service_role or secret key here.
        </li>
      </ol>
      <p className="field-row__hint">
        The backup isn’t encrypted: anyone with both the URL and the key can
        read the bucket, so keep them to yourself. A free project pauses after a
        week without use; open the Supabase dashboard to resume it.
      </p>
    </details>
  )
}

function ConnectForm() {
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [bucket, setBucket] = useState(DEFAULT_BUCKET)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const ids = useId()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const origin = normalizeProjectUrl(url)
    const name = bucket.trim()
    const key = apiKey.trim()
    if (!origin)
      return setError('Enter the project URL, like https://abcd.supabase.co')
    if (!key) return setError('Enter the project’s anon or publishable key.')
    if (!isValidBucket(name))
      return setError(
        'Bucket names use lowercase letters, numbers, dots, dashes and underscores.',
      )
    setError('')
    setChecking(true)
    try {
      await connect({ url: origin, apiKey: key, bucket: name })
    } catch (failure) {
      setError(messageOf(failure))
      setChecking(false)
    }
  }

  return (
    <form className="backup-form" onSubmit={submit} noValidate>
      <label className="backup-field">
        <span className="field-row__label">Project URL</span>
        <input
          className="input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://abcd1234.supabase.co"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="backup-field">
        <label className="field-row__label" htmlFor={`${ids}-key`}>
          API key (anon or publishable)
        </label>
        <span className="backup-field__key">
          <input
            id={`${ids}-key`}
            className="input"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sb_publishable_… or eyJ…"
            autoComplete="off"
            spellCheck={false}
          />
          <IconButton
            size="sm"
            label={showKey ? 'Hide key' : 'Show key'}
            onClick={() => setShowKey((s) => !s)}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </IconButton>
        </span>
      </div>
      <label className="backup-field">
        <span className="field-row__label">Bucket</span>
        <input
          className="input"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {error && (
        <p className="field-error backup-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="backup-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={checking}
          icon={
            checking ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <CloudUpload size={16} />
            )
          }
        >
          {checking ? 'Checking…' : 'Connect'}
        </Button>
        <span className="field-row__hint">
          The key is kept in this browser only and never goes into a backup.
        </span>
      </div>
      <SetupGuide bucket={bucket.trim()} />
    </form>
  )
}

function Connected() {
  const backup = useBackup()
  const toast = useToast()
  const [restoring, setRestoring] = useState(false)
  // A fresh sheet (list, choice, error) each time it opens.
  const [sheetKey, setSheetKey] = useState(0)
  // A new device: does the bucket already hold backups to restore?
  const [existing, setExisting] = useState<number | null>(null)
  const { connection, activity, armed } = backup
  const working = activity.kind !== 'idle'

  useEffect(() => {
    if (armed) return
    let live = true
    listBackups()
      .then((list) => live && setExisting(list.length))
      .catch(() => live && setExisting(null))
    return () => {
      live = false
    }
  }, [armed])

  async function runBackup() {
    try {
      const { photosUploaded } = await backUpNow()
      toast({
        tone: 'success',
        message: photosUploaded
          ? `Backed up, with ${photosUploaded} new photo${photosUploaded === 1 ? '' : 's'}`
          : 'Backed up',
      })
    } catch {
      // Shown in the status line.
    }
  }

  const host = connection ? new URL(connection.url).host : ''

  return (
    <div className="backup">
      <div className="field-row backup__connection">
        <div>
          <p className="field-row__label">Connected to {host}</p>
          <p className="field-row__hint">Bucket “{connection?.bucket}”</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={<Unplug size={14} />}
          onClick={disconnect}
          disabled={working}
        >
          Disconnect
        </Button>
      </div>

      <p className="backup-status" role="status">
        {working ? (
          <>
            <LoaderCircle size={15} className="spin" />
            {activityText(activity)}
          </>
        ) : backup.lastError ? (
          <span className="backup-status--error">
            <AlertCircle size={15} />
            Last backup failed: {backup.lastError}
          </span>
        ) : backup.lastBackupAt ? (
          <span title={dateTime.format(backup.lastBackupAt)}>
            <CheckCircle2 size={15} />
            Last backup {timeAgo(backup.lastBackupAt)}
          </span>
        ) : (
          <span>Not backed up from this browser yet.</span>
        )}
      </p>

      {!armed && existing !== null && existing > 0 && (
        <div className="callout">
          <p>
            This bucket already has {existing} backup
            {existing === 1 ? '' : 's'}. On a new device, restore one to bring
            your data here. Backing up this browser adds a new one.
          </p>
        </div>
      )}

      <div className="backup-actions">
        <Button
          variant="primary"
          icon={<CloudUpload size={16} />}
          onClick={() => void runBackup()}
          disabled={working}
        >
          Back up now
        </Button>
        <Button
          icon={<History size={16} />}
          onClick={() => {
            setSheetKey((k) => k + 1)
            setRestoring(true)
          }}
          disabled={working}
        >
          Restore…
        </Button>
      </div>

      <Switch
        id="backup-auto"
        label="Back up automatically"
        hint={
          armed
            ? 'Once a day while the app is open.'
            : 'Once a day while the app is open, starting after your first backup or restore here.'
        }
        checked={backup.auto}
        onChange={(auto) => updateBackupOptions({ auto })}
      />
      <Switch
        id="backup-photos"
        label="Include progress photos"
        hint="Only photos not uploaded yet are sent each time."
        checked={backup.includePhotos}
        onChange={(includePhotos) => updateBackupOptions({ includePhotos })}
      />

      <RestoreSheet
        key={sheetKey}
        open={restoring}
        onClose={() => setRestoring(false)}
      />
    </div>
  )
}

function RestoreSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { activity } = useBackup()
  const [list, setList] = useState<SnapshotInfo[] | null>(null)
  const [error, setError] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const restoring = activity.kind === 'restore'

  useEffect(() => {
    if (!open) return
    let live = true
    listBackups()
      .then((found) => {
        if (!live) return
        setList(found)
        setChosen(found[0]?.name ?? null)
      })
      .catch((failure) => live && setError(messageOf(failure)))
    return () => {
      live = false
    }
  }, [open])

  async function restore() {
    if (!chosen) return
    setError('')
    try {
      await restoreNow(chosen)
      location.reload()
    } catch (failure) {
      setError(messageOf(failure))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => !restoring && onClose()}
      title="Restore a backup"
      description="Replaces the tasks, focus sessions, weight log, quotes and settings in this browser with the backup’s. Photos are added, never deleted. The page reloads afterwards."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={restoring}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void restore()}
            disabled={!chosen || restoring}
            icon={
              restoring ? (
                <LoaderCircle size={16} className="spin" />
              ) : undefined
            }
          >
            {restoring ? activityText(activity) : 'Replace my data'}
          </Button>
        </>
      }
    >
      {error && (
        <p className="field-error backup-form__error" role="alert">
          {error}
        </p>
      )}
      {list === null && !error && <p className="empty">Loading backups…</p>}
      {list?.length === 0 && (
        <p className="empty">No backups in this bucket yet.</p>
      )}
      {list && list.length > 0 && (
        <fieldset className="backup-list" disabled={restoring}>
          <legend className="visually-hidden">Backups, newest first</legend>
          {list.map((info, index) => (
            <label key={info.name} className="backup-list__item">
              <input
                type="radio"
                name="backup"
                value={info.name}
                checked={chosen === info.name}
                onChange={() => setChosen(info.name)}
              />
              <span className="setting-row__main">
                <strong>
                  {dateTime.format(info.createdAt)}
                  {index === 0 && <em className="chip chip--accent">latest</em>}
                </strong>
                <span className="subtle">
                  {timeAgo(info.createdAt.getTime())}
                  {info.size !== null ? ` · ${formatBytes(info.size)}` : ''}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </Sheet>
  )
}

/** Export and import a JSON file: works without any account. */
function FileBackup() {
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

  const photos = pending
    ? slidesOf(normalizeLog(pending.local['todoapp.weight.v1'])).length
    : 0

  return (
    <div className="field-row backup-file">
      <div>
        <p className="field-row__label">Backup file</p>
        <p className="field-row__hint">
          Everything except photos, as a JSON file. Works without Supabase.
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

      <Sheet
        open={pending !== null}
        onClose={() => !applying && setPending(null)}
        title="Import this backup?"
        description="Replaces the tasks, focus sessions, weight log, quotes and settings in this browser. The page reloads afterwards."
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
            already in this browser will show. Restore from Supabase to bring
            photos back.
          </p>
        )}
      </Sheet>
    </div>
  )
}
