import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { registerServiceWorker } from './pwa/register.ts'
import { loadSettings } from './state/useSettings.ts'

registerServiceWorker()

// Only the chosen UI (and its styles) is loaded; Settings switches and reloads.
// Two separate import() calls on purpose: in one expression the bundler merges
// their preload lists, and the other version's stylesheet would load too.
async function loadApp(): Promise<ComponentType> {
  if (loadSettings().uiVersion === 'v1')
    return (await import('./ui/v1/index.ts')).default
  return (await import('./ui/v2/index.ts')).default
}

const App = await loadApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
