# Independent verification · dsh-pomodoro v1.0.0

- **Task**: `task-5` — independent, adversarial verification of the strict-TypeScript rewrite before publication.
- **Verifier**: `verifier` (team member), not an author of any source file.
- **Rounds**: round 1 verified commit `2ab42e18900f1a3100eb8470758f7bd004117f9c`; **round 2 (this revision) re-verifies the D-1 fix on a dirty tree** (`src/core/timer.ts`, `src/ui/settings.ts`, `lib/client.js`, `lib/core/timer.js`, `scripts/smoke.mjs`, `tests/core.test.mjs` modified, not yet committed).
- **Date**: 2026-10-01 (Asia/Shanghai).
- **Rule followed**: every file except `docs/VERIFICATION.md` was read-only. No defect was fixed.
- **Sandbox caveats** (not repo defects):
  - `pnpm run <script>` is unusable here because `$HOME/pnpm-workspace.yaml` exists (`/Users/heshuren/pnpm-workspace.yaml`, 135 bytes, verified). The gate was reproduced with `npm run <script>` and with the underlying tools directly.
  - No browser/OS control is available in this session. Pixels, audio and native notification banners cannot be observed.
  - The Client inspect channel was **not attached** in either round (see §5), so the live occupant of `shell.overlay` could **not** be confirmed from the running page.

## Verdict at a glance (round 2)

| # | Area | Result |
| --- | --- | --- |
| 1 | Full gate reproduced | **PASS 4/5**, `check:fresh` = **pending commit** (fails only because the fix is not committed; see §1) |
| 2 | Artifact contract (rebuilt bundle) | **PASS** |
| 3 | Layering regression (portal + z-index 120 + pointer-events) | **PASS — the fix survived** |
| 4 | Behaviour (111 smoke checks + own adversarial matrices) | **PASS** |
| 5 | Live mount | **PARTIAL** — Host Loader row and served file confirmed; browser occupant **NOT VERIFIED** (Client channel timed out again, 4 attempts this round) |
| 6 | Docs truthfulness | **PASS** — every sampled README claim substantiated; one previously false code comment is now accurate |
| — | **D-1 (round 1 finding)** | **FIXED AND RE-VERIFIED** at core and UI level (§4c, §8) |

---

## 1. Full gate reproduced

Run in `/Users/heshuren/Desktop/DeepSeek/dsh-pomodoro`, `node v24.18.0`.

| Check | Method (exact command) | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `npm run typecheck` (= `tsc -p tsconfig.json`) | **PASS** | exit 0, no diagnostics |
| build | `npm run build` (= `node scripts/build.mjs`) | **PASS** | `build: lib/client.js (bundled) + lib/index.js, lib/core/*.js (tsc)` |
| unit tests | `npm run test:core` (= `node --test tests/`) | **PASS** | `ℹ tests 60 / ℹ pass 60 / ℹ fail 0` (was 59; the new D-1 tests are included) |
| client smoke | `npm run test:client` (= `node scripts/smoke.mjs`) | **PASS** | **111** `ok`, 0 `FAIL`, final line `PASS: all checks passed` (was 98; new section `[4b] number input drafts`) |
| freshness | `npm run check:fresh` | **PENDING COMMIT** | exit 1, stderr: `check:fresh — lib/ is not in sync with src/` / `M lib/client.js` / `M lib/core/timer.js` — expected, because HEAD still carries the pre-fix `lib/`. **Not a product defect.** |

Proof that `check:fresh` will pass once the Lead commits:

```
$ npm run build && diff -r /tmp/dsh-verify/lib-prefix2 lib && echo IDENTICAL
IDENTICAL                       # the working lib/ equals a fresh build, byte for byte
$ git status --porcelain -- lib
 M lib/client.js                # differs from HEAD only because the fix is uncommitted
 M lib/core/timer.js
```

`npm run build` leaves exactly those two files modified; the other four `lib/core/*.js` and `lib/index.js` rebuild byte-identically to HEAD. Only two source files changed in this round (`git diff --name-only -- src` → `src/core/timer.ts`, `src/ui/settings.ts`; `src/core/types.ts`, `src/client.ts`, `src/platform.ts` untouched, as the Lead stated).

