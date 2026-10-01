/**
 * The timer state machine. Pure and referentially stable: a transition that
 * changes nothing returns the input object itself.
 * @module
 */
import type {
  NumericSettingKey,
  Phase,
  PomodoroSettings,
  PomodoroState,
  PomodoroStats,
  SettingKey,
} from './types.js'
import { DEFAULT_SETTINGS, MINUTE_MS, SETTING_LIMITS, UNSET_POSITION } from './types.js'
import { clampInt } from './format.js'
import { creditWork, emptyStats, normalizeStats } from './stats.js'

/** Options for {@link advance}. */
export interface AdvanceOptions {
  /** Credit the finished round to the statistics (a completion); `false` for a skip. */
  credit?: boolean
  /** Force auto-start on/off instead of consulting the settings. */
  auto?: boolean
  /** Clock to use; defaults to `Date.now()`. */
  now?: number
}

/** The only keys whose value is a clamped number. */
const NUMERIC_SETTING_KEYS: readonly NumericSettingKey[] = [
  'workMin',
  'shortMin',
  'longMin',
  'roundsPerLong',
]

/** Narrow a {@link SettingKey} to the numeric half of the preferences. */
function isNumericSettingKey(key: SettingKey): key is NumericSettingKey {
  return (NUMERIC_SETTING_KEYS as readonly string[]).includes(key)
}

/**
 * Read a numeric preference out of an untrusted value.
 *
 * The settings panel hands over strings from a number input, so a numeric string
 * is a value (`'30'`, `' 30 '`). `Number()` alone cannot decide that, because it
 * maps `''`, `'   '`, `null`, `false` and `[]` to a finite `0` — a cleared field
 * would then silently become the smallest round. Those are "no value", so they
 * return `null` and {@link withSetting} keeps the current preference untouched.
 * @param value - Candidate value.
 * @returns The finite number, or `null` when there is nothing to apply.
 */
function preferenceNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  // Booleans, bigints, symbols, null, objects: not a preference value at all.
  return null
}

/**
 * Resolve an injected clock. Only a caller that passes a non-finite `now` (or no
 * `now` at all, for {@link advance}) falls back to the wall clock — the core
 * never reads the clock on its own.
 * @param now - Injected epoch milliseconds.
 * @returns A finite epoch time.
 */
function resolveNow(now: number | undefined): number {
  return now !== undefined && Number.isFinite(now) ? now : Date.now()
}

/**
 * Value comparison for statistics. Used to keep the *input* statistics reference
 * when a transition leaves them untouched, which is what makes a React
 * `setState` bail out.
 */
function sameStats(a: PomodoroStats, b: PomodoroStats): boolean {
  return (
    a.day === b.day &&
    a.pomodoros === b.pomodoros &&
    a.focusMs === b.focusMs &&
    a.totalPomodoros === b.totalPomodoros &&
    a.totalFocusMs === b.totalFocusMs
  )
}

/**
 * Length of one round of `phase`.
 * @param phase - Round type.
 * @param settings - Current preferences.
 * @returns Duration in milliseconds.
 */
export function durationOf(phase: Phase, settings: PomodoroSettings): number {
  const minutes = phase === 'work' ? settings.workMin : phase === 'short' ? settings.shortMin : settings.longMin
  // A round is never zero length. A hand-built or corrupt settings object would
  // otherwise make every round expire instantly and chain.
  return Math.max(1, Number.isFinite(minutes) ? minutes : 1) * MINUTE_MS
}

/**
 * Milliseconds left in the current round, derived from the deadline while
 * running so a throttled tab catches up instead of drifting.
 * @param state - Current state.
 * @param now - Epoch milliseconds.
 * @returns Remaining milliseconds, never negative.
 */
export function remainingOf(state: PomodoroState, now: number): number {
  if (state.running && Number.isFinite(now)) {
    const endsAt = state.endsAt
    if (endsAt !== null && Number.isFinite(endsAt)) {
      const left = endsAt - now
      return left > 0 ? left : 0
    }
  }
  // Paused (or a running state whose deadline is unusable): the stored
  // remaining time is the truth, floored at zero.
  const paused = state.remainingMs
  return Number.isFinite(paused) && paused > 0 ? paused : 0
}

