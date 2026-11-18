import { createRecordStore } from '../lib/recordStore.ts'
import { createJsonStore } from '../lib/storage.ts'
import type { FocusSession } from './pomodoro.ts'

const SESSIONS_V1 = 'todoapp.pomodoro.sessions.v1'

/** Finished sessions grow every day: IndexedDB, one record each, oldest first. */
export const sessionRecords = createRecordStore<FocusSession>({
  dbName: 'todoapp-focus-sessions',
  legacy: createJsonStore<FocusSession[]>(SESSIONS_V1, () => []),
  legacyKeys: [SESSIONS_V1],
  compare: (a, b) => a.end - b.end,
})
