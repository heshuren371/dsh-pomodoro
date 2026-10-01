/**
 * Unit tests for the pure core.
 *
 * They import the COMPILED `lib/core/*.js` — the exact artifact the published
 * package and the browser bundle use — so run `node scripts/build.mjs` before
 * `node --test tests/`. A source-only change that was never rebuilt fails here.
 *
 * Everything clock-dependent is driven by the fixed `NOW` below; nothing in the
 * core is allowed to read the wall clock for these paths.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { clampInt, dayKey, formatClock, formatMinutes } from '../lib/core/format.js'
import { creditWork, emptyStats, normalizeStats } from '../lib/core/stats.js'
import {
  advance,
  clearStats,
  completedRounds,
  currentRoundNumber,
  cycleRounds,
  durationOf,
  initialState,
  progressOf,
  remainingOf,
  resetRound,
  settleIfExpired,
  toggleRun,
  withSetting,
} from '../lib/core/timer.js'
import { STATE_SCHEMA_VERSION, createStore } from '../lib/core/store.js'
import { DEFAULT_SETTINGS, LEGACY_STORE_KEYS, MINUTE_MS, SETTING_LIMITS, STORE_KEY } from '../lib/core/types.js'

const MIN = MINUTE_MS
const WORK_MS = 25 * MIN
const SHORT_MS = 5 * MIN
const LONG_MS = 15 * MIN

/** Fixed local 2026-03-14 10:30 — midday, so no DST edge can move the day key. */
const NOW = new Date(2026, 2, 14, 10, 30, 0, 0).getTime()
const TODAY = '2026-03-14'
const SOME_OTHER_DAY = '2020-01-01'

const ZERO_STATS = { day: TODAY, pomodoros: 0, focusMs: 0, totalPomodoros: 0, totalFocusMs: 0 }

/** A settings object derived from the defaults. */
function settings(overrides = {}) {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

/** A fresh state with tweaks. */
function state(overrides = {}) {
  return { ...initialState(NOW), ...overrides }
}

/** A raw v2 snapshot with tweaks. */
function snapshot(overrides = {}) {
  return {
    v: 2,
    settings: settings(),
    phase: 'work',
    running: false,
    endsAt: null,
    remainingMs: WORK_MS,
    workInCycle: 0,
    stats: emptyStats(NOW),
    ui: { x: null, y: null, collapsed: false },
    ...overrides,
  }
}

/** In-memory `StorageLike` with direct access to the raw map. */
function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    map,
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

/** Freeze every nested object so an accidental mutation throws in strict mode. */
function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) deepFreeze(value[key])
  }
  return value
}

// ── format.ts ───────────────────────────────────────────────────────────────

test('formatClock rounds up and never leaves the [00:00, …] range', () => {
  assert.equal(formatClock(25 * MIN), '25:00')
  assert.equal(formatClock(999), '00:01')
  assert.equal(formatClock(1000), '00:01')
  assert.equal(formatClock(1001), '00:02')
  assert.equal(formatClock(0), '00:00')
  assert.equal(formatClock(1), '00:01')
  assert.equal(formatClock(-1), '00:00')
  assert.equal(formatClock(-5 * MIN), '00:00')
  assert.equal(formatClock(NaN), '00:00')
  assert.equal(formatClock(Infinity), '00:00')
  assert.equal(formatClock(60 * MIN), '60:00')
})

test('formatMinutes rounds to whole minutes', () => {
  assert.equal(formatMinutes(25 * MIN), 25)
  assert.equal(formatMinutes(30_000), 1)
  assert.equal(formatMinutes(90_000), 2)
  assert.equal(formatMinutes(29_999), 0)
  assert.equal(formatMinutes(0), 0)
  assert.equal(formatMinutes(-MIN), 0)
  assert.equal(formatMinutes(NaN), 0)
})

test('dayKey is the local calendar day, zero padded, never UTC', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59, 59).getTime()), '2026-01-05')
  assert.equal(dayKey(new Date(2026, 0, 1, 0, 30).getTime()), '2026-01-01')
  assert.equal(dayKey(new Date(2026, 8, 9, 12, 0).getTime()), '2026-09-09')
  assert.equal(dayKey(new Date(2026, 11, 31, 23, 59).getTime()), '2026-12-31')

  // Local components, not `toISOString().slice(0, 10)`: in UTC+8 the timestamp
  // below is 2026-01-02 local but still 2026-01-01 UTC.
  const ts = new Date(2026, 0, 2, 1, 0).getTime()
  const local = new Date(ts)
  const expected =
    local.getFullYear() +
    '-' +
    String(local.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(local.getDate()).padStart(2, '0')
  assert.equal(dayKey(ts), expected)

  // A non-finite clock degrades to the epoch instead of producing "NaN-NaN-NaN".
  assert.equal(dayKey(NaN), dayKey(0))
})

test('clampInt rounds, clamps, and never throws on hostile values', () => {
  assert.equal(clampInt(5.4, 1, 10), 5)
  assert.equal(clampInt(5.5, 1, 10), 6)
  assert.equal(clampInt(0, 1, 180), 1)
  assert.equal(clampInt(999, 1, 180), 180)
  assert.equal(clampInt('12', 1, 20), 12)
  assert.equal(clampInt('-12', 1, 20), 1)
  assert.equal(clampInt('abc', 1, 20), 1)
  assert.equal(clampInt(undefined, 1, 20), 1)
  assert.equal(clampInt(null, 1, 20), 1)
  assert.equal(clampInt(NaN, 1, 20), 1)
  assert.equal(clampInt(Infinity, 1, 20), 1)
  assert.equal(clampInt(-Infinity, 1, 20), 1)
  assert.equal(clampInt(true, 0, 10), 1)
  // `Number(Symbol())` throws, and a hostile `valueOf` can too.
  assert.equal(clampInt(Symbol('x'), 0, 10), 0)
  assert.equal(
    clampInt(
      {
        valueOf() {
          throw new Error('hostile')
        },
      },
      2,
      10,
    ),
    2,
  )
})

