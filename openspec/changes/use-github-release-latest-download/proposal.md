# Proposal

## Why

FreeControl 插件的安装引导当前把 `https://fc.awaw.cc/` 作为下载地址展示和复制，而仓库 README 已提供 `https://github.com/pdone/FreeControl/releases/latest`。两个入口不一致，会让用户在安装引导中拿到旧官网地址，也给市场审核带来一个未声明域名 `fc.awaw.cc` 的告警。发布前统一到 GitHub 最新 Release，可以让文档、界面和剪贴板行为保持一致。

## What Changes

- 将 `DOWNLOAD_URL` 从 `https://fc.awaw.cc/` 改为 `https://github.com/pdone/FreeControl/releases/latest`，作为插件中唯一的下载地址。
- 安装引导页面和设置页继续展示同一地址；「复制下载链接」继续把该地址写入剪贴板，行为不变。
- `README.md` 删除 `fc.awaw.cc` 官网入口，只保留 GitHub Releases Latest 作为下载地址。
- 增加测试断言固定下载地址，避免未来改回旧地址；现有「复制下载链接」测试保持通过。
- 不改变发现文件读取、设备连接、网络请求或浮屿服务声明；插件仍只访问 `localhost`。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `freecontrol-plugin`: 修改「安装入口与复制链接」要求，明确官方下载地址 SHALL 为 GitHub Releases Latest，且界面展示与剪贴板内容 MUST 一致。

## Impact

- 代码：`freecontrol/src/protocol.ts` 中的 `DOWNLOAD_URL`；`src/island.tsx`、`src/settings.tsx` 和 `src/host.ts` 只是沿用该常量，无需改变调用方式。
- 文档：`freecontrol/README.md` 的准备章节。
- 测试：`freecontrol/tests/host.test.mjs` 增加固定 URL 断言。
- 市场审核：静态扫描仍可能把 `github.com` 报为未声明域名，但该常量只用于展示与复制，不发起请求，`fuyu.network` 不需要变更。