## 2. Artifact contract (re-checked on the REBUILT `lib/client.js`)

| Check | Method | Result | Evidence |
| --- | --- | --- | --- |
| no `import`/`export` statements | node line scan `/^\s*(import|export)[\s{('"]/` | **PASS** | both `[]` |
| single classic-script IIFE | head/tail + jsdom eval | **PASS** | `"use strict";` then `(() => {`, ends `})();`; eval'd during the 111-check smoke run |
| React runtime not bundled | grep `react.production`, `react.development`, `__SECRET_INTERNALS`, `react.element`, `Invalid hook call` | **PASS** | all `0`; bundle now 55,947 bytes / 1,485 lines (was 55,655 / 1,462 — the `NumberField` grew it by ~0.3 kB) |
| React only through the module table | node scan + `src/platform.ts` | **PASS** | `require(` count `0`; exactly one `require_("react")`; `react-dom` appears once, as `optionalPlatformModule("react-dom")?.createPortal` |
| `lib/index.js` ESM, no side effects | `import * as m from "./lib/index.js"` | **PASS** | namespace `['apply']`, `typeof apply === 'function'`; sole statement `export function apply() { }` |
| `main` / `exports` resolve | `createRequire(<profile>/package.json).resolve(...)` | **PASS** | `@local/dsh-pomodoro` → `lib/index.js`; `/client` → `lib/client.js`; `/package.json` → `package.json` |
| `files` covers every runtime artifact, no `.ts` leak | `npm pack --dry-run` | **PASS** | 16 files, unchanged list (`lib/client.js` 56.4 kB, `lib/core/*.js` ×5, `lib/index.js`, `cordis.patch.yml`, `icon.svg`, `locale/{zh,en}.json`, `dsh-plugin.json`, both READMEs, `LICENSE`, `package.json`); no `*.ts` |

## 3. Layering regression — did the fullscreen-player fix survive?

Grepped the **rebuilt** bundle:

| Check | Evidence (bundle line, round 2) | Result |
| --- | --- | --- |
| `z-index:120` on the layer | `883: ".dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}"`; identical at `1436` (crash card) | **PASS** |
| `pointer-events:none` on the layer | same two lines | **PASS** |
| `pointer-events:auto` on the card | `888: "pointer-events:auto;user-select:none;…"` inside `.dsp-card{…}`; `1440` for the crash card | **PASS** |
| portal call | `28–34` helper (`…?.createPortal ?? null`, `portalFn(children, document.body)`); call sites `968` and `1431` | **PASS** |
| no competing z-index | only two `z-index:` tokens in the whole bundle, both `120` | **PASS** |

**Plain statement: the fix that keeps the timer above the music player's fullscreen player survived the rewrite and the D-1 change.** The runtime consequence is re-exercised in jsdom on the rebuilt bundle: `.dsp-layer` is a direct child of `<body>`, `#root` does not contain the card, layer `pointerEvents === 'none'`, card `'auto'`.

## 4. Behaviour

### 4a. Smoke assertions reproduced independently (re-run on the rebuilt bundle)

The full suite was run (`npm run test:client`, **111/111**, 0 React console errors). The same five assertions as round 1 were re-driven from a scratch harness outside the repo (`/tmp/dsh-verify/adv-ui.mjs`), all still passing:

| Reproduced assertion | Observed (round 2) |
| --- | --- |
| fresh mount is a paused 25:00 focus round, round 1/4 | `25:00` / `专注` / `第 1/4 轮` |
| layer CSS byte-exact, portal target `document.body` | `.dsp-layer{position:fixed;inset:0;pointer-events:none;z-index:120}` present; `#root` does not contain the card |
| start → clock advances → pause freezes and persists `running:false` | `24:59` after 1.2 s; frozen across 0.6 s; stored `running === false` |
| skip leaves focus, consumes a cycle round, credits nothing | `短休息`, stats still `今日 0 个` |
| expired running **long-break** snapshot settles to focus, no credit, full length | `专注`, `今日 0 个`, `25:00` |

