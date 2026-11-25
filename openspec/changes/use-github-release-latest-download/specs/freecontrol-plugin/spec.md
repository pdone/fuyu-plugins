# Spec Delta

## MODIFIED Requirements

### Requirement: 安装入口与复制链接

未检测到 FreeControl 时，插件 SHALL 显示官方下载地址 `https://github.com/pdone/FreeControl/releases/latest`（GitHub Releases Latest）并提供复制入口；界面展示的地址与「复制下载链接」写入剪贴板的地址 MUST 一致。该地址 MUST NOT 使用 `https://fc.awaw.cc/`。插件 MUST NOT 自动下载、保存或执行安装包或安装器。

#### Scenario: 展示最新 Release 地址

- **WHEN** 浮屿页面或设置页因未检测到 FreeControl 而显示安装引导
- **THEN** 下载地址显示为 `https://github.com/pdone/FreeControl/releases/latest`，不显示 `https://fc.awaw.cc/`

#### Scenario: 复制下载链接

- **WHEN** 用户点击「复制下载链接」
- **THEN** `https://github.com/pdone/FreeControl/releases/latest` 写入剪贴板，界面提示已复制

#### Scenario: 剪贴板不可用

- **WHEN** 浮屿没有提供剪贴板服务或写入失败
- **THEN** 地址文本保持可见并可选中，界面提示复制失败，引导内容保持不变

#### Scenario: 不代为下载

- **WHEN** 用户停留在安装引导
- **THEN** 插件不访问新增域名，不向磁盘写入安装包，也不启动任何外部程序
