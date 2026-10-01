/**
 * The floating Pomodoro card: rendering, the drag interaction, the round loop,
 * persistence, keyboard shortcuts and the accessibility announcements.
 *
 * Everything arithmetic lives in `src/core/*` — this module only calls the pure
 * transitions with an explicit `Date.now()` and keeps the platform side effects
 * (timers, storage, audio, notifications, DOM listeners) cleaned up on unmount.
 * @module
 */
import type * as ReactNS from 'react'
import { React } from '../platform.js'
import { h } from './h.js'
import { t } from '../i18n.js'
import {
  advance,
  clearStats,
  completedRounds,
  cycleRounds,
  durationOf,
  progressOf,
  remainingOf,
  resetRound,
  settleIfExpired,
  toggleRun,
  withSetting,
} from '../core/timer.js'
import { createStore, type Store } from '../core/store.js'
import { formatClock, formatMinutes } from '../core/format.js'
import {
  DEFAULT_SETTINGS,
  STORE_KEY,
  type NumericSettingKey,
  type Phase,
  type PomodoroState,
  type SettingKey,
  type StorageLike,
  type ToggleSettingKey,
} from '../core/types.js'
import { closeAudio, playChime, playTick, unlockAudio } from '../audio.js'
import { notificationPermission, requestNotificationPermission, showNotification } from '../notify.js'
import { Icon, type IconName } from './icons.js'
import { Ring } from './ring.js'
import { Controls } from './controls.js'
import { SettingsPanel } from './settings.js'
import { renderLayer } from './layer.js'

/** How long a transient notice stays on screen. */
const NOTICE_MS = 2800

/** How long the pointer must rest before a dragged position is persisted. */
const POSITION_SAVE_MS = 250

/** Interval of the round loop; the remaining time itself comes from the deadline. */
const TICK_INTERVAL_MS = 200

/** Card position on screen; each axis is `null` until the card is placed. */
interface CardPosition {
  x: number | null
  y: number | null
}

/** An in-flight drag: the pointer offset inside the card. */
interface DragOrigin {
  dx: number
  dy: number
}

/**
 * `window.localStorage`, or `null` when even reading the property throws (some
 * privacy modes do).
 * @returns The storage face, or `null`.
 */
function openStorage(): StorageLike | null {
  try {
    const storage: Storage | undefined = window.localStorage
    return storage === undefined ? null : storage
  } catch {
    return null
  }
}

/**
 * Localized name of a phase.
 * @param phase - Round type.
 * @returns The translated label.
 */
function phaseLabel(phase: Phase): string {
  return t(phase === 'work' ? 'phase.work' : phase === 'short' ? 'phase.short' : 'phase.long')
}

/**
 * Keep a card position inside the viewport, leaving a small margin.
 * @param point - Candidate position.
 * @param element - Card element, used for its measured size.
 * @returns A clamped position.
 */
function clampPosition(point: { x: number; y: number }, element: HTMLElement | null): { x: number; y: number } {
  const width = element !== null && element.offsetWidth > 0 ? element.offsetWidth : 252
  const height = element !== null && element.offsetHeight > 0 ? element.offsetHeight : 220
  const maxX = Math.max(8, window.innerWidth - width - 8)
  const maxY = Math.max(8, window.innerHeight - height - 8)
  return { x: Math.min(Math.max(8, point.x), maxX), y: Math.min(Math.max(8, point.y), maxY) }
}

/**
 * Small icon-only control factory, shared by the header and the pill.
 * @param name - Icon to draw.
 * @param label - Accessible name and tooltip.
 * @param onClick - Activation handler.
 * @param extraClass - Optional extra class.
 * @returns The button element.
 */
function iconButton(
  name: IconName,
  label: string,
  onClick: () => void,
  extraClass?: string,
): ReactNS.ReactElement {
  return h(
    'button',
    {
      key: name,
      type: 'button',
      className: 'dsp-iconbtn' + (extraClass === undefined ? '' : ' ' + extraClass),
      'data-dsp-no-drag': '1',
      title: label,
      'aria-label': label,
      onClick,
    },
    h(Icon, { name }),
  )
}

/**
 * The whole Pomodoro card: progress ring, controls, statistics and settings.
 * @returns The card element, wrapped in its click-through layer.
 */
