# 番茄钟 · dsh-pomodoro

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）的悬浮番茄钟插件。

它在 `shell.overlay` 里占一个座位，却把卡片 portal 到 `#root` 旁边，所以任何面板、任何会话下都看得见，也不会被音乐播放器插件的全屏层盖住。源码用 TypeScript 编写，`lib/` 是构建产物并**提交进仓库**（GitHub 安装不跑构建步骤）；除开发期工具外没有任何运行时依赖。

## 功能

- **圆环倒计时**：SVG 进度环 + `MM:SS`，专注 / 短休息 / 长休息各用一套主题色
- **自动轮转**：专注 → 短休息；每完成 N 轮专注 → 长休息；两段各可设置是否自动开始
- **手动控制**：开始 / 暂停 / 重置本轮 / 跳过本轮
- **悬浮卡片**：可拖到任意位置、可收起成胶囊；位置与展开状态都会记住
- **断点续跑**：计时基于绝对时间戳，刷新页面后继续倒计时；页面关闭期间已经结束的那一轮，会在回来时补记 1 个番茄并进入下一段
- **多标签同步**：在另一个标签页改了设置或统计时本页会跟随（拖动过程中除外）
- **提示音与滴答**：WebAudio 现场合成，不依赖任何音频文件
- **桌面通知**：可选，首次开启时才向浏览器申请权限
- **统计**：今日番茄数与专注分钟数，以及累计值；可一键清除
- **中英界面**：走 Client locale 服务，跟随 Harness 界面语言
- **主题一致**：只用 `--dsw-alias-*` 主题令牌，浅色 / 深色自动适配；不 import 任何 Harness Client 包

## 安装

需要 Node.js `^22.19.0 || >=24.0.0`，并确保 `pnpm` 在 `PATH` 上。

**方式 A · 本地目录**（开发 / 本机安装）。在 DSH 会话里调用 Plugin Manager，目标写本包的绝对路径，profile 会链接该目录：

```
plugin_manager  action: install_bundle  target: /绝对路径/dsh-pomodoro
```

**方式 B · GitHub**：

```sh
dsh plugin --profile web add github:heshuren371/dsh-pomodoro
```

锁版本加 `#v1.0.0` 之类的后缀。装完重启 `dsh web`（本地链接安装则刷新页面即可）。安装位置、启停与卸载都由 Plugin Manager / `dsh plugin` 管理，**不要手改** profile 的 `package.json` 或 `cordis.patch.yml`。

卸载：

```sh
dsh plugin --profile web remove @local/dsh-pomodoro
```

卸载不会清理浏览器里的统计数据；需要的话在浏览器中删除 `dsh-pomodoro/store/v2`。

DSH 兼容范围（`package.json` 的 `dsh.compatibility`）：`>=0.1.6-alpha.1 <0.3.0`；`dshReleases` 只记录跑过验收的版本（目前 `0.2.0-rc.2` = compatible），其余版本一律未验证。

## 使用

安装后右下角出现番茄钟卡片：

- 拖动卡片空白处移动位置；在按钮、输入框上不会触发拖动
- 点 `−` 收起成胶囊，胶囊上的 `^` 再展开
- 点滑杆图标打开设置
- 卡片上显示当前阶段、倒计时圆环、轮次计数（如 `第 1/4 轮`）与今日 / 累计统计

数据存在浏览器 `localStorage` 的 `dsh-pomodoro/store/v2`，旧版键 `dsh-pomodoro/store/v1` 会在首次加载时迁移过来。数据只在本机、本浏览器。

## 设置

| 设置 | 键 | 默认 | 范围 |
| --- | --- | --- | --- |
| 专注时长 | `workMin` | 25 | 1–180 分钟 |
| 短休息 | `shortMin` | 5 | 1–60 分钟 |
| 长休息 | `longMin` | 15 | 1–120 分钟 |
| 长休息前轮数 | `roundsPerLong` | 4 | 1–12 轮 |
| 自动开始休息 | `autoStartBreak` | 开 | 开 / 关 |
| 自动开始专注 | `autoStartWork` | 关 | 开 / 关 |
| 结束提示音 | `sound` | 开 | 开 / 关 |
| 走时滴答声 | `tick` | 关 | 开 / 关 |
| 桌面通知 | `notify` | 关 | 开 / 关 |
| 清除统计 | —— | —— | 按钮 |
| 恢复默认设置 | —— | —— | 按钮 |

越界的数值按 `SETTING_LIMITS` 夹到范围内；损坏或缺字段的存储数据会被归一化成默认值，不会抛错。

## 快捷键

先点一下卡片让它获得焦点，然后：

| 键 | 动作 |
| --- | --- |
| `Space` | 开始 / 暂停 |
| `R` | 重置本轮 |
| `S` | 跳过本轮 |

快捷键只在卡片有焦点时生效，不会抢走输入框里的按键。

## 架构

