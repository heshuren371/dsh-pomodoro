/**
 * Generated sound: the round chime and the per-second tick, synthesised with
 * WebAudio so the plugin ships no audio assets.
 *
 * Browsers only allow an `AudioContext` to start from a user gesture, so
 * {@link unlockAudio} is called from the start/pause control (and from any other
 * gesture that could lead to a sound) while the actual notes are scheduled later.
 * Every entry point is best-effort: a shell without WebAudio, or a context that
 * refuses to start, silently produces no sound instead of throwing.
 *
 * The context is a module singleton so a remount of the card reuses it, and it is
 * released by {@link closeAudio} when the widget unmounts — an open
 * `AudioContext` keeps a hardware audio thread alive.
 *
 * No React and no Harness import lives here: this module is a plain side-effect
 * helper reached from `src/ui/overlay.ts` at event time.
 * @module
 */
import type { Phase } from './core/types.js'

/** Frequencies of the notes played when a focus round ends. */
const WORK_CHIME_HZ: readonly number[] = [659.25, 880, 1318.51]

/** Frequencies of the notes played when a break ends. */
const BREAK_CHIME_HZ: readonly number[] = [880, 1174.66]

/** The single shared context, or `null` before the first gesture / after unmount. */
let context: AudioContext | null = null

/**
 * The browser's `AudioContext` constructor, including the legacy
 * `webkitAudioContext` spelling some shells still expose.
 * @returns The constructor, or `null` when the shell has no WebAudio.
 */
function audioContextCtor(): (new () => AudioContext) | null {
  const scope = window as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

/**
 * Create (once) and resume the shared context. Must be called from a user
 * gesture to satisfy the browser autoplay policy.
 * @returns The live context, or `null` when WebAudio is unavailable.
 */
export function unlockAudio(): AudioContext | null {
  try {
    if (context === null) {
      const Ctor = audioContextCtor()
      if (Ctor === null) return null
      context = new Ctor()
    }
    if (context.state === 'suspended') {
      const resumed: unknown = context.resume()
      if (resumed instanceof Promise) resumed.catch(() => undefined)
    }
    return context
  } catch {
    context = null
    return null
  }
}

/**
 * Schedule one short tone on the given context.
 * @param target - Context to play on.
 * @param frequency - Tone frequency in hertz.
 * @param startAt - Context-relative start time in seconds.
 * @param duration - Tone length in seconds.
 * @param peak - Peak gain, reached after a 20 ms attack.
 * @param type - Oscillator waveform.
 */
function tone(
  target: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  peak: number,
  type: OscillatorType,
): void {
  const oscillator = target.createOscillator()
  const gain = target.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(target.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.03)
}

/**
 * The context a sound may play on right now. Deliberately does **not** create
 * one: only a user gesture ({@link unlockAudio}) may do that, so a round that
 * completes in a tab the user never touched stays silent instead of leaving a
 * suspended context behind.
 * @returns The running context, or `null`.
 */
function activeAudio(): AudioContext | null {
  const target = context
  if (target === null || target.state !== 'running') return null
  return target
}

/**
 * Play the round chime: a rising three-note figure after focus, two notes after
 * a break.
 * @param finishedPhase - The phase that just ended.
 */
export function playChime(finishedPhase: Phase): void {
  const target = activeAudio()
  if (target === null) return
  const notes = finishedPhase === 'work' ? WORK_CHIME_HZ : BREAK_CHIME_HZ
  try {
    const start = target.currentTime + 0.02
    notes.forEach((frequency, index) => {
      tone(target, frequency, start + index * 0.16, 0.55, 0.2, 'sine')
    })
  } catch {
    /* a context that has already been closed cannot play; sound is optional */
  }
}

/** Play the quiet second-boundary tick used while focus runs. */
export function playTick(): void {
  const target = activeAudio()
  if (target === null) return
  try {
    tone(target, 1500, target.currentTime + 0.001, 0.03, 0.04, 'square')
  } catch {
    /* best-effort */
  }
}

/** Close and forget the shared context. Safe to call more than once. */
export function closeAudio(): void {
  const target = context
  context = null
  if (target === null) return
  try {
    const closed: unknown = target.close()
    if (closed instanceof Promise) closed.catch(() => undefined)
  } catch {
    /* already closed */
  }
}
