# Design

## Context

插件当前用 `src/protocol.ts` 中的 `DOWNLOAD_URL` 作为唯一下载地址常量；`src/island.tsx`、`src/settings.tsx` 负责展示，`src/host.ts` 的 `copyDownloadLink` 负责复制到剪贴板。README 已给出 GitHub Releases Latest 地址。变更动机见 `proposal.md`，行为要求见 `specs/freecontrol-plugin/spec.md`。

约束：插件不请求该下载地址，只展示和复制；`fuyu.network` 当前只声明 `localhost`。本次修改发生在尚未向市场提交 `1.0.0` 的阶段。

## Goals / Non-Goals

**Goals:**

- 让界面展示、剪贴板内容和 README 都指向同一个 GitHub Releases Latest 地址。
- 保持 `DOWNLOAD_URL` 作为唯一来源，避免多处字面量再次分叉。
- 用测试固定字面量，防止未来无意改回旧地址。

**Non-Goals:**

- 不改变自动发现、设备连接、错误提示和主题样式。
- 不自动打开浏览器、不下载安装包、不访问 GitHub。
- 不修改 `fuyu.network`、清单字段或插件版本。
- 不包含市场提交、签名或开 PR 流程。

## Decisions

1. **只改 `DOWNLOAD_URL` 常量。** 设为 `https://github.com/pdone/FreeControl/releases/latest`。三个使用方已经引用该常量，无需改调用代码。备选方案是在页面、宿主和 README 各写字面量，但会重新引入地址不一致的风险，因此不采用。

2. **保持 `fuyu.network` 不变。** 市场静态扫描会把代码里出现的 `github.com` 标为未声明域名，和之前 `fc.awaw.cc` 的告警性质相同。该 URL 只用于展示与复制，没有 `fetch` 或外部程序调用；把 `github.com` 加入 `fuyu.network` 会声明插件并不存在的联网行为，因此保留告警并在发布说明中解释。

3. **测试直接断言字面量。** 现有「复制下载链接」测试只比较 `copied` 与 `DOWNLOAD_URL`，常量改错也会通过。增加一条断言，确认常量严格等于 GitHub Releases Latest 地址，并确认不包含旧域名。备选方案是断言渲染后的 UI 文本，但覆盖不到剪贴板路径，成本更高。

4. **README 只保留一个下载地址。** 删除 `fc.awaw.cc` 官网入口，把 GitHub Releases Latest 作为准备章节的唯一下载入口。这样文档不会继续引导用户去旧地址。

5. **不提升插件版本。** 规划时市场尚无 `@pdone/fuyu-freecontrol` 条目，本次改动仍属于待首次上架的 `1.0.0` 源码。若应用前该版本已上架，则需改为提升版本号并提交新版本，而不是改写已上架版本。

## Risks / Trade-offs

- `[市场审核提示域名未声明]` → 静态扫描仍会报告 `github.com`；确认没有联网调用后，在 PR 说明该字面量仅作展示/复制，不修改 `fuyu.network`。
- `[用户认知切换]` → 官网入口被移除；README 与插件安装引导同时指向 Releases Latest，减少歧义。
- `[已上架版本不可修改]` → 应用前确认市场状态；如已上架则提升版本号，按新版本流程发布。
- `[测试误判]` → 用字面量断言而非仅用常量自比，避免测试随错误常量一起通过。

## Migration Plan

1. 修改 `DOWNLOAD_URL`，更新 README，补充测试断言。
2. 运行 `npm run typecheck`、`npm run lint`、`npm test`、`npm run check:market`，确认无错误。
3. 将源码提交到 `pdone/fuyu-plugins` 的 `master`，供后续市场发布或手动打包使用。
4. 如需回滚，恢复常量和 README 中的旧地址并重新提交；不涉及数据迁移或配置迁移。
