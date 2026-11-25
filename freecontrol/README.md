# FreeControl for Fuyu

FreeControl 浮屿插件把本机 Android 设备列表、在线状态和连接控制放到浮屿中。它调用已经运行的 FreeControl，不自行启动 scrcpy 或 adb。

## 准备：安装 FreeControl

本插件需要本机已有 FreeControl。Windows 提供免安装单文件，下载后双击即可运行；macOS 与 Linux 按发布页说明安装。

- 官网：<https://fc.awaw.cc/>
- GitHub Releases：<https://github.com/pdone/FreeControl/releases/latest>

## 使用

1. 下载并运行 FreeControl（见上一节）。
2. 在 FreeControl 的「设置 → 外部控制」中开启「浮屿设备控制」。
3. 保持 FreeControl 运行，可以最小化或收进托盘，但不要选择“退出”。
4. 打开浮屿的 FreeControl 页面。插件会自动发现并连接本机 FreeControl，无需复制配对信息。
5. 在线设备可以连接，已连接设备可以断开。

收起条显示 `已连接设备数 / 设备总数`，点击后打开 FreeControl 页面。

FreeControl 重启后，插件会读取新的本地发现文件并自动重连。如果页面显示“还没有 FreeControl”，可按页面步骤下载运行，或点击“复制下载链接”；如果显示“FreeControl 未就绪”，请确认 FreeControl 正在运行且已开启浮屿设备控制，再点击“重新检测”。如果显示“无法连接 FreeControl”，请按页面中的具体错误说明处理；旧版本没有“浮屿设备控制”选项时，请先更新 FreeControl。

## 它会做什么

- 检查 FreeControl 用户数据目录是否存在，区分“还没有 FreeControl”和“已安装但未就绪”。
- 读取 FreeControl 用户数据目录中的 `fuyu-local.json` 本地发现文件。
- 读取 FreeControl 返回的设备别名、连接方式、连接标识和状态。
- 执行单台设备的连接与断开。
- 未检测到 FreeControl 时显示官方下载地址，并可通过浮屿剪贴板复制链接。
- 只向 `localhost` 或 `127.0.0.1` 发起请求，不访问其它域名。
- 不写入访问令牌文件，不运行程序，不打包任何二进制。

发现文件包含本次 FreeControl 运行的随机访问令牌，只放在当前用户数据目录；Unix 权限为 `0600`，Windows 系统继承当前用户目录权限。FreeControl 服务端只保存令牌哈希。关闭浮屿设备控制或退出 FreeControl 后，发现文件会被删除，旧令牌立即失效。

## 开发

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run check
npm run dev
```

`npm run dev` 会把插件登记到正在运行的浮屿开发模式，并在源码变化时重新构建。

市场截图由真实 React 组件生成：

```sh
npx fuyu-plugin shots --no-cover
```

示例数据位于 `shots/`，不进入安装包。

## 项目结构

| 文件 | 运行环境 | 作用 |
|---|---|---|
| `src/host.ts` | Node 宿主 | 自动发现、本地 HTTP、状态轮询 |
| `src/island.tsx` | 浮屿窗口 | 设备页面与收起条 |
| `src/settings.tsx` | 设置窗口 | 自动连接状态与重新检测 |
| `src/protocol.ts` | 共享 | 方法、主题与数据类型 |
| `src/useFreeControl.ts` | React | 宿主调用与状态订阅 |

插件图标取自 FreeControl 品牌资产包：清单与设置-插件页使用 `assets/icons/desktop/512x512.png`（原样复制为 `assets/icon.png`），浮屿页面与收起条使用 `assets/icons/tray/tray-64-white.png` 剪影（随主题显示黑/白，无底色）。
