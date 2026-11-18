import type { PhotoKey } from '../weight.ts'
import {
  BackupError,
  snapshotTime,
  type BackupProvider,
  type SnapshotInfo,
} from './provider.ts'

export interface SupabaseConnection {
  /** Project URL, e.g. https://abcd1234.supabase.co */
  url: string
  /** The project's anon / publishable key. */
  apiKey: string
  bucket: string
}

export const DEFAULT_BUCKET = 'todoapp-backup'

/**
 * 'abcd.supabase.co', 'https://abcd.supabase.co/rest/v1/' → 'https://abcd.supabase.co';
 * null when it isn't a URL. Plain http only for a local Supabase.
 */
export function normalizeProjectUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  let url: URL
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    return null
  if (!url.hostname.includes('.') && !local) return null
  return url.origin
}

/** Bucket names Supabase accepts. */
export function isValidBucket(name: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,62}$/.test(name)
}

const SNAPSHOTS = 'snapshots'
const PHOTOS = 'photos'
const CHECK_FILE = 'connection-check.txt'
const PAGE = 1000

// Object names may not contain '~' (photo keys use it); '_' never appears in a key.
const photoObject = (key: PhotoKey) => `${PHOTOS}/${key.replace('~', '_')}`
const photoKeyOf = (name: string): PhotoKey => name.replace('_', '~')

const encodePath = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/')

interface ListedObject {
  name: string
  /** null for a folder. */
  id: string | null
  metadata: { size?: number } | null
}

/** Supabase Storage over its REST API: one bucket, snapshots and photos in folders. */
export function createSupabaseProvider(
  { url, apiKey, bucket }: SupabaseConnection,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): BackupProvider {
  const base = `${url}/storage/v1`
  const bucketPath = encodeURIComponent(bucket)

  function headers(extra?: HeadersInit): Headers {
    const all = new Headers(extra)
    all.set('apikey', apiKey)
    // Legacy keys are JWTs and go in Authorization too; the newer
    // publishable keys (sb_publishable_…) only work as `apikey`.
    if (apiKey.startsWith('eyJ')) all.set('Authorization', `Bearer ${apiKey}`)
    return all
  }

  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response
    try {
      response = await fetchImpl(base + path, {
        ...init,
        headers: headers(init.headers),
      })
    } catch {
      throw new BackupError(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'You’re offline. The backup will be tried again later.'
          : 'Couldn’t reach Supabase. Check the project URL and your connection.',
      )
    }
    if (!response.ok) throw await errorFrom(response, bucket)
    return response
  }

  async function upload(path: string, body: Blob | string, type: string) {
    await call(`/object/${bucketPath}/${encodePath(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': type, 'x-upsert': 'true' },
      body,
    })
  }

  async function download(path: string): Promise<Response> {
    return call(`/object/${bucketPath}/${encodePath(path)}`)
  }

  /** Every file in a folder (not subfolders). */
  async function list(folder: string): Promise<ListedObject[]> {
    const found: ListedObject[] = []
    for (let offset = 0; ; offset += PAGE) {
      const response = await call(`/object/list/${bucketPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: folder,
          limit: PAGE,
          offset,
          sortBy: { column: 'name', order: 'desc' },
        }),
      })
      const page = (await response.json()) as ListedObject[]
      found.push(...page.filter((item) => item.id !== null))
      if (page.length < PAGE) return found
    }
  }

  return {
    async check() {
      // Write then read back a small file: that tries the key, the bucket and
      // its policies, which a listing alone wouldn't (it can come back empty).
      const stamp = new Date().toISOString()
      await upload(CHECK_FILE, stamp, 'text/plain')
      const text = await (await download(CHECK_FILE)).text()
      if (text !== stamp)
        throw new BackupError(
          'The bucket accepted a file but returned something else. Check its policies.',
        )
    },

    async listSnapshots() {
      const items = await list(SNAPSHOTS)
      return items
        .map((item): SnapshotInfo | null => {
          const createdAt = snapshotTime(item.name)
          return createdAt
            ? {
                name: item.name,
                createdAt,
                size: item.metadata?.size ?? null,
              }
            : null
        })
        .filter((info): info is SnapshotInfo => info !== null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },

    putSnapshot: (name, json) =>
      upload(`${SNAPSHOTS}/${name}`, json, 'application/json'),

    async getSnapshot(name) {
      return (await download(`${SNAPSHOTS}/${name}`)).text()
    },

    async deleteSnapshots(names) {
      if (!names.length) return
      await call(`/object/${bucketPath}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefixes: names.map((name) => `${SNAPSHOTS}/${name}`),
        }),
      })
    },

    async listPhotos() {
      const items = await list(PHOTOS)
      return new Set(items.map((item) => photoKeyOf(item.name)))
    },

    putPhoto: (key, photo) =>
      upload(photoObject(key), photo, photo.type || 'image/jpeg'),

    async getPhoto(key) {
      return (await download(photoObject(key))).blob()
    },
  }
}

/** Supabase's error, as something a person can act on. */
async function errorFrom(
  response: Response,
  bucket: string,
): Promise<BackupError> {
  let message = ''
  let code = String(response.status)
  try {
    const body = (await response.json()) as {
      message?: string
      error?: string
      statusCode?: string | number
    }
    message = body.message ?? body.error ?? ''
    if (body.statusCode) code = String(body.statusCode)
  } catch {
    // Not JSON: go by the status alone.
  }
  const text = message.toLowerCase()
  if (text.includes('bucket not found'))
    return new BackupError(
      `There’s no bucket named “${bucket}” in this project.`,
    )
  if (
    code === '401' ||
    text.includes('invalid api key') ||
    text.includes('jwt') ||
    text.includes('signature')
  )
    return new BackupError(
      'Supabase didn’t accept the API key. Copy the anon or publishable key again.',
    )
  if (
    code === '403' ||
    text.includes('row-level security') ||
    text.includes('unauthorized')
  )
    return new BackupError(
      `The bucket “${bucket}” doesn’t allow this yet. Run the setup SQL for it (see “How to set up”).`,
    )
  if (code === '404' || text.includes('not found'))
    return new BackupError('That file isn’t in the bucket anymore.')
  if (code === '413' || text.includes('too large'))
    return new BackupError('A file is larger than the bucket allows.')
  return new BackupError(
    `Supabase error ${response.status}${message ? `: ${message}` : ''}`,
  )
}
