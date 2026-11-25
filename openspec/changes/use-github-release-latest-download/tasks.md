# Tasks

## 1. 下载地址与文档

- [x] 1.1 将 `freecontrol/src/protocol.ts` 的 `DOWNLOAD_URL` 改为 `https://github.com/pdone/FreeControl/releases/latest`；验证：在 `freecontrol/src` 中搜索 `fc.awaw.cc` 无结果，且 `island.tsx`、`settings.tsx`、`host.ts` 无需修改即可引用新地址。
- [x] 1.2 更新 `freecontrol/README.md` 准备章节，删除 `fc.awaw.cc` 官网入口，仅保留 GitHub Releases Latest 下载地址；验证：README 中不含旧域名，GitHub Releases Latest 地址作为唯一下载入口出现。

## 2. 回归测试

- [x] 2.1 在 `freecontrol/tests/host.test.mjs` 增加字面量断言，确认 `DOWNLOAD_URL` 严格等于 `https://github.com/pdone/FreeControl/releases/latest` 且不包含 `fc.awaw.cc`；验证：`npm test` 通过，且常量被改回旧地址时该断言会失败。
- [x] 2.2 保留现有「copy download link uses the clipboard service when available」测试，确认复制内容来自 `DOWNLOAD_URL`；验证：`npm test` 中该用例通过，`copied` 与新地址一致。

## 3. 集成验证与交付

- [x] 3.1 在 `freecontrol/` 运行 `npm run typecheck`、`npm run lint`、`npm test`、`npm run check:market`；验证：四条命令退出码均为 0，`check:market` 无 error，允许与展示/复制链接相关的域名告警。
- [x] 3.2 提交源码到 `pdone/fuyu-plugins` 的 `master`；验证：`git status` 干净，远端 `master` 的提交号包含本次地址修改。
