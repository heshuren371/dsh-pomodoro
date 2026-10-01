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
/** Defaults for every preference. */
export const DEFAULT_SETTINGS = Object.freeze({
    workMin: 25,
    shortMin: 5,
    longMin: 15,
    roundsPerLong: 4,
    autoStartBreak: true,
    autoStartWork: false,
    sound: true,
    tick: false,
    notify: false,
});
/** Inclusive clamp range per numeric preference. */
export const SETTING_LIMITS = Object.freeze({
    workMin: [1, 180],
    shortMin: [1, 60],
    longMin: [1, 120],
    roundsPerLong: [1, 12],
});
/** All phases in cycle order. */
export const PHASES = Object.freeze(['work', 'short', 'long']);
/** Current storage key. */
export const STORE_KEY = 'dsh-pomodoro/store/v2';
/** Storage keys written by earlier versions; read once, then migrated forward. */
export const LEGACY_STORE_KEYS = Object.freeze(['dsh-pomodoro/store/v1']);
/** One minute in milliseconds. */
export const MINUTE_MS = 60000;
/** Milliseconds in a round that has just started, i.e. the placement of an unplaced card. */
export const UNSET_POSITION = null;
