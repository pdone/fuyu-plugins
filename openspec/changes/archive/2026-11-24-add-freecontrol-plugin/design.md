# Design

## Context

- 浮屿 v3 插件由 Node 宿主与 React 窗口组成：`src/host.ts` 负责文件、网络与定时器，`src/island.tsx`、`src/settings.tsx` 只通过 `ctx.host.call` / `ctx.host.on` 与宿主通信；清单在 `package.json` 的 `fuyu` 字段声明入口、插槽与联网域名。参见 `proposal.md`。
- FreeControl 已提供本机接口契约：`fuyu-local.json` 发现文件（`version`、`service`、`baseUrl`、`token`、`issuedAt`），以及 `GET /v1/state`、`POST /v1/devices/{deviceId}/connect|disconnect`。接口要求回环 Host 与 Bearer 凭据，状态值只有 `connected` / `idle` / `offline` / `unknown`。插件不修改 FreeControl。
- `freecontrol/` 已有可运行实现。本次以规格为准核对实现，并完成「名称 FreeControl + 官方品牌图标」的身份调整。
- 约束：窗口没有定时器，宿主必须使用 `ctx.setInterval`；禁止 `addEventListener`、`<style>` 与全局样式注入；清单 `fuyu.network` 只接受主机名，声明 `localhost` 时浮屿同时放行 `127.0.0.1` 的 HTTP 请求（`ControlledHttp.isAllowedTarget`）。

## Goals / Non-Goals

**Goals:**

- 所有发现、轮询与 HTTP 调用集中在宿主，令牌不进入窗口与推送载荷。
- 自动发现、重启重连与短暂文件缺失的稳定处理；连接/断开后可立即看到新状态。
- 插件身份与品牌一致：显示名 FreeControl，图标为 FreeControl 官方品牌图标。
- 紧凑的浮屿页面、收起条与设置区块，深浅色与中英文可用。

**Non-Goals:**

- 不做配对流程、远程/局域网访问、MCP/stdio。
- 不做设备增删改、scrcpy 参数编辑、日志查看或启动 scrcpy/adb。
- 不修改 FreeControl 主程序，不引入新的持久化配置文件。
- 不处理市场发布凭据与签名之外的发布流程。

## Decisions

### D1 宿主与窗口的职责划分

宿主独占发现文件读取、状态轮询和 HTTP 请求；窗口只渲染快照并发起方法调用。方法为 `snapshot`、`refresh`、`connect`、`disconnect`，宿主通过 `ctx.clients.handle` 应答，通过 `state` 主题推送快照。

- 备选：在窗口内轮询——窗口没有定时器，且会把凭据带到渲染层，否决。
- 备选：每次请求都新建连接并重试——会增加操作延迟与重复副作用风险，改为单次请求加超时。

### D2 发现与重连策略

- 按平台从 `%APPDATA%/FreeControl2`、`~/Library/Application Support/FreeControl2`、`$XDG_DATA_HOME/FreeControl2`（缺省 `~/.local/share/FreeControl2`）读取 `fuyu-local.json`。
- 校验：普通文件、非符号链接、≤16 KiB、`version === 1`、`service === "freecontrol-fuyu"`、`baseUrl` 为无凭据无路径的 `http://localhost` 或 `http://127.0.0.1`、令牌长度 8–512、`issuedAt` 为有限数字；任一不符即忽略该记录。
- 每 2 秒重新读取发现文件，因此 FreeControl 重启换令牌后无需用户操作即可重连；地址或令牌变化时先切到「正在连接」再读取状态。
- 发现文件缺失时保留当前连接 1.5 秒宽限，避免 Windows 原子替换的瞬时失败导致设备列表闪清；宽限后清空并回到「未发现」。
- 备选：监听文件系统事件——跨平台行为与插件生命周期管理更复杂，且需自行清理监听器，否决。
- 备选：把发现信息持久化到插件数据目录——令牌应只存在于内存，否决。

### D3 请求、状态归一与错误映射

- 请求使用宿主 `fetch`，携带 `Authorization: Bearer <token>`；状态读取超时 5 秒，连接/断开超时 30 秒；连接/断开请求不发送请求体。
- 状态读取把设备状态归一为 `connected` / `idle` / `offline` / `unknown`，并计算 `onlineCount = idle + connected`、`connectedCount`、`statusSequence`、`lastCheckedAt`。
- 错误映射：401 → 未授权；404 → 设备不存在；409 → 操作冲突或设备不可用；422 → 操作失败；429/5xx → 服务暂不可用；其它 → 操作失败。未知响应不得当作成功。
- 推送前用快照 JSON 比较，内容相同不重复推送；错误字段随快照更新，界面无须自行推断。

### D4 界面与交互模型

