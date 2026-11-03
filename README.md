# To-do (sketch style)

A small single-page to-do app with a hand-drawn look. Stack and structure are described in
[tech-stack-choosing-plan.md](tech-stack-choosing-plan.md).

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

Todos are saved in the browser's `localStorage` (key `todoapp.todos.v1`).
