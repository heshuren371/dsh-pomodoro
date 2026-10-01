# Pomodoro · dsh-pomodoro

A floating Pomodoro timer for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).

It takes a seat in `shell.overlay` but portals its card beside `#root`, so it stays visible in every panel and every session, and the music player's fullscreen surfaces cannot cover it. The source is TypeScript, `lib/` is a build artifact **committed on purpose** (GitHub installs run no build step), and there are no runtime dependencies beyond the development-time tooling.

## Features

- **Ring countdown**: SVG progress ring plus `MM:SS`, with its own theme colour per focus / short break / long break
- **Automatic rotation**: focus → short break; every N focus rounds → long break; each transition can auto-start or not
- **Manual controls**: start / pause / reset round / skip round
- **Floating card**: drag it anywhere, collapse it to a pill; position and collapsed state are remembered
- **Resume across reloads**: the countdown is anchored to absolute timestamps, so a refresh keeps it going; a round that finished while the page was closed is credited on return and the cycle advances
- **Multi-tab sync**: settings or statistics changed in another tab are adopted here (except mid-drag)
- **Chime and ticking**: synthesised with WebAudio, no audio files involved
- **Desktop notifications**: optional, and the browser permission is requested only when you first turn it on
- **Statistics**: today's pomodoros and focus minutes plus lifetime totals, clearable in one click
- **Chinese and English UI**: goes through the Client locale service and follows the Harness language
- **Theme-consistent**: only `--dsw-alias-*` theme tokens, light and dark adapt automatically, and no Harness Client package is imported

## Install

Requires Node.js `^22.19.0 || >=24.0.0` and `pnpm` on your `PATH`.

**Track A · local directory** (development / local install). Inside a DSH session, call Plugin Manager with the absolute path of this package; the profile links that directory:

```
plugin_manager  action: install_bundle  target: /absolute/path/to/dsh-pomodoro
```

**Track B · GitHub**:

```sh
dsh plugin --profile web add github:heshuren371/dsh-pomodoro
```

Append `#v1.0.0` to pin a version. Restart `dsh web` afterwards (for a local link install, a page refresh is enough). Installation location, enable/disable and removal are owned by Plugin Manager / `dsh plugin` — **do not hand-edit** the profile's `package.json` or `cordis.patch.yml`.

Uninstall:

```sh
dsh plugin --profile web remove @local/dsh-pomodoro
```

Uninstalling does not clear the statistics stored in the browser; delete `dsh-pomodoro/store/v2` there if you want them gone.

DSH compatibility range (`dsh.compatibility` in `package.json`): `>=0.1.6-alpha.1 <0.3.0`. `dshReleases` lists only versions that were actually accepted (`0.2.0-rc.2` = compatible today); everything else is unverified.

## Usage

After installing, the Pomodoro card appears in the bottom-right corner:

- Drag any empty part of the card to move it; buttons and inputs never start a drag
- Click `−` to collapse it to a pill, then `^` on the pill to expand it again
- Click the sliders icon to open the settings
- The card shows the current phase, the countdown ring, the round counter (for example `Round 1/4`) and today's / lifetime statistics

Data lives in browser `localStorage` under `dsh-pomodoro/store/v2`; the older `dsh-pomodoro/store/v1` key is migrated on first load. It stays on this machine and in this browser.

## Configuration

| Setting | Key | Default | Range |
| --- | --- | --- | --- |
| Focus length | `workMin` | 25 | 1–180 minutes |
| Short break | `shortMin` | 5 | 1–60 minutes |
| Long break | `longMin` | 15 | 1–120 minutes |
| Rounds before long break | `roundsPerLong` | 4 | 1–12 rounds |
| Auto-start breaks | `autoStartBreak` | on | on / off |
| Auto-start focus | `autoStartWork` | off | on / off |
| Round chime | `sound` | on | on / off |
| Ticking during focus | `tick` | off | on / off |
| Desktop notifications | `notify` | off | on / off |
| Clear statistics | —— | —— | button |
| Restore defaults | —— | —— | button |

Out-of-range numbers are clamped by `SETTING_LIMITS`; corrupted or incomplete stored data is normalised to defaults instead of throwing.

## Shortcuts

Click the card once so it has focus, then:

| Key | Action |
| --- | --- |
| `Space` | Start / pause |
| `R` | Reset round |
| `S` | Skip round |

Shortcuts only fire while the card has focus, so they never steal keystrokes from an input.

## Architecture

