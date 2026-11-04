/**
 * Longest text each kind of field accepts (characters). Generous for real use,
 * but one accidental paste can't fill the browser's storage.
 */
export const MAX_LENGTH = {
  /** Todo and target names; a todo title is also copied into each focus session. */
  title: 200,
  quote: 500,
  author: 100,
  /** A saved video's name. */
  name: 100,
} as const

/** Photos one day can hold (each about 300 KB once resized). */
export const MAX_PHOTOS_PER_DAY = 12
