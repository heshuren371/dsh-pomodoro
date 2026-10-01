/**
 * The card's inline SVG icon set. Pure data plus one tiny component; nothing here
 * touches React at module scope, so the module body is safe to evaluate before the
 * shell binds the platform.
 * @module
 */
import type * as ReactNS from 'react'
import { h } from './h.js'

/** Every icon the card draws. */
export type IconName = 'play' | 'pause' | 'reset' | 'skip' | 'sliders' | 'minus' | 'chevron'

/** Path data per icon, in a 24×24 viewBox. */
const ICON_PATHS: Readonly<Record<IconName, readonly string[]>> = {
  play: ['M8 5.1v13.8L19 12z'],
  pause: ['M7 5h3.2v14H7z', 'M13.8 5H17v14h-3.2z'],
  reset: ['M11.6 4.6V2L6.6 6.6l5 4.6V8.4a4.6 4.6 0 1 1-4.6 4.6H5A6.6 6.6 0 1 0 11.6 4.6z'],
  skip: ['M6 5.6l8.4 6.4L6 18.4z', 'M15.6 5.4h2.2v13.2h-2.2z'],
  sliders: ['M3 6.8h18v1.4H3z', 'M9 5h2v5H9z', 'M3 11.3h18v1.4H3z', 'M15 9.5h2v5h-2z', 'M3 15.8h18v1.4H3z', 'M6 14h2v5H6z'],
  minus: ['M5 11h14v2H5z'],
  chevron: ['M12 8.4l6 6-1.4 1.4L12 11.2l-4.6 4.6L6 14.4z'],
}

/** Props accepted by {@link Icon}. */
export interface IconProps {
  /** Which glyph to draw. */
  name: IconName
  /** Rendered square size in pixels; defaults to 16. */
  size?: number
}

/**
 * Draw one decorative icon. Always `aria-hidden`: every icon sits inside a
 * control that owns the accessible name.
 * @param props - Icon name and size.
 * @returns The inline SVG element.
 */
export function Icon(props: IconProps): ReactNS.ReactElement {
  const paths = ICON_PATHS[props.name]
  const size = props.size ?? 16
  return h(
    'svg',
    {
      className: 'dsp-icon',
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      'aria-hidden': true,
      focusable: false,
    },
    paths.map((d, index) => h('path', { key: index, d, fill: 'currentColor' })),
  )
}
