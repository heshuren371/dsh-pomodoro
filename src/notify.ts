/**
 * Desktop-notification plumbing. Wording stays in `src/i18n.ts`; this module is
 * only the thin, defensive wrapper around the browser `Notification` API.
 *
 * Nothing here ever throws: a shell without notifications, a denied permission,
 * or a constructor that rejects an option object all degrade to silence, which is
 * the same contract the card gives for sound.
 * @module
 */

/** Permission state, plus `unsupported` for a shell without the API. */
export type NotifyPermission = NotificationPermission | 'unsupported'

/**
 * The shell's `Notification` constructor.
 * @returns The constructor, or `null` when the API is unavailable.
 */
function notificationCtor(): typeof Notification | null {
  const scope = window as unknown as { Notification?: typeof Notification }
  const ctor = scope.Notification
  return typeof ctor === 'function' ? ctor : null
}

/**
 * Read the current permission without prompting.
 * @returns The permission, or `unsupported`.
 */
export function notificationPermission(): NotifyPermission {
  try {
    return notificationCtor()?.permission ?? 'unsupported'
  } catch {
    return 'unsupported'
  }
}

/**
 * Ask the user for permission. Called only when the notification switch is turned
 * on, never on mount.
 * @returns The resulting permission; `unsupported` when there is no API.
 */
export function requestNotificationPermission(): Promise<NotifyPermission> {
  try {
    const ctor = notificationCtor()
    if (ctor === null) return Promise.resolve<NotifyPermission>('unsupported')
    return Promise.resolve(ctor.requestPermission()).then(
      (result) => result,
      () => 'denied' as const,
    )
  } catch {
    return Promise.resolve<NotifyPermission>('denied')
  }
}

/**
 * Show one notification when permission allows it.
 * @param title - Notification title.
 * @param body - Notification body.
 */
export function showNotification(title: string, body: string): void {
  try {
    const ctor = notificationCtor()
    if (ctor === null || ctor.permission !== 'granted') return
    new ctor(title, { body, tag: 'dsh-pomodoro', silent: true })
  } catch {
    /* notifications are best-effort */
  }
}