// ── stats.ts ────────────────────────────────────────────────────────────────

test('emptyStats zeroes today counters', () => {
  assert.deepEqual(emptyStats(NOW), ZERO_STATS)
})

test('normalizeStats: wrong types and non-objects become zeros', () => {
  for (const garbage of [undefined, null, 'garbage', 42, true, [1, 2], () => {}]) {
    assert.deepEqual(normalizeStats(garbage, NOW), ZERO_STATS)
  }
  assert.deepEqual(
    normalizeStats({ day: TODAY, pomodoros: '4', focusMs: {}, totalPomodoros: null, totalFocusMs: Infinity }, NOW),
    ZERO_STATS,
  )
  assert.deepEqual(
    normalizeStats({ day: TODAY, pomodoros: -3, focusMs: -1, totalPomodoros: -2, totalFocusMs: -5 }, NOW),
    ZERO_STATS,
  )
})

test('normalizeStats: a current day keeps its counters', () => {
  const valid = { day: TODAY, pomodoros: 4, focusMs: 4 * MIN, totalPomodoros: 11, totalFocusMs: 11 * MIN }
  assert.deepEqual(normalizeStats(valid, NOW), valid)
})

test('normalizeStats: a stale day resets today but keeps lifetime totals', () => {
  const stale = { day: SOME_OTHER_DAY, pomodoros: 4, focusMs: 4 * MIN, totalPomodoros: 11, totalFocusMs: 11 * MIN }
  assert.deepEqual(normalizeStats(stale, NOW), {
    day: TODAY,
    pomodoros: 0,
    focusMs: 0,
    totalPomodoros: 11,
    totalFocusMs: 11 * MIN,
  })
})

test('normalizeStats does not mutate its input', () => {
  const input = deepFreeze({ day: SOME_OTHER_DAY, pomodoros: 4, focusMs: 4 * MIN, totalPomodoros: 11, totalFocusMs: 11 * MIN })
  const before = JSON.stringify(input)
  assert.doesNotThrow(() => normalizeStats(input, NOW))
  assert.equal(JSON.stringify(input), before)
})

test('creditWork counts one round, adds its length to both totals, and rolls the day', () => {
  const base = emptyStats(NOW)
  assert.deepEqual(creditWork(base, WORK_MS, NOW), {
    day: TODAY,
    pomodoros: 1,
    focusMs: WORK_MS,
    totalPomodoros: 1,
    totalFocusMs: WORK_MS,
  })
  assert.deepEqual(base, ZERO_STATS, 'the input statistics object must stay untouched')

  const carried = creditWork(
    { day: SOME_OTHER_DAY, pomodoros: 5, focusMs: 5 * MIN, totalPomodoros: 20, totalFocusMs: 20 * MIN },
    WORK_MS,
    NOW,
  )
  assert.deepEqual(carried, {
    day: TODAY,
    pomodoros: 1,
    focusMs: WORK_MS,
    totalPomodoros: 21,
    totalFocusMs: 20 * MIN + WORK_MS,
  })
})

test('creditWork tolerates garbage statistics and a bad round length', () => {
  const recovered = creditWork(undefined, WORK_MS, NOW)
  assert.equal(recovered.pomodoros, 1)
  assert.equal(recovered.focusMs, WORK_MS)

  const noTime = creditWork(emptyStats(NOW), NaN, NOW)
  assert.equal(noTime.pomodoros, 1, 'the round still happened')
  assert.equal(noTime.focusMs, 0)

  const lots = creditWork(emptyStats(NOW), Number.MAX_SAFE_INTEGER, NOW)
  assert.equal(lots.focusMs, Number.MAX_SAFE_INTEGER, 'counters saturate instead of overflowing')
})

// ── timer.ts: the initial state ─────────────────────────────────────────────

test('initialState is a paused, full-length, unplaced focus round', () => {
  const s = initialState(NOW)
  assert.equal(s.phase, 'work')
  assert.equal(s.running, false)
  assert.equal(s.endsAt, null)
  assert.equal(s.remainingMs, WORK_MS)
  assert.equal(formatClock(remainingOf(s, NOW)), '25:00')
  assert.equal(s.workInCycle, 0)
  assert.equal(completedRounds(s), 0)
  assert.equal(currentRoundNumber(s), 1)
  assert.equal(cycleRounds(s.settings), 4)
  assert.deepEqual(s.stats, ZERO_STATS)
  assert.deepEqual(s.ui, { x: null, y: null, collapsed: false })
})

test('initialState hands out a mutable copy of the frozen defaults', () => {
  const s = initialState(NOW)
  assert.notEqual(s.settings, DEFAULT_SETTINGS)
  s.settings.workMin = 99
  assert.equal(DEFAULT_SETTINGS.workMin, 25)
  assert.equal(initialState(NOW).settings.workMin, 25)
})

test('durationOf maps phases to milliseconds and never returns zero', () => {
  assert.equal(durationOf('work', settings()), WORK_MS)
  assert.equal(durationOf('short', settings()), SHORT_MS)
  assert.equal(durationOf('long', settings()), LONG_MS)
  assert.equal(durationOf('work', settings({ workMin: 0 })), MIN)
  assert.equal(durationOf('work', settings({ workMin: -10 })), MIN)
  assert.equal(durationOf('work', settings({ workMin: NaN })), MIN)
})

