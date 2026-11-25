# Spec Delta

## ADDED Requirements

### Requirement: 安装状态区分

插件 SHALL 区分「未检测到 FreeControl 数据目录」与「数据目录存在但没有发现文件」两种未就绪状态，并在页面与设置页给出对应引导，不得把「没装」误报成「没开启控制」。

#### Scenario: 从未运行过 FreeControl

- **WHEN** FreeControl 数据根目录不存在
- **THEN** 页面与设置页显示「未检测到 FreeControl」和下载安装步骤，不要求用户去 FreeControl 设置中开启控制

#### Scenario: 已运行但未就绪

- **WHEN** 数据根目录存在但没有有效的发现文件
- **THEN** 页面与设置页显示「已安装但未开启浮屿设备控制」和开启步骤，包括保持 FreeControl 运行

#### Scenario: 无法确认

- **WHEN** 数据根目录的存在性检查失败（例如权限不足）
- **THEN** 按「数据目录存在」处理并显示开启步骤，不阻断重新检测

### Requirement: 安装入口与复制链接

未检测到 FreeControl 时，插件 SHALL 显示官方下载地址并提供复制入口；MUST NOT 自动下载、保存或执行安装包或安装器。

#### Scenario: 复制下载链接

- **WHEN** 用户点击「复制下载链接」
- **THEN** 官方下载地址写入剪贴板，界面提示已复制

#### Scenario: 剪贴板不可用

- **WHEN** 浮屿没有提供剪贴板服务或写入失败
- **THEN** 地址文本保持可见并可选中，界面提示复制失败，引导内容保持不变

#### Scenario: 不代为下载

- **WHEN** 用户停留在安装引导
- **THEN** 插件不访问新增域名，不向磁盘写入安装包，也不启动任何外部程序

### Requirement: 连接状态与错误可见性

插件 SHALL 在连接中显示进行中提示，在已发现但请求失败时显示「无法连接 FreeControl」及快照中的具体错误；MUST NOT 把超时、服务不可用或未知响应统一断言为程序未运行。

#### Scenario: 正在连接

- **WHEN** 插件已读取有效发现文件并正在请求设备状态
- **THEN** 页面显示「正在连接 FreeControl…」和重新检测入口，不显示空设备引导

#### Scenario: 连接请求失败

- **WHEN** 发现文件存在但状态请求超时、失败或返回不可用错误
- **THEN** 页面与设置页显示「无法连接 FreeControl」、对应错误说明和重新检测入口

#### Scenario: 服务暂不可用

- **WHEN** 服务端返回限流或 5xx 错误
- **THEN** 界面显示服务暂不可用，不显示「FreeControl 未运行」

## MODIFIED Requirements

### Requirement: 浮屿页面与收起条

插件 SHALL 注册浮屿页面与收起条入口；页面 SHALL 显示标题、统计、设备列表与刷新入口，并覆盖未检测到、已安装未就绪、正在连接、连接失败、凭据失效、空设备与错误状态；收起条 SHALL 显示「已连接/总数」并在点击后打开页面；界面 SHALL 使用浮屿主题变量与中英文案。

#### Scenario: 有设备时

- **WHEN** 插件已连接且设备列表非空
- **THEN** 页面显示标题、统计、刷新按钮，以及每台设备的别名、连接方式、状态与操作按钮

#### Scenario: 正在连接

- **WHEN** 插件状态为正在连接
- **THEN** 页面显示进行中提示和重新检测按钮，不显示空设备引导

#### Scenario: 连接失败

- **WHEN** 插件状态为无法连接且快照包含错误
- **THEN** 页面显示无法连接提示、具体错误说明和重新检测按钮

#### Scenario: 未发现或凭据失效

- **WHEN** 插件未发现 FreeControl，或服务端返回未授权
- **THEN** 页面显示对应引导文案与重新检测按钮，不展示设备操作

#### Scenario: 未检测到 FreeControl

- **WHEN** 插件找不到 FreeControl 数据目录
- **THEN** 页面显示下载与运行 FreeControl 的步骤、官方下载地址和重新检测按钮，不展示设备操作

#### Scenario: 已安装未就绪

- **WHEN** 数据目录存在但没有有效的发现文件
- **THEN** 页面显示在 FreeControl 中开启浮屿设备控制的步骤、没有该选项时更新 FreeControl 的提示和重新检测按钮，不展示设备操作

#### Scenario: 空设备

- **WHEN** 已连接但没有任何设备
- **THEN** 页面提示先在 FreeControl 中添加设备

#### Scenario: 收起条

- **WHEN** 收起条可见
- **THEN** 显示「已连接数/设备总数」，点击后打开 FreeControl 页面

#### Scenario: 主题与语言

- **WHEN** 浮屿切换深色/浅色主题或中文/英文
- **THEN** 颜色来自浮屿主题变量，文案来自对应语言

### Requirement: 设置页自动连接状态

插件 SHALL 注册设置页区块，显示连接状态、最近更新时间、自动连接说明、重新检测按钮与当前错误；未就绪时 SHALL 向浮屿报告需要配置，并按「未检测到」或「已安装未就绪」给出不同的提示。

#### Scenario: 状态可查

- **WHEN** 用户打开浮屿设置页
- **THEN** 区块显示当前连接状态，已连接时显示最近更新时间

#### Scenario: 正在连接

- **WHEN** 插件状态为正在连接
- **THEN** 区块显示进行中提示和重新检测按钮

#### Scenario: 连接失败

- **WHEN** 插件状态为无法连接且快照包含错误
- **THEN** 区块显示无法连接状态、具体错误说明和重新检测按钮

#### Scenario: 提示安装

- **WHEN** 插件未检测到 FreeControl 数据目录
- **THEN** 区块提示先安装并开启 FreeControl，并显示下载地址

#### Scenario: 提示开启

- **WHEN** 插件未发现或未连接 FreeControl
- **THEN** 区块提示在 FreeControl 设置中开启浮屿设备控制，并提示没有该选项时更新 FreeControl

#### Scenario: 重新检测

- **WHEN** 用户点击重新检测
- **THEN** 插件立即读取数据目录与发现文件并更新区块显示

### Requirement: 凭据与访问边界

插件 SHALL 只向 `localhost` 或 `127.0.0.1` 发起请求并携带发现文件中的 Bearer 令牌；令牌 MUST NOT 出现在界面文案、推送事件、日志或任何写入的文件中；插件 MAY 检查 FreeControl 数据根目录是否存在，但 MUST NOT 读取发现文件以外的文件内容，MUST NOT 执行程序、启动 scrcpy 或 adb，也 MUST NOT 下载或保存安装包。

#### Scenario: 拒绝非回环记录

- **WHEN** 发现文件给出的地址不是回环地址
- **THEN** 插件不采用该记录，不发起请求

#### Scenario: 只检查目录存在性

- **WHEN** 插件判断 FreeControl 是否至少运行过一次
- **THEN** 只检查数据根目录是否存在，不列出或读取其中其它文件

#### Scenario: 令牌不外泄

- **WHEN** 插件推送状态、渲染页面或记录诊断信息
- **THEN** 载荷与文案中不包含访问令牌

#### Scenario: 不写入令牌

- **WHEN** 插件运行、重连或停止
- **THEN** 不向任何文件写入访问令牌或发现文件内容

#### Scenario: 不执行外部程序

- **WHEN** 用户连接或断开设备，或在安装引导中复制下载地址
- **THEN** 插件只调用回环 HTTP 接口或系统剪贴板，不启动 scrcpy、adb、安装器或其它进程
