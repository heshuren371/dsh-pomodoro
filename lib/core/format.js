/**
 * Number/date formatting. Pure; no DOM, no locale service.
 * @module
 */
import { MINUTE_MS } from './types.js';
/** Two-digit zero padding for clock and calendar fields. */
function pad2(value) {
    return String(value).padStart(2, '0');
}
/**
 * Coerce an untrusted value to a finite number.
 *
 * `Number()` throws for symbols and may throw again inside a hostile `valueOf`;
 * everything the core reads back from storage is untrusted, so the conversion is
 * always guarded instead of trusted.
 * @param value - Candidate value.
 * @returns The finite number, or `null` when it cannot be represented.
 */
function toFinite(value) {
    try {
        const number = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(number) ? number : null;
    }
    catch {
        return null;
    }
}
/**
 * `MM:SS`, rounding up so a freshly started 25 minute round shows `25:00` and the
 * last second still reads `00:01` before it hits `00:00`.
 * @param ms - Milliseconds remaining.
 * @returns Clock text.
 */
export function formatClock(ms) {
    // Round up (not down) and floor at zero: the displayed second must not reach
    // 00:00 before the deadline actually passes, and an expired round never shows
    // a negative clock.
    const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
    const totalSeconds = Math.ceil(safeMs / 1000);
    return pad2(Math.floor(totalSeconds / 60)) + ':' + pad2(totalSeconds % 60);
}
/**
 * Whole minutes for the statistics line.
 * @param ms - Duration in milliseconds.
 * @returns Rounded minutes.
 */
export function formatMinutes(ms) {
    if (!Number.isFinite(ms) || ms <= 0)
        return 0;
    return Math.round(ms / MINUTE_MS);
}
/**
 * Local calendar day of `now` as `YYYY-MM-DD`, so "today" follows the user's
 * clock rather than UTC.
 * @param now - Epoch milliseconds.
 * @returns Calendar day key.
 */
export function dayKey(now) {
    // Local getters, never `toISOString()`: a round finished at 00:30 local time
    // belongs to the new day even in UTC+13, where UTC is still yesterday.
    // A non-finite/invalid clock falls back to the epoch so the result stays a
    // well-formed key instead of "NaN-NaN-NaN".
    const date = new Date(Number.isFinite(now) ? now : 0);
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}
/**
 * Round and clamp an untrusted number.
 * @param value - Candidate value; anything non-finite falls back to `low`.
 * @param low - Inclusive lower bound.
 * @param high - Inclusive upper bound.
 * @returns An integer inside `[low, high]`.
 */
export function clampInt(value, low, high) {
    const number = toFinite(value);
    // `low` is the safe side for garbage: for every caller it is the most
    // conservative value (a 1 minute round, zero counters).
    if (number === null)
        return low;
    return Math.min(Math.max(Math.round(number), low), high);
}
