/**
 * The card's stylesheet, hoisted to a module constant.
 *
 * Two rules are load-bearing and must not be edited casually:
 *
 * - `.dsp-layer{...z-index:120}` — the layer is portalled beside `#root`, so its
 *   own stacking level decides the fight with the surfaces drawn inside the tree.
 *   120 clears the music player's fullscreen player (40), modal (60) and lightbox
 *   (80) while staying below the harness's dialog/popover tier (900–1100), so the
 *   timer never covers a host dialog and a host menu always stays above it.
 * - `.dsp-layer{pointer-events:none}` + `.dsp-card{pointer-events:auto}` — the
 *   covering layer must let clicks through to the app underneath, while the card
 *   itself stays interactive.
 *
 * Colours come from `--dsw-alias-*` theme tokens only, so the card follows the
 * harness dark/light theme without shipping any palette of its own.
 * @module
 */

/** Class name of the click-through portal layer. */
export const LAYER_CLASS = 'dsp-layer'

/** Class name of the card itself. */
export const CARD_CLASS = 'dsp-card'

/** The complete stylesheet, injected by the layer and removed with it. */
export const LAYER_CSS: string = [
  // Beside #root the layer states its own z-index. 120 clears every surface the
  // music player draws inside the tree — fullscreen player 40, modal 60 and
  // lightbox 80 — while leaving the harness dialog/popover tier (900–1100) where
  // the harness put it. Its pointer-events:none can no longer be overridden by
  // the frame's `.overlayLayer > *` rule either, because the layer is not a child
  // of that node any more.
  '.dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}',
  '.dsp-card{position:absolute;box-sizing:border-box;width:252px;padding:12px;border-radius:14px;',
  'background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);',
  'border:1px solid var(--dsw-alias-border-l1);box-shadow:0 12px 28px rgba(0,0,0,.22);',
  'font-family:inherit;font-size:12px;font-weight:400;line-height:1.45;',
  'pointer-events:auto;user-select:none;-webkit-user-select:none;',
  'font-variant-numeric:tabular-nums;touch-action:none;cursor:grab}',
  '.dsp-card.is-dragging{cursor:grabbing}',
  '.dsp-card--mini{width:auto;padding:6px 8px;border-radius:999px}',
  '.dsp-head{display:flex;align-items:center;gap:6px;margin-bottom:8px}',
  '.dsp-title{font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}',
  '.dsp-spacer{flex:1}',
  '.dsp-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-brand-primary)}',
  '.dsp-dot--short{background:var(--dsw-alias-state-success-primary)}',
  '.dsp-dot--long{background:var(--dsw-alias-state-warn-primary)}',
  '.dsp-body{display:flex;flex-direction:column;align-items:center}',
  '.dsp-ringwrap{position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center}',
  '.dsp-ring{display:block}',
  '.dsp-ring--work{color:var(--dsw-alias-brand-primary)}',
  '.dsp-ring--short{color:var(--dsw-alias-state-success-primary)}',
  '.dsp-ring--long{color:var(--dsw-alias-state-warn-primary)}',
  '.dsp-ring .dsp-progress{transition:stroke-dashoffset .2s linear}',
  '.dsp-ring.is-running{animation:dsp-breathe 3.2s ease-in-out infinite}',
  '@keyframes dsp-breathe{0%,100%{opacity:1}50%{opacity:.78}}',
  '.dsp-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;pointer-events:none}',
  '.dsp-clock{font-size:26px;font-weight:600;letter-spacing:.01em}',
  '.dsp-clock--mini{font-size:15px;font-weight:600;min-width:44px;text-align:center}',
  '.dsp-phase{font-size:11px;color:var(--dsw-alias-label-secondary)}',
  '.dsp-round{font-size:10px;color:var(--dsw-alias-label-secondary)}',
  '.dsp-dots{display:flex;gap:5px;justify-content:center;margin:8px 0 10px}',
  '.dsp-pip{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-border-l2)}',
  '.dsp-pip.is-done{background:var(--dsw-alias-brand-primary)}',
  '.dsp-controls{display:flex;align-items:center;justify-content:center;gap:8px}',
  '.dsp-icon{display:block}',
  '.dsp-iconbtn{display:inline-flex;align-items:center;justify-content:center;height:30px;min-width:34px;padding:0 8px;',
  'border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);',
  'color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}',
  '.dsp-iconbtn:hover{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
  '.dsp-iconbtn--wide{flex:1}',
  '.dsp-iconbtn--round{height:26px;min-width:26px;padding:0;border-radius:50%}',
  '.dsp-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;',
  'border:1px solid transparent;border-radius:9px;cursor:pointer;font:600 12px/1 inherit}',
  '.dsp-btn--primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}',
  '.dsp-btn--main{flex:0 0 92px}',
  '.dsp-btn--ghost{margin-top:8px;width:100%;background:transparent;border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
  '.dsp-btn--ghost:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
  '.dsp-stats{display:flex;flex-direction:column;align-items:center;gap:2px;margin-top:9px;',
  'font-size:11.5px;font-weight:500;color:var(--dsw-alias-label-primary);text-align:center}',
  '.dsp-stats-total{color:var(--dsw-alias-label-secondary);font-weight:400}',
  '.dsp-notice{margin-top:8px;padding:5px 8px;border-radius:8px;font-size:10.5px;text-align:center;',
  'background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
  '.dsp-settings{margin-top:10px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:6px}',
  '.dsp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}',
  '.dsp-row-label{color:var(--dsw-alias-label-secondary);flex:1;min-width:0}',
  '.dsp-row-control{display:inline-flex;align-items:center;gap:5px;flex:none}',
  '.dsp-num{width:52px;height:24px;box-sizing:border-box;padding:0 6px;border-radius:6px;text-align:right;',
  'background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);',
  'border:1px solid var(--dsw-alias-border-l1);font:inherit;font-variant-numeric:tabular-nums}',
  '.dsp-unit{color:var(--dsw-alias-label-secondary);font-size:10px;min-width:24px;text-align:left}',
  '.dsp-shortcut{margin:2px 0 0;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
  '.dsp-switch{position:relative;width:34px;height:19px;padding:0;border-radius:999px;cursor:pointer;flex:none;',
  'background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2)}',
  '.dsp-switch.is-on{background:var(--dsw-alias-brand-primary);border-color:transparent}',
  '.dsp-switch-knob{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;',
  'background:var(--dsw-alias-label-secondary);transition:left .15s ease}',
  '.dsp-switch.is-on .dsp-switch-knob{left:17px;background:var(--dsw-alias-bg-base)}',
  '.dsp-mini{display:flex;align-items:center;gap:7px}',
  // Keyboard focus is always visible: the card is focusable as a whole, so
  // dropping this would make Space/R/S unreachable without a mouse.
  '.dsp-card:focus-visible,.dsp-iconbtn:focus-visible,.dsp-btn:focus-visible,.dsp-switch:focus-visible,.dsp-num:focus-visible{',
  'outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
  '.dsp-card:focus-visible{outline-offset:3px}',
  // Screen-reader-only live region for the round-change announcement.
  '.dsp-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
  '@media (prefers-reduced-motion:reduce){.dsp-ring.is-running{animation:none}.dsp-ring .dsp-progress{transition:none}.dsp-switch-knob{transition:none}}',
].join('\n')
