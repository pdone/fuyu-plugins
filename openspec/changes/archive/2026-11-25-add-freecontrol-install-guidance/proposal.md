# Proposal

## Why

用户可能先在浮屿里装了本插件，本机却还没有 FreeControl；当前空态把「没装」和「装了没开」混在一起，直接要求「在 FreeControl 设置中开启浮屿设备控制」，新用户不知道下一步该去哪。浮屿插件页面又无法打开外部链接，因此需要在本插件能触达的表面上把「先安装 FreeControl」讲清楚。

## What Changes

- 宿主增加对 FreeControl 数据根目录的存在性探测（只检查目录是否存在，不读取内容），据此区分「从未运行过」与「已运行但未就绪」。
- 设备快照新增安装状态字段；浮屿页面与设置区块按状态给出不同引导：
  - 未检测到数据目录：显示「下载并运行 FreeControl」的步骤、官方下载地址文本与「复制下载链接」按钮。
  - 数据目录存在但没有发现文件：显示「打开 FreeControl → 设置 → 外部控制，开启浮屿设备控制并保持运行」的步骤。
  - 未授权：保留现有「重新连接 FreeControl」引导。
- 宿主新增复制下载链接的方法，点击时动态使用浮屿 `clipboard/v1` 服务写入剪贴板，不把它列为启动依赖；服务不可用时界面保留可选中、可手动复制的地址文本。
- `ctx.settings.setup` 的提示按状态区分：未检测到数据目录时提示「安装并开启 FreeControl」，已安装未就绪时提示「在 FreeControl 中开启浮屿设备控制」。
- README 增加「准备：安装 FreeControl」小节，附官网与 GitHub Releases 链接（市场详情页的 Markdown 链接由浮屿负责打开）；插件描述与关键词标明需要 FreeControl。
- 连接阶段补充状态提示：正在连接时显示进行中空态；请求失败时显示「无法连接 FreeControl」和快照中的具体错误，不再把超时或服务不可用断言为程序未运行；已安装未就绪时提示旧版本可能没有「浮屿设备控制」选项。
- 规范调整：允许插件检查 FreeControl 数据根目录是否存在；仍 MUST NOT 读取发现文件以外的内容，MUST NOT 下载或执行程序，MUST NOT 访问新增域名。
- **不做**：自动下载安装包、运行安装器、检查注册表或进程、打包 FreeControl 二进制、为 GitHub 或官网新增 `fuyu.network` 域名。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `freecontrol-plugin`: 增加安装引导与「未检测到 / 已安装未就绪」状态区分，设置提示随状态变化，并扩展凭据与访问边界以允许数据根存在性检查。

## Impact

- `freecontrol/src/protocol.ts`：快照字段与新增方法名。
- `freecontrol/src/host.ts`：数据根探测、按状态上报 setup 提示、复制下载链接的处理方法。
- `freecontrol/src/island.tsx`、`freecontrol/src/settings.tsx`、`freecontrol/src/text.ts`、`freecontrol/src/styles.css`：分支空态、步骤文案、复制按钮与失败回退。
- `freecontrol/README.md`、`freecontrol/package.json`、`freecontrol/CHANGELOG.md`：安装前置说明、可选服务声明与版本记录。
- `openspec/specs/freecontrol-plugin/spec.md`：新增安装引导需求，修改页面、设置与访问边界需求。
- 点击复制时按需使用浮屿 `clipboard/v1`，并使用 `ctx.settings.setup`；不新增网络域名，不修改 FreeControl。
- 假设：界面上的下载入口以官网 `https://fc.awaw.cc/` 为准，GitHub Releases 作为 README 中的备用入口；如产品希望调整入口，可在实现前替换文案与复制目标。
