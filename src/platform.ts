/**
 * The bridge between the bundle factory and the shell's frozen module table.
 *
 * The Client bundle is one self-contained script that the shell evaluates in the
 * browser, so it cannot use static imports for platform words (`react`,
 * `react-dom`). The factory receives the module-table `require`; {@link bindPlatform}
 * hands it to this module, and every other module reaches React through the
 * objects defined here.
 *
 * Nothing in this file may read React at module scope: the bundled module bodies
 * run when the script is evaluated, which happens *before* the shell calls the
 * factory. Components read `React.createElement` while rendering, long after
 * `bindPlatform` has filled {@link React}.
 */
import type * as ReactNS from 'react'

/** The module-table `require` handed to the bundle factory. */
export type RequireFn = (specifier: string) => unknown

let requireFn: RequireFn | null = null

/** The shell's React instance, filled by {@link bindPlatform}. */
export const React = {} as typeof ReactNS

/**
 * Bind the factory's module table and load the one module React cannot live
 * without. Called once, at the top of the bundle factory, before `apply`.
 * @param require_ - Module-table `require` supplied by `window.__ModuleLoader__`.
 */
export function bindPlatform(require_: RequireFn): void {
  requireFn = require_
  Object.assign(React, require_('react') as object)
}

/**
 * Resolve one platform word from the module table.
 * @param specifier - Exact module-table key, for example `react-dom`.
 * @returns The module namespace.
 * @throws When called before {@link bindPlatform}.
 */
export function platformModule<T>(specifier: string): T {
  if (requireFn === null) {
    throw new Error('@local/dsh-pomodoro: platform module "' + specifier + '" requested before the module table was bound')
  }
  return requireFn(specifier) as T
}

/**
 * Resolve an optional platform word, tolerating a shell that does not offer it.
 * @param specifier - Exact module-table key.
 * @returns The module namespace, or `null`.
 */
export function optionalPlatformModule<T>(specifier: string): T | null {
  try {
    return platformModule<T>(specifier)
  } catch {
    return null
  }
}

type ElementType = Parameters<typeof ReactNS.createElement>[0]
type ElementProps = Record<string, unknown> | null

/**
 * `React.createElement` behind a stable name, so the UI reads like the plain-JS
 * generation did while staying fully typed.
 * @param type - Element type.
 * @param props - Element props.
 * @param children - Child nodes.
 * @returns The created element.
 */
export function h(type: ElementType, props?: ElementProps, ...children: unknown[]): ReactNS.ReactElement {
  return React.createElement(type, props as never, ...(children as never[]))
}

interface ReactDomFace {
  createPortal?: (children: ReactNS.ReactNode, container: Element) => ReactNS.ReactElement
}

let portalFn: ReactDomFace['createPortal'] | null | undefined

/**
 * Render `children` into a layer beside `#root` on `document.body`, which is the
 * host's own convention for a surface that covers the window (see
 * `packages/client/web/src/base.css`) and the only way to sit above an in-tree
 * layer whose stacking context is higher than the `shell.overlay` layer.
 * @param children - Layer content.
 * @returns The portal element, or `null` when this shell exposes no `react-dom`
 *          portal API (the caller then renders the layer in place).
 */
export function portalToBody(children: ReactNS.ReactNode): ReactNS.ReactElement | null {
  if (portalFn === undefined) {
    portalFn = optionalPlatformModule<ReactDomFace>('react-dom')?.createPortal ?? null
  }
  if (portalFn === null || portalFn === undefined) return null
  if (typeof document === 'undefined' || document.body === null) return null
  return portalFn(children, document.body)
}
