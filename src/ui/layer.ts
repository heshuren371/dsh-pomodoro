/**
 * The bounding layer that carries the card, plus the `<style>` element it owns.
 *
 * The card is registered into `shell.overlay`, but a positioned child cannot
 * escape that slot layer's stacking context, so the whole card is portalled
 * beside `#root` on `document.body` — the host's own convention for a surface
 * that covers the window, and where the theme's `--dsw-alias-*` variables live.
 * When the shell exposes no portal API the layer renders in place inside the slot
 * (the pre-portal behaviour) instead of disappearing.
 *
 * The `<style>` lives inside the layer rather than in `document.head`, so
 * unmounting the widget removes the stylesheet with it and nothing is left beside
 * `#root`.
 * @module
 */
import type * as ReactNS from 'react'
import { portalToBody } from '../platform.js'
import { h } from './h.js'
import { LAYER_CLASS, LAYER_CSS } from './styles.js'

/**
 * Wrap `children` in the click-through layer and portal it beside `#root`.
 * @param children - The card.
 * @returns The layer element, portalled when possible and in place otherwise.
 */
export function renderLayer(children: ReactNS.ReactNode): ReactNS.ReactElement {
  const layer = h(
    'div',
    { className: LAYER_CLASS },
    h('style', { dangerouslySetInnerHTML: { __html: LAYER_CSS } }),
    children,
  )
  return portalToBody(layer) ?? layer
}
