/**
 * Client-side dictionary registry and the module-wide translator.
 *
 * Every visible string in the widget goes through {@link t}; `client.ts` binds it
 * to `ctx.locale.bind(NS)` in `apply`, so the card follows the harness language
 * without re-registering. `t` is keyed by the Chinese dictionary, which makes an
 * unknown key a compile error.
 * @module
 */

/** Locale namespace registered with the Client locale service. */
export const NS = 'dsh-pomodoro'

/** Chinese dictionary; the key set is the contract for every other locale. */
export const zh = {
  'card.title': '番茄钟',
  'a11y.timer': '番茄钟计时器',
  'a11y.roundDone': (phase: string) => '本轮结束，进入' + phase,
  'phase.work': '专注',
  'phase.short': '短休息',
  'phase.long': '长休息',
  'action.start': '开始',
  'action.pause': '暂停',
  'action.reset': '重置本轮',
  'action.skip': '跳过本轮',
  'action.collapse': '收起',
  'action.expand': '展开',
  'action.clearStats': '清除统计',
  'action.defaults': '恢复默认设置',
  'round.counter': (done: number, total: number) => '第 ' + done + '/' + total + ' 轮',
  'stats.today': (count: number, minutes: number) => '今日 ' + count + ' 个 · ' + minutes + ' 分钟',
  'stats.total': (count: number, minutes: number) => '累计 ' + count + ' 个 · ' + minutes + ' 分钟',
  'settings.title': '设置',
  'settings.work': '专注时长',
  'settings.short': '短休息',
  'settings.long': '长休息',
  'settings.rounds': '长休息前轮数',
  'settings.autoStartBreak': '自动开始休息',
  'settings.autoStartWork': '自动开始专注',
  'settings.sound': '结束提示音',
  'settings.tick': '走时滴答声',
  'settings.notify': '桌面通知',
  'unit.minute': '分钟',
  'unit.round': '轮',
  'shortcut.hint': '快捷键：空格 开始/暂停 · R 重置 · S 跳过',
  'notify.workDone': '专注结束',
  'notify.workDone.body': (minutes: number, phase: string) => '休息一下：' + phase + ' ' + minutes + ' 分钟',
  'notify.breakDone': '休息结束',
  'notify.breakDone.body': (minutes: number) => '继续下一轮专注：' + minutes + ' 分钟',
  'notice.noNotify': '当前环境不支持桌面通知',
  'notice.notifyDenied': '通知权限被拒绝，可在浏览器地址栏中重新开启',
  'notice.notifyOn': '已开启桌面通知',
  'notice.cleared': '统计已清除',
  'notice.defaults': '已恢复默认设置',
  'error.render': '番茄钟出错了：',
  'error.retry': '重试',
} as const

/** English dictionary; same keys as {@link zh}. */
export const en: Record<keyof typeof zh, string | ((...args: never[]) => string)> = {
  'card.title': 'Pomodoro',
  'a11y.timer': 'Pomodoro timer',
  'a11y.roundDone': (phase: string) => 'Round finished, now ' + phase,
  'phase.work': 'Focus',
  'phase.short': 'Short break',
  'phase.long': 'Long break',
  'action.start': 'Start',
  'action.pause': 'Pause',
  'action.reset': 'Reset round',
  'action.skip': 'Skip round',
  'action.collapse': 'Collapse',
  'action.expand': 'Expand',
  'action.clearStats': 'Clear statistics',
  'action.defaults': 'Restore defaults',
  'round.counter': (done: number, total: number) => 'Round ' + done + '/' + total,
  'stats.today': (count: number, minutes: number) => 'Today ' + count + ' · ' + minutes + ' min',
  'stats.total': (count: number, minutes: number) => 'All time ' + count + ' · ' + minutes + ' min',
  'settings.title': 'Settings',
  'settings.work': 'Focus length',
  'settings.short': 'Short break',
  'settings.long': 'Long break',
  'settings.rounds': 'Rounds before long break',
  'settings.autoStartBreak': 'Auto-start breaks',
  'settings.autoStartWork': 'Auto-start focus',
  'settings.sound': 'Round chime',
  'settings.tick': 'Ticking during focus',
  'settings.notify': 'Desktop notifications',
  'unit.minute': 'min',
  'unit.round': 'rounds',
  'shortcut.hint': 'Shortcuts: Space start/pause · R reset · S skip',
  'notify.workDone': 'Focus finished',
  'notify.workDone.body': (minutes: number, phase: string) => 'Take a break: ' + phase + ' for ' + minutes + ' min',
  'notify.breakDone': 'Break finished',
  'notify.breakDone.body': (minutes: number) => 'Back to focus for ' + minutes + ' min',
  'notice.noNotify': 'Desktop notifications are not available here',
  'notice.notifyDenied': 'Notification permission was denied — re-enable it from the address bar',
  'notice.notifyOn': 'Desktop notifications enabled',
  'notice.cleared': 'Statistics cleared',
  'notice.defaults': 'Default settings restored',
  'error.render': 'The Pomodoro widget failed: ',
  'error.retry': 'Retry',
}

let boundLocale: ((key: string) => unknown) | null = null

/**
 * Bind the translator to the Client locale service.
 * @param translate - `ctx.locale.bind(NS)`.
 */
export function bindLocale(translate: (key: string) => unknown): void {
  boundLocale = translate
}

/**
 * Translate one key, calling a dictionary function with `args`.
 * @param key - Dictionary key.
 * @param args - Arguments for a function-valued entry.
 * @returns The localized text, or the key when nothing is bound or found.
 */
export function t(key: keyof typeof zh, ...args: unknown[]): string {
  let value: unknown = key
  try {
    value = boundLocale === null ? key : boundLocale(key)
  } catch {
    value = key
  }
  if (typeof value === 'function') return (value as (...inner: unknown[]) => string)(...args)
  return typeof value === 'string' ? value : key
}