test('remainingOf reads the deadline while running and floors at zero', () => {
  const paused = state()
  assert.equal(remainingOf(paused, NOW), WORK_MS)
  assert.equal(remainingOf({ ...paused, remainingMs: -1 }, NOW), 0)
  assert.equal(remainingOf({ ...paused, remainingMs: NaN }, NOW), 0)

  const running = { ...paused, running: true, endsAt: NOW + 60_000, remainingMs: WORK_MS }
  assert.equal(remainingOf(running, NOW), 60_000)
  assert.equal(remainingOf(running, NOW + 60_000), 0)
  assert.equal(remainingOf(running, NOW + 90_000), 0, 'an overrun never reports negative time')
})

test('progressOf fills the ring from 0 to 1 and stays clamped', () => {
  const paused = state()
  assert.equal(progressOf(paused, NOW), 0)
  const running = { ...paused, running: true, endsAt: NOW + 60_000 }
  assert.equal(progressOf(running, NOW), 1 - 60_000 / WORK_MS)
  assert.equal(progressOf({ ...running, endsAt: NOW - 1 }, NOW), 1)
  assert.equal(progressOf({ ...paused, remainingMs: 2 * WORK_MS }, NOW), 0)
})

// ── timer.ts: advance ───────────────────────────────────────────────────────

test('advance: a finished focus round credits exactly one pomodoro and one work length', () => {
  const before = state()
  const next = advance(before, { credit: true, auto: false, now: NOW })

  assert.equal(next.phase, 'short')
  assert.equal(next.workInCycle, 1)
  assert.equal(next.running, false)
  assert.equal(next.endsAt, null)
  assert.equal(next.remainingMs, SHORT_MS)
  assert.notEqual(next, before)

  assert.equal(next.stats.day, TODAY)
  assert.equal(next.stats.pomodoros, 1)
  assert.equal(next.stats.focusMs, WORK_MS)
  assert.equal(next.stats.totalPomodoros, 1)
  assert.equal(next.stats.totalFocusMs, WORK_MS)
  assert.notEqual(next.stats, before.stats)
  assert.deepEqual(before.stats, ZERO_STATS, 'the input statistics must stay untouched')
})

test('advance: a skip moves the cycle but credits nothing and keeps the statistics reference', () => {
  const before = state({ settings: settings({ autoStartBreak: false }) })
  const skipped = advance(before, { credit: false, now: NOW })

  assert.equal(skipped.phase, 'short')
  assert.equal(skipped.workInCycle, 1)
  assert.equal(skipped.stats, before.stats, 'unchanged statistics keep their identity (React bail-out)')
  assert.deepEqual(skipped.stats, ZERO_STATS)
})

test('advance: leaving a break never credits, even with credit:true', () => {
  const onBreak = state({ phase: 'short', workInCycle: 1, remainingMs: SHORT_MS })
  const next = advance(onBreak, { credit: true, auto: false, now: NOW })
  assert.equal(next.phase, 'work')
  assert.equal(next.workInCycle, 1, 'the cycle counter is not reset by a break')
  assert.equal(next.stats, onBreak.stats)
  assert.equal(next.remainingMs, WORK_MS)
})

test('advance: the second focus round of a 2-round cycle opens the long break and resets the cycle', () => {
  let s = state({ settings: settings({ roundsPerLong: 2, autoStartBreak: false, autoStartWork: false }) })

  s = advance(s, { credit: true, now: NOW }) // focus 1
  assert.equal(s.phase, 'short')
  assert.equal(s.workInCycle, 1)
  assert.equal(s.stats.pomodoros, 1)

  s = advance(s, { now: NOW }) // short break
  assert.equal(s.phase, 'work')
  assert.equal(s.workInCycle, 1)
  assert.equal(currentRoundNumber(s), 2)
  assert.equal(s.stats.pomodoros, 1, 'a break is not a pomodoro')

  s = advance(s, { credit: true, now: NOW }) // focus 2 -> long break
  assert.equal(s.phase, 'long')
  assert.equal(s.workInCycle, 0, 'the cycle restarts')
  assert.equal(completedRounds(s), 0)
  assert.equal(s.remainingMs, LONG_MS)
  assert.equal(s.stats.pomodoros, 2)
  assert.equal(s.stats.focusMs, 2 * WORK_MS)

  s = advance(s, { now: NOW }) // long break -> focus
  assert.equal(s.phase, 'work')
  assert.equal(s.workInCycle, 0)
  assert.equal(currentRoundNumber(s), 1)
  assert.equal(s.remainingMs, WORK_MS)
})

test('advance: roundsPerLong=1 makes every focus round a long break', () => {
  const next = advance(state({ settings: settings({ roundsPerLong: 1, autoStartBreak: false }) }), { credit: true, now: NOW })
  assert.equal(next.phase, 'long')
  assert.equal(next.workInCycle, 0)
})

test('advance: shrinking roundsPerLong below the current cycle counter stays safe', () => {
  // The UI lets the user lower the cycle length mid-cycle; the counter may still
  // hold a larger value, so both the counter view and the next transition have to
  // clamp it instead of running past the long break.
  const midCycle = withSetting(state({ workInCycle: 3 }), 'roundsPerLong', 2)
  assert.equal(midCycle.settings.roundsPerLong, 2)
  assert.equal(completedRounds(midCycle), 1, 'clamped to the new cycle')
  assert.equal(currentRoundNumber(midCycle), 2)

  const next = advance(midCycle, { credit: true, now: NOW })
  assert.equal(next.phase, 'long')
  assert.equal(next.workInCycle, 0)
})