- `island.page/v1`：标题、统计、刷新按钮、错误横幅与设备列表；设备行显示状态点、别名、USB/Wi-Fi 标识、连接标识与操作按钮。
- 连接按钮可用条件：已连接（显示断开）或在线；离线/未知 USB 禁用；离线无线允许尝试。操作期间仅该设备按钮禁用并显示进行中，完成后再取一次快照。
- 未发现与凭据失效使用独立空态与「重新检测」按钮；无设备时提示先去 FreeControl 添加设备。
- `island.collapsed/v1` 显示「已连接/总数」，点击打开页面；不使用 `width: 100%` 或 `flex: 1`。
- `settings.section/v1` 显示状态、最近更新时间、自动连接说明、重新检测与错误；`ctx.settings.setup` 在未连接时提示开启浮屿设备控制。
- 颜色与圆角全部使用 `--fuyu-plugin-*` 变量，类名统一 `fuyu-freecontrol` 前缀，文案集中在中英双语文本模块。

### D5 身份与品牌图标

- 显示名在清单、页面标题、收起条与文档中统一为 FreeControl；描述中英文对应，顶层 `description` 与英文一致。
- 插件图标改为 FreeControl 官方品牌图标：从 `F:\github\FreeControl\assets\icons\desktop\512x512.png` 原样复制为 `freecontrol/assets/icon.png`（512×512、RGBA、原生尺寸），清单 `fuyu.icon` 指向该文件，删除原 `assets/icon.svg` 占位字形。
- 选择理由：桌面成品是 FreeControl 对外的正式图标，保留方底、渐变与品牌色，不做改色或重绘；浮屿清单允许 `.png` 图标，市场预览也能直接显示。备选 `logo/logo-transparent.png` 只是设计源、没有方底，不符合插件图标惯例，否决；用 CLI 重新生成 Lucide 字形会丢掉品牌身份，否决。
- 浮屿内的页面/收起条图标使用无底色的单色剪影：从品牌资产包 `assets/icons/tray/tray-64-white.png` 取 64px 剪影作为 alpha 蒙版（`assets/brand-mask.png`），槽位组件以 `background-color: var(--fuyu-plugin-text, #fff)` 着色，`.island-light` 祖先下改为黑色。深色主题为白、浅色主题为黑，不显示方底、自带明暗或品牌色。蒙版在构建时以 data URL 内联，island 包只增加约 1.2 KB；`settings.tsx` 不引入该图标。
- `settings` 插件列表与市场继续读取清单的 `assets/icon.png`（产品方底图标），与页面剪影分开；原先「槽位保留电话线稿」与「槽位直接用产品方底图标」两版取舍都已按用户复核意见撤回。
- 若后续生成市场封面，封面取色需显式传 `--color #FCCD01`；现有截图使用 `--no-cover`，不受影响。

### D6 凭据与生命周期

- 只访问发现文件中的回环地址；令牌只保存在宿主内存，不写入文件、不放入推送载荷、不进入文案或日志。
- 定时器使用 `ctx.setInterval`，插件停用时由浮屿清理；窗口通过 `ctx.host.on` 订阅并在卸载时退订；样式通过 `import "./styles.css"` 注入。
- 插件不读写 `ctx.dataDir`，不执行外部程序，不读取发现文件以外的 FreeControl 数据。

### D7 验证策略

- 宿主测试使用本地 HTTP 假服务覆盖：自动发现、设备列表与统计、连接/断开、令牌轮换后重连、令牌不进入推送载荷、发现文件删除后回到未发现、无效记录被忽略。
- 使用 `fuyu-plugin shots` 从真实组件生成页面与收起条截图；`npm run typecheck`、`npm run lint`、`npm test`、`npm run build`、`npm run check` 全绿。
- 运行时验收由用户在运行中的浮屿完成：插件出现在设备页与设置页、开启/关闭浮屿设备控制后的发现与失效、连接与断开的实际投屏效果。

## Risks / Trade-offs

- [服务端状态语义变化] → 插件只接受四类状态并把未知值归一为 `unknown`；状态序列与最近检查时间随快照更新，避免界面误报。
- [发现文件替换瞬时失败] → 1.5 秒宽限加 2 秒轮询重试，不让一次读取失败清空列表。
- [令牌泄露] → 令牌只在宿主内存使用；推送与文案不含令牌，测试断言发布载荷不出现令牌。
- [PNG 图标在超大尺寸下不如矢量锐利] → 使用 512 原生成品，满足插件界面与市场卡片；如未来需要更大尺寸，应由 FreeControl 品牌资产包提供同源成品。
- [64px 剪影蒙版在高分屏放大] → 页面入口 15–22px 时 2× DPI 显示约 44px，仍在 64px 原生范围内；更高 DPI 若出现模糊，再由品牌资产包补矢量剪影。
- [轮询触发服务端限流] → 2 秒一次远低于 60 次/10 秒限制；操作后只追加一次状态刷新。
- [图标与主题背景对比] → 官方方底在深浅色下都有边界；内部线稿图标继续跟随主题色，避免界面图标失去可读性。

## Migration Plan

- 替换 `assets/icon.png`、更新清单与文档后重新构建插件包；无数据迁移，无配置变更。
- 回滚：恢复 `assets/icon.svg` 与原清单 `fuyu.icon` 即可，不影响宿主逻辑与既有数据。
