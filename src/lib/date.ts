/** A local calendar day as 'YYYY-MM-DD'. Sorts and compares correctly as a string. */
export type DateKey = string

const MS_PER_DAY = 86_400_000

// Never use toISOString() for days: it gives the UTC date, which is off by one near midnight.
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local midnight of the given day. */
export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Calendar arithmetic (not ms arithmetic), so DST changes can't shift the day.
export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY,
  )
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(key: DateKey): number {
  return parseDateKey(key).getDay()
}

export function msUntilNextDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

/** 'Tuesday 3 November' */
export function formatLongDate(key: DateKey): string {
  return parseDateKey(key).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** 'Today', 'Yesterday' or 'Monday 2 November'. */
export function relativeDayLabel(date: DateKey, today: DateKey): string {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  return formatLongDate(date)
}

/** 'Sun 1 Nov' */
export function formatDayShort(key: DateKey): string {
  return parseDateKey(key).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** '1 Nov' */
export function formatDayMonth(key: DateKey): string {
  return parseDateKey(key).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

/** 'Tue 3 Nov 2026' */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonth(key: DateKey): string {
  return parseDateKey(key).toLocaleDateString('en-GB', { month: 'short' })
}

/**
 * GitHub-style contribution grid: `weeks` columns of 7 days (Sunday first),
 * the last column being the current week. Days after today are null.
 */
export function buildGrid(today: DateKey, weeks = 53): (DateKey | null)[][] {
  const lastSunday = addDays(today, -dayOfWeek(today))
  const firstSunday = addDays(lastSunday, -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const key = addDays(firstSunday, week * 7 + day)
      return key > today ? null : key
    }),
  )
}

/**
 * Grid for an explicit range: Sunday-first weeks covering `from`..`to`.
 * Days outside the range, or after today, are null.
 */
export function buildRangeGrid(
  from: DateKey,
  to: DateKey,
  today: DateKey,
): (DateKey | null)[][] {
  const firstSunday = addDays(from, -dayOfWeek(from))
  const lastSunday = addDays(to, -dayOfWeek(to))
  const weeks = daysBetween(firstSunday, lastSunday) / 7 + 1
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const key = addDays(firstSunday, week * 7 + day)
      return key < from || key > to || key > today ? null : key
    }),
  )
}

/** '4 May – 3 Nov 2026', or with both years when they differ. */
export function formatRange(from: DateKey, to: DateKey): string {
  const withYear = (key: DateKey) =>
    parseDateKey(key).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  return `${sameYear ? formatDayMonth(from) : withYear(from)} – ${withYear(to)}`
}

/** Month labels for the grid's top row, placed at the first column of each month. */
export function monthLabels(
  columns: (DateKey | null)[][],
): { column: number; label: string }[] {
  const labels: { column: number; label: string }[] = []
  let previous = ''
  columns.forEach((days, column) => {
    // A range can start mid-week, so use the column's first day that is shown.
    const first = days.find((day) => day !== null)
    if (!first) return
    const month = first.slice(0, 7)
    if (month !== previous) labels.push({ column, label: formatMonth(first) })
    previous = month
  })
  // Like GitHub: drop a leading partial month that would collide with the next label.
  if (labels.length > 1 && labels[1].column - labels[0].column < 3)
    labels.shift()
  return labels
}