test('advance: auto-start follows the settings for the phase being entered', () => {
  // Defaults: autoStartBreak=true, autoStartWork=false.
  const intoBreak = advance(state(), { credit: true, now: NOW })
  assert.equal(intoBreak.running, true)
  assert.equal(intoBreak.endsAt, NOW + SHORT_MS)
  assert.equal(intoBreak.remainingMs, SHORT_MS)

  const onBreak = state({ phase: 'short', workInCycle: 1, remainingMs: SHORT_MS })
  const intoWork = advance(onBreak, { now: NOW })
  assert.equal(intoWork.running, false)
  assert.equal(intoWork.endsAt, null)
  assert.equal(intoWork.remainingMs, WORK_MS)

  const autoWork = advance(state({ ...onBreak, settings: settings({ autoStartWork: true }) }), { now: NOW })
  assert.equal(autoWork.running, true)
  assert.equal(autoWork.endsAt, NOW + WORK_MS)
})

test('advance: the auto option overrides both settings', () => {
  const forcedBreak = advance(state({ settings: settings({ autoStartBreak: false }) }), { auto: true, now: NOW })
  assert.equal(forcedBreak.running, true)
  assert.equal(forcedBreak.endsAt, NOW + SHORT_MS)

  const forcedWork = advance(
    state({ phase: 'short', workInCycle: 1, settings: settings({ autoStartWork: true }) }),
    { auto: false, now: NOW },
  )
  assert.equal(forcedWork.running, false)
  assert.equal(forcedWork.endsAt, null)
})

test('advance is deterministic and pure', () => {
  const before = deepFreeze(state())
  const snapshotOfBefore = JSON.stringify(before)
  const first = advance(before, { credit: true, now: NOW })
  const second = advance(before, { credit: true, now: NOW })
  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(before), snapshotOfBefore)
})

// ── timer.ts: run/pause/reset/settings/stats ────────────────────────────────

test('toggleRun starts from the stored remaining time and pauses back into it', () => {
  const paused = state()
  const started = toggleRun(paused, NOW)
  assert.equal(started.running, true)
  assert.equal(started.endsAt, NOW + WORK_MS)
  assert.equal(started.remainingMs, WORK_MS)
  assert.equal(paused.running, false, 'the input is untouched')

  const pausedAgain = toggleRun(started, NOW + 1000)
  assert.equal(pausedAgain.running, false)
  assert.equal(pausedAgain.endsAt, null)
  assert.equal(pausedAgain.remainingMs, WORK_MS - 1000)

  // A paused round that overran keeps a zero remainder, never a negative one.
  const overrun = toggleRun(started, NOW + WORK_MS + 5000)
  assert.equal(overrun.remainingMs, 0)

  // A paused round with no usable remainder starts at full length.
  assert.equal(toggleRun(state({ remainingMs: 0 }), NOW).endsAt, NOW + WORK_MS)
  assert.equal(toggleRun(state({ remainingMs: NaN }), NOW).endsAt, NOW + WORK_MS)
})

test('resetRound returns to full length, paused, and is a no-op when already there', () => {
  const running = toggleRun(state(), NOW)
  const reset = resetRound(running)
  assert.equal(reset.running, false)
  assert.equal(reset.endsAt, null)
  assert.equal(reset.remainingMs, WORK_MS)

  assert.equal(resetRound(reset), reset, 'nothing changes -> the same reference')
  assert.equal(resetRound(state({ remainingMs: 3 * MIN })).remainingMs, WORK_MS)
})

test('withSetting clamps numeric preferences into SETTING_LIMITS', () => {
  const base = state()
  assert.equal(withSetting(base, 'workMin', 999).settings.workMin, SETTING_LIMITS.workMin[1])
  assert.equal(withSetting(base, 'workMin', 0).settings.workMin, SETTING_LIMITS.workMin[0])
  assert.equal(withSetting(base, 'workMin', 30.4).settings.workMin, 30)
  assert.equal(withSetting(base, 'shortMin', 90).settings.shortMin, SETTING_LIMITS.shortMin[1])
  assert.equal(withSetting(base, 'longMin', -3).settings.longMin, SETTING_LIMITS.longMin[0])
  assert.equal(withSetting(base, 'roundsPerLong', 99).settings.roundsPerLong, SETTING_LIMITS.roundsPerLong[1])
  assert.equal(withSetting(base, 'roundsPerLong', 0).settings.roundsPerLong, SETTING_LIMITS.roundsPerLong[0])
  // A UI number input hands over a string; a numeric string is still a value.
  assert.equal(withSetting(base, 'workMin', '40').settings.workMin, 40)
  assert.equal(withSetting(base, 'workMin', ' 30 ').settings.workMin, 30)
  assert.equal(withSetting(base, 'workMin', '9999').settings.workMin, SETTING_LIMITS.workMin[1])
  assert.equal(withSetting(base, 'workMin', '0').settings.workMin, SETTING_LIMITS.workMin[0])
})