### 4b. Adversarial matrices (scratch files outside the repo)

The round-1 core matrix (`/tmp/dsh-verify/adv.mjs`, cases A–K) was re-run against the fixed `lib/core/*.js`: identical results — `roundsPerLong=1`, out-of-range `workInCycle`, expired running long-break snapshot, storage whose `setItem` throws (no double credit), tampered far-future `endsAt`, frozen-state purity, double unmount. Two rows changed as intended by the fix: `withSetting(workMin, null)` and `withSetting(workMin, false)` now return the **same state reference** instead of clamping to 1.

### 4c. D-1 re-verification — the fix

**(i) The Lead's command:**

```sh
$ node --input-type=module -e 'import {withSetting,initialState} from "./lib/core/timer.js"; const s=initialState(0); const r=withSetting(s,"workMin",""); console.log(r.settings.workMin, r===s)'
25 true
```

**(ii) My adversarial matrix** (`/tmp/dsh-verify/adv2-core.mjs`), 21 values that must be by-reference no-ops:

| Inputs | Result |
| --- | --- |
| `''`, `'   '`, `'\t\n'` | SAME REF |
| `null`, `undefined` | SAME REF |
| `true`, `false` | SAME REF |
| `0n` (bigint), `Symbol('x')` | SAME REF |
| `[]`, `{}`, `() => 30` | SAME REF |
| `NaN`, `Infinity`, `-Infinity` | SAME REF |
| `'Infinity'`, `'NaN'`, `'1e309'`, `'30px'`, `'0x'`, `'1_000'` | SAME REF |

`=> unexpectedly moved: 0`. Values that legitimately must move still do: `'30'`→30, `' 30 '`→30, `30.4`→30, `'-5'`→1 (clamp low), `'999'`→180 (clamp high); the per-key rule holds for `roundsPerLong` (`'30'`→12, `'-3'`→1); switches still accept only literal `true`. A frozen state survives the whole matrix without throwing, and unchanged settings still bail out by reference.

**(iii) End-to-end UI, independently driven in jsdom** — a scratch copy of the repo smoke test plus my own section `[15]` (`/tmp/dsh-verify/smoke-copy2.mjs`; nothing in the repo was modified). All 14 checks pass:

```
[15] adversarial re-check of the number-input draft
  ok   D-1 start state: field 25 / clock 25:00
  ok   D-1 FIXED: clearing leaves the field empty
  ok   D-1 FIXED: clearing keeps 25:00
  ok   D-1 FIXED: clearing keeps stored workMin=25
  ok   blur of an empty draft restores 25
  ok   blur did not change storage
  ok   typing 999 clamps the round to 180 and shows 180
  ok   typing 0 clamps to the 1 minute minimum
  ok   typing 40 commits
  ok   emptied again, still 40 committed
  ok   an external change drops the stale empty draft (shows 25)
  ok   restore defaults kept a round length of 25:00
  ok   a non-numeric draft never moves the preference
  ok   blur after a non-numeric draft shows the committed value
```

The round-1 failure lines (`empty input … → 1` / `01:00`) are gone.

## 5. Live mount

