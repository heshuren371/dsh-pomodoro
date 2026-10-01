import { DEFAULT_SETTINGS, LEGACY_STORE_KEYS, PHASES, SETTING_LIMITS, STORE_KEY } from './types.js';
import { clampInt } from './format.js';
import { normalizeStats } from './stats.js';
import { durationOf, initialState, settleIfExpired } from './timer.js';
/** Schema version written into {@link STORE_KEY}. */
export const STATE_SCHEMA_VERSION = 2;
/** Object test that also rejects arrays and `null` (both are `typeof 'object'`). */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Read a stored value that must be a real number.
 *
 * Persisted JSON that came from this plugin is always numeric, so anything else
 * (a string, boolean, `null`, `NaN`) is corruption or tampering: it is treated
 * as "wrong type" and normalized to a default rather than coerced.
 * @param value - Candidate value.
 * @returns The finite number, or `null`.
 */
function storedNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
/**
 * One preference from untrusted storage: a finite number is clamped into
 * {@link SETTING_LIMITS}, anything else falls back to the default.
 */
function numericSetting(source, key) {
    const value = storedNumber(source[key]);
    if (value === null)
        return DEFAULT_SETTINGS[key];
    const [low, high] = SETTING_LIMITS[key];
    return clampInt(value, low, high);
}
/** One switch from untrusted storage: only a real boolean is accepted. */
function toggleSetting(source, key) {
    const value = source[key];
    return typeof value === 'boolean' ? value : DEFAULT_SETTINGS[key];
}
/** Placement from untrusted storage; an unusable coordinate means "not placed". */
function position(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
/** Every preference, with per-key validation. */
function normalizeSettings(value) {
    const source = isRecord(value) ? value : {};
    return {
        workMin: numericSetting(source, 'workMin'),
        shortMin: numericSetting(source, 'shortMin'),
        longMin: numericSetting(source, 'longMin'),
        roundsPerLong: numericSetting(source, 'roundsPerLong'),
        autoStartBreak: toggleSetting(source, 'autoStartBreak'),
        autoStartWork: toggleSetting(source, 'autoStartWork'),
        sound: toggleSetting(source, 'sound'),
        tick: toggleSetting(source, 'tick'),
        notify: toggleSetting(source, 'notify'),
    };
}
/** Card placement, defaulting to the unplaced pill. */
function normalizeUi(value) {
    const source = isRecord(value) ? value : {};
    return {
        x: position(source.x),
        y: position(source.y),
        collapsed: source.collapsed === true,
    };
}
/** Stored phase, defaulting to focus. */
function toPhase(value) {
    if (typeof value === 'string' && PHASES.includes(value))
        return value;
    return 'work';
}
/**
 * Read and parse one snapshot from storage.
 * @param storage - Storage face, or `null`.
 * @param key - Storage key to read.
 * @returns The raw snapshot object, or `null` when missing/unreadable/corrupt.
 */
function readSnapshot(storage, key) {
    if (storage === null)
        return null;
    try {
        const raw = storage.getItem(key);
        if (typeof raw !== 'string' || raw.length === 0)
            return null;
        const parsed = JSON.parse(raw);
        return isRecord(parsed) ? parsed : null;
    }
    catch {
        // Unreadable storage (private mode, a SecurityError) or malformed JSON:
        // behave exactly as if nothing had been stored.
        return null;
    }
}
/**
 * Rebuild a valid state from an untrusted snapshot, replaying the live round.
 * @param snapshot - Raw snapshot object.
 * @param now - Epoch milliseconds.
 * @returns A valid state.
 */
function rehydrate(snapshot, now) {
    const settings = normalizeSettings(snapshot.settings);
    const phase = toPhase(snapshot.phase);
    const rounds = clampInt(settings.roundsPerLong, SETTING_LIMITS.roundsPerLong[0], SETTING_LIMITS.roundsPerLong[1]);
    const storedCycle = storedNumber(snapshot.workInCycle);
    const base = {
        settings,
        phase,
        running: false,
        endsAt: null,
        remainingMs: durationOf(phase, settings),
        workInCycle: storedCycle === null ? 0 : clampInt(storedCycle, 0, rounds - 1),
        stats: normalizeStats(snapshot.stats, now),
        ui: normalizeUi(snapshot.ui),
    };
    if (snapshot.running === true) {
        const endsAt = storedNumber(snapshot.endsAt);
        if (endsAt !== null) {
            // A round that outlived the page is replayed from its deadline: still
            // running while the deadline is ahead, settled once (paused, credited)
            // once it has passed.
            return settleIfExpired({ ...base, running: true, endsAt, remainingMs: Math.max(0, endsAt - now) }, now);
        }
    }
    const remaining = storedNumber(snapshot.remainingMs);
    if (remaining !== null && remaining > 0) {
        // A paused round never exceeds its configured length, even if the stored
        // value was written by an older, differently-configured version.
        return { ...base, remainingMs: Math.min(remaining, durationOf(phase, settings)) };
    }
    return base;
}
/** True when the snapshot is a running round whose deadline has already passed. */
function isExpiredRunning(snapshot, now) {
    if (snapshot.running !== true)
        return false;
    const endsAt = storedNumber(snapshot.endsAt);
    return endsAt !== null && endsAt <= now;
}
/** The durable projection of a state, as written to storage. */
function toSnapshot(state) {
    const running = state.running === true;
    return {
        v: STATE_SCHEMA_VERSION,
        settings: state.settings,
        phase: state.phase,
        running,
        endsAt: running && Number.isFinite(state.endsAt) ? state.endsAt : null,
        // While running the deadline is the only durable truth: a stale
        // `remainingMs` must never be read back as a paused round.
        remainingMs: running ? null : state.remainingMs,
        workInCycle: state.workInCycle,
        stats: state.stats,
        ui: state.ui,
    };
}
/** Best-effort write; storage failures must never break the timer. */
function writeSnapshot(storage, state) {
    if (storage === null)
        return;
    try {
        storage.setItem(STORE_KEY, JSON.stringify(toSnapshot(state)));
    }
    catch {
        // Quota exceeded, private mode, or a poisoned storage: the timer keeps
        // working, it just forgets.
    }
}
/**
 * Build a store over an injected storage face.
 * @param storage - `window.localStorage`, or `null` when unavailable.
 * @returns The store.
 */
export function createStore(storage) {
    return {
        version: STATE_SCHEMA_VERSION,
        load(now) {
            // The clock is injectable; the wall clock is only read when the caller
            // omits it, mirroring the documented default on the core contract.
            const at = now !== undefined && Number.isFinite(now) ? now : Date.now();
            const snapshot = readSnapshot(storage, STORE_KEY);
            if (snapshot !== null) {
                const state = rehydrate(snapshot, at);
                // Settling is one-way: persist it so reloading again cannot credit the
                // same finished round twice.
                if (isExpiredRunning(snapshot, at))
                    writeSnapshot(storage, state);
                return state;
            }
            // No usable current snapshot: adopt the newest legacy one, if any, and
            // migrate it forward so the next load reads v2 directly.
            for (const key of LEGACY_STORE_KEYS) {
                const legacy = readSnapshot(storage, key);
                if (legacy !== null) {
                    const state = rehydrate(legacy, at);
                    writeSnapshot(storage, state);
                    return state;
                }
            }
            return initialState(at);
        },
        save(state) {
            writeSnapshot(storage, state);
        },
    };
}