test('withSetting keeps the current preference for anything that is not a value (D-1)', () => {
  // `Number('')` is `0` and finite, so a cleared number input used to clamp down
  // to the 1-minute lower bound. Every entry here must be a by-reference no-op.
  const base = state()
  const noValue = [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['tab/newline', '\t\n'],
    ['null', null],
    ['undefined', undefined],
    ['false', false],
    ['true', true],
    ['non-numeric string', 'abc'],
    ['unit-suffixed string', '30px'],
    ['"Infinity" string', 'Infinity'],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['bigint', 30n],
    ['symbol', Symbol('30')],
    ['plain object', {}],
    ['array', []],
    ['function', () => {}],
  ]
  for (const [label, value] of noValue) {
    assert.equal(withSetting(base, 'workMin', value), base, label + ' must keep the current preference')
  }
  assert.equal(base.settings.workMin, 25, 'the input state is untouched')

  // The rule is per-key, not special-cased for the focus length.
  for (const key of ['workMin', 'shortMin', 'longMin', 'roundsPerLong']) {
    assert.equal(withSetting(base, key, ''), base, key + ' + "" must be a no-op')
    assert.equal(withSetting(base, key, '   '), base, key + ' + whitespace must be a no-op')
    assert.equal(withSetting(base, key, null), base, key + ' + null must be a no-op')
  }

  // An unchanged value is a no-op too.
  assert.equal(withSetting(base, 'workMin', 25), base)
})

test('withSetting: clearing the focus-length field cannot produce a 1-minute round (D-1 repro)', () => {
  const base = state()
  const cleared = withSetting(base, 'workMin', '')
  assert.equal(cleared, base)
  assert.equal(cleared.settings.workMin, 25)
  assert.equal(durationOf(cleared.phase, cleared.settings), WORK_MS)
  assert.equal(formatClock(remainingOf(cleared, NOW)), '25:00')
})

test('withSetting accepts only a literal true for switches', () => {
  const base = state()
  assert.equal(withSetting(base, 'sound', true), base, 'an unchanged switch is a no-op by reference')
  assert.equal(withSetting(base, 'sound', false).settings.sound, false)
  assert.deepEqual(withSetting(base, 'sound', false).settings, settings({ sound: false }))
  const off = state({ settings: settings({ sound: false }) })
  assert.equal(withSetting(off, 'sound', 'yes').settings.sound, false, 'a truthy string is not a boolean')
  assert.equal(withSetting(off, 'notify', 1).settings.notify, false)
  assert.equal(withSetting(off, 'notify', true).settings.notify, true)
})

test('withSetting follows a new length while paused at full length, otherwise only shrinks', () => {
  const base = state()
  const longer = withSetting(base, 'workMin', 50)
  assert.equal(longer.running, false)
  assert.equal(longer.remainingMs, 50 * MIN, 'a full-length paused round follows the new preference')
  assert.equal(withSetting(base, 'shortMin', 20).remainingMs, WORK_MS, 'another phase does not move this round')

  const midRound = state({ remainingMs: 10 * MIN })
  assert.equal(withSetting(midRound, 'workMin', 50).remainingMs, 10 * MIN, 'never rewound')
  assert.equal(withSetting(midRound, 'workMin', 5).remainingMs, 5 * MIN, 'shrinks to fit')

  const running = toggleRun(base, NOW)
  const changed = withSetting(running, 'workMin', 50)
  assert.equal(changed.remainingMs, WORK_MS, 'the running deadline stays authoritative')
  assert.equal(changed.endsAt, running.endsAt)
})

test('clearStats zeroes both buckets and is a reference no-op when already empty', () => {
  const busy = state({ stats: { day: TODAY, pomodoros: 3, focusMs: 3 * MIN, totalPomodoros: 9, totalFocusMs: 9 * MIN } })
  const cleared = clearStats(busy, NOW)
  assert.deepEqual(cleared.stats, ZERO_STATS)
  assert.equal(cleared.phase, busy.phase)
  assert.equal(busy.stats.pomodoros, 3, 'the input is untouched')
  assert.equal(clearStats(cleared, NOW), cleared)
})

test('cycleRounds, completedRounds and currentRoundNumber agree on the cycle', () => {
  assert.equal(cycleRounds(settings()), 4)
  assert.equal(cycleRounds(settings({ roundsPerLong: 0 })), 1)
  assert.equal(cycleRounds(settings({ roundsPerLong: 99 })), 12)
  assert.equal(cycleRounds(settings({ roundsPerLong: 3.6 })), 4)

  assert.equal(completedRounds(state({ workInCycle: 2 })), 2)
  assert.equal(completedRounds(state({ workInCycle: 99 })), 3, 'clamped to the cycle')
  assert.equal(completedRounds(state({ workInCycle: -5 })), 0)
  assert.equal(completedRounds(state({ workInCycle: NaN })), 0)

  assert.equal(currentRoundNumber(state()), 1)
  assert.equal(currentRoundNumber(state({ workInCycle: 2 })), 3)
  assert.equal(currentRoundNumber(state({ phase: 'short', workInCycle: 2 })), 2)
})

// ── timer.ts: settleIfExpired ───────────────────────────────────────────────

test('settleIfExpired leaves a live or paused round alone by reference', () => {
  const paused = state()
  assert.equal(settleIfExpired(paused, NOW), paused)

  const live = state({ running: true, endsAt: NOW + 1000, remainingMs: 1000 })
  assert.equal(settleIfExpired(live, NOW), live)

  const noDeadline = state({ running: true, endsAt: null })
  assert.equal(settleIfExpired(noDeadline, NOW), noDeadline, 'expiry cannot be proven without a deadline')
})

