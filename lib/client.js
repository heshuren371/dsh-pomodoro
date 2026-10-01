/* @local/dsh-pomodoro — generated from src/ by `pnpm run build`; do not edit. */
"use strict";
(() => {
  // src/platform.ts
  var requireFn = null;
  var React = {};
  function bindPlatform(require_) {
    requireFn = require_;
    Object.assign(React, require_("react"));
  }
  function platformModule(specifier) {
    if (requireFn === null) {
      throw new Error('@local/dsh-pomodoro: platform module "' + specifier + '" requested before the module table was bound');
    }
    return requireFn(specifier);
  }
  function optionalPlatformModule(specifier) {
    try {
      return platformModule(specifier);
    } catch {
      return null;
    }
  }
  function h(type, props, ...children) {
    return React.createElement(type, props, ...children);
  }
  var portalFn;
  function portalToBody(children) {
    if (portalFn === void 0) {
      portalFn = optionalPlatformModule("react-dom")?.createPortal ?? null;
    }
    if (portalFn === null || portalFn === void 0) return null;
    if (typeof document === "undefined" || document.body === null) return null;
    return portalFn(children, document.body);
  }

  // src/i18n.ts
  var NS = "dsh-pomodoro";
  var zh = {
    "card.title": "番茄钟",
    "a11y.timer": "番茄钟计时器",
    "a11y.roundDone": (phase) => "本轮结束，进入" + phase,
    "phase.work": "专注",
    "phase.short": "短休息",
    "phase.long": "长休息",
    "action.start": "开始",
    "action.pause": "暂停",
    "action.reset": "重置本轮",
    "action.skip": "跳过本轮",
    "action.collapse": "收起",
    "action.expand": "展开",
    "action.clearStats": "清除统计",
    "action.defaults": "恢复默认设置",
    "round.counter": (done, total) => "第 " + done + "/" + total + " 轮",
    "stats.today": (count, minutes) => "今日 " + count + " 个 · " + minutes + " 分钟",
    "stats.total": (count, minutes) => "累计 " + count + " 个 · " + minutes + " 分钟",
    "settings.title": "设置",
    "settings.work": "专注时长",
    "settings.short": "短休息",
    "settings.long": "长休息",
    "settings.rounds": "长休息前轮数",
    "settings.autoStartBreak": "自动开始休息",
    "settings.autoStartWork": "自动开始专注",
    "settings.sound": "结束提示音",
    "settings.tick": "走时滴答声",
    "settings.notify": "桌面通知",
    "unit.minute": "分钟",
    "unit.round": "轮",
    "shortcut.hint": "快捷键：空格 开始/暂停 · R 重置 · S 跳过",
    "notify.workDone": "专注结束",
    "notify.workDone.body": (minutes, phase) => "休息一下：" + phase + " " + minutes + " 分钟",
    "notify.breakDone": "休息结束",
    "notify.breakDone.body": (minutes) => "继续下一轮专注：" + minutes + " 分钟",
    "notice.noNotify": "当前环境不支持桌面通知",
    "notice.notifyDenied": "通知权限被拒绝，可在浏览器地址栏中重新开启",
    "notice.notifyOn": "已开启桌面通知",
    "notice.cleared": "统计已清除",
    "notice.defaults": "已恢复默认设置",
    "error.render": "番茄钟出错了：",
    "error.retry": "重试"
  };
  var en = {
    "card.title": "Pomodoro",
    "a11y.timer": "Pomodoro timer",
    "a11y.roundDone": (phase) => "Round finished, now " + phase,
    "phase.work": "Focus",
    "phase.short": "Short break",
    "phase.long": "Long break",
    "action.start": "Start",
    "action.pause": "Pause",
    "action.reset": "Reset round",
    "action.skip": "Skip round",
    "action.collapse": "Collapse",
    "action.expand": "Expand",
    "action.clearStats": "Clear statistics",
    "action.defaults": "Restore defaults",
    "round.counter": (done, total) => "Round " + done + "/" + total,
    "stats.today": (count, minutes) => "Today " + count + " · " + minutes + " min",
    "stats.total": (count, minutes) => "All time " + count + " · " + minutes + " min",
    "settings.title": "Settings",
    "settings.work": "Focus length",
    "settings.short": "Short break",
    "settings.long": "Long break",
    "settings.rounds": "Rounds before long break",
    "settings.autoStartBreak": "Auto-start breaks",
    "settings.autoStartWork": "Auto-start focus",
    "settings.sound": "Round chime",
    "settings.tick": "Ticking during focus",
    "settings.notify": "Desktop notifications",
    "unit.minute": "min",
    "unit.round": "rounds",
    "shortcut.hint": "Shortcuts: Space start/pause · R reset · S skip",
    "notify.workDone": "Focus finished",
    "notify.workDone.body": (minutes, phase) => "Take a break: " + phase + " for " + minutes + " min",
    "notify.breakDone": "Break finished",
    "notify.breakDone.body": (minutes) => "Back to focus for " + minutes + " min",
    "notice.noNotify": "Desktop notifications are not available here",
    "notice.notifyDenied": "Notification permission was denied — re-enable it from the address bar",
    "notice.notifyOn": "Desktop notifications enabled",
    "notice.cleared": "Statistics cleared",
    "notice.defaults": "Default settings restored",
    "error.render": "The Pomodoro widget failed: ",
    "error.retry": "Retry"
  };
  var boundLocale = null;
  function bindLocale(translate) {
    boundLocale = translate;
  }
  function t(key, ...args) {
    let value = key;
    try {
      value = boundLocale === null ? key : boundLocale(key);
    } catch {
      value = key;
    }
    if (typeof value === "function") return value(...args);
    return typeof value === "string" ? value : key;
  }

  // src/ui/h.ts
  function h2(type, props, ...children) {
    return h(type, props, ...children);
  }

  // src/core/types.ts
  var DEFAULT_SETTINGS = Object.freeze({
    workMin: 25,
    shortMin: 5,
    longMin: 15,
    roundsPerLong: 4,
    autoStartBreak: true,
    autoStartWork: false,
    sound: true,
    tick: false,
    notify: false
  });
  var SETTING_LIMITS = Object.freeze({
    workMin: [1, 180],
    shortMin: [1, 60],
    longMin: [1, 120],
    roundsPerLong: [1, 12]
  });
  var PHASES = Object.freeze(["work", "short", "long"]);
  var STORE_KEY = "dsh-pomodoro/store/v2";
  var LEGACY_STORE_KEYS = Object.freeze(["dsh-pomodoro/store/v1"]);
  var MINUTE_MS = 6e4;
  var UNSET_POSITION = null;

  // src/core/format.ts
  function pad2(value) {
    return String(value).padStart(2, "0");
  }
  function toFinite(value) {
    try {
      const number = typeof value === "number" ? value : Number(value);
      return Number.isFinite(number) ? number : null;
    } catch {
      return null;
    }
  }
  function formatClock(ms) {
    const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
    const totalSeconds = Math.ceil(safeMs / 1e3);
    return pad2(Math.floor(totalSeconds / 60)) + ":" + pad2(totalSeconds % 60);
  }
  function formatMinutes(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return Math.round(ms / MINUTE_MS);
  }
  function dayKey(now) {
    const date = new Date(Number.isFinite(now) ? now : 0);
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }
  function clampInt(value, low, high) {
    const number = toFinite(value);
    if (number === null) return low;
    return Math.min(Math.max(Math.round(number), low), high);
  }

  // src/core/stats.ts
  var MAX_COUNTER = Number.MAX_SAFE_INTEGER;
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function counter(value, max) {
    return typeof value === "number" && Number.isFinite(value) ? clampInt(value, 0, max) : 0;
  }
  function emptyStats(now) {
    return {
      day: dayKey(now),
      pomodoros: 0,
      focusMs: 0,
      totalPomodoros: 0,
      totalFocusMs: 0
    };
  }
  function normalizeStats(value, now) {
    const source = isRecord(value) ? value : null;
    const sameDay = source !== null && source.day === dayKey(now);
    return {
      day: dayKey(now),
      pomodoros: sameDay ? counter(source?.pomodoros, MAX_COUNTER) : 0,
      focusMs: sameDay ? counter(source?.focusMs, MAX_COUNTER) : 0,
      totalPomodoros: counter(source?.totalPomodoros, MAX_COUNTER),
      totalFocusMs: counter(source?.totalFocusMs, MAX_COUNTER)
    };
  }
  function creditWork(stats, focusMs, now) {
    const current = normalizeStats(stats, now);
    const focused = counter(focusMs, MAX_COUNTER);
    return {
      day: current.day,
      pomodoros: clampInt(current.pomodoros + 1, 0, MAX_COUNTER),
      focusMs: clampInt(current.focusMs + focused, 0, MAX_COUNTER),
      totalPomodoros: clampInt(current.totalPomodoros + 1, 0, MAX_COUNTER),
      totalFocusMs: clampInt(current.totalFocusMs + focused, 0, MAX_COUNTER)
    };
  }

  // src/core/timer.ts
  var NUMERIC_SETTING_KEYS = [
    "workMin",
    "shortMin",
    "longMin",
    "roundsPerLong"
  ];
  function isNumericSettingKey(key) {
    return NUMERIC_SETTING_KEYS.includes(key);
  }
  function preferenceNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
  function resolveNow(now) {
    return now !== void 0 && Number.isFinite(now) ? now : Date.now();
  }
  function sameStats(a, b) {
    return a.day === b.day && a.pomodoros === b.pomodoros && a.focusMs === b.focusMs && a.totalPomodoros === b.totalPomodoros && a.totalFocusMs === b.totalFocusMs;
  }
  function durationOf(phase, settings) {
    const minutes = phase === "work" ? settings.workMin : phase === "short" ? settings.shortMin : settings.longMin;
    return Math.max(1, Number.isFinite(minutes) ? minutes : 1) * MINUTE_MS;
  }
  function remainingOf(state, now) {
    if (state.running && Number.isFinite(now)) {
      const endsAt = state.endsAt;
      if (endsAt !== null && Number.isFinite(endsAt)) {
        const left = endsAt - now;
        return left > 0 ? left : 0;
      }
    }
    const paused = state.remainingMs;
    return Number.isFinite(paused) && paused > 0 ? paused : 0;
  }
  function progressOf(state, now) {
    const duration = durationOf(state.phase, state.settings);
    if (!(duration > 0)) return 0;
    return Math.min(1, Math.max(0, 1 - remainingOf(state, now) / duration));
  }
  function advance(state, options) {
    const settings = state.settings;
    const at = resolveNow(options?.now);
    const wasWork = state.phase === "work";
    const rounds = cycleRounds(settings);
    let workInCycle = clampInt(state.workInCycle, 0, rounds - 1);
    let phase;
    if (wasWork) {
      const finished = workInCycle + 1;
      workInCycle = finished >= rounds ? 0 : finished;
      phase = finished >= rounds ? "long" : "short";
    } else {
      phase = "work";
    }
    const duration = durationOf(phase, settings);
    const autoStart = options?.auto !== void 0 ? options.auto === true : wasWork ? settings.autoStartBreak === true : settings.autoStartWork === true;
    const normalized = normalizeStats(state.stats, at);
    const stats = options?.credit === true && wasWork ? creditWork(normalized, durationOf("work", settings), at) : sameStats(state.stats, normalized) ? state.stats : normalized;
    return {
      ...state,
      phase,
      workInCycle,
      stats,
      running: autoStart,
      endsAt: autoStart ? at + duration : null,
      remainingMs: duration
    };
  }
  function toggleRun(state, now) {
    const at = resolveNow(now);
    if (state.running) {
      return { ...state, running: false, endsAt: null, remainingMs: remainingOf(state, at) };
    }
    const remaining = Number.isFinite(state.remainingMs) && state.remainingMs > 0 ? state.remainingMs : durationOf(state.phase, state.settings);
    return { ...state, running: true, endsAt: at + remaining, remainingMs: remaining };
  }
  function resetRound(state) {
    const duration = durationOf(state.phase, state.settings);
    if (!state.running && state.endsAt === null && state.remainingMs === duration) return state;
    return { ...state, running: false, endsAt: null, remainingMs: duration };
  }
  function withSetting(state, key, rawValue) {
    const settings = { ...state.settings };
    if (isNumericSettingKey(key)) {
      const number = preferenceNumber(rawValue);
      if (number === null) return state;
      const [low, high] = SETTING_LIMITS[key];
      const next = clampInt(number, low, high);
      if (settings[key] === next) return state;
      settings[key] = next;
    } else {
      const next = rawValue === true;
      if (settings[key] === next) return state;
      settings[key] = next;
    }
    let remainingMs = state.remainingMs;
    if (!state.running) {
      const previousDuration = durationOf(state.phase, state.settings);
      const nextDuration = durationOf(state.phase, settings);
      const atFullLength = Math.abs(state.remainingMs - previousDuration) < 1e3;
      const carried = Number.isFinite(remainingMs) && remainingMs >= 0 ? remainingMs : nextDuration;
      remainingMs = atFullLength ? nextDuration : Math.min(carried, nextDuration);
    }
    return { ...state, settings, remainingMs };
  }
  function clearStats(state, now) {
    const fresh = emptyStats(now);
    if (sameStats(state.stats, fresh)) return state;
    return { ...state, stats: fresh };
  }
  function settleIfExpired(state, now) {
    if (!state.running || !Number.isFinite(now)) return state;
    const endsAt = state.endsAt;
    if (endsAt === null || !Number.isFinite(endsAt)) return state;
    if (endsAt > now) return state;
    return advance(state, { credit: true, auto: false, now });
  }
  function cycleRounds(settings) {
    const [low, high] = SETTING_LIMITS.roundsPerLong;
    return clampInt(settings.roundsPerLong, low, high);
  }
  function completedRounds(state) {
    return clampInt(state.workInCycle, 0, cycleRounds(state.settings) - 1);
  }
  function initialState(now) {
    const settings = { ...DEFAULT_SETTINGS };
    return {
      settings,
      phase: "work",
      running: false,
      endsAt: null,
      remainingMs: durationOf("work", settings),
      workInCycle: 0,
      stats: emptyStats(now),
      ui: { x: UNSET_POSITION, y: UNSET_POSITION, collapsed: false }
    };
  }

  // src/core/store.ts
  var STATE_SCHEMA_VERSION = 2;
  function isRecord2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function storedNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function numericSetting(source, key) {
    const value = storedNumber(source[key]);
    if (value === null) return DEFAULT_SETTINGS[key];
    const [low, high] = SETTING_LIMITS[key];
    return clampInt(value, low, high);
  }
  function toggleSetting(source, key) {
    const value = source[key];
    return typeof value === "boolean" ? value : DEFAULT_SETTINGS[key];
  }
  function position(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function normalizeSettings(value) {
    const source = isRecord2(value) ? value : {};
    return {
      workMin: numericSetting(source, "workMin"),
      shortMin: numericSetting(source, "shortMin"),
      longMin: numericSetting(source, "longMin"),
      roundsPerLong: numericSetting(source, "roundsPerLong"),
      autoStartBreak: toggleSetting(source, "autoStartBreak"),
      autoStartWork: toggleSetting(source, "autoStartWork"),
      sound: toggleSetting(source, "sound"),
      tick: toggleSetting(source, "tick"),
      notify: toggleSetting(source, "notify")
    };
  }
  function normalizeUi(value) {
    const source = isRecord2(value) ? value : {};
    return {
      x: position(source.x),
      y: position(source.y),
      collapsed: source.collapsed === true
    };
  }
  function toPhase(value) {
    if (typeof value === "string" && PHASES.includes(value)) return value;
    return "work";
  }
  function readSnapshot(storage, key) {
    if (storage === null) return null;
    try {
      const raw = storage.getItem(key);
      if (typeof raw !== "string" || raw.length === 0) return null;
      const parsed = JSON.parse(raw);
      return isRecord2(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  function rehydrate(snapshot, now) {
    const settings = normalizeSettings(snapshot.settings);
    const phase = toPhase(snapshot.phase);
    const rounds = clampInt(settings.roundsPerLong, SETTING_LIMITS.roundsPerLong[0], SETTING_LIMITS.roundsPerLong[1]);
    const storedCycle = storedNumber(snapshot.workInCycle);
    const base = {
      settings,
      phase,
      running: false,
      endsAt: null,
      remainingMs: durationOf(phase, settings),
      workInCycle: storedCycle === null ? 0 : clampInt(storedCycle, 0, rounds - 1),
      stats: normalizeStats(snapshot.stats, now),
      ui: normalizeUi(snapshot.ui)
    };
    if (snapshot.running === true) {
      const endsAt = storedNumber(snapshot.endsAt);
      if (endsAt !== null) {
        return settleIfExpired({ ...base, running: true, endsAt, remainingMs: Math.max(0, endsAt - now) }, now);
      }
    }
    const remaining = storedNumber(snapshot.remainingMs);
    if (remaining !== null && remaining > 0) {
      return { ...base, remainingMs: Math.min(remaining, durationOf(phase, settings)) };
    }
    return base;
  }
  function isExpiredRunning(snapshot, now) {
    if (snapshot.running !== true) return false;
    const endsAt = storedNumber(snapshot.endsAt);
    return endsAt !== null && endsAt <= now;
  }
  function toSnapshot(state) {
    const running = state.running === true;
    return {
      v: STATE_SCHEMA_VERSION,
      settings: state.settings,
      phase: state.phase,
      running,
      endsAt: running && Number.isFinite(state.endsAt) ? state.endsAt : null,
      // While running the deadline is the only durable truth: a stale
      // `remainingMs` must never be read back as a paused round.
      remainingMs: running ? null : state.remainingMs,
      workInCycle: state.workInCycle,
      stats: state.stats,
      ui: state.ui
    };
  }
  function writeSnapshot(storage, state) {
    if (storage === null) return;
    try {
      storage.setItem(STORE_KEY, JSON.stringify(toSnapshot(state)));
    } catch {
    }
  }
  function createStore(storage) {
    return {
      version: STATE_SCHEMA_VERSION,
      load(now) {
        const at = now !== void 0 && Number.isFinite(now) ? now : Date.now();
        const snapshot = readSnapshot(storage, STORE_KEY);
        if (snapshot !== null) {
          const state = rehydrate(snapshot, at);
          if (isExpiredRunning(snapshot, at)) writeSnapshot(storage, state);
          return state;
        }
        for (const key of LEGACY_STORE_KEYS) {
          const legacy = readSnapshot(storage, key);
          if (legacy !== null) {
            const state = rehydrate(legacy, at);
            writeSnapshot(storage, state);
            return state;
          }
        }
        return initialState(at);
      },
      save(state) {
        writeSnapshot(storage, state);
      }
    };
  }

  // src/audio.ts
  var WORK_CHIME_HZ = [659.25, 880, 1318.51];
  var BREAK_CHIME_HZ = [880, 1174.66];
  var context = null;
  function audioContextCtor() {
    const scope = window;
    return scope.AudioContext ?? scope.webkitAudioContext ?? null;
  }
  function unlockAudio() {
    try {
      if (context === null) {
        const Ctor = audioContextCtor();
        if (Ctor === null) return null;
        context = new Ctor();
      }
      if (context.state === "suspended") {
        const resumed = context.resume();
        if (resumed instanceof Promise) resumed.catch(() => void 0);
      }
      return context;
    } catch {
      context = null;
      return null;
    }
  }
  function tone(target, frequency, startAt, duration, peak, type) {
    const oscillator = target.createOscillator();
    const gain = target.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(1e-4, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(1e-4, startAt + duration);
    oscillator.connect(gain);
    gain.connect(target.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }
  function activeAudio() {
    const target = context;
    if (target === null || target.state !== "running") return null;
    return target;
  }
  function playChime(finishedPhase) {
    const target = activeAudio();
    if (target === null) return;
    const notes = finishedPhase === "work" ? WORK_CHIME_HZ : BREAK_CHIME_HZ;
    try {
      const start = target.currentTime + 0.02;
      notes.forEach((frequency, index) => {
        tone(target, frequency, start + index * 0.16, 0.55, 0.2, "sine");
      });
    } catch {
    }
  }
  function playTick() {
    const target = activeAudio();
    if (target === null) return;
    try {
      tone(target, 1500, target.currentTime + 1e-3, 0.03, 0.04, "square");
    } catch {
    }
  }
  function closeAudio() {
    const target = context;
    context = null;
    if (target === null) return;
    try {
      const closed = target.close();
      if (closed instanceof Promise) closed.catch(() => void 0);
    } catch {
    }
  }

  // src/notify.ts
  function notificationCtor() {
    const scope = window;
    const ctor = scope.Notification;
    return typeof ctor === "function" ? ctor : null;
  }
  function notificationPermission() {
    try {
      return notificationCtor()?.permission ?? "unsupported";
    } catch {
      return "unsupported";
    }
  }
  function requestNotificationPermission() {
    try {
      const ctor = notificationCtor();
      if (ctor === null) return Promise.resolve("unsupported");
      return Promise.resolve(ctor.requestPermission()).then(
        (result) => result,
        () => "denied"
      );
    } catch {
      return Promise.resolve("denied");
    }
  }
  function showNotification(title, body) {
    try {
      const ctor = notificationCtor();
      if (ctor === null || ctor.permission !== "granted") return;
      new ctor(title, { body, tag: "dsh-pomodoro", silent: true });
    } catch {
    }
  }

  // src/ui/icons.ts
  var ICON_PATHS = {
    play: ["M8 5.1v13.8L19 12z"],
    pause: ["M7 5h3.2v14H7z", "M13.8 5H17v14h-3.2z"],
    reset: ["M11.6 4.6V2L6.6 6.6l5 4.6V8.4a4.6 4.6 0 1 1-4.6 4.6H5A6.6 6.6 0 1 0 11.6 4.6z"],
    skip: ["M6 5.6l8.4 6.4L6 18.4z", "M15.6 5.4h2.2v13.2h-2.2z"],
    sliders: ["M3 6.8h18v1.4H3z", "M9 5h2v5H9z", "M3 11.3h18v1.4H3z", "M15 9.5h2v5h-2z", "M3 15.8h18v1.4H3z", "M6 14h2v5H6z"],
    minus: ["M5 11h14v2H5z"],
    chevron: ["M12 8.4l6 6-1.4 1.4L12 11.2l-4.6 4.6L6 14.4z"]
  };
  function Icon(props) {
    const paths = ICON_PATHS[props.name];
    const size = props.size ?? 16;
    return h2(
      "svg",
      {
        className: "dsp-icon",
        viewBox: "0 0 24 24",
        width: size,
        height: size,
        "aria-hidden": true,
        focusable: false
      },
      paths.map((d, index) => h2("path", { key: index, d, fill: "currentColor" }))
    );
  }

  // src/ui/ring.ts
  var RING_RADIUS = 56;
  var RING_LENGTH = 2 * Math.PI * RING_RADIUS;
  function Ring(props) {
    const offset = RING_LENGTH * (1 - Math.min(1, Math.max(0, props.progress)));
    return h2(
      "div",
      { className: "dsp-ringwrap", role: "timer", "aria-label": props.label },
      h2(
        "svg",
        {
          className: "dsp-ring dsp-ring--" + props.phase + (props.running ? " is-running" : ""),
          viewBox: "0 0 132 132",
          width: 132,
          height: 132,
          "aria-hidden": true
        },
        h2("circle", {
          cx: 66,
          cy: 66,
          r: RING_RADIUS,
          fill: "none",
          stroke: "var(--dsw-alias-border-l2)",
          strokeWidth: 7
        }),
        h2("circle", {
          className: "dsp-progress",
          cx: 66,
          cy: 66,
          r: RING_RADIUS,
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 7,
          strokeLinecap: "round",
          strokeDasharray: RING_LENGTH,
          strokeDashoffset: offset,
          transform: "rotate(-90 66 66)"
        })
      ),
      h2(
        "div",
        { className: "dsp-center" },
        h2("div", { className: "dsp-clock" }, props.clock),
        h2("div", { className: "dsp-phase" }, props.phaseText),
        h2("div", { className: "dsp-round" }, props.roundText)
      )
    );
  }

  // src/ui/controls.ts
  function iconButton(name, label, onClick, extraClass) {
    return h2(
      "button",
      {
        key: name,
        type: "button",
        className: "dsp-iconbtn" + (extraClass === void 0 ? "" : " " + extraClass),
        "data-dsp-no-drag": "1",
        title: label,
        "aria-label": label,
        onClick
      },
      h2(Icon, { name })
    );
  }
  function Controls(props) {
    const toggleLabel = t(props.running ? "action.pause" : "action.start");
    return h2(
      "div",
      { className: "dsp-controls" },
      iconButton("reset", t("action.reset"), props.onReset, "dsp-iconbtn--wide"),
      h2(
        "button",
        {
          key: "toggle",
          type: "button",
          className: "dsp-btn dsp-btn--primary dsp-btn--main",
          "data-dsp-no-drag": "1",
          "aria-label": toggleLabel,
          title: toggleLabel,
          onClick: props.onToggleRun
        },
        h2(Icon, { name: props.running ? "pause" : "play" }),
        h2("span", null, toggleLabel)
      ),
      iconButton("skip", t("action.skip"), props.onSkip, "dsp-iconbtn--wide")
    );
  }

  // src/ui/switch.ts
  function Switch(props) {
    return h2(
      "button",
      {
        type: "button",
        role: "switch",
        "aria-checked": props.checked,
        "aria-label": props.label,
        title: props.label,
        "data-dsp-no-drag": "1",
        className: "dsp-switch" + (props.checked ? " is-on" : ""),
        onClick: () => props.onChange(!props.checked)
      },
      h2("span", { className: "dsp-switch-knob", "aria-hidden": true })
    );
  }

  // src/ui/settings.ts
  var NUMBER_ROWS = [
    { key: "workMin", labelKey: "settings.work" },
    { key: "shortMin", labelKey: "settings.short" },
    { key: "longMin", labelKey: "settings.long" },
    { key: "roundsPerLong", labelKey: "settings.rounds" }
  ];
  var TOGGLE_ROWS = [
    { key: "autoStartBreak", labelKey: "settings.autoStartBreak" },
    { key: "autoStartWork", labelKey: "settings.autoStartWork" },
    { key: "sound", labelKey: "settings.sound" },
    { key: "tick", labelKey: "settings.tick" },
    { key: "notify", labelKey: "settings.notify" }
  ];
  function NumberField(props) {
    const { useEffect, useState } = React;
    const [draft, setDraft] = useState(null);
    useEffect(() => {
      setDraft(null);
    }, [props.value]);
    return h2("input", {
      className: "dsp-num",
      type: "number",
      min: props.limits[0],
      max: props.limits[1],
      step: 1,
      value: draft === null ? String(props.value) : draft,
      "data-dsp-no-drag": "1",
      "aria-label": props.label,
      onChange: (event) => {
        const raw = event.target.value;
        setDraft(raw);
        const trimmed = raw.trim();
        if (trimmed !== "" && Number.isFinite(Number(trimmed))) props.onNumberChange(props.settingKey, trimmed);
      },
      onBlur: () => setDraft(null)
    });
  }
  function numberRow(row, settings, onNumberChange) {
    const limits = SETTING_LIMITS[row.key];
    const label = t(row.labelKey);
    return h2(
      "label",
      { className: "dsp-row", key: row.key },
      h2("span", { className: "dsp-row-label" }, label),
      h2(
        "span",
        { className: "dsp-row-control" },
        h2(NumberField, {
          settingKey: row.key,
          label,
          value: settings[row.key],
          limits,
          onNumberChange
        }),
        h2("span", { className: "dsp-unit" }, t(row.key === "roundsPerLong" ? "unit.round" : "unit.minute"))
      )
    );
  }
  function switchRow(row, settings, onToggleChange) {
    const label = t(row.labelKey);
    return h2(
      "div",
      { className: "dsp-row", key: row.key },
      h2("span", { className: "dsp-row-label" }, label),
      h2(
        "span",
        { className: "dsp-row-control" },
        h2(Switch, {
          checked: settings[row.key],
          label,
          onChange: (next) => onToggleChange(row.key, next)
        })
      )
    );
  }
  function SettingsPanel(props) {
    return h2(
      "div",
      { className: "dsp-settings" },
      NUMBER_ROWS.map((row) => numberRow(row, props.settings, props.onNumberChange)),
      TOGGLE_ROWS.map((row) => switchRow(row, props.settings, props.onToggleChange)),
      h2("p", { className: "dsp-shortcut", key: "shortcut" }, t("shortcut.hint")),
      h2(
        "button",
        {
          key: "defaults",
          type: "button",
          className: "dsp-btn dsp-btn--ghost",
          "data-dsp-no-drag": "1",
          onClick: props.onRestoreDefaults
        },
        t("action.defaults")
      ),
      h2(
        "button",
        {
          key: "clear",
          type: "button",
          className: "dsp-btn dsp-btn--ghost",
          "data-dsp-no-drag": "1",
          onClick: props.onClearStats
        },
        t("action.clearStats")
      )
    );
  }

  // src/ui/styles.ts
  var LAYER_CLASS = "dsp-layer";
  var LAYER_CSS = [
    // Beside #root the layer states its own z-index. 120 clears every surface the
    // music player draws inside the tree — fullscreen player 40, modal 60 and
    // lightbox 80 — while leaving the harness dialog/popover tier (900–1100) where
    // the harness put it. Its pointer-events:none can no longer be overridden by
    // the frame's `.overlayLayer > *` rule either, because the layer is not a child
    // of that node any more.
    ".dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}",
    ".dsp-card{position:absolute;box-sizing:border-box;width:252px;padding:12px;border-radius:14px;",
    "background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);",
    "border:1px solid var(--dsw-alias-border-l1);box-shadow:0 12px 28px rgba(0,0,0,.22);",
    "font-family:inherit;font-size:12px;font-weight:400;line-height:1.45;",
    "pointer-events:auto;user-select:none;-webkit-user-select:none;",
    "font-variant-numeric:tabular-nums;touch-action:none;cursor:grab}",
    ".dsp-card.is-dragging{cursor:grabbing}",
    ".dsp-card--mini{width:auto;padding:6px 8px;border-radius:999px}",
    ".dsp-head{display:flex;align-items:center;gap:6px;margin-bottom:8px}",
    ".dsp-title{font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}",
    ".dsp-spacer{flex:1}",
    ".dsp-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-brand-primary)}",
    ".dsp-dot--short{background:var(--dsw-alias-state-success-primary)}",
    ".dsp-dot--long{background:var(--dsw-alias-state-warn-primary)}",
    ".dsp-body{display:flex;flex-direction:column;align-items:center}",
    ".dsp-ringwrap{position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center}",
    ".dsp-ring{display:block}",
    ".dsp-ring--work{color:var(--dsw-alias-brand-primary)}",
    ".dsp-ring--short{color:var(--dsw-alias-state-success-primary)}",
    ".dsp-ring--long{color:var(--dsw-alias-state-warn-primary)}",
    ".dsp-ring .dsp-progress{transition:stroke-dashoffset .2s linear}",
    ".dsp-ring.is-running{animation:dsp-breathe 3.2s ease-in-out infinite}",
    "@keyframes dsp-breathe{0%,100%{opacity:1}50%{opacity:.78}}",
    ".dsp-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;pointer-events:none}",
    ".dsp-clock{font-size:26px;font-weight:600;letter-spacing:.01em}",
    ".dsp-clock--mini{font-size:15px;font-weight:600;min-width:44px;text-align:center}",
    ".dsp-phase{font-size:11px;color:var(--dsw-alias-label-secondary)}",
    ".dsp-round{font-size:10px;color:var(--dsw-alias-state-idle-primary)}",
    ".dsp-dots{display:flex;gap:5px;justify-content:center;margin:8px 0 10px}",
    ".dsp-pip{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-border-l2)}",
    ".dsp-pip.is-done{background:var(--dsw-alias-brand-primary)}",
    ".dsp-controls{display:flex;align-items:center;justify-content:center;gap:8px}",
    ".dsp-icon{display:block}",
    ".dsp-iconbtn{display:inline-flex;align-items:center;justify-content:center;height:30px;min-width:34px;padding:0 8px;",
    "border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);",
    "color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}",
    ".dsp-iconbtn:hover{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
    ".dsp-iconbtn--wide{flex:1}",
    ".dsp-iconbtn--round{height:26px;min-width:26px;padding:0;border-radius:50%}",
    ".dsp-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;",
    "border:1px solid transparent;border-radius:9px;cursor:pointer;font:600 12px/1 inherit}",
    ".dsp-btn--primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}",
    ".dsp-btn--main{flex:0 0 92px}",
    ".dsp-btn--ghost{margin-top:8px;width:100%;background:transparent;border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}",
    ".dsp-btn--ghost:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
    ".dsp-stats{display:flex;flex-direction:column;align-items:center;gap:1px;margin-top:9px;",
    "font-size:10.5px;color:var(--dsw-alias-label-secondary);text-align:center}",
    ".dsp-stats-total{color:var(--dsw-alias-state-idle-primary)}",
    ".dsp-notice{margin-top:8px;padding:5px 8px;border-radius:8px;font-size:10.5px;text-align:center;",
    "background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}",
    ".dsp-settings{margin-top:10px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:6px}",
    ".dsp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}",
    ".dsp-row-label{color:var(--dsw-alias-label-secondary);flex:1;min-width:0}",
    ".dsp-row-control{display:inline-flex;align-items:center;gap:5px;flex:none}",
    ".dsp-num{width:52px;height:24px;box-sizing:border-box;padding:0 6px;border-radius:6px;text-align:right;",
    "background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);",
    "border:1px solid var(--dsw-alias-border-l1);font:inherit;font-variant-numeric:tabular-nums}",
    ".dsp-unit{color:var(--dsw-alias-state-idle-primary);font-size:10px;min-width:24px;text-align:left}",
    ".dsp-shortcut{margin:2px 0 0;font-size:10px;line-height:1.5;color:var(--dsw-alias-state-idle-primary)}",
    ".dsp-switch{position:relative;width:34px;height:19px;padding:0;border-radius:999px;cursor:pointer;flex:none;",
    "background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2)}",
    ".dsp-switch.is-on{background:var(--dsw-alias-brand-primary);border-color:transparent}",
    ".dsp-switch-knob{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;",
    "background:var(--dsw-alias-label-secondary);transition:left .15s ease}",
    ".dsp-switch.is-on .dsp-switch-knob{left:17px;background:var(--dsw-alias-bg-base)}",
    ".dsp-mini{display:flex;align-items:center;gap:7px}",
    // Keyboard focus is always visible: the card is focusable as a whole, so
    // dropping this would make Space/R/S unreachable without a mouse.
    ".dsp-card:focus-visible,.dsp-iconbtn:focus-visible,.dsp-btn:focus-visible,.dsp-switch:focus-visible,.dsp-num:focus-visible{",
    "outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}",
    ".dsp-card:focus-visible{outline-offset:3px}",
    // Screen-reader-only live region for the round-change announcement.
    ".dsp-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}",
    "@media (prefers-reduced-motion:reduce){.dsp-ring.is-running{animation:none}.dsp-ring .dsp-progress{transition:none}.dsp-switch-knob{transition:none}}"
  ].join("\n");

  // src/ui/layer.ts
  function renderLayer(children) {
    const layer = h2(
      "div",
      { className: LAYER_CLASS },
      h2("style", { dangerouslySetInnerHTML: { __html: LAYER_CSS } }),
      children
    );
    return portalToBody(layer) ?? layer;
  }

  // src/ui/overlay.ts
  var NOTICE_MS = 2800;
  var POSITION_SAVE_MS = 250;
  var TICK_INTERVAL_MS = 200;
  function openStorage() {
    try {
      const storage = window.localStorage;
      return storage === void 0 ? null : storage;
    } catch {
      return null;
    }
  }
  function phaseLabel(phase) {
    return t(phase === "work" ? "phase.work" : phase === "short" ? "phase.short" : "phase.long");
  }
  function clampPosition(point, element) {
    const width = element !== null && element.offsetWidth > 0 ? element.offsetWidth : 252;
    const height = element !== null && element.offsetHeight > 0 ? element.offsetHeight : 220;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    return { x: Math.min(Math.max(8, point.x), maxX), y: Math.min(Math.max(8, point.y), maxY) };
  }
  function iconButton2(name, label, onClick, extraClass) {
    return h2(
      "button",
      {
        key: name,
        type: "button",
        className: "dsp-iconbtn" + (extraClass === void 0 ? "" : " " + extraClass),
        "data-dsp-no-drag": "1",
        title: label,
        "aria-label": label,
        onClick
      },
      h2(Icon, { name })
    );
  }
  function PomodoroOverlay() {
    const { useCallback, useEffect, useRef, useState } = React;
    const layoutEffect = typeof React.useLayoutEffect === "function" ? React.useLayoutEffect : React.useEffect;
    const [store] = useState(() => createStore(openStorage()));
    const [state, setState] = useState(() => settleIfExpired(store.load(Date.now()), Date.now()));
    const [now, setNow] = useState(() => Date.now());
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [notice, setNotice] = useState(null);
    const [announcement, setAnnouncement] = useState("");
    const [dragging, setDragging] = useState(false);
    const [position2, setPosition] = useState(() => ({ x: state.ui.x, y: state.ui.y }));
    const stateRef = useRef(state);
    const cardRef = useRef(null);
    const dragRef = useRef(null);
    const finishingRef = useRef(false);
    const lastTickSecondRef = useRef(0);
    const noticeTimerRef = useRef(null);
    const mountedRef = useRef(true);
    const previousPhaseRef = useRef(state.phase);
    stateRef.current = state;
    const showNotice = useCallback((message) => {
      setNotice(message);
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(() => {
        noticeTimerRef.current = null;
        setNotice(null);
      }, NOTICE_MS);
    }, []);
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
        closeAudio();
      };
    }, []);
    useEffect(() => {
      store.save(state);
    }, [store, state]);
    const applyState = useCallback((next) => {
      if (!mountedRef.current) return;
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
    }, []);
    const completeRound = useCallback(() => {
      const current = stateRef.current;
      if (!current.running || current.endsAt === null || Date.now() < current.endsAt) return;
      if (finishingRef.current) return;
      finishingRef.current = true;
      try {
        const finishedPhase = current.phase;
        const next = advance(current, { credit: true });
        applyState(next);
        setNow(Date.now());
        if (current.settings.sound) playChime(finishedPhase);
        if (current.settings.notify) {
          const minutes = formatMinutes(durationOf(next.phase, next.settings));
          const title = t(finishedPhase === "work" ? "notify.workDone" : "notify.breakDone");
          const body2 = finishedPhase === "work" ? t("notify.workDone.body", minutes, phaseLabel(next.phase)) : t("notify.breakDone.body", minutes);
          showNotification(title, body2);
        }
      } finally {
        finishingRef.current = false;
      }
    }, [applyState]);
    const handleToggleRun = useCallback(() => {
      const current = stateRef.current;
      if (!current.running) unlockAudio();
      applyState(toggleRun(current, Date.now()));
      setNow(Date.now());
    }, [applyState]);
    const handleReset = useCallback(() => {
      applyState(resetRound(stateRef.current));
      setNow(Date.now());
    }, [applyState]);
    const handleSkip = useCallback(() => {
      applyState(advance(stateRef.current, { credit: false }));
      setNow(Date.now());
    }, [applyState]);
    const handleNumberChange = useCallback(
      (key, rawValue) => {
        applyState(withSetting(stateRef.current, key, rawValue));
      },
      [applyState]
    );
    const handleToggleChange = useCallback(
      (key, next) => {
        applyState(withSetting(stateRef.current, key, next));
      },
      [applyState]
    );
    const handleClearStats = useCallback(() => {
      applyState(clearStats(stateRef.current, Date.now()));
      showNotice(t("notice.cleared"));
    }, [applyState, showNotice]);
    const handleRestoreDefaults = useCallback(() => {
      let next = stateRef.current;
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        next = withSetting(next, key, DEFAULT_SETTINGS[key]);
      }
      applyState(next);
      showNotice(t("notice.defaults"));
    }, [applyState, showNotice]);
    const handleNotifyToggle = useCallback(
      (next) => {
        if (!next) {
          applyState(withSetting(stateRef.current, "notify", false));
          return;
        }
        const permission = notificationPermission();
        if (permission === "granted") {
          applyState(withSetting(stateRef.current, "notify", true));
          return;
        }
        if (permission === "unsupported") {
          showNotice(t("notice.noNotify"));
          return;
        }
        if (permission === "denied") {
          showNotice(t("notice.notifyDenied"));
          return;
        }
        void requestNotificationPermission().then((result) => {
          if (result === "granted") {
            applyState(withSetting(stateRef.current, "notify", true));
            showNotice(t("notice.notifyOn"));
          } else {
            showNotice(t("notice.notifyDenied"));
          }
        });
      },
      [applyState, showNotice]
    );
    const handleSettingsToggle = useCallback(
      (key, next) => {
        if (key === "notify") handleNotifyToggle(next);
        else handleToggleChange(key, next);
      },
      [handleNotifyToggle, handleToggleChange]
    );
    const setCollapsed = useCallback(
      (collapsed2) => {
        const current = stateRef.current;
        applyState({ ...current, ui: { ...current.ui, collapsed: collapsed2 } });
      },
      [applyState]
    );
    useEffect(() => {
      if (!state.running || state.endsAt === null) return void 0;
      const step = () => {
        const current = stateRef.current;
        if (!current.running || current.endsAt === null) return;
        const stamp = Date.now();
        if (stamp >= current.endsAt) {
          completeRound();
          return;
        }
        setNow(stamp);
        if (current.settings.tick && current.phase === "work") {
          const second = Math.floor(stamp / 1e3);
          if (second !== lastTickSecondRef.current) {
            lastTickSecondRef.current = second;
            playTick();
          }
        }
      };
      step();
      const id = window.setInterval(step, TICK_INTERVAL_MS);
      return () => window.clearInterval(id);
    }, [state.running, state.endsAt, completeRound]);
    useEffect(() => {
      if (!state.running) return void 0;
      const check = () => {
        const current = stateRef.current;
        if (current.running && current.endsAt !== null && Date.now() >= current.endsAt) completeRound();
      };
      document.addEventListener("visibilitychange", check);
      return () => document.removeEventListener("visibilitychange", check);
    }, [state.running, completeRound]);
    layoutEffect(() => {
      const element = cardRef.current;
      setPosition((previous) => {
        if (previous.x !== null && previous.y !== null) return clampPosition({ x: previous.x, y: previous.y }, element);
        const rect = element === null ? null : element.getBoundingClientRect();
        const width = rect !== null && rect.width > 0 ? rect.width : 252;
        const height = rect !== null && rect.height > 0 ? rect.height : 220;
        return {
          x: Math.max(12, window.innerWidth - width - 24),
          y: Math.max(12, window.innerHeight - height - 24)
        };
      });
    }, []);
    useEffect(() => {
      const onResize = () => {
        const element = cardRef.current;
        setPosition(
          (previous) => previous.x === null || previous.y === null ? previous : clampPosition({ x: previous.x, y: previous.y }, element)
        );
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    useEffect(() => {
      if (position2.x === null || position2.y === null) return void 0;
      const x = position2.x;
      const y = position2.y;
      const id = window.setTimeout(() => {
        setState(
          (previous) => previous.ui.x === x && previous.ui.y === y ? previous : { ...previous, ui: { ...previous.ui, x, y } }
        );
      }, POSITION_SAVE_MS);
      return () => window.clearTimeout(id);
    }, [position2.x, position2.y]);
    useEffect(() => {
      const onStorage = (event) => {
        if (event.key !== null && event.key !== STORE_KEY) return;
        if (dragRef.current !== null) return;
        const next = settleIfExpired(store.load(Date.now()), Date.now());
        stateRef.current = next;
        setState(next);
        setNow(Date.now());
        if (next.ui.x !== null && next.ui.y !== null) setPosition({ x: next.ui.x, y: next.ui.y });
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }, [store]);
    useEffect(() => {
      if (previousPhaseRef.current === state.phase) return;
      previousPhaseRef.current = state.phase;
      setAnnouncement(t("a11y.roundDone", phaseLabel(state.phase)));
    }, [state.phase]);
    const onDragStart = useCallback((event) => {
      if (event.button !== void 0 && event.button !== 0) return;
      const target = event.target;
      if (target !== null && typeof target.closest === "function" && target.closest("[data-dsp-no-drag]") !== null) return;
      const element = cardRef.current;
      if (element === null) return;
      const rect = element.getBoundingClientRect();
      dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
      }
      event.preventDefault();
    }, []);
    const onDragMove = useCallback((event) => {
      const drag = dragRef.current;
      if (drag === null) return;
      setPosition(clampPosition({ x: event.clientX - drag.dx, y: event.clientY - drag.dy }, cardRef.current));
    }, []);
    const onDragEnd = useCallback((event) => {
      if (dragRef.current === null) return;
      dragRef.current = null;
      setDragging(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
      }
    }, []);
    const onKeyDown = useCallback(
      (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          handleToggleRun();
        } else if (event.key === "r" || event.key === "R") {
          event.preventDefault();
          handleReset();
        } else if (event.key === "s" || event.key === "S") {
          event.preventDefault();
          handleSkip();
        }
      },
      [handleReset, handleSkip, handleToggleRun]
    );
    const settings = state.settings;
    const remaining = remainingOf(state, now);
    const progress = progressOf(state, now);
    const done = completedRounds(state);
    const total = cycleRounds(settings);
    const collapsed = state.ui.collapsed;
    const roundText = t("round.counter", state.phase === "work" ? done + 1 : done, total);
    const cardStyle = position2.x === null || position2.y === null ? { right: "24px", bottom: "24px", visibility: "hidden" } : { left: position2.x + "px", top: position2.y + "px" };
    const dots = h2(
      "div",
      { className: "dsp-dots", key: "dots", "aria-hidden": true },
      Array.from(
        { length: total },
        (_unused, index) => h2("span", { key: index, className: "dsp-pip" + (index < done ? " is-done" : "") })
      )
    );
    const liveRegion = h2(
      "div",
      { className: "dsp-sr", role: "status", "aria-live": "polite", key: "live" },
      announcement
    );
    const body = collapsed ? h2(
      "div",
      { className: "dsp-mini" },
      h2("span", { className: "dsp-dot dsp-dot--" + state.phase, "aria-hidden": true }),
      h2("span", { className: "dsp-clock dsp-clock--mini" }, formatClock(remaining)),
      iconButton2(
        state.running ? "pause" : "play",
        t(state.running ? "action.pause" : "action.start"),
        handleToggleRun,
        "dsp-iconbtn--round"
      ),
      iconButton2("chevron", t("action.expand"), () => setCollapsed(false), "dsp-iconbtn--round")
    ) : [
      h2(
        "header",
        { className: "dsp-head", key: "head" },
        h2("span", { className: "dsp-dot dsp-dot--" + state.phase, "aria-hidden": true }),
        h2("span", { className: "dsp-title" }, t("card.title")),
        h2("span", { className: "dsp-spacer" }),
        iconButton2("sliders", t("settings.title"), () => setSettingsOpen((open) => !open)),
        iconButton2("minus", t("action.collapse"), () => setCollapsed(true))
      ),
      h2(
        "div",
        { className: "dsp-body", key: "body" },
        h2(Ring, {
          phase: state.phase,
          running: state.running,
          progress,
          clock: formatClock(remaining),
          phaseText: phaseLabel(state.phase),
          roundText,
          label: t("a11y.timer")
        }),
        dots
      ),
      h2(Controls, {
        key: "controls",
        running: state.running,
        onToggleRun: handleToggleRun,
        onReset: handleReset,
        onSkip: handleSkip
      }),
      h2(
        "div",
        { className: "dsp-stats", key: "stats" },
        h2("span", null, t("stats.today", state.stats.pomodoros, formatMinutes(state.stats.focusMs))),
        h2(
          "span",
          { className: "dsp-stats-total" },
          t("stats.total", state.stats.totalPomodoros, formatMinutes(state.stats.totalFocusMs))
        )
      ),
      notice === null ? null : h2("div", { className: "dsp-notice", role: "status", key: "notice" }, notice),
      settingsOpen ? h2(
        "div",
        { key: "settings" },
        h2(SettingsPanel, {
          settings,
          onNumberChange: handleNumberChange,
          onToggleChange: handleSettingsToggle,
          onClearStats: handleClearStats,
          onRestoreDefaults: handleRestoreDefaults
        })
      ) : null
    ];
    return renderLayer(
      h2(
        "section",
        {
          ref: cardRef,
          className: "dsp-card dsp-card--" + state.phase + (collapsed ? " dsp-card--mini" : "") + (dragging ? " is-dragging" : ""),
          style: cardStyle,
          role: "group",
          "aria-label": t("card.title"),
          tabIndex: 0,
          onKeyDown,
          onPointerDown: onDragStart,
          onPointerMove: onDragMove,
          onPointerUp: onDragEnd,
          onPointerCancel: onDragEnd
        },
        body,
        // Outside the collapsed/expanded branch: a round that ends while the card
        // is a pill still has to be announced.
        liveRegion
      )
    );
  }

  // src/client.ts
  var MODULE_ID = "@local/dsh-pomodoro";
  var SLOT_ENTRY_ID = "dsh-pomodoro";
  function createBoundary() {
    const { Component } = React;
    return class ErrorBoundary extends Component {
      state = { error: null };
      static getDerivedStateFromError(error) {
        return { error };
      }
      componentDidCatch(error) {
        try {
          console.error("[dsh-pomodoro]", error);
        } catch {
        }
      }
      render() {
        if (this.state.error === null) return h(PomodoroOverlay);
        const message = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
        const card = h(
          "div",
          { className: "dsp-layer" },
          h("style", { dangerouslySetInnerHTML: { __html: ERROR_CSS } }),
          h(
            "div",
            { className: "dsp-card dsp-card--error", style: { right: "24px", bottom: "24px" } },
            h("div", { className: "dsp-title" }, t("card.title")),
            h("div", { className: "dsp-notice is-error" }, t("error.render") + message),
            h(
              "button",
              { type: "button", className: "dsp-btn dsp-btn--ghost", onClick: () => this.setState({ error: null }) },
              t("error.retry")
            )
          )
        );
        return portalToBody(card) ?? card;
      }
    };
  }
  var ERROR_CSS = [
    ".dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}",
    ".dsp-card{position:absolute;box-sizing:border-box;width:280px;padding:12px;border-radius:14px;",
    "background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);",
    "border:1px solid var(--dsw-alias-border-l1);box-shadow:0 12px 28px rgba(0,0,0,.22);",
    "font-family:inherit;font-size:12px;line-height:1.45;pointer-events:auto}",
    ".dsp-title{font-weight:600;color:var(--dsw-alias-label-secondary);margin-bottom:6px}",
    ".dsp-notice{padding:5px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);",
    "color:var(--dsw-alias-state-error-primary);word-break:break-word}",
    ".dsp-btn{margin-top:8px;width:100%;height:30px;border-radius:8px;cursor:pointer;font:inherit;",
    "background:transparent;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1)}"
  ].join("\n");
  var sink = window.__ModuleLoader__;
  if (sink === void 0) {
    throw new Error(MODULE_ID + ": window.__ModuleLoader__ is missing (booted outside the web shell?)");
  }
  sink.load({
    id: MODULE_ID,
    factory(require_) {
      bindPlatform(require_);
      const module = { exports: {} };
      const exports = module.exports;
      const inject = ["slots", "locale"];
      function apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { zh, en }),
          "pomodoro: dictionaries"
        );
        bindLocale(ctx.locale.bind(NS));
        ctx.slots.inject(
          "shell.overlay",
          () => ctx.slots.register(
            {
              name: "shell.overlay",
              id: SLOT_ENTRY_ID,
              order: 20,
              label: () => t("card.title"),
              locale: NS,
              inject: () => ({})
            },
            createBoundary()
          )
        );
      }
      exports.apply = apply;
      exports.inject = inject;
      return module.exports;
    }
  });
})();
