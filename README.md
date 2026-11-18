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

Everything is saved in this browser: settings, targets, quotes and the weight log in
`localStorage`; todos, focus sessions and photos in IndexedDB. Nothing is uploaded unless
you set up Backup.
The v2 goal weight is stored separately (`todoapp.v2.weightGoal.v1`) and v1 ignores it.

## Backup (v2)

Settings → Backup copies your data to **your own Supabase project** (the free plan is
plenty: about 300 KB per photo, a few MB for everything else). The browser talks to
Supabase directly; there is no server of ours in between.

1. Create a free project at [supabase.com](https://supabase.com).
2. **Storage → New bucket** named `todoapp-backup`, with _Public bucket_ off.
3. **SQL Editor**: let the app's key use that bucket and nothing else:

   ```sql
   create policy "todoapp backup read" on storage.objects
     for select to anon using (bucket_id = 'todoapp-backup');
   create policy "todoapp backup insert" on storage.objects
     for insert to anon with check (bucket_id = 'todoapp-backup');
   create policy "todoapp backup update" on storage.objects
     for update to anon using (bucket_id = 'todoapp-backup');
   create policy "todoapp backup delete" on storage.objects
     for delete to anon using (bucket_id = 'todoapp-backup');
   ```

4. **Project Settings → API Keys**: copy the _Publishable key_ (`sb_publishable_…`; older
   projects: the _anon_ key). Never a secret / service_role key.
5. The **Connect** button at the top of the dashboard (or **Project Settings → Data API**)
   shows the Project URL (`https://<project-ref>.supabase.co`). Paste both into
   Settings → Backup.

What it does:

- **Back up now**, or automatically once a day while the app is open. Automatic backups
  start after this browser's first backup or restore, so a new device can't save its
  empty data as the newest backup before you restore.
- Each backup is one JSON file in `snapshots/`; the newest 10 are kept. Photos go to
  `photos/`, each uploaded once (photo keys are never reused). Photos deleted in the app
  stay in the bucket.
- **Restore** replaces the tasks, focus sessions, weight log, quotes and settings in this
  browser with a backup's, adds its photos, and reloads. The backup settings and a running
  timer stay as they are.
- **Export / Import** a JSON file (everything except photos) works without Supabase.

The connection (URL and key) is kept in this browser (`todoapp.backup.v1`) and never goes
into a backup. Backups aren't encrypted: anyone with both the URL and the key can read the
bucket. A free Supabase project pauses after a week without use; resume it from the
dashboard and the next backup goes through.

Code: `src/lib/backup` (snapshot, Supabase adapter, backup/restore), `src/state/backup.ts`
(settings, daily schedule), `src/ui/v2/screens/settings/BackupSettings.tsx`.
