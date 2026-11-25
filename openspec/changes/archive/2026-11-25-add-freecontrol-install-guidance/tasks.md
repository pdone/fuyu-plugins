# Tasks

当前 `freecontrol/` 已有可运行实现；以下任务按规格补齐安装引导与状态区分，每项以可运行的验证为准。

## 1. 协议与宿主状态模型

- [x] 1.1 在 `src/protocol.ts` 的快照类型与 `emptySnapshot()` 中增加 `installed: boolean`（默认 `false`），新增下载地址常量与复制方法名；验证：`npm run typecheck` 通过，类型引用处无遗漏。
- [x] 1.2 在 `src/host.ts` 中把数据根解析与发现文件路径拆开，每轮轮询对数据根执行 `lstat`：存在且为目录 → `installed = true`，不存在 → `false`，其它错误 → 按 `true` 处理；不列出或读取目录内其它文件；验证：宿主测试覆盖「目录不存在」「目录存在」「权限错误按已安装处理」三种情况。
- [x] 1.3 按 `installed` 调整 `ctx.settings.setup` 提示：未检测到 → 「安装并开启 FreeControl」，已安装未就绪 → 「在 FreeControl 中开启浮屿设备控制」；更新现有测试里对旧提示文案的断言；验证：`npm test` 中两种提示均被断言。

## 2. 复制下载链接

- [x] 2.1 在 `src/host.ts` 中实现 `copyDownloadLink` 处理器：懒获取 `clipboard/v1`，`try/catch` 调用 `copyText({ text: DOWNLOAD_URL })`，成功返回 `{ ok: true }`、失败或服务缺失返回 `{ ok: false }`；验证：宿主测试用假服务断言成功与失败两条路径。
- [x] 2.2 宿主 `export const inject` 与 `package.json` 的 `fuyu.inject` 均不声明 `clipboard/v1`，仅在点击复制时动态获取；验证：`npm run check` 通过，剪贴板服务缺失时插件仍能启动并返回复制失败。

## 3. 页面与设置引导

- [x] 3.1 在 `src/text.ts` 增加中英双语文案：未检测到标题与步骤、已安装未就绪标题与步骤、「复制下载链接」「已复制」「复制失败」、下载地址标签；不改变现有 `status` 文案映射；验证：检索组件无新增硬编码可见字符串。
- [x] 3.2 在 `src/island.tsx` 把 `unpaired` 空态按 `installed` 二分：未检测到显示安装步骤、地址文本与「复制下载链接 / 重新检测」，已安装未就绪显示开启控制步骤与「重新检测」，`unauthorized` 保持重新连接引导；复制反馈不使用定时器；验证：`npx fuyu-plugin shots` 能分别渲染两种未就绪空态，按钮点击调用对应宿主方法。
- [x] 3.3 在 `src/settings.tsx` 按同一 `installed` 分支显示步骤与复制入口，状态行沿用现有 `status` 文案；验证：开发模式下两种状态分别显示正确步骤，复制失败时地址文本仍可见。
- [x] 3.4 需要时在 `src/styles.css` 补充步骤与地址文本的紧凑样式（沿用 `fuyu-freecontrol` 前缀与主题变量）；验证：深/浅主题下无硬编码颜色，岛页面在 792×360 内不溢出。

## 4. 文档、清单与版本记录

- [x] 4.1 在 `README.md` 增加「准备：安装 FreeControl」小节，给出官网与 GitHub Releases 链接，并把原文「打开 FreeControl 设置」调整为先安装再开启的顺序；验证：市场详情页渲染的链接可点击，文案与实际步骤一致。
- [x] 4.2 在 `package.json` 的中英文描述或关键词中补充「需先安装 FreeControl」的前置说明；验证：`npm run check` 通过，市场列表文案能读到前置条件。
- [x] 4.3 在 `CHANGELOG.md` 增加本次引导与状态区分条目；验证：版本记录包含未安装引导、复制下载链接与状态提示变化。

## 5. 集成验证

- [x] 5.1 运行 `npm test`、`npm run typecheck`、`npm run lint`、`npm run build`、`npm run check`，全部通过且无新增错误。
- [x] 5.2 更新 `shots/sample.ts`（如需要）并运行 `npx fuyu-plugin shots --no-cover`，重新生成未就绪空态与收起条截图；验证：截图来自真实组件，能区分两种未就绪文案。
- [x] 5.3 运行 `npm run dev` 注册插件，在数据目录缺失与存在两种环境下分别确认页面、设置区块、复制按钮与重新检测行为，再交由用户完成运行时验收。

## 6. 连接错误与状态提示

- [x] 6.1 `useFreeControl` 在状态推送、首次快照与刷新后同步 `snapshot.error`，确保后台轮询失败也能显示错误；验证：类型检查通过，离线/未授权快照的错误码进入界面错误状态。
- [x] 6.2 将 `offline` 状态文案改为「无法连接 FreeControl」，设置页显示打开/保持运行的具体步骤；`connecting` 在岛页面与设置页显示进行中提示，不显示空设备引导；验证：真实组件截图分别覆盖 connecting 与 offline 状态。
- [x] 6.3 在「已安装未就绪」分支增加「若没有『浮屿设备控制』选项，请更新 FreeControl」提示；验证：中英文案完整，岛页面与设置页都显示，深/浅主题不溢出。
- [x] 6.4 宿主测试断言状态请求失败与未授权时快照包含对应 `error`；验证：`npm test` 通过。
- [x] 6.5 增加 connecting/offline 截图样本并重新生成截图；验证：截图来自真实组件，能区分进行中、无法连接与未就绪三种状态。
- [x] 6.6 运行 `npm test`、`npm run typecheck`、`npm run lint`、`npm run build`、`npm run check`，全部通过且无新增错误。

## 7. 按钮悬停对比度

- [x] 7.1 主按钮 hover 保持强调色底并轻微提亮，不再切换为深色表面；次级按钮继续使用表面 hover；验证：深/浅主题下“重新检测”等主按钮悬停时文字清晰可读。

## Workflow follow-up

- 实现与人工验收完成后，按项目要求归档本次变更。
