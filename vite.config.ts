import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works under any sub-path,
  // e.g. GitHub Pages at https://<user>.github.io/<repo>/.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // A zone with DST, so the date tests cover the clock-change days.
    env: { TZ: 'Europe/London' },
  },
})
