// Service worker: makes the app installable and usable offline.
//
// Built by the `serviceWorker` plugin in vite.config.ts, which fills in the
// two placeholders below with the list of files in the build and a hash of
// the build, so every deploy gets a fresh cache and old ones are dropped.
// All paths are relative to this file, so it works under any sub-path
// (e.g. GitHub Pages at /<repo>/).

const VERSION = __VERSION__
const PRECACHE = __PRECACHE__
const CACHE = `todo-${VERSION}`
const INDEX = new URL('./index.html', self.location).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE.map((path) => new URL(path, self.location).href)),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('todo-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function cachePut(key, response) {
  const cache = await caches.open(CACHE)
  await cache.put(key, response)
}

// Network first so a new deploy shows up on the next load; fall back to the
// cached app shell when offline.
async function handleNavigate(event) {
  try {
    const response = await fetch(event.request)
    if (response.ok) event.waitUntil(cachePut(INDEX, response.clone()))
    return response
  } catch (error) {
    const cached = await caches.match(INDEX)
    if (cached) return cached
    throw error
  }
}

// Build assets are content-hashed, so a cached copy is always correct.
async function handleAsset(event) {
  const cached = await caches.match(event.request)
  if (cached) return cached
  const response = await fetch(event.request)
  if (response.ok) event.waitUntil(cachePut(event.request, response.clone()))
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  // Only handle our own files; YouTube embeds etc. go straight to the network.
  if (new URL(request.url).origin !== self.location.origin) return
  event.respondWith(
    request.mode === 'navigate' ? handleNavigate(event) : handleAsset(event),
  )
})
