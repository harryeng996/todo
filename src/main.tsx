import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/patrick-hand'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sketch.css'
import './styles/app.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/register.ts'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
