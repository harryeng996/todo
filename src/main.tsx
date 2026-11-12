import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerServiceWorker } from './pwa/register.ts'
import { loadSettings } from './state/useSettings.ts'

registerServiceWorker()

// Only the chosen UI (and its styles) is loaded; Settings switches and reloads.
const { uiVersion } = loadSettings()
const { default: App } = await (uiVersion === 'v1'
  ? import('./ui/v1/index.ts')
  : import('./ui/v2/index.ts'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
