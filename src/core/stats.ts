/**
 * Statistics folding. Pure; never throws on persisted garbage.
 * @module
 */
import type { PomodoroStats } from './types.js'
import { clampInt, dayKey } from './format.js'

/**
 * Upper bound for every counter. Counters are cumulative and persisted, so a
 * corrupt or hostile snapshot could otherwise poison arithmetic forever; the
 * safe-integer ceiling keeps every later sum exact.
 */
const MAX_COUNTER = Number.MAX_SAFE_INTEGER

/** Object test that also rejects arrays and `null` (both are `typeof 'object'`). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * One counter from untrusted storage. Only a real, finite number counts — a
 * string, boolean, `null` or `NaN` is a wrong type, not a value to coerce — and
 * every value is clamped into `[0, max]` so a corrupt snapshot cannot poison
 * later arithmetic.
 */
function counter(value: unknown, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 0, max) : 0
}

/**
 * Zeroed counters for the day containing `now`.
 * @param now - Epoch milliseconds.
 * @returns Fresh statistics.
 */
export function emptyStats(now: number): PomodoroStats {
  return {
    day: dayKey(now),
    pomodoros: 0,
    focusMs: 0,
    totalPomodoros: 0,
    totalFocusMs: 0,
  }
}

/**
 * Validate persisted statistics, resetting the daily counters when the stored
 * day is not the day containing `now` while keeping the lifetime totals.
 * @param value - Untrusted persisted value.
 * @param now - Epoch milliseconds.
 * @returns Normalized statistics.
 */
export function normalizeStats(value: unknown, now: number): PomodoroStats {
  const source = isRecord(value) ? value : null
  // The stored day is a `YYYY-MM-DD` key: equality with today's key is the whole
  // rollover test, so a stale day zeroes today's counters but never the totals.
  const sameDay = source !== null && source.day === dayKey(now)
  return {
    day: dayKey(now),
    pomodoros: sameDay ? counter(source?.pomodoros, MAX_COUNTER) : 0,
    focusMs: sameDay ? counter(source?.focusMs, MAX_COUNTER) : 0,
    totalPomodoros: counter(source?.totalPomodoros, MAX_COUNTER),
    totalFocusMs: counter(source?.totalFocusMs, MAX_COUNTER),
  }
}

/**
 * Count one finished focus round. Day-rollover aware, so a round that ends after
 * midnight credits the new day.
 * @param stats - Current statistics.
 * @param focusMs - Length of the focus round that finished.
 * @param now - Epoch milliseconds.
 * @returns Updated statistics.
 */
export function creditWork(stats: PomodoroStats, focusMs: number, now: number): PomodoroStats {
  // Normalizing first is what makes the credit day-correct: crossing midnight
  // resets the daily counters, then the round is added to the new day while the
  // lifetime totals keep accumulating.
  const current = normalizeStats(stats, now)
  const focused = counter(focusMs, MAX_COUNTER)
  return {
    day: current.day,
    pomodoros: clampInt(current.pomodoros + 1, 0, MAX_COUNTER),
    focusMs: clampInt(current.focusMs + focused, 0, MAX_COUNTER),
    totalPomodoros: clampInt(current.totalPomodoros + 1, 0, MAX_COUNTER),
    totalFocusMs: clampInt(current.totalFocusMs + focused, 0, MAX_COUNTER),
  }
}
