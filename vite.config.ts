import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Emits dist/sw.js from src/pwa/sw.js, filling in the list of files to
// precache (every bundle output plus everything in public/) and a version
// hash of that list, so each deploy installs a fresh offline cache.
function serviceWorker(): Plugin {
  let publicDir = ''
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_options, bundle) {
      const publicFiles = publicDir
        ? readdirSync(publicDir, { recursive: true, withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) =>
              relative(
                publicDir,
                join(entry.parentPath, entry.name),
              ).replaceAll('\\', '/'),
            )
        : []
      // index.html is emitted after this hook, so add it by name.
      const files = [
        ...new Set(['index.html', ...Object.keys(bundle), ...publicFiles]),
      ]
        .filter((file) => !file.endsWith('.map'))
        .sort((a, b) => a.localeCompare(b))
      const precache = ['./', ...files.map((file) => `./${file}`)]
      const version = createHash('sha256')
        .update(
          Object.values(bundle)
            .map((chunk) =>
              chunk.type === 'chunk' ? chunk.code : chunk.source,
            )
            .join('\n'),
        )
        .update(files.join('\n'))
        .digest('hex')
        .slice(0, 12)
      const source = readFileSync(
        new URL('./src/pwa/sw.js', import.meta.url),
        'utf8',
      )
        .replace('__VERSION__', JSON.stringify(version))
        .replace('__PRECACHE__', JSON.stringify(precache))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works under any sub-path,
  // e.g. GitHub Pages at https://<user>.github.io/<repo>/.
  base: './',
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // A zone with DST, so the date tests cover the clock-change days.
    env: { TZ: 'Europe/London' },
  },
})
