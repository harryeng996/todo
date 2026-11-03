import type { DateKey } from '../lib/date.ts'

export interface Todo {
  id: string // crypto.randomUUID()
  title: string
  done: boolean
  date: DateKey // the day the todo belongs to
  createdAt: string // ISO date
}
