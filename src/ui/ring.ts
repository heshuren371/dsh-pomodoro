/**
 * The progress ring, the clock and the phase/round captions.
 *
 * The ring is a `role="timer"` region so assistive tech can find it; the visual
 * SVG itself stays decorative and every value is exposed as text in the centre.
 * @module
 */
import type * as ReactNS from 'react'
import { h } from './h.js'
import type { Phase } from '../core/types.js'

/** Ring geometry, shared by both circles. */
const RING_RADIUS = 56

/** Circumference of the progress circle. */
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** Props accepted by {@link Ring}. */
export interface RingProps {
  /** Round currently on screen. */
  phase: Phase
  /** Whether the round is counting down. */
  running: boolean
  /** Fraction of the round already elapsed, in `[0, 1]`. */
  progress: number
  /** `MM:SS` text for the centre. */
  clock: string
  /** Localized phase name. */
  phaseText: string
  /** Localized round counter, e.g. `第 1/4 轮`. */
  roundText: string
  /** Accessible name for the timer region. */
  label: string
}

/**
 * Render the ring and its centre readout.
 * @param props - Phase, progress and the pre-translated captions.
 * @returns The ring block.
 */
export function Ring(props: RingProps): ReactNS.ReactElement {
  const offset = RING_LENGTH * (1 - Math.min(1, Math.max(0, props.progress)))
  return h(
    'div',
    { className: 'dsp-ringwrap', role: 'timer', 'aria-label': props.label },
    h(
      'svg',
      {
        className: 'dsp-ring dsp-ring--' + props.phase + (props.running ? ' is-running' : ''),
        viewBox: '0 0 132 132',
        width: 132,
        height: 132,
        'aria-hidden': true,
      },
      h('circle', {
        cx: 66,
        cy: 66,
        r: RING_RADIUS,
        fill: 'none',
        stroke: 'var(--dsw-alias-border-l2)',
        strokeWidth: 7,
      }),
      h('circle', {
        className: 'dsp-progress',
        cx: 66,
        cy: 66,
        r: RING_RADIUS,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 7,
        strokeLinecap: 'round',
        strokeDasharray: RING_LENGTH,
        strokeDashoffset: offset,
        transform: 'rotate(-90 66 66)',
      }),
    ),
    h(
      'div',
      { className: 'dsp-center' },
      h('div', { className: 'dsp-clock' }, props.clock),
      h('div', { className: 'dsp-phase' }, props.phaseText),
      h('div', { className: 'dsp-round' }, props.roundText),
    ),
  )
}