export function PomodoroOverlay(): ReactNS.ReactElement {
  const { useCallback, useEffect, useRef, useState } = React
  // `useLayoutEffect` is absent in a non-DOM renderer; the placement must still run.
  const layoutEffect: typeof React.useEffect =
    typeof React.useLayoutEffect === 'function' ? React.useLayoutEffect : React.useEffect

  const [store] = useState<Store>(() => createStore(openStorage()))
  const [state, setState] = useState<PomodoroState>(() => settleIfExpired(store.load(Date.now()), Date.now()))
  const [now, setNow] = useState<number>(() => Date.now())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState<CardPosition>(() => ({ x: state.ui.x, y: state.ui.y }))

  const stateRef = useRef(state)
  const cardRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragOrigin | null>(null)
  const finishingRef = useRef(false)
  const lastTickSecondRef = useRef(0)
  const noticeTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const previousPhaseRef = useRef<Phase>(state.phase)
  stateRef.current = state

  /** Show a transient status line under the stats. */
  const showNotice = useCallback((message: string): void => {
    setNotice(message)
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null
      setNotice(null)
    }, NOTICE_MS)
  }, [])

  // ── lifecycle cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
      closeAudio()
    }
  }, [])

  // ── persistence: one write per durable change ────────────────────────────
  useEffect(() => {
    store.save(state)
  }, [store, state])

  // ── transitions ──────────────────────────────────────────────────────────
  const applyState = useCallback((next: PomodoroState): void => {
    // A notification-permission prompt can resolve after the card is gone.
    if (!mountedRef.current) return
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
  }, [])

  const completeRound = useCallback((): void => {
    const current = stateRef.current
    if (!current.running || current.endsAt === null || Date.now() < current.endsAt) return
    if (finishingRef.current) return
    finishingRef.current = true
    try {
      const finishedPhase = current.phase
      const next = advance(current, { credit: true })
      applyState(next)
      setNow(Date.now())
      if (current.settings.sound) playChime(finishedPhase)
      if (current.settings.notify) {
        const minutes = formatMinutes(durationOf(next.phase, next.settings))
        const title = t(finishedPhase === 'work' ? 'notify.workDone' : 'notify.breakDone')
        const body =
          finishedPhase === 'work'
            ? t('notify.workDone.body', minutes, phaseLabel(next.phase))
            : t('notify.breakDone.body', minutes)
        showNotification(title, body)
      }
    } finally {
      finishingRef.current = false
    }
  }, [applyState])

  const handleToggleRun = useCallback((): void => {
    const current = stateRef.current
    if (!current.running) unlockAudio()
    applyState(toggleRun(current, Date.now()))
    setNow(Date.now())
  }, [applyState])

  const handleReset = useCallback((): void => {
    applyState(resetRound(stateRef.current))
    setNow(Date.now())
  }, [applyState])

  const handleSkip = useCallback((): void => {
    applyState(advance(stateRef.current, { credit: false }))
    setNow(Date.now())
  }, [applyState])

  const handleNumberChange = useCallback(
    (key: NumericSettingKey, rawValue: string): void => {
      applyState(withSetting(stateRef.current, key, rawValue))
    },
    [applyState],
  )

  const handleToggleChange = useCallback(
    (key: ToggleSettingKey, next: boolean): void => {
      applyState(withSetting(stateRef.current, key, next))
    },
    [applyState],
  )

  const handleClearStats = useCallback((): void => {
    applyState(clearStats(stateRef.current, Date.now()))
    showNotice(t('notice.cleared'))
  }, [applyState, showNotice])

  const handleRestoreDefaults = useCallback((): void => {
    let next: PomodoroState = stateRef.current
    for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
      next = withSetting(next, key, DEFAULT_SETTINGS[key])
    }
    applyState(next)
    showNotice(t('notice.defaults'))
  }, [applyState, showNotice])

  /**
   * The notification switch is the only place that may prompt: turning it off, or
   * reading an already-granted permission, never asks the browser anything.
   */
  const handleNotifyToggle = useCallback(
    (next: boolean): void => {
      if (!next) {
        applyState(withSetting(stateRef.current, 'notify', false))
        return
      }
      const permission = notificationPermission()
      if (permission === 'granted') {
        applyState(withSetting(stateRef.current, 'notify', true))
        return
      }
      if (permission === 'unsupported') {
        showNotice(t('notice.noNotify'))
        return
      }
      if (permission === 'denied') {
        showNotice(t('notice.notifyDenied'))
        return
      }
      void requestNotificationPermission().then((result) => {
        if (result === 'granted') {
          applyState(withSetting(stateRef.current, 'notify', true))
          showNotice(t('notice.notifyOn'))
        } else {
          showNotice(t('notice.notifyDenied'))
        }
      })
    },
    [applyState, showNotice],
  )

  const handleSettingsToggle = useCallback(
    (key: ToggleSettingKey, next: boolean): void => {
      if (key === 'notify') handleNotifyToggle(next)
      else handleToggleChange(key, next)
    },
    [handleNotifyToggle, handleToggleChange],
  )

  const setCollapsed = useCallback(
    (collapsed: boolean): void => {
      const current = stateRef.current
      applyState({ ...current, ui: { ...current.ui, collapsed } })
    },
    [applyState],
  )

  // ── the clock: derived from wall-clock deadlines, so throttled tabs catch up ──
  useEffect(() => {
    if (!state.running || state.endsAt === null) return undefined
    const step = (): void => {
      const current = stateRef.current
      if (!current.running || current.endsAt === null) return
      const stamp = Date.now()
      if (stamp >= current.endsAt) {
        completeRound()
        return
      }
      setNow(stamp)
      if (current.settings.tick && current.phase === 'work') {
        const second = Math.floor(stamp / 1000)
        if (second !== lastTickSecondRef.current) {
          lastTickSecondRef.current = second
          playTick()
        }
      }
    }
    step()
    const id = window.setInterval(step, TICK_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [state.running, state.endsAt, completeRound])

  useEffect(() => {
    if (!state.running) return undefined
    const check = (): void => {
      const current = stateRef.current
      if (current.running && current.endsAt !== null && Date.now() >= current.endsAt) completeRound()
    }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [state.running, completeRound])

  // ── placement ────────────────────────────────────────────────────────────
  layoutEffect(() => {
    const element = cardRef.current
    setPosition((previous) => {
      if (previous.x !== null && previous.y !== null) return clampPosition({ x: previous.x, y: previous.y }, element)
      const rect = element === null ? null : element.getBoundingClientRect()
      const width = rect !== null && rect.width > 0 ? rect.width : 252
      const height = rect !== null && rect.height > 0 ? rect.height : 220
      return {
        x: Math.max(12, window.innerWidth - width - 24),
        y: Math.max(12, window.innerHeight - height - 24),
      }
    })
    // Placement runs once; later moves come from drag and resize.
  }, [])

  useEffect(() => {
    const onResize = (): void => {
      const element = cardRef.current
      setPosition((previous) =>
        previous.x === null || previous.y === null ? previous : clampPosition({ x: previous.x, y: previous.y }, element),
      )
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Persist a dragged position once the pointer rests, not on every frame.
  useEffect(() => {
    if (position.x === null || position.y === null) return undefined
    const x = position.x
    const y = position.y
    const id = window.setTimeout(() => {
      setState((previous) =>
        previous.ui.x === x && previous.ui.y === y ? previous : { ...previous, ui: { ...previous.ui, x, y } },
      )
    }, POSITION_SAVE_MS)
    return () => window.clearTimeout(id)
  }, [position.x, position.y])

  // ── multi-tab sync: adopt the other tab's snapshot ───────────────────────
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== null && event.key !== STORE_KEY) return
      // A drag is a local interaction; adopting another tab's position mid-gesture
      // would fight the pointer.
      if (dragRef.current !== null) return
      const next = settleIfExpired(store.load(Date.now()), Date.now())
      stateRef.current = next
      setState(next)
      setNow(Date.now())
      if (next.ui.x !== null && next.ui.y !== null) setPosition({ x: next.ui.x, y: next.ui.y })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store])

  // ── accessibility: announce every round change ───────────────────────────
  useEffect(() => {
    if (previousPhaseRef.current === state.phase) return
    previousPhaseRef.current = state.phase
    setAnnouncement(t('a11y.roundDone', phaseLabel(state.phase)))
  }, [state.phase])

  // ── drag ─────────────────────────────────────────────────────────────────
  const onDragStart = useCallback((event: ReactNS.PointerEvent<HTMLElement>): void => {
    if (event.button !== undefined && event.button !== 0) return
    const target = event.target as Element | null
    if (target !== null && typeof target.closest === 'function' && target.closest('[data-dsp-no-drag]') !== null) return
    const element = cardRef.current
    if (element === null) return
    const rect = element.getBoundingClientRect()
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top }
    setDragging(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* pointer capture is a nicety */
    }
    event.preventDefault()
  }, [])

  const onDragMove = useCallback((event: ReactNS.PointerEvent<HTMLElement>): void => {
    const drag = dragRef.current
    if (drag === null) return
    setPosition(clampPosition({ x: event.clientX - drag.dx, y: event.clientY - drag.dy }, cardRef.current))
  }, [])

  const onDragEnd = useCallback((event: ReactNS.PointerEvent<HTMLElement>): void => {
    if (dragRef.current === null) return
    dragRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  const onKeyDown = useCallback(
    (event: ReactNS.KeyboardEvent<HTMLElement>): void => {
      // Only the card itself handles shortcuts; a focused inner control keeps its
      // own native behaviour (Space on a button activates that button).
      if (event.target !== event.currentTarget) return
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        handleToggleRun()
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        handleReset()
      } else if (event.key === 's' || event.key === 'S') {
        event.preventDefault()
        handleSkip()
      }
    },
    [handleReset, handleSkip, handleToggleRun],
  )

  // ── render ───────────────────────────────────────────────────────────────
  const settings = state.settings
  const remaining = remainingOf(state, now)
  const progress = progressOf(state, now)
  const done = completedRounds(state)
  const total = cycleRounds(settings)
  const collapsed = state.ui.collapsed
  const roundText = t('round.counter', state.phase === 'work' ? done + 1 : done, total)

  const cardStyle =
    position.x === null || position.y === null
      ? { right: '24px', bottom: '24px', visibility: 'hidden' as const }
      : { left: position.x + 'px', top: position.y + 'px' }

  const dots = h(
    'div',
    { className: 'dsp-dots', key: 'dots', 'aria-hidden': true },
    Array.from({ length: total }, (_unused, index) =>
      h('span', { key: index, className: 'dsp-pip' + (index < done ? ' is-done' : '') }),
    ),
  )

  const liveRegion = h(
    'div',
    { className: 'dsp-sr', role: 'status', 'aria-live': 'polite', key: 'live' },
    announcement,
  )

  const body = collapsed
    ? h(
        'div',
        { className: 'dsp-mini' },
        h('span', { className: 'dsp-dot dsp-dot--' + state.phase, 'aria-hidden': true }),
        h('span', { className: 'dsp-clock dsp-clock--mini' }, formatClock(remaining)),
        iconButton(
          state.running ? 'pause' : 'play',
          t(state.running ? 'action.pause' : 'action.start'),
          handleToggleRun,
          'dsp-iconbtn--round',
        ),
        iconButton('chevron', t('action.expand'), () => setCollapsed(false), 'dsp-iconbtn--round'),
      )
    : [
        h(
          'header',
          { className: 'dsp-head', key: 'head' },
          h('span', { className: 'dsp-dot dsp-dot--' + state.phase, 'aria-hidden': true }),
          h('span', { className: 'dsp-title' }, t('card.title')),
          h('span', { className: 'dsp-spacer' }),
          iconButton('sliders', t('settings.title'), () => setSettingsOpen((open) => !open)),
          iconButton('minus', t('action.collapse'), () => setCollapsed(true)),
        ),
        h(
          'div',
          { className: 'dsp-body', key: 'body' },
          h(Ring, {
            phase: state.phase,
            running: state.running,
            progress,
            clock: formatClock(remaining),
            phaseText: phaseLabel(state.phase),
            roundText,
            label: t('a11y.timer'),
          }),
          dots,
        ),
        h(Controls, {
          key: 'controls',
          running: state.running,
          onToggleRun: handleToggleRun,
          onReset: handleReset,
          onSkip: handleSkip,
        }),
        h(
          'div',
          { className: 'dsp-stats', key: 'stats' },
          h('span', null, t('stats.today', state.stats.pomodoros, formatMinutes(state.stats.focusMs))),
          h(
            'span',
            { className: 'dsp-stats-total' },
            t('stats.total', state.stats.totalPomodoros, formatMinutes(state.stats.totalFocusMs)),
          ),
        ),
        notice === null ? null : h('div', { className: 'dsp-notice', role: 'status', key: 'notice' }, notice),
        settingsOpen
          ? h(
              'div',
              { key: 'settings' },
              h(SettingsPanel, {
                settings,
                onNumberChange: handleNumberChange,
                onToggleChange: handleSettingsToggle,
                onClearStats: handleClearStats,
                onRestoreDefaults: handleRestoreDefaults,
              }),
            )
          : null,
      ]

  return renderLayer(
    h(
      'section',
      {
        ref: cardRef,
        className:
          'dsp-card dsp-card--' +
          state.phase +
          (collapsed ? ' dsp-card--mini' : '') +
          (dragging ? ' is-dragging' : ''),
        style: cardStyle,
        role: 'group',
        'aria-label': t('card.title'),
        tabIndex: 0,
        onKeyDown,
        onPointerDown: onDragStart,
        onPointerMove: onDragMove,
        onPointerUp: onDragEnd,
        onPointerCancel: onDragEnd,
      },
      body,
      // Outside the collapsed/expanded branch: a round that ends while the card
      // is a pill still has to be announced.
      liveRegion,
    ),
  )
}