test('settleIfExpired credits an expired focus round exactly once and stays paused', () => {
  const expired = state({ running: true, endsAt: NOW - 1, remainingMs: 0 })
  const settled = settleIfExpired(expired, NOW)

  assert.equal(settled.running, false)
  assert.equal(settled.endsAt, null)
  assert.equal(settled.phase, 'short')
  assert.equal(settled.workInCycle, 1)
  assert.equal(settled.remainingMs, SHORT_MS)
  assert.equal(settled.stats.pomodoros, 1)
  assert.equal(settled.stats.focusMs, WORK_MS)
  assert.equal(settled.stats.totalPomodoros, 1)

  assert.equal(settleIfExpired(settled, NOW), settled, 'settling again is a no-op')
})

test('settleIfExpired treats the deadline itself as expired and never credits a break', () => {
  const atDeadline = state({ running: true, endsAt: NOW, remainingMs: 0 })
  assert.equal(settleIfExpired(atDeadline, NOW).stats.pomodoros, 1)

  const onBreak = state({ phase: 'short', workInCycle: 1, running: true, endsAt: NOW - 1, remainingMs: 0 })
  const settled = settleIfExpired(onBreak, NOW)
  assert.equal(settled.phase, 'work')
  assert.equal(settled.stats.pomodoros, 0, 'a break is not a pomodoro')
  assert.equal(settled.workInCycle, 1)
})

// ── store.ts ────────────────────────────────────────────────────────────────

test('store: version and storage keys', () => {
  assert.equal(STATE_SCHEMA_VERSION, 2)
  assert.equal(STORE_KEY, 'dsh-pomodoro/store/v2')
  assert.deepEqual([...LEGACY_STORE_KEYS], ['dsh-pomodoro/store/v1'])
  assert.equal(createStore(memoryStorage()).version, STATE_SCHEMA_VERSION)
})

test('store: missing storage or an empty one yields the default state', () => {
  for (const store of [createStore(null), createStore(memoryStorage())]) {
    const s = store.load(NOW)
    assert.equal(s.phase, 'work')
    assert.equal(s.running, false)
    assert.equal(s.remainingMs, WORK_MS)
    assert.deepEqual(s.stats, ZERO_STATS)
    assert.deepEqual(s.ui, { x: null, y: null, collapsed: false })
    assert.doesNotThrow(() => store.save(s))
  }
})

test('store: load() defaults its clock', () => {
  const s = createStore(memoryStorage()).load()
  assert.equal(s.remainingMs, WORK_MS)
  assert.match(s.stats.day, /^\d{4}-\d{2}-\d{2}$/)
})

test('store: malformed or non-object JSON falls back to defaults instead of throwing', () => {
  for (const raw of ['{oops', 'null', '42', '"hello"', '[1,2]', 'true', '']) {
    const s = createStore(memoryStorage({ [STORE_KEY]: raw })).load(NOW)
    assert.equal(s.phase, 'work')
    assert.equal(s.remainingMs, WORK_MS)
    assert.equal(s.stats.pomodoros, 0)
  }
})

test('store: unreadable storage never throws', () => {
  const hostile = {
    getItem() {
      throw new Error('SecurityError')
    },
    setItem() {
      throw new Error('QuotaExceeded')
    },
  }
  const store = createStore(hostile)
  assert.doesNotThrow(() => store.save(initialState(NOW)))
  const s = store.load(NOW)
  assert.equal(s.remainingMs, WORK_MS)

  const notAString = { getItem: () => 42, setItem() {} }
  assert.equal(createStore(notAString).load(NOW).remainingMs, WORK_MS)
})

test('store: settings get per-key validation (wrong types -> defaults, numbers -> clamped)', () => {
  const stored = snapshot({
    settings: {
      workMin: 999,
      shortMin: 0,
      longMin: '15',
      roundsPerLong: 3.6,
      autoStartBreak: 'yes',
      autoStartWork: true,
      sound: 0,
      tick: null,
      notify: 1,
    },
  })
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)

  assert.equal(s.settings.workMin, SETTING_LIMITS.workMin[1], 'out of range -> clamped high')
  assert.equal(s.settings.shortMin, SETTING_LIMITS.shortMin[0], 'out of range -> clamped low')
  assert.equal(s.settings.longMin, DEFAULT_SETTINGS.longMin, 'a string is a wrong type -> default')
  assert.equal(s.settings.roundsPerLong, 4)
  assert.equal(s.settings.autoStartBreak, DEFAULT_SETTINGS.autoStartBreak)
  assert.equal(s.settings.autoStartWork, true, 'a real boolean is kept')
  assert.equal(s.settings.sound, DEFAULT_SETTINGS.sound)
  assert.equal(s.settings.tick, DEFAULT_SETTINGS.tick)
  assert.equal(s.settings.notify, DEFAULT_SETTINGS.notify)
})

test('store: a fully absent settings object keeps every default', () => {
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify({ v: 2 }) })).load(NOW)
  assert.deepEqual({ ...s.settings }, { ...DEFAULT_SETTINGS })
})

test('store: phase, cycle counter and placement are validated', () => {
  const stored = snapshot({
    phase: 'nonsense',
    workInCycle: 99,
    ui: { x: 120, y: 'top', collapsed: 'yes' },
  })
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)
  assert.equal(s.phase, 'work')
  assert.equal(s.workInCycle, 3, 'clamped into the 4-round cycle')
  assert.deepEqual(s.ui, { x: 120, y: null, collapsed: false })

  const long = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(snapshot({ phase: 'long' })) })).load(NOW)
  assert.equal(long.phase, 'long')
  assert.equal(long.remainingMs, LONG_MS)
})

