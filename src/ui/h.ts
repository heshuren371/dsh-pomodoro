/**
 * UI-local `h`.
 *
 * `src/platform.ts` types its `type` parameter as `Parameters<typeof createElement>[0]`,
 * which React 18 resolves to `string | FunctionComponent<{}> | ComponentClass<{}>` —
 * a component with *required* props is not assignable to `FunctionComponent<{}>`,
 * so every `h(Ring, { … })` would be a type error even though it is correct at
 * runtime. This wrapper keeps the two-armed signature honest for our components:
 * the component position accepts any function component, and the props position
 * stays the same loose record the frozen helper already uses. The runtime call is
 * still `React.createElement` from the shell's module table.
 * @module
 */
import type * as ReactNS from 'react'
import { h as platformH } from '../platform.js'

/**
 * A host tag name or a function component with any props.
 *
 * `(props: never) => ReactNode` is the widest possible function-component type:
 * `never` is assignable to every parameter type, so a component with required
 * props fits, while a plain `() => ReactElement` fits too.
 */
export type UiElementType = string | ((props: never) => ReactNS.ReactNode)

/**
 * Create one element.
 * @param type - Host tag or function component.
 * @param props - Element props.
 * @param children - Child nodes.
 * @returns The created element.
 */
export function h(
  type: UiElementType,
  props?: Record<string, unknown> | null,
  ...children: unknown[]
): ReactNS.ReactElement {
  return platformH(type as Parameters<typeof platformH>[0], props, ...children)
}
