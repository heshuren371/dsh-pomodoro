# Repository instructions · dsh-pomodoro

面向第一次接手本仓库的人与 agent。改代码前先读完本文件。

## 这是什么

DSH 的悬浮番茄钟插件，v1.0.0，MIT，仓库 https://github.com/heshuren371/dsh-pomodoro。
唯一真源是 `src/`；`lib/` 是构建产物，**提交进仓库**（GitHub 安装不跑构建步骤）。

## 仓库地图

| 路径 | 职责 |
| --- | --- |
| `src/core/**` | 纯核心：types 契约 / format / stats / timer / store。不碰 `window`、`document`、定时器、音频、通知；依赖时钟的函数显式接收 `now` |
| `src/ui/**` | 悬浮卡片：`overlay.ts`（渲染、拖动、轮次循环、快捷键）与 `ring` / `controls` / `settings` / `switch` / `icons` / `styles` / `layer` / `h` |
| `src/platform.ts` | 模块表桥：运行时取 `react` / `react-dom`，提供 `portalToBody` |
| `src/i18n.ts` | 中英字典（键集以中文为准）+ `t()` |
| `src/audio.ts` / `src/notify.ts` | WebAudio 提示音与滴答；浏览器 Notification 的防御式包装 |
| `src/client.ts` | Client 入口：注册 bundle、挂 `shell.overlay` 座位、错误边界 |
| `src/index.ts` | Host 半边：空 `apply`，只为 bundle 占一行 Loader 座位 |
| `lib/` | 产物：`client.js`（esbuild 单文件）+ `index.js`、`core/*.js`（tsc） |
| `scripts/build.mjs` | esbuild 打 Client bundle + tsc 出 Host 与核心 |
| `scripts/smoke.mjs` | jsdom 冒烟测试（`test:client`） |
| `tests/` | 纯核心单元测试（`test:core`） |
| `dsh-plugin.json` / `dsh-plugin.naming.json` | Community v0.15 清单 / 命名声明 |
| `cordis.patch.yml` | 插入 Loader 行 `dsh-pomodoro` → `@local/dsh-pomodoro` |

## 命令

```sh
pnpm install --ignore-workspace   # 若 $HOME 下有 pnpm-workspace.yaml，必须带这个 flag，否则 pnpm 拒绝安装
pnpm run typecheck
pnpm run build
pnpm run test:core
pnpm run test:client
pnpm run verify        # typecheck + build + test:core + test:client
pnpm run check:fresh   # 重新构建，并断言 lib/ 与 src/ 一致
```

## 不变量

- **`lib/` 是产物，提交进仓库，永不手改。** 改完 `src/` 必须 `pnpm run build` 并提交 `lib/`；CI 用 `git diff --exit-code -- lib` 加未跟踪文件检查抓住漂移。
- **`src/core/**` 保持纯**：不引用 DOM / 定时器 / 音频 / 通知，`now` 显式传入。UI 只做渲染与平台副作用。
- **Client bundle 必须无 import**：`src/client.ts` 会被 esbuild 折成单文件 IIFE 并在浏览器里 eval，相对 import 存活不了；`react` / `react-dom` 只能经 `src/platform.ts` 从模块表取。
- **类型是门禁**：`tsconfig.json` 开着 `strict`、`noUncheckedIndexedAccess`、`noUnusedLocals`、`noUnusedParameters`。不要为了让门禁变绿放宽这些开关，清掉死代码。
- **持久化数据不可信**：`localStorage` 的 `dsh-pomodoro/store/v2` 可能被改坏，一律归一化到默认值、不抛错；旧键 `store/v1` 在首次加载时迁移。
- **UI 文案必须同时补 `zh` 与 `en`**（`src/i18n.ts`），键集以中文为准。

## 不要动

- `lib/`（产物）、`node_modules/`、`pnpm-lock.yaml`（除非确实改了依赖）
- 不要为了让 CI 变绿删断言或放宽 `tsconfig`；不要手改 profile 的 `package.json` 或 `cordis.patch.yml`
- 不要给 `dsh-plugin.json` 添加本插件用不到的权限：它不读写文件、不联网、不起进程，`permissions` 保持空数组
