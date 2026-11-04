// Registers the service worker (production builds only, so the dev server
// never serves stale cached files).
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })
  })
}
