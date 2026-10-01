/**
 * jsdom smoke test for the Pomodoro client half.
 *
 * Loads the *built* `lib/client.js` through a stubbed module loader, mounts the
 * component registered into `shell.overlay` with real React 18, and drives it like
 * a user: start, pause, settings edits, drag, collapse, skip, plus a real round
 * completion (driven by a pre-seeded deadline) to check phase rotation,
 * statistics and persistence.
 *
 *   node scripts/smoke.mjs
 *
 * Dependencies are resolved local-first (`dsh-pomodoro/node_modules`) and only
 * fall back to the sibling music-player checkout for `react`/`react-dom`, which
 * this package does not install itself. Override that fallback with
 * `DSP_TEST_DEPS=/path/to/checkout`.
 *
 * This is a development aid and is not part of the published bundle.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(here, '..');
const bundlePath = path.join(pluginDir, 'lib', 'client.js');

if (!fs.existsSync(bundlePath)) {
  console.error('missing ' + bundlePath + ' — run `node scripts/build.mjs` first');
  process.exit(1);
}

// ── dependencies: local node_modules first, sibling checkout as a fallback ───
const localRequire = createRequire(path.join(pluginDir, 'package.json'));
const fallbackDir = process.env.DSP_TEST_DEPS || path.resolve(pluginDir, '../dsh-music-player');
let fallbackRequire = null;

function dep(name) {
  try {
    return localRequire(name);
  } catch (localError) {
    if (fallbackRequire === null) fallbackRequire = createRequire(path.join(fallbackDir, 'package.json'));
    try {
      return fallbackRequire(name);
    } catch (fallbackError) {
      throw new Error(
        'smoke: cannot resolve "' +
          name +
          '" from ' +
          path.join(pluginDir, 'node_modules') +
          ' or from ' +
          fallbackDir +
          '. Add it to devDependencies, or point DSP_TEST_DEPS at a checkout that has react/react-dom.',
      );
    }
  }
}

const { JSDOM } = dep('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = dep('react');
const ReactDom = dep('react-dom');
const { createRoot } = dep('react-dom/client');
const act = React.act || dep('react-dom/test-utils').act;

// ── the built bundle, loaded like the shell loads it ─────────────────────────
const code = fs.readFileSync(bundlePath, 'utf8');
let definition = null;
dom.window.__ModuleLoader__ = {
  load(def) {
    definition = def;
  },
};

vm.runInThisContext(code, { filename: 'lib/client.js' });

// ── helpers ──────────────────────────────────────────────────────────────────
const STORE_KEY = 'dsh-pomodoro/store/v2';
const LEGACY_KEY = 'dsh-pomodoro/store/v1';
const root = createRoot(document.getElementById('root'));

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log('  ok   ' + label);
  } else {
    failures += 1;
    console.log('  FAIL ' + label + (detail === undefined ? '' : '  → ' + detail));
  }
}

// React reports act() misuse, missing keys and invalid props through
// console.error; treat any of it as a defect rather than hidden noise.
const consoleErrors = [];
const nativeConsoleError = console.error;
console.error = (...args) => {
  consoleErrors.push(args.map((value) => String(value)).join(' '));
  nativeConsoleError(...args);
};

/** The bundle must be a single classic script: no `import`/`export` statements. */
check('bundle is import-free (evaluated as a classic script)', !/^\s*(?:import|export)[\s{('"]/m.test(code));

if (!definition) throw new Error('lib/client.js did not register a module');
check('module id is the package name', definition.id === '@local/dsh-pomodoro', definition.id);

const mod = definition.factory((id) => {
  if (id === 'react') return React;
  if (id === 'react-dom') return ReactDom;
  throw new Error('unexpected require: ' + id);
});

// ── fake plugin context ──────────────────────────────────────────────────────
let dictionaries = {};
let registration = null;

const ctx = {
  effect(fn) {
    fn();
    return () => {};
  },
  locale: {
    register(namespace, dicts) {
      dictionaries = dicts;
      return () => {};
    },
    bind(namespace) {
      return (key) => (dictionaries.zh || {})[key];
    },
  },
  slots: {
    inject(owner, callback) {
      registration = callback();
      return () => {};
    },
    register(options, Component) {
      return { options, Component };
    },
  },
};

mod.apply(ctx);

if (!registration) throw new Error('no slot registration happened');
const { options, Component } = registration;
check(
  'registered into shell.overlay as dsh-pomodoro',
  options.name === 'shell.overlay' && options.id === 'dsh-pomodoro',
  JSON.stringify(options),
);

function card() {
  return document.querySelector('.dsp-card');
}

function layer() {
  return document.querySelector('.dsp-layer');
}

function text() {
  return card().textContent.replace(/\s+/g, ' ').trim();
}

function clock() {
  const el = card().querySelector('.dsp-clock');
  return el ? el.textContent.trim() : null;
}

function phase() {
  const el = card().querySelector('.dsp-phase');
  return el ? el.textContent.trim() : null;
}

function round() {
  const el = card().querySelector('.dsp-round');
  return el ? el.textContent.trim() : null;
}

function stats() {
  const el = card().querySelector('.dsp-stats');
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
}

function sr() {
  const el = card().querySelector('.dsp-sr');
  return el ? el.textContent.trim() : null;
}

function notice() {
  const el = card().querySelector('.dsp-notice');
  return el ? el.textContent.trim() : null;
}

function button(label) {
  return Array.from(card().querySelectorAll('button')).find((el) => el.getAttribute('aria-label') === label);
}

function buttonByText(label) {
  return Array.from(card().querySelectorAll('button')).find((el) => el.textContent.trim() === label);
}

async function click(label) {
  const target = button(label);
  if (!target) throw new Error('no button labelled ' + label + ' in: ' + text());
  await act(async () => {
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
}

async function clickText(label) {
  const target = buttonByText(label);
  if (!target) throw new Error('no button reading ' + label + ' in: ' + text());
  await act(async () => {
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
}

function pointerEvent(type, init) {
  const Ctor = dom.window.PointerEvent || dom.window.MouseEvent;
  return new Ctor(type, { bubbles: true, cancelable: true, ...init });
}

/** Drive a controlled number input the way a real keystroke reaches React. */
function typeNumber(input, text) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, text);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

async function render() {
  await act(async () => {
    root.render(React.createElement(Component));
  });
}

/** React reuses the instance at the same position, so scenarios that seed a new
 *  store must unmount first; otherwise the previous state survives the render. */
async function remount() {
  await act(async () => {
    root.render(null);
  });
  await render();
}

async function wait(ms) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function dayKey(date) {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function emptyStats(overrides) {
  return {
    day: dayKey(),
    pomodoros: 0,
    focusMs: 0,
    totalPomodoros: 0,
    totalFocusMs: 0,
    ...overrides,
  };
}

function baseSettings(overrides) {
  return {
    workMin: 25,
    shortMin: 5,
    longMin: 15,
    roundsPerLong: 4,
    autoStartBreak: true,
    autoStartWork: false,
    sound: false,
    tick: false,
    notify: false,
    ...overrides,
  };
}

/** A v2 snapshot in exactly the shape `createStore(...).save()` writes. */
function snapshot(overrides) {
  return {
    v: 2,
    settings: baseSettings(),
    phase: 'work',
    running: false,
    endsAt: null,
    remainingMs: 1500000,
    workInCycle: 0,
    stats: emptyStats(),
    ui: { x: 40, y: 40, collapsed: false },
    ...overrides,
  };
}

function seed(value, key) {
  dom.window.localStorage.setItem(key || STORE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
}

function stored(key) {
  const raw = dom.window.localStorage.getItem(key || STORE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function fireStorage(value) {
  seed(value);
  await act(async () => {
    dom.window.dispatchEvent(
      new dom.window.StorageEvent('storage', {
        key: STORE_KEY,
        newValue: JSON.stringify(value),
        storageArea: dom.window.localStorage,
        url: 'http://localhost/',
      }),
    );
  });
}

// ── 1. fresh mount ───────────────────────────────────────────────────────────
console.log('\n[1] fresh mount');
dom.window.localStorage.clear();
await render();
check('renders in shell.overlay', Boolean(card()));
check('starts at 25:00', clock() === '25:00', clock());
check('phase is focus', phase() === '专注', phase());
check('round counter 1/4', round() === '第 1/4 轮', round());
check('stats start at zero', stats() === '今日 0 个 · 0 分钟累计 0 个 · 0 分钟', stats());
check('four cycle pips', card().querySelectorAll('.dsp-pip').length === 4);
check('start button present', Boolean(button('开始')));
check('ring is a labelled timer region', card().querySelector('[role=timer]') !== null
  && card().querySelector('[role=timer]').getAttribute('aria-label') === '番茄钟计时器',
  String(card().querySelector('[role=timer]') && card().querySelector('[role=timer]').getAttribute('aria-label')));
check('card is keyboard focusable', card().tabIndex === 0, String(card().tabIndex));
check('live region is polite and initially quiet', card().querySelector('[aria-live=polite]') !== null && sr() === '', sr());

// The card may not live inside the slot layer: a positioned child cannot escape
// that layer's stacking context, so it is portalled beside #root instead.
const portalLayer = card().closest('.dsp-layer');
check(
  'portals out of the slot layer',
  portalLayer !== null && portalLayer.parentElement === document.body,
  portalLayer ? portalLayer.parentElement && portalLayer.parentElement.tagName : 'no layer',
);
check('portalled content is not inside #root', document.getElementById('root').contains(card()) === false);
const styleText = layer().querySelector('style').textContent;
const layerCss = /\.dsp-layer\{([^}]*)\}/.exec(styleText);
check('layer CSS found', layerCss !== null);
check(
  'layer rule keeps the frozen portal fix verbatim',
  styleText.includes('.dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}'),
);
const layerZ = layerCss === null ? NaN : Number(/z-index:(\d+)/.exec(layerCss[1])[1]);
check('layer z-index clears the music player surfaces (40/60/80)', layerZ >= 120, String(layerZ));
check('layer declares pointer-events none', /pointer-events:none/.test(layerCss === null ? '' : layerCss[1]));
check('card declares pointer-events auto', /\.dsp-card\{[^}]*pointer-events:auto/.test(styleText));
const layerPointer = dom.window.getComputedStyle(portalLayer).pointerEvents;
check(
  'click-through layer, clickable card',
  layerPointer === 'none' && dom.window.getComputedStyle(card()).pointerEvents === 'auto',
  layerPointer + ' / ' + dom.window.getComputedStyle(card()).pointerEvents,
);
check('focus-visible outlines are declared', /:focus-visible/.test(styleText) && /outline:2px solid/.test(styleText));
check('reduced-motion is respected', /prefers-reduced-motion:reduce/.test(styleText));

// ── 2. start / pause / resume ────────────────────────────────────────────────
console.log('\n[2] start, pause, resume');
await click('开始');
check('running after start', Boolean(button('暂停')), text());
await wait(1200);
const runningClock = clock();
check('clock advanced', runningClock !== '25:00', runningClock);
await click('暂停');
const pausedClock = clock();
await wait(600);
check('paused clock frozen', clock() === pausedClock, clock() + ' vs ' + pausedClock);
check('persisted as paused', stored() && stored().running === false, JSON.stringify(stored() && stored().running));
await click('开始');
check('resumed', Boolean(button('暂停')));

// ── 3. reset and skip ────────────────────────────────────────────────────────
console.log('\n[3] reset and skip');
await click('暂停');
await click('重置本轮');
check('reset restores full round', clock() === '25:00', clock());
await click('跳过本轮');
check('skip leaves focus and continues the cycle', phase() === '短休息', phase());
check('skip credits no pomodoro', stats().indexOf('今日 0 个') === 0, stats());
check('skip consumes one cycle round', round() === '第 1/4 轮', round());

// ── 4. settings panel ────────────────────────────────────────────────────────
console.log('\n[4] settings panel');
await click('设置');
const workInput = card().querySelector('input[type=number]');
check('settings panel open', Boolean(workInput));
await act(async () => {
  typeNumber(workInput, '30');
});
check('work length applied while on a break', card().querySelector('input[type=number]').value === '30', card().querySelector('input[type=number]').value);
await click('跳过本轮');
check('back to a 30 minute focus round', clock() === '30:00' && phase() === '专注', clock() + ' / ' + phase());
const switches = () => card().querySelectorAll('[role=switch]');
check('five switches', switches().length === 5, String(switches().length));
check('every switch has aria-checked', Array.from(switches()).every((el) => el.hasAttribute('aria-checked')));
check('chime defaults on', switches()[2].getAttribute('aria-checked') === 'true');
await act(async () => {
  switches()[2].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
});
check('chime switch toggles off', switches()[2].getAttribute('aria-checked') === 'false');
check('settings persisted', stored().settings.workMin === 30 && stored().settings.sound === false, JSON.stringify(stored().settings));
check('keyboard hint is shown', text().indexOf('快捷键：空格 开始/暂停 · R 重置 · S 跳过') >= 0, text());
// Notifications are unavailable under jsdom: enabling must warn, not throw, and
// must not flip the switch.
await act(async () => {
  switches()[4].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
});
check('notification switch stays off without the API', switches()[4].getAttribute('aria-checked') === 'false');
check('a notice explains why', notice() === '当前环境不支持桌面通知', String(notice()));
// Restore defaults brings the round back to the default length and marks the notice.
await clickText('恢复默认设置');
check('defaults restored in the store', stored().settings.workMin === 25 && stored().settings.sound === true, JSON.stringify(stored().settings));
check('paused card follows the new length', clock() === '25:00', clock());
check('defaults notice shown', notice() === '已恢复默认设置', String(notice()));

// ── 4b. number inputs keep a draft while editing ─────────────────────────────
console.log('\n[4b] number input drafts');
let workField = card().querySelector('input[type=number]');
check('work field shows the committed value', workField.value === '25', workField.value);
check(
  'the input contract is unchanged',
  workField.className === 'dsp-num' &&
    workField.getAttribute('data-dsp-no-drag') === '1' &&
    workField.getAttribute('aria-label') === '专注时长' &&
    workField.min === '1' &&
    workField.max === '180' &&
    workField.step === '1',
  [workField.className, workField.getAttribute('data-dsp-no-drag'), workField.getAttribute('aria-label'), workField.min, workField.max, workField.step].join('/'),
);
// The input still opts out of dragging.
const beforeInputDrag = card().style.left;
await act(async () => {
  workField.dispatchEvent(pointerEvent('pointerdown', { clientX: 200, clientY: 200, button: 0, pointerId: 9 }));
  card().dispatchEvent(pointerEvent('pointermove', { clientX: 420, clientY: 420, pointerId: 9 }));
  card().dispatchEvent(pointerEvent('pointerup', { clientX: 420, clientY: 420, pointerId: 9 }));
});
check('the number input never starts a drag', card().style.left === beforeInputDrag, beforeInputDrag + ' → ' + card().style.left);
// (a) an emptied field must not commit: no drop to the 1 minute minimum.
await act(async () => {
  typeNumber(workField, '');
});
check('clearing the field leaves it empty', workField.value === '', workField.value);
check('clearing the field keeps the round length', clock() === '25:00', clock());
check(
  'clearing the field keeps the stored setting',
  stored().settings.workMin === 25,
  JSON.stringify(stored().settings.workMin),
);
// (b) a valid draft commits immediately and still persists.
await act(async () => {
  typeNumber(workField, '30');
});
check('typing 30 commits the length', clock() === '30:00', clock());
check('a valid edit still persists', stored().settings.workMin === 30, JSON.stringify(stored().settings.workMin));
workField = card().querySelector('input[type=number]');
check('the field shows the committed value again', workField.value === '30', workField.value);
// (c) an emptied field reverts to the committed number on blur.
await act(async () => {
  typeNumber(workField, '');
});
check('the emptied field is still empty before blur', workField.value === '', workField.value);
await act(async () => {
  workField.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true }));
});
check('blur restores the committed number', workField.value === '30', workField.value);
check(
  'blur did not change the stored setting',
  stored().settings.workMin === 30,
  JSON.stringify(stored().settings.workMin),
);
// Leave the length at the default so the later shortcut checks still see 25:00.
await act(async () => {
  typeNumber(workField, '25');
});
check(
  'the field can be set back to 25',
  clock() === '25:00' && stored().settings.workMin === 25,
  clock() + ' / ' + JSON.stringify(stored().settings.workMin),
);

// ── 5. collapse and drag ─────────────────────────────────────────────────────
console.log('\n[5] collapse and drag');
await click('收起');
check('collapsed to a pill', card().className.indexOf('dsp-card--mini') >= 0);
check('pill shows a clock', clock() !== null, clock());
check('pill hides the ring', card().querySelector('[role=timer]') === null);
check('live region survives collapsing', card().querySelector('.dsp-sr') !== null);
await click('展开');
check('expanded again', card().className.indexOf('dsp-card--mini') < 0);
const before = card().style.left;
await act(async () => {
  const header = card().querySelector('.dsp-head');
  header.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0, pointerId: 1 }));
  card().dispatchEvent(pointerEvent('pointermove', { clientX: 300, clientY: 260, pointerId: 1 }));
  card().dispatchEvent(pointerEvent('pointerup', { clientX: 300, clientY: 260, pointerId: 1 }));
});
check('card moved', card().style.left !== before, before + ' → ' + card().style.left);
await wait(400);
check('position persisted', stored().ui.x === parseInt(card().style.left, 10), JSON.stringify(stored().ui));
// A control marked data-dsp-no-drag must never start a drag.
const pinnedLeft = card().style.left;
await act(async () => {
  const start = button('开始') || button('暂停');
  start.dispatchEvent(pointerEvent('pointerdown', { clientX: 500, clientY: 500, button: 0, pointerId: 2 }));
  card().dispatchEvent(pointerEvent('pointermove', { clientX: 700, clientY: 700, pointerId: 2 }));
  card().dispatchEvent(pointerEvent('pointerup', { clientX: 700, clientY: 700, pointerId: 2 }));
});
check('buttons never start a drag', card().style.left === pinnedLeft, pinnedLeft + ' → ' + card().style.left);

// ── 6. keyboard shortcuts ────────────────────────────────────────────────────
console.log('\n[6] keyboard shortcuts');
function key(k) {
  return new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
}
check('card starts paused before the shortcut checks', Boolean(button('开始')), text());
await act(async () => {
  card().dispatchEvent(key(' '));
});
check('space starts the round', Boolean(button('暂停')), text());
await act(async () => {
  card().dispatchEvent(key(' '));
});
check('space pauses again', Boolean(button('开始')), text());
await click('开始');
await wait(300);
await act(async () => {
  card().dispatchEvent(key('r'));
});
check('r resets the round to full length', clock() === '25:00' && Boolean(button('开始')), clock() + ' / ' + text());
await act(async () => {
  card().dispatchEvent(key('s'));
});
check('s skips the round', phase() === '短休息', phase());

// ── 7. a round that really completes ─────────────────────────────────────────
console.log('\n[7] round completion (focus → short break)');
dom.window.localStorage.clear();
seed(
  snapshot({
    settings: baseSettings({ workMin: 1, shortMin: 2, autoStartBreak: false, autoStartWork: false }),
    running: true,
    endsAt: Date.now() + 250,
    remainingMs: null,
  }),
);
await remount();
check('resumes the persisted running round', Boolean(button('暂停')), text());
await wait(900);
check('advanced to short break', phase() === '短休息', phase());
check('break length from settings', clock() === '02:00', clock());
check('stopped because auto-start is off', Boolean(button('开始')), text());
check('credited one pomodoro and one minute', stats() === '今日 1 个 · 1 分钟累计 1 个 · 1 分钟', stats());
check('cycle position kept', round() === '第 1/4 轮', round());
check('stored next round', stored().phase === 'short' && stored().running === false, JSON.stringify({ phase: stored().phase, running: stored().running }));
check('screen reader was told about the round change', sr() === '本轮结束，进入短休息', String(sr()));
await click('设置');
await clickText('清除统计');
check('statistics cleared', stats() === '今日 0 个 · 0 分钟累计 0 个 · 0 分钟', stats());
check('cleared notice shown', notice() === '统计已清除', String(notice()));

// ── 8. the long-break boundary ───────────────────────────────────────────────
console.log('\n[8] round completion at the long-break boundary');
dom.window.localStorage.clear();
seed(
  snapshot({
    settings: baseSettings({ workMin: 1, shortMin: 1, longMin: 3, roundsPerLong: 2, autoStartBreak: false }),
    running: true,
    endsAt: Date.now() + 200,
    remainingMs: null,
    workInCycle: 1,
  }),
);
await remount();
await wait(850);
check('long break after the last round', phase() === '长休息', phase());
check('long break length', clock() === '03:00', clock());
check('cycle counter reset', round() === '第 0/2 轮', round());
check('pips cleared for the new cycle', card().querySelectorAll('.dsp-pip.is-done').length === 0, String(card().querySelectorAll('.dsp-pip.is-done').length));

// ── 9. a deadline that passed while the page was closed ──────────────────────
console.log('\n[9] round finished while away');
dom.window.localStorage.clear();
seed(
  snapshot({
    settings: baseSettings({ workMin: 25, shortMin: 5, autoStartBreak: true }),
    running: true,
    endsAt: Date.now() - 60000,
    remainingMs: null,
    stats: emptyStats({ pomodoros: 2, focusMs: 3000000, totalPomodoros: 5, totalFocusMs: 7500000 }),
    ui: { x: null, y: null, collapsed: false },
  }),
);
await remount();
check('settled into the break, paused', phase() === '短休息' && Boolean(button('开始')), phase() + ' / ' + text());
check('the away round was credited', stats().indexOf('今日 3 个') === 0, stats());
check('totals carried over', stats().indexOf('累计 6 个') >= 0, stats());
check('the settled snapshot is written back as v2', stored() && stored().v === 2, JSON.stringify(stored() && stored().v));

// ── 10. multi-tab sync ───────────────────────────────────────────────────────
console.log('\n[10] multi-tab sync through the storage event');
await fireStorage(
  snapshot({ settings: baseSettings({ shortMin: 7 }), phase: 'short', remainingMs: 7 * 60000 }),
);
check('another tab’s snapshot is adopted', phase() === '短休息' && clock() === '07:00', phase() + ' / ' + clock());
await act(async () => {
  const header = card().querySelector('.dsp-head');
  header.dispatchEvent(pointerEvent('pointerdown', { clientX: 120, clientY: 120, button: 0, pointerId: 5 }));
});
await fireStorage(snapshot({ phase: 'long', remainingMs: 3 * 60000 }));
check('sync is ignored mid-drag', phase() === '短休息', phase());
await act(async () => {
  card().dispatchEvent(pointerEvent('pointerup', { clientX: 120, clientY: 120, pointerId: 5 }));
});
await fireStorage(snapshot({ phase: 'long', remainingMs: 3 * 60000 }));
check('sync resumes after the drag', phase() === '长休息', phase());

// ── 11. stale store defence ──────────────────────────────────────────────────
console.log('\n[11] malformed store, dead hours and legacy migration');
dom.window.localStorage.clear();
seed('{not json');
await remount();
check('survives malformed storage', Boolean(card()) && clock() === '25:00', clock());
dom.window.localStorage.clear();
seed({
  v: 2,
  settings: { workMin: 9999, roundsPerLong: -4, sound: 'yes' },
  phase: 'nope',
  workInCycle: 77,
  stats: null,
  ui: { x: 1e9, y: -1e9 },
});
await remount();
check('phase falls back to focus', phase() === '专注', phase());
check('cycle pips stay sane', card().querySelectorAll('.dsp-pip').length === 1, String(card().querySelectorAll('.dsp-pip').length));
check('bad numbers clamped or defaulted', stored().settings.workMin >= 1 && stored().settings.workMin <= 180, JSON.stringify(stored().settings));
check(
  'card stays inside the viewport',
  parseInt(card().style.left, 10) < dom.window.innerWidth && parseInt(card().style.top, 10) < dom.window.innerHeight,
  card().style.left + ',' + card().style.top,
);
// Legacy v1 snapshots are migrated into v2 on first load.
dom.window.localStorage.clear();
seed(
  {
    v: 1,
    settings: baseSettings({ workMin: 50 }),
    phase: 'work',
    running: false,
    endsAt: null,
    remainingMs: null,
    workInCycle: 0,
    stats: emptyStats(),
    ui: { x: null, y: null, collapsed: false },
  },
  LEGACY_KEY,
);
await remount();
check('legacy v1 settings migrate forward', clock() === '50:00', clock());
check('legacy snapshot rewritten under the v2 key', stored() !== null && stored().v === 2 && stored().settings.workMin === 50, JSON.stringify(stored() && stored().v));

// ── 12. the visibilitychange catch-up path, without the round loop ───────────
console.log('\n[12] visibilitychange catch-up');
dom.window.localStorage.clear();
seed(
  snapshot({
    settings: baseSettings({ workMin: 1, shortMin: 2, autoStartBreak: false }),
    running: true,
    endsAt: Date.now() + 300,
    remainingMs: null,
  }),
);
const realSetInterval = dom.window.setInterval;
// Disable the 200 ms loop so only the visibility handler can finish the round.
dom.window.setInterval = () => 0;
await remount();
check('resumes running before the deadline', Boolean(button('暂停')), text());
await wait(400);
check('loop really is disabled', phase() === '专注', phase());
await act(async () => {
  document.dispatchEvent(new dom.window.Event('visibilitychange'));
});
check('visibilitychange settles the expired round', phase() === '短休息', phase());
check('the late round is credited', stats().indexOf('今日 1 个') === 0, stats());
dom.window.setInterval = realSetInterval;

// ── 13. unmount, timer cleanup and leftovers ─────────────────────────────────
console.log('\n[13] unmount and resource cleanup');
let liveIntervals = 0;
const nativeSetInterval = dom.window.setInterval;
const nativeClearInterval = dom.window.clearInterval;
dom.window.setInterval = function (handler, timeout, ...args) {
  liveIntervals += 1;
  return nativeSetInterval.call(dom.window, handler, timeout, ...args);
};
dom.window.clearInterval = function (id) {
  liveIntervals -= 1;
  return nativeClearInterval.call(dom.window, id);
};
await click('开始');
check('round loop interval is live while running', liveIntervals >= 1, String(liveIntervals));
await act(async () => {
  root.unmount();
});
check('round loop interval cleared on unmount', liveIntervals === 0, String(liveIntervals));
dom.window.setInterval = nativeSetInterval;
dom.window.clearInterval = nativeClearInterval;
check('unmounts cleanly', document.querySelector('.dsp-card') === null);
check('portal layer removed with the plugin', document.querySelector('.dsp-layer') === null);
check('stylesheet removed with the layer', document.querySelector('.dsp-layer style') === null);
check(
  'nothing left beside #root',
  document.body.querySelectorAll(':scope > *:not(#root)').length === 0,
  String(document.body.querySelectorAll(':scope > *:not(#root)').length),
);
check('no React or widget errors were logged', consoleErrors.length === 0, consoleErrors.join(' | '));

console.log('\n' + (failures === 0 ? 'PASS: all checks passed' : 'FAIL: ' + failures + ' check(s) failed'));
process.exit(failures === 0 ? 0 : 1);
