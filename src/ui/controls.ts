/**
 * The transport row: reset the round, start/pause, skip to the next round.
 * @module
 */
import type * as ReactNS from 'react'
import { h } from './h.js'
import { t } from '../i18n.js'
import { Icon, type IconName } from './icons.js'

/** Props accepted by {@link Controls}. */
export interface ControlsProps {
  /** Whether the round is currently counting down. */
  running: boolean
  /** Start or pause the round. */
  onToggleRun(): void
  /** Restart the current round, paused. */
  onReset(): void
  /** Skip to the next round without crediting statistics. */
  onSkip(): void
}

/**
 * Build one icon-only button. Every one is marked `data-dsp-no-drag` so the drag
 * gesture never starts on a control.
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
 * Render the transport row.
 * @param props - Run state and the three handlers.
 * @returns The controls block.
 */
export function Controls(props: ControlsProps): ReactNS.ReactElement {
  const toggleLabel = t(props.running ? 'action.pause' : 'action.start')
  return h(
    'div',
    { className: 'dsp-controls' },
    iconButton('reset', t('action.reset'), props.onReset, 'dsp-iconbtn--wide'),
    h(
      'button',
      {
        key: 'toggle',
        type: 'button',
        className: 'dsp-btn dsp-btn--primary dsp-btn--main',
        'data-dsp-no-drag': '1',
        'aria-label': toggleLabel,
        title: toggleLabel,
        onClick: props.onToggleRun,
      },
      h(Icon, { name: props.running ? 'pause' : 'play' }),
      h('span', null, toggleLabel),
    ),
    iconButton('skip', t('action.skip'), props.onSkip, 'dsp-iconbtn--wide'),
  )
}
