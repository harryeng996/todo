# To-do

A daily to-do app with a Pomodoro timer, YouTube soundtrack, weight tracking and quotes.
It is a PWA and works offline.

## Two interfaces

- **v2** (default): separate screens (Home, Tasks, Focus, Body, Settings) with charts and
  statistics, light and dark themes and animations.
- **v1**: the original single page with a hand-drawn look (git tag `v1`).

Switch in Settings ("Use the new interface"). Both read the same data, so nothing is lost;
the page reloads and only the chosen interface is loaded.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Scripts

| Script         | What it does                          |
| -------------- | ------------------------------------- |
| `pnpm dev`     | Dev server with hot reload            |
| `pnpm build`   | Type-check and build to `dist/`       |
| `pnpm preview` | Serve the built `dist/` locally       |
| `pnpm test`    | Run Vitest (watch mode; `--run` once) |
| `pnpm lint`    | Lint with oxlint                      |
| `pnpm format`  | Format with Prettier                  |

## Code layout

| Path                   | What                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `src/main.tsx`         | Loads v1 or v2 by the saved setting                            |
| `src/state`, `src/lib` | Shared data and logic (todos, Pomodoro, weight, quotes, video) |
| `src/hooks`            | Shared non-visual hooks (photos, YouTube player, grid range)   |
| `src/ui/v1`            | The original interface and its styles                          |
| `src/ui/v2`            | The new interface: `shell`, `screens`, `components`, `charts`  |

## Data

Everything is saved in this browser only: settings, targets, quotes and the weight log in
`localStorage`; todos, focus sessions and photos in IndexedDB. Nothing is uploaded.
The v2 goal weight is stored separately (`todoapp.v2.weightGoal.v1`) and v1 ignores it.

## Backup file (v2)

Settings → Backup → **Export** saves the tasks, focus sessions, weight log, targets, quotes
and settings as one JSON file (photos aren't included). **Import** checks the file, shows
what's in it and, once confirmed, replaces that data in this browser and reloads. A running
timer stays as it is. The file isn't encrypted, so keep it somewhere private.

Code: `src/lib/backup` (snapshot and file), `src/ui/v2/screens/settings/BackupSettings.tsx`.
