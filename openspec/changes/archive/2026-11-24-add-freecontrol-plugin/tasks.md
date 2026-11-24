# Tasks

当前 `freecontrol/` 已有实现；以下任务按规格核对、补齐差异并完成身份与图标调整，每项以可运行的验证为准。

## 1. 身份与品牌图标

- [x] 1.1 核对并统一插件身份：`package.json` 的 `fuyu.displayName` 中英文均为 FreeControl，`fuyu.description` 中英文对应、顶层 `description` 与英文一致；验证：读取清单字段确认名称一致，`npm run check` 不再提示身份声明不一致。
- [x] 1.2 将 FreeControl 官方图标 `F:\github\FreeControl\assets\icons\desktop\512x512.png` 原样复制为 `freecontrol/assets/icon.png`（不改色、不缩放），把 `fuyu.icon` 改为 `assets/icon.png` 并删除 `assets/icon.svg`；验证：`assets/icon.png` 为 512×512 RGBA，清单路径存在，`npm run check` 通过。
- [x] 1.3 同步 README 与 CHANGELOG 的名称、图标来源与功能描述；验证：文档中的名称与清单一致，图标来源指向 FreeControl 品牌资产包，无占位字形残留。
- [x] 1.4 浮屿页面与收起条改用主题黑白剪影：从 `assets/icons/tray/tray-64-white.png` 复制 `assets/brand-mask.png`，槽位图标以蒙版取 `var(--fuyu-plugin-text)`，不带底色；设置-插件页与市场仍使用清单的产品图标。验证：深/浅主题截图分别显示白/黑 FC 剪影，插件列表显示产品方底图标。

## 2. 宿主：自动发现与状态轮询

- [x] 2.1 按平台定位并校验 `fuyu-local.json`（普通文件、非符号链接、≤16 KiB、版本 1、服务标识 `freecontrol-fuyu`、回环地址、令牌长度、`issuedAt` 为有限数字）；验证：`npm test` 中有效与无效记录用例均通过。
- [x] 2.2 每 2 秒重新读取发现文件；地址或令牌变化时切换连接并重新取状态；文件短暂缺失保留 1.5 秒宽限，持续缺失后清空并回到未发现；验证：单测覆盖令牌轮换后重连、删除发现文件后回到未发现。
- [x] 2.3 读取 `/v1/state`，归一设备状态并计算 `onlineCount`、`connectedCount`、`statusSequence`、`lastCheckedAt`；快照内容相同不重复推送；验证：单测断言三种状态统计与重复轮询只产生一次推送。
- [x] 2.4 未连接时通过 `ctx.settings.setup` 报告需要配置并给出开启浮屿设备控制的提示；验证：宿主测试或手动检查 `setup` 调用参数，连接成功后 `needed` 为 false。

## 3. 设备操作与错误处理

- [x] 3.1 连接/断开处理器只接受设备身份并调用 `/v1/devices/{deviceId}/connect|disconnect`，操作超时 30 秒，完成后重新读取快照；验证：单测断言请求 URL、方法与操作后的状态刷新。
- [x] 3.2 落实错误映射：401 → 未授权、404 → 设备不存在、409 → 操作冲突/设备不可用、422 → 操作失败、429/5xx → 服务暂不可用、未知 → 操作失败；验证：单测覆盖各状态码，未知响应不被标记为成功。
- [x] 3.3 确保访问令牌只存在于宿主内存：不写入文件、不进入推送载荷、不进入文案与日志；验证：单测断言发布数据与文件系统均不包含令牌。

## 4. 浮屿页面、收起条与设置页

- [x] 4.1 核对 `island.page/v1`：标题、统计、刷新、错误横幅与设备列表（别名、USB/Wi-Fi、连接标识、状态、操作按钮）；验证：用真实组件生成截图并能看到上述元素。
- [x] 4.2 核对 `island.collapsed/v1`：显示「已连接/总数」，点击打开页面，不使用 `width: 100%` 或 `flex: 1`；验证：收起条截图显示计数，清单中 `opens` 指向页面 id。
- [x] 4.3 核对未发现、凭据失效、空设备与操作错误四种状态：分别显示引导文案、重新检测或错误说明，未发现/失效时不展示操作按钮；验证：单测覆盖状态数据，开发模式下逐态确认文案与按钮。
- [ ] 4.4 核对 `settings.section/v1`：状态、最近更新时间、自动连接说明、重新检测与错误；验证：开发模式下打开设置页看到区块并触发重新检测。

## 5. 本地化、主题与样式

- [x] 5.1 核对所有可见文案都来自中英双语文本模块，页面、收起条与设置页无硬编码文案；验证：检索组件中的可见字符串，仅剩符号与数字。
- [x] 5.2 核对颜色、字体与圆角全部使用 `--fuyu-plugin-*` 变量；验证：`styles.css` 中无十六进制颜色或固定字体栈。
- [x] 5.3 核对所有 CSS 类名以 `fuyu-freecontrol` 前缀命名；验证：检索 `styles.css` 与组件类名，无未加前缀的类。

## 6. 测试、构建与运行时验收

- [x] 6.1 运行 `npm test`，宿主发现、重连、操作、错误映射与令牌保护用例全部通过。
- [x] 6.2 运行 `npm run typecheck` 与 `npm run lint`，均无错误。
- [x] 6.3 运行 `npm run build`，确认安装包包含 `assets/icon.png` 且清单指向该文件；再运行 `npm run check`，结果仅为 review/listing 级警告。
- [x] 6.4 运行 `npx fuyu-plugin shots --no-cover` 重新生成 `screenshots/page.png` 与 `screenshots/bar.png`；验证：两张截图来自真实组件且内容与当前界面一致。
- [ ] 6.5 在浮屿运行中执行 `npm run dev` 注册插件，确认设备页出现 FreeControl 页面与收起条、设置页出现区块，插件行无加载错误。
- [ ] 6.6 交由用户完成运行时验收：开启/关闭浮屿设备控制后的自动发现与失效、重启 FreeControl 后自动重连、在线设备连接与断开；验证以用户回执为准。

## Workflow follow-up

- 实现与人工验收完成后，按项目要求归档本次变更。