| Sub-check | Method | Result | Evidence |
| --- | --- | --- | --- |
| Loader row exists in the running Host | `cordis_inspect_query` host `Config.listConfigs` name `@local/dsh-pomodoro` | **PASS** | `{"id":"include:dsh-pomodoro","patchId":"dsh-pomodoro","name":"@local/dsh-pomodoro","status":"absent"}` — re-checked in round 2; same shape as the live `@local/dsh-music-player` row (`absent` = no Config schema, not "not loaded") |
| Profile bundles it | read `~/.dsh/profiles/web/package.json` | **PASS** | dependency `"@local/dsh-pomodoro": "link:/Users/heshuren/Desktop/DeepSeek/dsh-pomodoro"` + last entry of `dsh.profile.bundles` |
| Bundle registers `shell.overlay` / `dsh-pomodoro` / order 20 | execute the rebuilt bundle with a stub `window.__ModuleLoader__` + stub `ctx` (`/tmp/dsh-verify/order-probe.mjs`) | **PASS (round 2)** | `ctx.slots.inject` owner `["shell.overlay"]`; options `{"name":"shell.overlay","id":"dsh-pomodoro","order":20,"locale":"dsh-pomodoro"}`; `exports.inject = ["slots","locale"]` |
| Served file is the freshly built one | profile symlink + inode + hash | **PASS (artifact path)** | `readlink` → the repo; `stat -f %i` gives the **same inode 50910591** for `lib/client.js` and `~/.dsh/profiles/web/node_modules/@local/dsh-pomodoro/lib/client.js`; that file equals a fresh build (`diff -r` IDENTICAL), sha256 `ba5b5939d600e048f9e2488d1bef318ff002c6b1acccf9141891ca3842bb4855` |
| Live occupant active in the browser | `cordis_inspect_query` client `Slots.listSubTree` `{"root":"shell.overlay"}` | **NOT VERIFIED — channel down** | **4 further attempts in round 2 (10 total across both rounds), each returned** `Slots.listSubTree: Client inspect query … timed out after 10000ms. Open or reconnect the Harness page, then retry.` Cross-check: client `Theme.listTokens` also timed out in the same window, so **no page is attached to the Client inspect channel** — not a pomodoro-specific failure. The Lead reports having seen `dsh-pomodoro` active at order 20 twice during integration; I could not reproduce that observation from this session |
| Temporary probe change | not attempted | **N/A** | With no attached page there is nothing to observe, and every file except this report is read-only for me |

**What this means:** Host wiring, profile link, registration payload (`shell.overlay` / `dsh-pomodoro` / order 20) and the identity of the served file are all confirmed; the only unconfirmed link is that the page currently open in the browser has executed that bundle. Re-check `Slots.listSubTree` on `shell.overlay` with a live page before publishing.

## 6. Docs truthfulness

Sampled `README.md` (and the same spans in `README.en.md`) against the code and the harness source.

| Claim | Verified against | Result |
| --- | --- | --- |
| defaults `25 / 5 / 15 / 4`, ranges `1–180 / 1–60 / 1–120 / 1–12` | `src/core/types.ts` `DEFAULT_SETTINGS` + `SETTING_LIMITS` | **PASS** |
| switch defaults (`autoStartBreak` 开, `autoStartWork` 关, `sound` 开, `tick` 关, `notify` 关) | same | **PASS** |
| storage key `dsh-pomodoro/store/v2`, legacy `v1` migrated on first load | `src/core/types.ts:136,139`, `src/core/store.ts:238-263` | **PASS** |
| "越界的数值按 `SETTING_LIMITS` 夹到范围内；损坏数据归一化、不抛错" | `withSetting`/`normalizeSettings`/`normalizeStats`; round-2 matrix: `'-5'`→1, `'999'`→180, no throw on 21 hostile values | **PASS** |
| `lib/` committed, `lib/client.js` a single import-free IIFE, React from the module table | §2 | **PASS** |
| no runtime dependencies / no Harness Client package imported | `package.json` has no `dependencies`; `src/**` imports are relative + `import type … from 'react'` | **PASS** |
| `shell.overlay` layer `z-index: 20`, `.overlayLayer > * { pointer-events: auto }` | harness `packages/client/ui-layout/src/client/AppFrame.module.css:280,284` | **PASS** |
| music player in-tree surfaces `40` / `60` / `80` | `dsh-music-player/src/client.ts:719 / 859 / 695` | **PASS** |
| layer `120` below the harness dialog/popover tier `900–1100` | harness `ui-primitives` (Modal 1000, Toast/Tooltip/Menu 1100), `ui-settings-account` 900, `ui-chat` 1100 | **PASS** |
| "every covering overlay portals to document.body beside #root" | harness `packages/client/web/src/base.css:52-53` | **PASS** |
| CI runs the same gates | `.github/workflows/ci.yml` mirrors `package.json` | **PASS** |
| Node engines `^22.19.0 || >=24.0.0` | `package.json` `engines` | **PASS** |
| `pnpm install --ignore-workspace` when `$HOME` has a workspace file | `/Users/heshuren/pnpm-workspace.yaml` exists | **PASS** |
| install via `dsh plugin --profile web add github:heshuren371/dsh-pomodoro` | CLI verb exists (`apps/cli/src/args.ts:187`); command not executed, repo unpublished | **NOT EXERCISED** |
| architecture file map | accurate for the files listed; does not mention `docs/VERIFICATION.md` | **CAVEAT F-1** |