```
dsh-pomodoro/
├── src/
│   ├── client.ts        Client 半边入口：注册 bundle、绑定模块表、挂 shell.overlay 座位与错误边界
│   ├── index.ts         Host 半边：空 apply，只给 bundle 占一行 Loader 座位（不注册 Service/Tool/Event）
│   ├── platform.ts      模块表桥：运行时取 React / react-dom，并提供 portalToBody
│   ├── i18n.ts          中英字典 + t()
│   ├── audio.ts         WebAudio 合成结束提示音与走时滴答（不含任何音频资源）
│   ├── notify.ts        浏览器 Notification API 的防御式包装
│   ├── core/            纯核心：types 契约 / format / stats / timer / store
│   └── ui/              卡片：overlay（渲染、拖动、轮次循环、快捷键）+ ring / controls / settings / switch / icons / styles / layer / h
├── lib/                 构建产物（提交进仓库）：client.js（esbuild 单文件）+ index.js、core/*.js（tsc）
├── scripts/
│   ├── build.mjs        esbuild 打 Client bundle + tsc 出 Host 与核心
│   ├── smoke.mjs        jsdom 冒烟测试（test:client）
│   └── check-build-fresh.mjs  产物新鲜度门禁
├── tests/               纯核心单元测试（test:core）
├── locale/{zh,en}.json  插件卡片与清单文案
├── cordis.patch.yml     插入 Loader 行 dsh-pomodoro → @local/dsh-pomodoro
├── dsh-plugin.json      Community v0.15 清单（不含任何权限）
├── dsh-plugin.naming.json  命名声明
├── icon.svg             插件图标
└── package.json
```

- **`src/core/**` 是纯的**：不碰 `window` / `document` / 定时器 / 音频 / 通知；任何依赖时钟的函数都显式接收 `now`。所以整套计时行为可以在纯 Node 里做单元测试，UI 只剩渲染与平台副作用。
- **Client bundle 是单文件**：`src/client.ts` 被 esbuild 折成一个无 import 的 IIFE（`lib/client.js`）——shell 在浏览器里 eval 它，相对 import 无法存活。`react` / `react-dom` 从模块表运行时取，不做静态 import。
- **Host 半边故意是空的**：番茄钟与 session log 无关，因此不注册任何 Service / Tool / Event，也不写 session 数据。

## 层级：为什么不会被全屏播放器遮挡

`shell.overlay` 这一层在框架里写着 `z-index: 20`，而定位元素逃不出自己所在层的层叠上下文；dsh-music-player 的全屏播放器在树内是 `40`、弹层 `60`、灯箱 `80`。只把卡片留在 `shell.overlay` 里，它一定会被这些层压住。

所以插件保留 `shell.overlay` 注册（那是生命周期与「座位」的来源），但把图层 **portal 到 `document.body` 里 `#root` 的旁边**——这正是宿主自己对「覆盖整窗的表面」的约定（`packages/client/web/src/base.css`：「every covering overlay portals to document.body beside #root」）。

图层 `z-index: 120`：**高于**播放器在树内的全部界面（`40` / `60` / `80`），**低于**宿主自己的对话框与气泡层（`900–1100`）。整层 `pointer-events: none`、只有卡片 `auto`，所以它不会吞掉底下的应用点击，也不再受 `.overlayLayer > * { pointer-events: auto }` 影响。主题令牌内联在 `<body>` 上，body 旁的图层照样继承，浅色 / 深色一致。

> 例外：如果播放器调用的是浏览器原生全屏（`requestFullscreen`，整屏只剩那个 `<video>`），任何页面内元素都无法显示——这是浏览器全屏的规则，不是层级问题。

## 开发

```sh
pnpm install            # 若 $HOME 下有 pnpm-workspace.yaml，改用 pnpm install --ignore-workspace
pnpm run typecheck      # tsc -p tsconfig.json（strict + noUncheckedIndexedAccess + noUnusedLocals/Parameters）
pnpm run build          # esbuild 出 lib/client.js；tsc 出 lib/index.js 与 lib/core/*.js
pnpm run test:core      # node --test tests/（纯核心单元测试）
pnpm run test:client    # node scripts/smoke.mjs（jsdom 冒烟测试）
pnpm run verify         # typecheck + test（test = build + test:core + test:client）
pnpm run check:fresh    # 重新构建，并在 lib/ 与 src/ 不一致时失败
```

改代码改 `src/`，**不要改 `lib/`**：`lib/` 是提交进仓库的产物（GitHub 安装不跑构建），`pnpm run check:fresh` 会在它漂移时失败。CI 跑同一组门禁，见 `.github/workflows/ci.yml`。

## 验证

**有机器验证**：`pnpm run typecheck`（类型）；`pnpm run test:core`（纯核心：时长 / 剩余 / 进度 / 轮转 / 统计 / 存储归一化与迁移）；`pnpm run test:client`（jsdom 冒烟：挂载、开始 / 暂停、重置 / 跳过、设置、拖动、收起、完成一轮与长休息边界、离线补记、脏数据防御、portal 落点与 z-index / pointer-events 层级断言、卸载清理）。

**没有机器验证**：真实浏览器里的视觉与布局（本仓库没有截图或盒模型测量能力）、真实音频输出与听感、系统级桌面通知横幅。这些一律按「未验证」对待。

## License

MIT © heshuren371
