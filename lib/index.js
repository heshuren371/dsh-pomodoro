/**
 * Host half of the Pomodoro bundle.
 *
 * The timer is deliberately Client-only: it renders into `shell.overlay` (as a
 * portal beside `#root`) and keeps preferences, statistics and the live round in
 * browser storage. Nothing about a Pomodoro round belongs in the session log, so
 * this half registers no Service, Tool, or Event and exists to give the bundle a
 * Loader row (the patch inserts `@local/dsh-pomodoro`) that owns the Client
 * module declared under `dsh.client`.
 */
/** No host-side configuration: every preference lives in the card's own settings. */
export function apply() { }
