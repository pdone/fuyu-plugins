# Design

## Context

见 `proposal.md`。当前实现的未就绪状态只有一个 `unpaired`，宿主只读取发现文件 `fuyu-local.json`，页面与设置页把「没装」和「装了没开」都按「未发现 FreeControl」处理（`src/host.ts`、`src/island.tsx`、`src/text.ts`）。

关键事实：

- FreeControl 是 Tauri 免安装应用，Windows 为单文件 exe，没有安装器；数据根固定为 `%APPDATA%/FreeControl2`（macOS/Linux 对应目录），首次启动时 `load_config` 会创建该目录并写入 `config.json`（FreeControl `src-tauri/src/main.rs` 的 setup 调用 `config::load_config`）。
- 浮屿插件页面是隔离 WebView：外部导航、`window.open`、点击外链都会被原生层取消；插件 API 没有打开浏览器的成员。市场详情页的 Markdown 链接由浮屿自己打开，这是唯一能点击外链的插件表面。
- 宿主可按需动态使用 `clipboard/v1`，窗口没有定时器，文案必须中英双语、样式使用 `--fuyu-plugin-*` 变量。

## Goals / Non-Goals

**Goals:**

- 在「没装」与「装了没开」之间给出不同且可执行的下一步。
- 引导不超过浮屿现有的访问边界：不新增域名、不下载安装包、不执行程序。
- 保持快照与页面的现有结构，改动集中在未就绪分支。

**Non-Goals:**

- 不做自动下载、静默安装、启动安装器或检查注册表/进程。
- 不改 FreeControl 主程序，不新增持久化配置。
- 不改动设备连接/断开的既有行为与错误语义。

## Decisions

### D1 用快照布尔字段表达安装迹象，不新增连接状态

快照新增 `installed: boolean`，含义是「FreeControl 数据根目录存在」，即「至少启动过一次」，不表示此刻正在运行。现有 `status` 保持 `unpaired / connecting / ready / offline / unauthorized` 不变。

- 未就绪的判定：`status === "unpaired"` 时，`installed === false` 显示安装引导，`installed === true` 显示开启控制引导；`unauthorized` 维持现有重新连接引导。
- 备选：给 `ConnectionStatus` 增加 `not_installed` / `not_enabled` 两个值——会把「连接生命周期」和「安装迹象」两种维度混在一个字段里，且现有 `text.status` 映射与测试都要重排，否决。
- 备选：只在页面本地推断——窗口无法访问文件系统，推断只能来自宿主，否决。

### D2 探测方式：只对数据根做一次 `lstat`

宿主把现有 `discoveryCandidates()` 拆成「数据根列表」与「发现文件 = 数据根 + `fuyu-local.json`」。每轮轮询在读取发现文件前，对数据根执行 `lstat`：

- `lstat` 成功且是目录 → `installed = true`。
- 目录不存在（`ENOENT`）→ `installed = false`。
- 其它错误（权限等）→ 按 `installed = true` 处理，避免把已安装用户误判成「没装」。
- 不 `readdir`、不读取 `config.json`，只看目录是否存在。

依据：FreeControl 首次启动必定创建数据根并写入 `config.json`，便携版改名、换版本都不影响该目录名；注册表/安装目录在便携版上不存在，检查进程需要执行外部程序，均不采用。

- 备选：检查 `config.json` 是否存在——等价于目录检查但多一次文件读取，且用户恢复出厂设置删除配置后会把「装过」误判为「没装」，否决。
- 备选：通过 `tasklist` / `ps` 判断进程——需要执行程序，违背现有边界与市场信任，否决。

### D3 复制下载链接放在宿主，`clipboard/v1` 按需动态获取

新增宿主方法 `copyDownloadLink`：

- 懒获取 `ctx.services.get(clipboardV1)`，在 `try/catch` 中调用 `copyText({ text: DOWNLOAD_URL })`；成功返回 `{ ok: true }`，失败或服务不存在返回 `{ ok: false }`。
- `DOWNLOAD_URL` 放在 `protocol.ts`，页面展示的地址文本与复制内容同源，避免两处漂移。
- 宿主 `export const inject` 不包含 `clipboard/v1`，清单也不声明该服务；只有用户点击复制时才通过 `ctx.services.get(clipboardV1)` 动态获取。浮屿 0.3.13 的可选注入仍会等待服务实现，把它列为 `optional` 会让剪贴板内置插件关闭时整个插件卡在「等待中」。
- 复制结果使用独立的小结果类型，不进入现有 `CallResult` / `ErrorCode`，避免复制失败污染页面的错误横幅。
- 备选：窗口直接 `ctx.services.get(clipboardV1)`——依赖窗口侧服务桥，老版本兼容性更难判断，且与「窗口只经 `ctx.host.call` 取外部能力」的现状不一致，否决。
- 备选：`navigator.clipboard`——插件页面是 InPrivate 隔离 WebView，权限请求默认拒绝，不可靠，否决。

