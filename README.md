# To-do (sketch style)

A small single-page to-do app with a hand-drawn look.

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

Everything is saved in the browser: todos, target, quote position and player settings live in
`localStorage`
The music folder is read in place and never copied. Chrome/Edge remember the folder; Firefox asks again each visit.
