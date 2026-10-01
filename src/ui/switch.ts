/**
 * The boolean setting control: a button with `role="switch"` and `aria-checked`,
 * so a screen reader announces the state and Space/Enter toggle it natively.
 * @module
 */
import type * as ReactNS from 'react'
import { h } from './h.js'

/** Props accepted by {@link Switch}. */
export interface SwitchProps {
  /** Current on/off state. */
  checked: boolean
  /** Accessible name; also the tooltip. */
  label: string
  /** Called with the next state when the user activates the switch. */
  onChange(next: boolean): void
}

/**
 * Render one switch.
 * @param props - State, label and change handler.
 * @returns The switch button.
 */
export function Switch(props: SwitchProps): ReactNS.ReactElement {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-checked': props.checked,
      'aria-label': props.label,
      title: props.label,
      'data-dsp-no-drag': '1',
      className: 'dsp-switch' + (props.checked ? ' is-on' : ''),
      onClick: () => props.onChange(!props.checked),
    },
    h('span', { className: 'dsp-switch-knob', 'aria-hidden': true }),
  )
}
