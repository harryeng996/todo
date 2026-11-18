import { describe, expect, it, vi } from 'vitest'
import {
  createSupabaseProvider,
  isValidBucket,
  normalizeProjectUrl,
} from './supabase.ts'

const URL_ = 'https://abcd.supabase.co'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function setup(
  respond: (url: string, init: RequestInit) => Response | Promise<Response>,
  apiKey = 'sb_publishable_abc',
) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) =>
      respond(String(input), init ?? {}),
  )
  const provider = createSupabaseProvider(
    { url: URL_, apiKey, bucket: 'todoapp-backup' },
    fetchMock as unknown as typeof fetch,
  )
  return { provider, fetchMock }
}

const headerOf = (init: RequestInit, name: string) =>
  new Headers(init.headers).get(name)

describe('project URL', () => {
  it('accepts the usual ways of pasting it', () => {
    expect(normalizeProjectUrl('abcd.supabase.co')).toBe(URL_)
    expect(normalizeProjectUrl(' https://abcd.supabase.co/rest/v1/ ')).toBe(
      URL_,
    )
    expect(normalizeProjectUrl('http://localhost:54321')).toBe(
      'http://localhost:54321',
    )
  })

  it('refuses what isn’t one', () => {
    expect(normalizeProjectUrl('')).toBeNull()
    expect(normalizeProjectUrl('not a url')).toBeNull()
    expect(normalizeProjectUrl('http://abcd.supabase.co')).toBeNull()
  })

  it('checks bucket names', () => {
    expect(isValidBucket('todoapp-backup')).toBe(true)
    expect(isValidBucket('My Bucket')).toBe(false)
  })
})

describe('Supabase storage', () => {
  it('uploads with the key, and sends a JWT key as a bearer token too', async () => {
    const { provider, fetchMock } = setup(() => json({ Key: 'x' }))
    await provider.putSnapshot('2026-11-18T09-05-07-123Z.json', '{}')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `${URL_}/storage/v1/object/todoapp-backup/snapshots/2026-11-18T09-05-07-123Z.json`,
    )
    expect(init!.method).toBe('POST')
    expect(headerOf(init!, 'apikey')).toBe('sb_publishable_abc')
    expect(headerOf(init!, 'x-upsert')).toBe('true')
    expect(headerOf(init!, 'Authorization')).toBeNull()

    const legacy = setup(() => json({}), 'eyJhbGciOi.legacy')
    await legacy.provider.putSnapshot('a.json', '{}')
    expect(headerOf(legacy.fetchMock.mock.calls[0][1]!, 'Authorization')).toBe(
      'Bearer eyJhbGciOi.legacy',
    )
  })

  it('stores photos under names Supabase accepts', async () => {
    const { provider, fetchMock } = setup((url, init) =>
      init.method === 'POST' && url.includes('/object/list/')
        ? json([
            { name: '2026-11-18_abc', id: '1', metadata: { size: 10 } },
            { name: '2026-11-17', id: '2', metadata: { size: 10 } },
          ])
        : json({}),
    )
    await provider.putPhoto(
      '2026-11-18~abc',
      new Blob(['x'], { type: 'image/jpeg' }),
    )
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${URL_}/storage/v1/object/todoapp-backup/photos/2026-11-18_abc`,
    )
    expect(await provider.listPhotos()).toEqual(
      new Set(['2026-11-18~abc', '2026-11-17']),
    )
  })

  it('lists backups newest first, skipping other files and folders', async () => {
    const { provider } = setup(() =>
      json([
        {
          name: '2026-11-17T08-00-00-000Z.json',
          id: 'a',
          metadata: { size: 5 },
        },
        {
          name: '2026-11-18T08-00-00-000Z.json',
          id: 'b',
          metadata: { size: 7 },
        },
        { name: 'notes.txt', id: 'c', metadata: null },
        { name: 'old', id: null, metadata: null },
      ]),
    )
    const list = await provider.listSnapshots()
    expect(list.map((s) => s.name)).toEqual([
      '2026-11-18T08-00-00-000Z.json',
      '2026-11-17T08-00-00-000Z.json',
    ])
    expect(list[0].size).toBe(7)
  })

  it('reads every page of a long listing', async () => {
    const page = (start: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        name: `k${start + i}`,
        id: String(start + i),
        metadata: null,
      }))
    const { provider, fetchMock } = setup((_url, init) => {
      const { offset } = JSON.parse(String(init.body))
      return json(offset === 0 ? page(0, 1000) : page(1000, 5))
    })
    expect((await provider.listPhotos()).size).toBe(1005)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('checks the connection by writing and reading back a file', async () => {
    let stored = ''
    const { provider } = setup((_url, init) => {
      if (init.method === 'POST') {
        stored = String(init.body)
        return json({})
      }
      return new Response(stored)
    })
    await expect(provider.check()).resolves.toBeUndefined()
  })

  it.each([
    [
      {
        statusCode: '404',
        error: 'Bucket not found',
        message: 'Bucket not found',
      },
      400,
      'no bucket named “todoapp-backup”',
    ],
    [
      {
        statusCode: '403',
        error: 'Unauthorized',
        message: 'new row violates row-level security policy',
      },
      400,
      'setup SQL',
    ],
    [{ message: 'Invalid API key' }, 401, 'didn’t accept the API key'],
    [
      { statusCode: '404', error: 'not_found', message: 'Object not found' },
      400,
      'isn’t in the bucket',
    ],
    [{ message: 'Boom' }, 500, 'Supabase error 500: Boom'],
  ])('explains %j', async (body, status, text) => {
    const { provider } = setup(() => json(body, status))
    await expect(provider.getSnapshot('x.json')).rejects.toThrow(text)
  })

  it('says when Supabase can’t be reached', async () => {
    const { provider } = setup(() => {
      throw new TypeError('Failed to fetch')
    })
    await expect(provider.listSnapshots()).rejects.toThrow(
      'Couldn’t reach Supabase',
    )
  })

  it('deletes old backups in one request', async () => {
    const { provider, fetchMock } = setup(() => json([]))
    await provider.deleteSnapshots(['a.json', 'b.json'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${URL_}/storage/v1/object/todoapp-backup`)
    expect(init!.method).toBe('DELETE')
    expect(JSON.parse(String(init!.body))).toEqual({
      prefixes: ['snapshots/a.json', 'snapshots/b.json'],
    })
  })
})