/**
 * Progress through the current round.
 * @param state - Current state.
 * @param now - Epoch milliseconds.
 * @returns Fraction in `[0, 1]`.
 */
export function progressOf(state: PomodoroState, now: number): number {
  const duration = durationOf(state.phase, state.settings)
  if (!(duration > 0)) return 0
  // The ring fills as the round runs down: 0 at full length, 1 at the deadline.
  return Math.min(1, Math.max(0, 1 - remainingOf(state, now) / duration))
}

/**
 * Finish or skip the current round and enter the next one. Focus advances to a
 * short break, or to a long break once {@link cycleRounds} rounds are done; a
 * break always advances back to focus. Entering a long break resets the cycle
 * counter so the next focus round is round one again.
 * @param state - Current state.
 * @param options - Credit and auto-start overrides.
 * @returns Next state.
 */
export function advance(state: PomodoroState, options?: AdvanceOptions): PomodoroState {
  const settings = state.settings
  const at = resolveNow(options?.now)
  const wasWork = state.phase === 'work'
  const rounds = cycleRounds(settings)

  let workInCycle = clampInt(state.workInCycle, 0, rounds - 1)
  let phase: Phase
  if (wasWork) {
    const finished = workInCycle + 1
    // A finished long-break cycle resets to zero: the next focus round is round
    // one of a new cycle, not round `rounds + 1`.
    workInCycle = finished >= rounds ? 0 : finished
    phase = finished >= rounds ? 'long' : 'short'
  } else {
    phase = 'work'
  }

  const duration = durationOf(phase, settings)
  // An explicit `auto` wins over the preference; otherwise the phase being
  // entered decides which auto-start flag applies.
  const autoStart =
    options?.auto !== undefined
      ? options.auto === true
      : wasWork
        ? settings.autoStartBreak === true
        : settings.autoStartWork === true

  const normalized = normalizeStats(state.stats, at)
  // Only a focus round that actually finished is credited; a skip moves the
  // cycle but leaves the statistics reference untouched.
  const stats =
    options?.credit === true && wasWork
      ? creditWork(normalized, durationOf('work', settings), at)
      : sameStats(state.stats, normalized)
        ? state.stats
        : normalized

  return {
    ...state,
    phase,
    workInCycle,
    stats,
    running: autoStart,
    endsAt: autoStart ? at + duration : null,
    remainingMs: duration,
  }
}

/**
 * Start or pause the current round.
 * @param state - Current state.
 * @param now - Epoch milliseconds.
 * @returns Toggled state.
 */
export function toggleRun(state: PomodoroState, now: number): PomodoroState {
  const at = resolveNow(now)
  if (state.running) {
    // Freeze the live countdown into `remainingMs` so a paused round resumes
    // exactly where it stopped.
    return { ...state, running: false, endsAt: null, remainingMs: remainingOf(state, at) }
  }
  // A paused round at zero (or with an unusable remaining time) starts full.
  const remaining =
    Number.isFinite(state.remainingMs) && state.remainingMs > 0
      ? state.remainingMs
      : durationOf(state.phase, state.settings)
  return { ...state, running: true, endsAt: at + remaining, remainingMs: remaining }
}

/**
 * Restart the current round at full length, paused.
 * @param state - Current state.
 * @returns Reset state.
 */
export function resetRound(state: PomodoroState): PomodoroState {
  const duration = durationOf(state.phase, state.settings)
  if (!state.running && state.endsAt === null && state.remainingMs === duration) return state
  return { ...state, running: false, endsAt: null, remainingMs: duration }
}

/**
 * Apply one preference, clamping numeric values into their range. While paused on
 * a full-length round the round follows the new length; otherwise the remaining
 * time only shrinks to fit.
 * @param state - Current state.
 * @param key - Preference key.
 * @param rawValue - Untrusted new value.
 * @returns Updated state, or the input when nothing changed.
 */
