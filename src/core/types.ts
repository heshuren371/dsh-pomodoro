/**
 * Frozen core contract — the only surface the UI and the plugin entry use.
 *
 * `src/core/*` is pure: it never touches `window`, `document`, timers, audio, or
 * notifications, and every function that depends on the clock takes `now`
 * explicitly. That is what makes the whole timer behaviour unit-testable in
 * plain Node (see `tests/core.test.mjs`), and it keeps the React half limited to
 * rendering and platform side effects.
 *
 * Contract invariants every implementation keeps:
 *
 * 1. **Pure + referentially stable.** A function that changes nothing returns
 *    the *same object reference*, so a React `setState` with it bails out instead
 *    of re-rendering.
 * 2. **Never throws on bad input.** Persisted data is untrusted: unknown fields,
 *    wrong types, stale days and out-of-range numbers all normalize to defaults.
 * 3. **Explicit clock.** `now` is epoch milliseconds; nothing reads `Date.now()`
 *    inside the core except the documented default in `createStore`.
 *
 * Module map (implemented in the sibling files):
 *
 * - `format.ts` — `formatClock`, `formatMinutes`, `dayKey`, `clampInt`
 * - `stats.ts`  — `emptyStats`, `normalizeStats`, `creditWork`
 * - `timer.ts`  — `durationOf`, `remainingOf`, `progressOf`, `advance`,
 *                 `toggleRun`, `resetRound`, `withSetting`, `clearStats`,
 *                 `settleIfExpired`, `cycleRounds`, `completedRounds`,
 *                 `currentRoundNumber`, `AdvanceOptions`
 * - `store.ts`  — `createStore`, `Store`, `STATE_SCHEMA_VERSION`
 */

/** Which round the timer is in. */
export type Phase = 'work' | 'short' | 'long'

/** Numeric preferences, each clamped by {@link SETTING_LIMITS}. */
export type NumericSettingKey = 'workMin' | 'shortMin' | 'longMin' | 'roundsPerLong'

/** Boolean preferences. */
export type ToggleSettingKey = 'autoStartBreak' | 'autoStartWork' | 'sound' | 'tick' | 'notify'

/** Every preference key. */
export type SettingKey = NumericSettingKey | ToggleSettingKey

/** User-tunable timer preferences, persisted as-is. */
export interface PomodoroSettings {
  /** Focus round length in minutes. */
  workMin: number
  /** Short break length in minutes. */
  shortMin: number
  /** Long break length in minutes. */
  longMin: number
  /** Completed focus rounds before a long break. */
  roundsPerLong: number
  /** Start the break automatically when focus ends. */
  autoStartBreak: boolean
  /** Start the next focus round automatically when a break ends. */
  autoStartWork: boolean
  /** Play the round chime. */
  sound: boolean
  /** Tick once per second during focus. */
  tick: boolean
  /** Ask the browser for a desktop notification on round changes. */
  notify: boolean
}

/** Today's counters plus lifetime totals. */
export interface PomodoroStats {
  /** Local `YYYY-MM-DD` the daily counters belong to. */
  day: string
  /** Focus rounds finished today. */
  pomodoros: number
  /** Focus milliseconds accumulated today. */
  focusMs: number
  /** Focus rounds finished since the plugin was first used. */
  totalPomodoros: number
  /** Focus milliseconds accumulated since the plugin was first used. */
  totalFocusMs: number
}

/** Card placement and collapsed state. */
export interface PomodoroUiState {
  /** Viewport x of the card's top-left corner, `null` until placed. */
  x: number | null
  /** Viewport y of the card's top-left corner, `null` until placed. */
  y: number | null
  /** Whether the card is collapsed to its pill form. */
  collapsed: boolean
}

/** The complete timer state: preferences, the live round, statistics, placement. */
export interface PomodoroState {
  settings: PomodoroSettings
  phase: Phase
  /** A round is counting down. */
  running: boolean
  /** Absolute deadline while running, `null` while paused. */
  endsAt: number | null
  /** Milliseconds left while paused; ignored while running. */
  remainingMs: number
  /** Focus rounds already finished inside the current long-break cycle. */
  workInCycle: number
  stats: PomodoroStats
  ui: PomodoroUiState
}

/** The storage face the core needs; the browser passes `window.localStorage`. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Defaults for every preference. */
export const DEFAULT_SETTINGS: Readonly<PomodoroSettings> = Object.freeze({
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  roundsPerLong: 4,
  autoStartBreak: true,
  autoStartWork: false,
  sound: true,
  tick: false,
  notify: false,
})

/** Inclusive clamp range per numeric preference. */
export const SETTING_LIMITS: Readonly<Record<NumericSettingKey, readonly [number, number]>> = Object.freeze({
  workMin: [1, 180],
  shortMin: [1, 60],
  longMin: [1, 120],
  roundsPerLong: [1, 12],
})

/** All phases in cycle order. */
export const PHASES: readonly Phase[] = Object.freeze(['work', 'short', 'long'])

/** Current storage key. */
export const STORE_KEY = 'dsh-pomodoro/store/v2'

/** Storage keys written by earlier versions; read once, then migrated forward. */
export const LEGACY_STORE_KEYS: readonly string[] = Object.freeze(['dsh-pomodoro/store/v1'])

/** One minute in milliseconds. */
export const MINUTE_MS = 60000

/** Milliseconds in a round that has just started, i.e. the placement of an unplaced card. */
export const UNSET_POSITION = null