**Claims I could not substantiate: none that are false.** The round-1 mismatch between the `src/ui/settings.ts` header comment and the behaviour is gone: the file's comment (lines 5-9) and the `NumberField` doc now describe exactly what I measured in §4c(iii).

## 7. Deep read: `src/core/timer.ts` / `src/core/store.ts`

| Question | Finding |
| --- | --- |
| `preferenceNumber` (new, `timer.ts:52-62`) | Only a real finite `number`, or a non-empty string that trims to a finite number, is a value; everything else returns `null` and `withSetting` returns the input reference. Verified against 21 hostile inputs (§4c). |
| `withSetting` beyond that | Unchanged: clamps into `SETTING_LIMITS`, keeps the current reference when the clamped value equals it, follows a new length while paused at full length, otherwise only shrinks. The refactor did not disturb the `remainingMs` logic (round-2 matrix + 111 smoke checks). |
| `NumberField` draft (`settings.ts:98-124`) | Local `draft` renders while present; commits only a non-empty finite parse; blur clears the draft; `useEffect([props.value])` clears a stale draft on any external change. All four behaviours independently reproduced in §4c(iii). |
| Referential stability | Still holds: a skip keeps the `stats` reference, unchanged settings/rounds return the input, and transitions never mutate a frozen state. |
| `roundsPerLong=1`, out-of-range `workInCycle`, expired long-break snapshot | Unchanged from round 1 and still safe; `durationOf` still floors at 1 minute, so rounds never chain instantly. |
| double-credit on reload | **Does not reproduce** (unchanged): `settleIfExpired` is idempotent, `store.load` persists the settled snapshot (`store.ts:247`), and a failing/false storage under-counts rather than double-counts. |

## 8. Defects and observations

### D-1 · round-1 MINOR DEFECT — **FIXED AND RE-VERIFIED** (round 2)

- **Was**: `withSetting` documented that a non-value keeps the current preference, but `Number('') === 0`, `Number(null) === 0` and `Number(false) === 0` are finite, so they were clamped to the lower bound. Clearing 专注时长 produced a 1-minute round and re-rendered the field as `1`.
- **Owning files then**: `src/core/timer.ts` (`withSetting`/`toFinite`) and `src/ui/settings.ts` (forwarded the raw string; its comment claimed an empty field was fine).
- **Fix verified**: `preferenceNumber` replaces the coercing `toFinite` (`src/core/timer.ts:52-62`), and the input became a draft-holding `NumberField` (`src/ui/settings.ts:98-124`).
- **Reproduction run (core, exact)**:

  ```sh
  $ node --input-type=module -e 'import {withSetting,initialState} from "./lib/core/timer.js"; const s=initialState(0); const r=withSetting(s,"workMin",""); console.log(r.settings.workMin, r===s)'
  25 true
  ```

- **Reproduction run (UI, scratch harness)**: `/tmp/dsh-verify/smoke-copy2.mjs` §[15] — 14/14 pass; clearing the field leaves it empty, keeps `25:00` and keeps stored `workMin === 25`; blur restores `25`; `999`→`180`, `0`→`1`; an external restore-defaults drops a stale draft.
- **Regression matrix**: `/tmp/dsh-verify/adv2-core.mjs` — 21 "must not move" inputs all return the same state reference, 0 moved.
- **Status**: no remaining defect. The tree must be committed for `check:fresh` to go green (§1).