test('store: a hostile snapshot of wrong types never throws', () => {
  const stored = {
    v: 2,
    settings: null,
    phase: {},
    running: 'yes',
    endsAt: 'soon',
    remainingMs: [],
    workInCycle: {},
    stats: [1],
    ui: 7,
  }
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)
  assert.equal(s.phase, 'work')
  assert.equal(s.running, false)
  assert.equal(s.remainingMs, WORK_MS)
  assert.equal(s.workInCycle, 0)
  assert.deepEqual(s.stats, ZERO_STATS)
  assert.deepEqual(s.ui, { x: null, y: null, collapsed: false })
})

test('store: a stale day resets today and keeps lifetime totals', () => {
  const stored = snapshot({
    stats: { day: SOME_OTHER_DAY, pomodoros: 6, focusMs: 6 * MIN, totalPomodoros: 40, totalFocusMs: 40 * MIN },
  })
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)
  assert.deepEqual(s.stats, {
    day: TODAY,
    pomodoros: 0,
    focusMs: 0,
    totalPomodoros: 40,
    totalFocusMs: 40 * MIN,
  })
})

test('store: a paused remainder is restored, clamped to the phase length, and defaults to full', () => {
  const load = (overrides) => createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(snapshot(overrides)) })).load(NOW)

  assert.equal(load({ remainingMs: 10 * MIN }).remainingMs, 10 * MIN)
  assert.equal(load({ remainingMs: 99 * MIN }).remainingMs, WORK_MS, 'never longer than the phase')
  assert.equal(load({ remainingMs: 0 }).remainingMs, WORK_MS)
  assert.equal(load({ remainingMs: -5 }).remainingMs, WORK_MS)
  assert.equal(load({ remainingMs: NaN }).remainingMs, WORK_MS)
  assert.equal(load({ remainingMs: 'nope' }).remainingMs, WORK_MS)
})

test('store: a running snapshot with a future deadline is replayed as running', () => {
  const endsAt = NOW + 90_000
  const stored = snapshot({ running: true, endsAt, remainingMs: null })
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)

  assert.equal(s.running, true)
  assert.equal(s.endsAt, endsAt)
  assert.equal(s.remainingMs, 90_000, 'remaining is derived from the deadline')
  assert.equal(remainingOf(s, NOW), 90_000)
})

test('store: a deadline that passed while away settles once, credited and paused', () => {
  const storage = memoryStorage({ [STORE_KEY]: JSON.stringify(snapshot({ running: true, endsAt: NOW - 1, remainingMs: null })) })
  const store = createStore(storage)
  const s = store.load(NOW)

  assert.equal(s.running, false)
  assert.equal(s.endsAt, null)
  assert.equal(s.phase, 'short')
  assert.equal(s.workInCycle, 1)
  assert.equal(s.stats.pomodoros, 1)
  assert.equal(s.stats.focusMs, WORK_MS)
  assert.equal(s.stats.totalPomodoros, 1)
  assert.equal(s.remainingMs, SHORT_MS)

  // The settle was persisted, so reloading cannot credit the same round twice.
  const again = store.load(NOW + 1000)
  assert.equal(again.stats.pomodoros, 1)
  assert.equal(again.running, false)

  const persisted = JSON.parse(storage.map.get(STORE_KEY))
  assert.equal(persisted.v, STATE_SCHEMA_VERSION)
  assert.equal(persisted.running, false)
  assert.equal(persisted.phase, 'short')
})

test('store: an expired break settles back to focus without crediting', () => {
  const stored = snapshot({
    phase: 'short',
    workInCycle: 1,
    running: true,
    endsAt: NOW - 1,
    remainingMs: null,
    stats: { day: TODAY, pomodoros: 3, focusMs: 3 * MIN, totalPomodoros: 3, totalFocusMs: 3 * MIN },
  })
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)
  assert.equal(s.phase, 'work')
  assert.equal(s.running, false)
  assert.equal(s.stats.pomodoros, 3)
  assert.equal(s.workInCycle, 1)
})

test('store: a running snapshot without a usable deadline falls back to its paused remainder', () => {
  const stored = snapshot({ running: true, endsAt: 'soon', remainingMs: 7 * MIN })
  const s = createStore(memoryStorage({ [STORE_KEY]: JSON.stringify(stored) })).load(NOW)
  assert.equal(s.running, false)
  assert.equal(s.endsAt, null)
  assert.equal(s.remainingMs, 7 * MIN)
})

test('store: a legacy v1 snapshot is migrated into the v2 key', () => {
  const legacyKey = LEGACY_STORE_KEYS[0]
  const legacy = {
    v: 1,
    settings: settings({ workMin: 30, roundsPerLong: 2 }),
    phase: 'short',
    running: false,
    endsAt: null,
    remainingMs: 3 * MIN,
    workInCycle: 1,
    stats: { day: TODAY, pomodoros: 2, focusMs: 2 * MIN, totalPomodoros: 5, totalFocusMs: 5 * MIN },
    ui: { x: 40, y: 60, collapsed: true },
  }
  const storage = memoryStorage({ [legacyKey]: JSON.stringify(legacy) })
  const s = createStore(storage).load(NOW)

  assert.equal(s.settings.workMin, 30)
  assert.equal(s.settings.roundsPerLong, 2)
  assert.equal(s.phase, 'short')
  assert.equal(s.remainingMs, 3 * MIN)
  assert.equal(s.workInCycle, 1)
  assert.equal(s.stats.pomodoros, 2)
  assert.deepEqual(s.ui, { x: 40, y: 60, collapsed: true })

  const migrated = JSON.parse(storage.map.get(STORE_KEY))
  assert.equal(migrated.v, STATE_SCHEMA_VERSION)
  assert.equal(migrated.settings.workMin, 30)
  assert.equal(migrated.phase, 'short')
  assert.equal(migrated.stats.pomodoros, 2)
})