export function withSetting(state: PomodoroState, key: SettingKey, rawValue: unknown): PomodoroState {
  const settings: PomodoroSettings = { ...state.settings }
  if (isNumericSettingKey(key)) {
    const number = preferenceNumber(rawValue)
    // No usable value (a cleared input, a label, `NaN`): keep the current
    // preference instead of silently dropping it to the lower bound.
    if (number === null) return state
    const [low, high] = SETTING_LIMITS[key]
    const next = clampInt(number, low, high)
    if (settings[key] === next) return state
    settings[key] = next
  } else {
    // Only a literal `true` turns a switch on, so a stray truthy value cannot
    // enable sound or notifications.
    const next = rawValue === true
    if (settings[key] === next) return state
    settings[key] = next
  }

  let remainingMs = state.remainingMs
  if (!state.running) {
    const previousDuration = durationOf(state.phase, state.settings)
    const nextDuration = durationOf(state.phase, settings)
    const atFullLength = Math.abs(state.remainingMs - previousDuration) < 1000
    // A paused round still at full length simply follows the new preference; a
    // round already under way only shrinks, so its progress is never rewound.
    const carried = Number.isFinite(remainingMs) && remainingMs >= 0 ? remainingMs : nextDuration
    remainingMs = atFullLength ? nextDuration : Math.min(carried, nextDuration)
  }

  return { ...state, settings, remainingMs }
}

/**
 * Zero today's counters and the lifetime totals.
 * @param state - Current state.
 * @param now - Epoch milliseconds.
 * @returns Updated state.
 */
export function clearStats(state: PomodoroState, now: number): PomodoroState {
  const fresh = emptyStats(now)
  if (sameStats(state.stats, fresh)) return state
  return { ...state, stats: fresh }
}

/**
 * Settle a round whose deadline already passed — the reload case. It is credited
 * once and starts paused, so a page left closed for hours cannot chain rounds.
 * @param state - Current state.
 * @param now - Epoch milliseconds.
 * @returns Settled state, or the input while the round is still live.
 */
export function settleIfExpired(state: PomodoroState, now: number): PomodoroState {
  if (!state.running || !Number.isFinite(now)) return state
  const endsAt = state.endsAt
  // No usable deadline means expiry cannot be proven; leave the round alone
  // rather than guessing at the user's work.
  if (endsAt === null || !Number.isFinite(endsAt)) return state
  if (endsAt > now) return state
  return advance(state, { credit: true, auto: false, now })
}

/**
 * Focus rounds per long-break cycle.
 * @param settings - Current preferences.
 * @returns Rounds, at least one.
 */
export function cycleRounds(settings: PomodoroSettings): number {
  const [low, high] = SETTING_LIMITS.roundsPerLong
  return clampInt(settings.roundsPerLong, low, high)
}

/**
 * Focus rounds already finished inside the current cycle.
 * @param state - Current state.
 * @returns Completed rounds, clamped to the cycle.
 */
export function completedRounds(state: PomodoroState): number {
  return clampInt(state.workInCycle, 0, cycleRounds(state.settings) - 1)
}

/**
 * Human round number of the round on screen (focus rounds are 1-based).
 * @param state - Current state.
 * @returns Round number for the counter.
 */
export function currentRoundNumber(state: PomodoroState): number {
  const completed = completedRounds(state)
  // During a break the counter keeps showing the focus round that just finished;
  // the next focus round is the following one.
  return state.phase === 'work' ? completed + 1 : completed
}

/**
 * A fresh, unplaced state built from the defaults.
 * @param now - Epoch milliseconds.
 * @returns Initial state.
 */
export function initialState(now: number): PomodoroState {
  // `settings` is a copy, never the frozen DEFAULT_SETTINGS object: callers own
  // the state they get back and must be able to replace a preference.
  const settings: PomodoroSettings = { ...DEFAULT_SETTINGS }
  return {
    settings,
    phase: 'work',
    running: false,
    endsAt: null,
    remainingMs: durationOf('work', settings),
    workInCycle: 0,
    stats: emptyStats(now),
    ui: { x: UNSET_POSITION, y: UNSET_POSITION, collapsed: false },
  }
}