### O-1 · Observation — the round counter reads `第 0/N 轮` during a long break

`advance` resets `workInCycle` to 0 when the long break starts, and `currentRoundNumber` returns `completed` on a break, so after finishing 4/4 focus rounds the long break shows "0/4". Unchanged and intentional (the suite asserts it); a UX nit for the author.

### O-2 · Observation — a tampered running deadline is not bounded by the phase length

`rehydrate` clamps a *paused* `remainingMs` to `durationOf(phase)` but takes a *running* `endsAt` as-is, so a hand-edited snapshot with `endsAt = now + 250 min` yields a 250-minute round. Only reachable by tampering with `localStorage`; the code documents the deadline as authoritative. No defect claimed.

### O-3 · Note — numeric strings go through `Number()`

The new rule accepts any non-empty string that `Number()` parses finite, so `'0x1f'` → 31 and `'1e3'` → 1000. Not reachable by typing into `<input type="number">` (the browser sanitises such text to `''`), and it is consistent with "a numeric string is a value". Recorded, not a defect.

### Follow-up F-1

README's architecture tree still does not mention the `docs/` directory added by this deliverable. Optional one-line README update owned by `release-docs`.

## 9. What remains unverified (explicit)

1. **Visual rendering / layout** — no browser or screenshot capability; jsdom asserts CSS text and class names only.
2. **Native OS fullscreen** (`requestFullscreen`) — cannot be exercised; README already documents that a native fullscreen `<video>` covers any in-page element.
3. **Real audio output** — WebAudio chime/tick only checked in code.
4. **Desktop notification banners** — jsdom has no Notification API; only the "unsupported" fallback path is asserted.
5. **The live browser occupant of `shell.overlay`** — the Client inspect channel timed out for every provider in both rounds (§5); must be re-checked with an attached page.
6. **Whether the currently open tab executed the freshly built bundle** — only the served artifact path (same inode as the profile link + byte-identical to a fresh build) is proven.
7. **`dsh plugin --profile web add github:heshuren371/dsh-pomodoro`** — not executed; the GitHub repository is not published yet.
8. **`pnpm run …`** — unusable in this sandbox; `npm run …` and direct binaries were used.
9. **`check:fresh` green** — pending the Lead committing the new `lib/` (§1); the rebuild was verified deterministic and identical to a fresh build.

## 10. Re-run recipe

```sh
cd /Users/heshuren/Desktop/DeepSeek/dsh-pomodoro

# 1. gate (npm because pnpm is broken in this sandbox)
npm run typecheck && npm run build && npm run test:core && npm run test:client
npm run check:fresh          # exits 1 until the new lib/ is committed; the rebuild is byte-identical

# 2. artifact contract
npm pack --dry-run
node --input-type=module -e 'import * as m from "./lib/index.js"; console.log(Object.keys(m))'

# 3. layering
grep -n 'z-index:120\|pointer-events:none\|pointer-events:auto' lib/client.js
grep -n 'createPortal\|portalToBody' lib/client.js

# 4. independent behaviour + adversarial cases (scratch, outside the repo)
node /tmp/dsh-verify/adv2-core.mjs   # D-1 matrix: 21 by-reference no-ops + clamp cases
node /tmp/dsh-verify/adv.mjs         # round-1 core edge cases A–K, re-run post-fix
node /tmp/dsh-verify/adv-ui.mjs      # 5 reproduced smoke assertions + double unmount
node /tmp/dsh-verify/smoke-copy2.mjs # repo smoke + section [15] D-1 UI re-verification
node /tmp/dsh-verify/order-probe.mjs # registration payload: shell.overlay / dsh-pomodoro / order 20

# 5. live mount
#   cordis_inspect_query host Config.listConfigs name=@local/dsh-pomodoro
#   cordis_inspect_query client Slots.listSubTree {"root":"shell.overlay"}   # needs an attached page
```

Scratch files used above live only in `/tmp/dsh-verify/` and were **not** added to the repository.