复制反馈不使用定时器（窗口没有定时器）：点击后按钮/提示保持「已复制」或「复制失败」，直到页面重新渲染；地址文本始终可见、可选中，作为兜底。

### D4 未就绪分支的界面结构

- 岛页面保持现有的空态骨架（图标、标题、说明、按钮），在 `unpaired` 下按 `installed` 二分：
  - `installed === false`：标题「还没有 FreeControl」，说明写三步（下载对应平台版本 → 运行 → 在设置 → 外部控制开启浮屿设备控制），展示下载地址，按钮为「复制下载链接」「重新检测」。
  - `installed === true`：标题「FreeControl 未就绪」，说明写「打开 FreeControl → 设置 → 外部控制，开启浮屿设备控制并保持运行」，按钮为「重新检测」。
- `unauthorized` 保持独立的「重新连接 FreeControl」文案。
- `installed === true` 的未就绪引导额外显示「若没有『浮屿设备控制』选项，请更新 FreeControl」。
- `connecting` 使用独立空态显示「正在连接 FreeControl…」和重新检测按钮，不落入「还没有设备」。
- `offline` 状态文案改为「无法连接 FreeControl」，设置页显示打开/保持运行的具体步骤；错误横幅展示快照中的错误码文案，不再统一断言程序未运行。
- 设置区块同样按 `installed` 显示步骤与复制入口；状态行沿用 `status` 文案。
- 收起条不变，仍未就绪时显示 `0/0`。
- 文案全部进入 `text.ts` 的中英双语对象；新增按钮沿用现有 `fuyu-freecontrol__button` 样式，不引入新颜色。

### D5 外部入口分工

- 插件页面/设置区块不提供可点击外链（平台不支持），只展示地址文本与复制按钮。
- README 增加「准备：安装 FreeControl」小节，给出官网 `https://fc.awaw.cc/` 与 GitHub Releases `https://github.com/pdone/FreeControl/releases/latest` 两个可点击链接；市场详情页会由浮屿打开它们。
- 复制按钮使用官网地址作为主入口；GitHub Releases 作为 README 中的备用入口。若产品希望调整主入口，只改 `DOWNLOAD_URL` 与两处文案。
- 插件描述补一句「需先安装 FreeControl」，让市场列表在安装前就暴露前置条件。

### D6 测试与兼容

- 宿主测试补充：数据根不存在时 `installed === false`、创建数据根后 `installed === true`、权限错误按已安装处理、复制方法在服务缺失时返回 `{ ok: false }`。
- 现有测试断言旧提示文案（`setups[0].hint`），需改为按 `installed` 断言两种提示。
- `emptySnapshot()` 增加 `installed: false`；快照变化检测沿用现有 JSON 比较，安装迹象变化只会多推送一次。
- 新增文案后重新跑 `npm run typecheck`、`npm run lint`、`npm test`，并用真实组件更新岛页面截图（未就绪空态）。

### D7 连接错误与状态提示

- `useFreeControl` 在订阅推送、首次快照和刷新后都把 `snapshot.error` 同步到本地错误状态，确保后台轮询失败也能显示错误说明。
- `offline` 只表示「无法连接」，不断言「程序未运行」；超时、限流、5xx 和未知响应分别使用已有错误码文案。
- 设置页在 `offline` 时显示「请打开 FreeControl 并保持运行；若已运行，请关闭再开启浮屿设备控制后重新检测」，不再显示通用自动连接说明。
- `connecting` 在岛页面与设置页都显示进行中提示；岛页面不展示空设备列表。
- 版本提示只出现在「数据目录存在但未就绪」分支，避免让刚下载最新版的用户重复看到。

## Risks / Trade-offs

- [数据根存在 ≠ 当前一定安装] → 文案使用「未检测到 / 未就绪」而不是断言「未安装」；删除数据目录或换系统用户时最坏结果是提示更新下载，不会破坏功能。
- [权限不足导致误判] → 检查失败按「已安装」处理，优先避免让已安装用户去重新下载。
- [剪贴板服务缺失或旧版本] → 不把剪贴板列为启动依赖，点击时动态获取，失败时地址文本仍可手动选择复制。
- [未就绪文案变长，岛页面空间小] → 步骤压缩到两行以内，地址单独一行；设置区块承载完整说明。
- [测试断言旧 hint 失败] → 在实现任务中显式更新既有断言，避免误以为回归。
- [Windows 便携版换目录] → 数据根固定在 `%APPDATA%`，与 exe 位置无关；改名/升级不影响判定。

## Migration Plan

- 仅升级插件包，无数据迁移；已连接用户不会看到安装引导。
- 回滚：回退插件版本即可；快照新增字段对旧页面无副作用（旧页面忽略未知字段）。

## Open Questions

无。