test('store: the current key wins over a legacy one and is left untouched', () => {
  const legacyKey = LEGACY_STORE_KEYS[0]
  const storage = memoryStorage({
    [STORE_KEY]: JSON.stringify(snapshot({ settings: settings({ workMin: 40 }) })),
    [legacyKey]: JSON.stringify({ v: 1, settings: settings({ workMin: 10 }) }),
  })
  const s = createStore(storage).load(NOW)
  assert.equal(s.settings.workMin, 40)
  assert.equal(JSON.parse(storage.map.get(legacyKey)).settings.workMin, 10)
})

test('store: a corrupt legacy snapshot is ignored, not migrated', () => {
  const storage = memoryStorage({ [LEGACY_STORE_KEYS[0]]: '{broken' })
  const s = createStore(storage).load(NOW)
  assert.equal(s.remainingMs, WORK_MS)
  assert.equal(storage.map.has(STORE_KEY), false)
})

test('store: a running legacy snapshot migrates forward still running', () => {
  const legacyKey = LEGACY_STORE_KEYS[0]
  const legacy = snapshot({ v: 1, running: true, endsAt: NOW + 60_000, remainingMs: null })
  const storage = memoryStorage({ [legacyKey]: JSON.stringify(legacy) })
  const s = createStore(storage).load(NOW)

  assert.equal(s.running, true)
  assert.equal(s.endsAt, NOW + 60_000)
  assert.equal(s.remainingMs, 60_000)

  const migrated = JSON.parse(storage.map.get(STORE_KEY))
  assert.equal(migrated.v, STATE_SCHEMA_VERSION)
  assert.equal(migrated.running, true)
  assert.equal(migrated.endsAt, NOW + 60_000)
})

test('store: save/load round-trips a paused state', () => {
  const storage = memoryStorage()
  const store = createStore(storage)
  const saved = state({
    phase: 'long',
    settings: settings({ longMin: 20 }),
    workInCycle: 2,
    stats: { day: TODAY, pomodoros: 3, focusMs: 3 * MIN, totalPomodoros: 8, totalFocusMs: 8 * MIN },
    ui: { x: 12, y: 34, collapsed: true },
    remainingMs: 7 * MIN,
  })
  store.save(saved)

  const raw = JSON.parse(storage.map.get(STORE_KEY))
  assert.equal(raw.v, STATE_SCHEMA_VERSION)
  assert.equal(raw.remainingMs, 7 * MIN)

  const loaded = store.load(NOW)
  assert.equal(loaded.phase, 'long')
  assert.equal(loaded.settings.longMin, 20)
  assert.equal(loaded.workInCycle, 2)
  assert.deepEqual(loaded.stats, saved.stats)
  assert.deepEqual(loaded.ui, saved.ui)
  assert.equal(loaded.remainingMs, 7 * MIN)
  assert.equal(loaded.running, false)
})

test('store: a running state round-trips through its deadline', () => {
  const storage = memoryStorage()
  const store = createStore(storage)
  store.save(toggleRun(initialState(NOW), NOW))

  const raw = JSON.parse(storage.map.get(STORE_KEY))
  assert.equal(raw.running, true)
  assert.equal(raw.remainingMs, null, 'while running the deadline is the only truth')
  assert.equal(raw.endsAt, NOW + WORK_MS)

  const loaded = store.load(NOW + 60_000)
  assert.equal(loaded.running, true)
  assert.equal(loaded.endsAt, NOW + WORK_MS)
  assert.equal(loaded.remainingMs, WORK_MS - 60_000)
})

// ── purity across the whole core ────────────────────────────────────────────

test('purity: no transition mutates its input state, even when it is frozen', () => {
  const transitions = [
    ['advance (credit)', (s) => advance(s, { credit: true, auto: true, now: NOW })],
    ['advance (skip)', (s) => advance(s, { credit: false, auto: false, now: NOW })],
    ['toggleRun', (s) => toggleRun(s, NOW)],
    ['resetRound', (s) => resetRound(s)],
    ['withSetting (number)', (s) => withSetting(s, 'workMin', 50)],
    ['withSetting (toggle)', (s) => withSetting(s, 'sound', false)],
    ['withSetting (ignored)', (s) => withSetting(s, 'workMin', 'abc')],
    ['clearStats', (s) => clearStats(s, NOW)],
    ['settleIfExpired', (s) => settleIfExpired(s, NOW)],
    ['remainingOf', (s) => remainingOf(s, NOW)],
    ['progressOf', (s) => progressOf(s, NOW)],
  ]

  for (const [label, run] of transitions) {
    const input = deepFreeze(initialState(NOW))
    const before = JSON.stringify(input)
    assert.doesNotThrow(() => run(input), label)
    assert.equal(JSON.stringify(input), before, label + ' mutated its input')
  }
})

test('purity: hostile values never throw anywhere', () => {
  const hostile = [undefined, null, NaN, Infinity, -Infinity, 'x', [], {}, true, false, Symbol('s'), 1n, () => {}]
  for (const value of hostile) {
    assert.doesNotThrow(() => normalizeStats(value, NOW))
    assert.doesNotThrow(() => clampInt(value, 0, 10))
    assert.doesNotThrow(() => withSetting(initialState(NOW), 'workMin', value))
    assert.doesNotThrow(() => withSetting(initialState(NOW), 'sound', value))
  }
})
