/**
 * Client half entry — the one file the shell evaluates in the browser.
 *
 * Responsibilities kept here, and nowhere else:
 *
 * 1. Register the bundle under its module id (the package name) and bind the
 *    module table before any UI module touches React.
 * 2. Own the plugin lifecycle: dictionaries, the `shell.overlay` seat, and the
 *    error boundary that turns a rendering crash into a visible, retryable card
 *    instead of a blank slot entry.
 * 3. Hand the widget its translator; the widget itself never sees `ctx`.
 */
import type * as ReactNS from 'react'
import { bindPlatform, h, portalToBody, React } from './platform.js'
import { bindLocale, en, NS, t, zh } from './i18n.js'
import { PomodoroOverlay } from './ui/overlay.js'

/** Bundle id: the shell resolves this Client module by the package name. */
const MODULE_ID = '@local/dsh-pomodoro'

/** Slot entry id inside `shell.overlay`. */
const SLOT_ENTRY_ID = 'dsh-pomodoro'

interface ModuleLoaderSink {
  load(registration: { id: string; factory: (require: (specifier: string) => unknown) => unknown }): void
}

type Disposer = () => void

/** Client locale service, as reached from `ctx.locale`. */
interface ClientLocaleService {
  register(namespace: string, dictionaries: Record<string, Record<string, unknown>>): Disposer
  bind(namespace: string): (key: string) => unknown
}

/** Options accepted by `ctx.slots.register`. */
interface SlotRegistrationOptions {
  name: string
  id: string
  order?: number
  label?: () => string
  locale?: string
  inject?: () => Record<string, unknown>
}

/** Client slot service, as reached from `ctx.slots`. */
interface ClientSlotsService {
  inject(ownerKey: string, callback: () => unknown): Disposer
  register(options: SlotRegistrationOptions, component: unknown): Disposer
}

/** The restricted Cordis context the shell hands to `apply`. */
interface PluginContext {
  effect(callback: () => Disposer | void, label?: string): Disposer
  locale: ClientLocaleService
  slots: ClientSlotsService
}

/** Shape this bundle exports back to the shell. */
interface ClientModuleExports {
  apply(ctx: PluginContext): void
  inject: string[]
}

/**
 * Build the boundary when the slot needs it: a class that extends
 * `React.Component` evaluates its superclass while the class *declaration* runs,
 * and a module-scope declaration would run before `bindPlatform` filled `React`.
 * @returns The slot entry component.
 */
function createBoundary(): unknown {
  const { Component } = React
  return class ErrorBoundary extends Component<Record<string, never>, { error: unknown }> {
    override state: { error: unknown } = { error: null }

    static getDerivedStateFromError(error: unknown): { error: unknown } {
      return { error }
    }

    override componentDidCatch(error: unknown): void {
      try {
        console.error('[dsh-pomodoro]', error)
      } catch {
        /* no console available */
      }
    }

    override render(): ReactNS.ReactNode {
      if (this.state.error === null) return h(PomodoroOverlay)
      const message = this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
      const card = h(
        'div',
        { className: 'dsp-layer' },
        h('style', { dangerouslySetInnerHTML: { __html: ERROR_CSS } }),
        h(
          'div',
          { className: 'dsp-card dsp-card--error', style: { right: '24px', bottom: '24px' } },
          h('div', { className: 'dsp-title' }, t('card.title')),
          h('div', { className: 'dsp-notice is-error' }, t('error.render') + message),
          h(
            'button',
            { type: 'button', className: 'dsp-btn dsp-btn--ghost', onClick: () => this.setState({ error: null }) },
            t('error.retry'),
          ),
        ),
      )
      // A crash card must stay visible for the same reason the widget does: a
      // fullscreen surface inside a column would otherwise cover it.
      return portalToBody(card) ?? card
    }
  }
}

/** Minimal styling for the crash card: it must render even when the widget CSS failed. */
const ERROR_CSS = [
  '.dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}',
  '.dsp-card{position:absolute;box-sizing:border-box;width:280px;padding:12px;border-radius:14px;',
  'background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);',
  'border:1px solid var(--dsw-alias-border-l1);box-shadow:0 12px 28px rgba(0,0,0,.22);',
  'font-family:inherit;font-size:12px;line-height:1.45;pointer-events:auto}',
  '.dsp-title{font-weight:600;color:var(--dsw-alias-label-secondary);margin-bottom:6px}',
  '.dsp-notice{padding:5px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);',
  'color:var(--dsw-alias-state-error-primary);word-break:break-word}',
  '.dsp-btn{margin-top:8px;width:100%;height:30px;border-radius:8px;cursor:pointer;font:inherit;',
  'background:transparent;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1)}',
].join('\n')

const sink = (window as unknown as { __ModuleLoader__?: ModuleLoaderSink }).__ModuleLoader__
if (sink === undefined) {
  throw new Error(MODULE_ID + ': window.__ModuleLoader__ is missing (booted outside the web shell?)')
}

sink.load({
  id: MODULE_ID,
  factory(require_) {
    bindPlatform(require_)

    const module = { exports: {} as ClientModuleExports }
    const exports = module.exports
    const inject = ['slots', 'locale']

    function apply(ctx: PluginContext): void {
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en } as unknown as Record<string, Record<string, unknown>>),
        'pomodoro: dictionaries',
      )
      bindLocale(ctx.locale.bind(NS))
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: SLOT_ENTRY_ID,
            order: 20,
            label: () => t('card.title'),
            locale: NS,
            inject: () => ({}),
          },
          createBoundary(),
        ),
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
