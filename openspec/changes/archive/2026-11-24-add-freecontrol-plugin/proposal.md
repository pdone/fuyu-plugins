# Proposal

## Why

FreeControl 已提供只监听回环地址的本地设备接口和自动发现文件，但用户在浮屿里看不到设备状态，也无法直接连接或断开，只能切回 FreeControl 操作。需要一个浮屿插件复用这套已认证的本地接口，把设备列表、在线/连接状态与单台连接/断开放进浮屿。

## What Changes

- 新增浮屿插件 `freecontrol/`，显示名称为 **FreeControl**，中英文名称与描述一致。
- 插件从 FreeControl 用户数据目录读取 `fuyu-local.json` 自动发现本机服务，不需要复制地址或配对信息；FreeControl 重启后重新读取并自动重连。
- 宿主周期性读取 `/v1/state` 设备快照，包含别名、连接方式、连接标识、状态与状态序列，并向浮屿窗口推送。
- 浮屿页面展示设备列表与「设备总数 / 在线 / 已连接」统计，支持单台设备连接与断开；在线与已连接设备可断开，离线 USB 设备禁止连接，离线无线设备允许尝试连接。
- 收起条显示「已连接数 / 设备总数」，点击进入 FreeControl 页面。
- 设置页提供自动连接状态、最近更新时间、重新检测与错误说明；未连接时通过 `ctx.settings.setup` 提示开启浮屿设备控制。
- 插件图标改用 FreeControl 项目官方品牌图标（来自 FreeControl 品牌资产包），替换现有通用手机字形占位图标。
- 插件只向 `localhost` / `127.0.0.1` 发起请求；发现文件无效、非回环或凭据失效时不发起设备操作；访问令牌不进入界面、事件、日志或任何持久化文件。
- 本次不包含 MCP / stdio、远程或局域网访问、设备管理与参数编辑、日志查看、启动 scrcpy 或 adb，也不修改 FreeControl 主程序。

## Capabilities

### New Capabilities

- `freecontrol-plugin`: 定义浮屿 FreeControl 插件的自动发现、设备状态快照、连接/断开操作、界面呈现、错误语义与安全边界。

### Modified Capabilities

无。

## Impact

- 新增 OpenSpec 根目录，以及 `freecontrol/` 下的插件源码、资源、测试与截图；本仓库当前无既有规格。
- 消费 FreeControl 既有的 `fuyu-local.json` 发现契约、`GET /v1/state` 与 `POST /v1/devices/{deviceId}/connect|disconnect`；不修改 FreeControl 仓库。
- 插件清单的 `fuyu.displayName`、`fuyu.icon`、构建产物与市场预览随图标调整；运行期不写入访问令牌或额外数据文件。
- 依赖 `fuyu-plugin` CLI 与 Fuyu `>=0.4.0`；`fuyu.network` 只声明 `localhost`（同时覆盖 `127.0.0.1` 回环请求）。