```
dsh-pomodoro/
├── src/
│   ├── client.ts        Client entry: registers the bundle, binds the module table, owns the shell.overlay seat and the error boundary
│   ├── index.ts         Host half: an empty apply that only gives the bundle a Loader row (no Service/Tool/Event)
│   ├── platform.ts      Module-table bridge: resolves React / react-dom at runtime and provides portalToBody
│   ├── i18n.ts          Chinese + English dictionaries and t()
│   ├── audio.ts         WebAudio-synthesised round chime and focus tick (no audio assets)
│   ├── notify.ts        A defensive wrapper around the browser Notification API
│   ├── core/            Pure core: the types contract, format, stats, timer, store
│   └── ui/              The card: overlay (rendering, dragging, round loop, shortcuts) + ring / controls / settings / switch / icons / styles / layer / h
├── lib/                 Build artifact (committed): client.js (one esbuild file) + index.js and core/*.js (tsc)
├── scripts/
│   ├── build.mjs        esbuild for the client bundle + tsc for the host and core
│   ├── smoke.mjs        jsdom smoke test (test:client)
│   └── check-build-fresh.mjs  Build-freshness gate
├── tests/               Pure-core unit tests (test:core)
├── locale/{zh,en}.json  Card and manifest strings
├── cordis.patch.yml     Inserts the Loader row dsh-pomodoro → @local/dsh-pomodoro
├── dsh-plugin.json      Community v0.15 manifest (no permissions)
├── dsh-plugin.naming.json  Naming declaration
├── icon.svg             Plugin icon
└── package.json
```

- **`src/core/**` is pure**: it never touches `window`, `document`, timers, audio or notifications, and every clock-dependent function takes `now` explicitly. That is what makes the whole timer behaviour unit-testable in plain Node and keeps the UI to rendering plus platform side effects.
- **The client bundle is one file**: esbuild folds `src/client.ts` into an import-free IIFE (`lib/client.js`) because the shell evaluates it in the browser, where relative imports cannot survive. `react` / `react-dom` come from the module table at runtime, never as static imports.
- **The host half is deliberately empty**: a Pomodoro round has nothing to do with the session log, so this plugin registers no Service, Tool or Event and writes no session data.

## Layering: why the fullscreen player cannot cover it

The `shell.overlay` layer states `z-index: 20` in the framework, and a positioned element cannot escape the stacking context it lives in; dsh-music-player's in-tree surfaces are the fullscreen player at `40`, its modal at `60` and its lightbox at `80`. A card left inside `shell.overlay` would always lose to them.

So the plugin keeps the `shell.overlay` registration (that is where its lifecycle and its seat come from) but portals the layer **into `document.body`, beside `#root`** — the host's own convention for a surface that covers the window (`packages/client/web/src/base.css`: "every covering overlay portals to document.body beside #root").

The layer states `z-index: 120`: **above** every in-tree player surface (`40` / `60` / `80`) and **below** the harness's own dialog/popover tier (`900–1100`). The whole layer is `pointer-events: none` and only the card opts back to `auto`, so it never swallows a click in the app underneath, and it is no longer subject to `.overlayLayer > * { pointer-events: auto }`. Theme tokens are inlined on `<body>`, so a layer beside it inherits them and light/dark stay consistent.

> Exception: if the player uses the browser's native fullscreen (`requestFullscreen`, leaving only that `<video>` on screen), no in-page element can show — that is a browser rule, not a layering problem.

## Development

```sh
pnpm install            # just install; the repo's pnpm-workspace.yaml already allows esbuild's install script
pnpm run typecheck      # tsc -p tsconfig.json (strict + noUncheckedIndexedAccess + noUnusedLocals/Parameters)
pnpm run build          # esbuild -> lib/client.js; tsc -> lib/index.js and lib/core/*.js
pnpm run test:core      # node --test tests/ (pure-core unit tests)
pnpm run test:client    # node scripts/smoke.mjs (jsdom smoke test)
pnpm run verify         # typecheck + test (test = build + test:core + test:client)
pnpm run check:fresh    # rebuild and fail when lib/ drifts from src/
```

This repository is its own workspace root: the `pnpm-workspace.yaml` at the top does exactly one thing — `allowBuilds: esbuild` allows esbuild's install script (pnpm 11 requires each project to decide about dependency build scripts, and an undecided script fails the install outright). CI uses `pnpm install --frozen-lockfile`.

Change `src/`, **never `lib/`**: `lib/` is the committed artifact (GitHub installs run no build step) and `pnpm run check:fresh` fails as soon as it drifts. CI runs the same gates; see `.github/workflows/ci.yml`.

## Verification

**Machine-verified**: `pnpm run typecheck` (types); `pnpm run test:core` (the pure core: durations, remaining time, progress, rotation, statistics, store normalisation and migration); `pnpm run test:client` (jsdom smoke: mount, start / pause, reset / skip, settings, drag, collapse, a real round completion including the long-break boundary, catch-up for time away, malformed-data defence, portal target and z-index / pointer-events layering assertions, unmount cleanup).

**Not machine-verified**: visuals and layout in a real browser (this repository has no screenshots and no box-model measurement), real audio output and how it sounds, and system-level desktop notification banners. Treat all of those as unverified.

## License

MIT © heshuren371
