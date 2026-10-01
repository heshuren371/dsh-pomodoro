/**
 * The settings panel: four clamped number inputs, five switches, the keyboard
 * hint, and the two maintenance buttons (restore defaults, clear statistics).
 *
 * Numeric inputs are bounded by {@link SETTING_LIMITS}. Each one keeps a local
 * text draft while the user edits, so an empty field stays empty instead of
 * snapping back to the committed number: a draft is committed only when it parses
 * to a finite number (the core then clamps it), and blurring an empty or invalid
 * draft restores the committed value.
 * @module
 */
import type * as ReactNS from 'react'
import { React } from '../platform.js'
import { h } from './h.js'
import { t } from '../i18n.js'
import {
  SETTING_LIMITS,
  type NumericSettingKey,
  type PomodoroSettings,
  type ToggleSettingKey,
} from '../core/types.js'
import { Switch } from './switch.js'

/** One numeric preference row. */
interface NumberRow {
  key: NumericSettingKey
  labelKey: 'settings.work' | 'settings.short' | 'settings.long' | 'settings.rounds'
}

/** One boolean preference row. */
interface ToggleRow {
  key: ToggleSettingKey
  labelKey:
    | 'settings.autoStartBreak'
    | 'settings.autoStartWork'
    | 'settings.sound'
    | 'settings.tick'
    | 'settings.notify'
}

/** The four durations, in the order the card shows them. */
const NUMBER_ROWS: readonly NumberRow[] = [
  { key: 'workMin', labelKey: 'settings.work' },
  { key: 'shortMin', labelKey: 'settings.short' },
  { key: 'longMin', labelKey: 'settings.long' },
  { key: 'roundsPerLong', labelKey: 'settings.rounds' },
]

/** The five switches, in the order the card shows them. */
const TOGGLE_ROWS: readonly ToggleRow[] = [
  { key: 'autoStartBreak', labelKey: 'settings.autoStartBreak' },
  { key: 'autoStartWork', labelKey: 'settings.autoStartWork' },
  { key: 'sound', labelKey: 'settings.sound' },
  { key: 'tick', labelKey: 'settings.tick' },
  { key: 'notify', labelKey: 'settings.notify' },
]

/** Props accepted by {@link SettingsPanel}. */
export interface SettingsPanelProps {
  /** Current preferences. */
  settings: PomodoroSettings
  /** Forward one raw number-input value for clamping by the core. */
  onNumberChange(key: NumericSettingKey, rawValue: string): void
  /** Flip one boolean preference. */
  onToggleChange(key: ToggleSettingKey, next: boolean): void
  /** Zero today's and lifetime statistics. */
  onClearStats(): void
  /** Restore every preference to its default. */
  onRestoreDefaults(): void
}

/** Props accepted by {@link NumberField}. */
interface NumberFieldProps {
  /** Which preference this input edits. */
  settingKey: NumericSettingKey
  /** Accessible name, also the row label. */
  label: string
  /** Committed value from the timer state. */
  value: number
  /** Inclusive bounds, mirrored into the input's `min`/`max`. */
  limits: readonly [number, number]
  /** Commit one parsed, finite draft; the core clamps the raw text. */
  onNumberChange(key: NumericSettingKey, rawValue: string): void
}

/**
 * One number input with a local draft.
 *
 * A fully controlled input cannot be emptied: the committed value is re-rendered
 * on every keystroke, so deleting the field would immediately fight the user.
 * The typed text is therefore kept locally and rendered while it exists, and is
 * committed only when it parses to a finite number. Blur drops the draft, so an
 * empty or invalid field falls back to the committed value — and any external
 * change (restore defaults, another tab) drops a stale draft too.
 * @param props - Setting key, label, committed value, bounds and commit handler.
 * @returns The number input.
 */
function NumberField(props: NumberFieldProps): ReactNS.ReactElement {
  const { useEffect, useState } = React
  const [draft, setDraft] = useState<string | null>(null)

  // A committed change from anywhere else invalidates an in-flight draft.
  useEffect(() => {
    setDraft(null)
  }, [props.value])

  return h('input', {
    className: 'dsp-num',
    type: 'number',
    min: props.limits[0],
    max: props.limits[1],
    step: 1,
    value: draft === null ? String(props.value) : draft,
    'data-dsp-no-drag': '1',
    'aria-label': props.label,
    onChange: (event: ReactNS.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      setDraft(raw)
      const trimmed = raw.trim()
      if (trimmed !== '' && Number.isFinite(Number(trimmed))) props.onNumberChange(props.settingKey, trimmed)
    },
    onBlur: () => setDraft(null),
  })
}

/**
 * Render one numeric row.
 * @param row - Row descriptor.
 * @param settings - Current preferences.
 * @param onNumberChange - Forwarded change handler.
 * @returns The labelled row.
 */
function numberRow(
  row: NumberRow,
  settings: PomodoroSettings,
  onNumberChange: (key: NumericSettingKey, rawValue: string) => void,
): ReactNS.ReactElement {
  const limits = SETTING_LIMITS[row.key]
  const label = t(row.labelKey)
  return h(
    'label',
    { className: 'dsp-row', key: row.key },
    h('span', { className: 'dsp-row-label' }, label),
    h(
      'span',
      { className: 'dsp-row-control' },
      h(NumberField, {
        settingKey: row.key,
        label,
        value: settings[row.key],
        limits,
        onNumberChange,
      }),
      h('span', { className: 'dsp-unit' }, t(row.key === 'roundsPerLong' ? 'unit.round' : 'unit.minute')),
    ),
  )
}

/**
 * Render one boolean row.
 * @param row - Row descriptor.
 * @param settings - Current preferences.
 * @param onToggleChange - Forwarded toggle handler.
 * @returns The labelled row.
 */
function switchRow(
  row: ToggleRow,
  settings: PomodoroSettings,
  onToggleChange: (key: ToggleSettingKey, next: boolean) => void,
): ReactNS.ReactElement {
  const label = t(row.labelKey)
  return h(
    'div',
    { className: 'dsp-row', key: row.key },
    h('span', { className: 'dsp-row-label' }, label),
    h(
      'span',
      { className: 'dsp-row-control' },
      h(Switch, {
        checked: settings[row.key],
        label,
        onChange: (next: boolean) => onToggleChange(row.key, next),
      }),
    ),
  )
}

/**
 * Render the settings panel.
 * @param props - Preferences and handlers.
 * @returns The panel element.
 */
export function SettingsPanel(props: SettingsPanelProps): ReactNS.ReactElement {
  return h(
    'div',
    { className: 'dsp-settings' },
    NUMBER_ROWS.map((row) => numberRow(row, props.settings, props.onNumberChange)),
    TOGGLE_ROWS.map((row) => switchRow(row, props.settings, props.onToggleChange)),
    h('p', { className: 'dsp-shortcut', key: 'shortcut' }, t('shortcut.hint')),
    h(
      'button',
      {
        key: 'defaults',
        type: 'button',
        className: 'dsp-btn dsp-btn--ghost',
        'data-dsp-no-drag': '1',
        onClick: props.onRestoreDefaults,
      },
      t('action.defaults'),
    ),
    h(
      'button',
      {
        key: 'clear',
        type: 'button',
        className: 'dsp-btn dsp-btn--ghost',
        'data-dsp-no-drag': '1',
        onClick: props.onClearStats,
      },
      t('action.clearStats'),
    ),
  )
}
