# Feed Switcher

主动选择 YouTube 搜索主题，并保存、收藏和切换自己的发现配置。

Feed Switcher 是本地优先的 Chrome Manifest V3 扩展。主题词、语言、地区、时间窗和优先级会组成 YouTube 原生搜索 URL；它不保证搜索结果，也不会训练、替换或控制 YouTube 推荐算法。界面里的“频道”是保存的发现配置，不是 YouTube 发布者频道。

当前源码版本：**0.6.4**，修复可选同步权限接口报错时的界面处理；在0.6.3统一源码与构建的基础上维护。历史版本保留为参考，不代表当前版本已重新验证所有环境。

[项目仓库](https://github.com/Rulle560/Feed-Switcher) · [版本下载](https://github.com/Rulle560/Feed-Switcher/releases) · [问题反馈](https://github.com/Rulle560/Feed-Switcher/issues)

## 适用与边界

- 面向希望主动搜索多个主题、保存可携带兴趣配置的学习与研究用户。
- 本地启用/关闭、主题设置、收藏、最近配置、JSON 导入导出不需要服务器。
- 可选同步需要单独启动本机 Backend Lite 或自行维护服务器，并明确同意上传数据。
- 不收集 YouTube 观看历史、浏览器历史或 cookies；搜索关键词会作为普通搜索 URL 发送给 YouTube。
- 语言词是相关性增强、地区是搜索提示；24H 按日期近似，并非精确小时过滤。
- 没有已实现的 AI 创作者分析、视频评分或付费 Gate；高级功能标志默认关闭。
- 隔离的 Chrome 120.0.6099.109 已通过本地核心流程验收；尚未覆盖所有补丁版本、用户环境和 YouTube 布局，页面变化可能影响界面入口。

## 安装

需要 Chrome 120+；构建与本地后端使用 Node.js 24。

```sh
npm run check
```

此命令应构建并验证当前扩展、运行当前前端与后端测试。不需要下载第三方运行库。也可只执行 `npm run build`，生成 `dist/`。

1. 打开 `chrome://extensions`，开启开发者模式。
2. 选择“加载已解压的扩展程序”，选择生成的 `dist` 文件夹。
3. 刷新已打开的 YouTube 页面；使用右下角 FS 入口设置主题。
4. 通过扩展弹窗启用/关闭，并查看收藏、最近配置和隐私说明。

如使用已打包的扩展 ZIP，先解压，再加载其中的 `extension` 文件夹。源码包与扩展包不同；扩展包内的安装说明、许可证和验证记录放在运行文件夹之外。

### 从旧版更新

先在旧版导出本地配置，备份只保存在自己电脑上。保留原来加载的扩展文件夹路径，将新版本的运行文件更新到该文件夹，然后在 `chrome://extensions` 中重新加载原条目并刷新 YouTube 页面。2026-10-05的隔离验收确认：保留同一目录和测试浏览器配置时，归档0.6.0升级到0.6.3后扩展ID、停用状态、非默认主题设置、收藏和最近使用均保留。

改用新解压目录或卸载重装不在此验收范围。更换目录前保留旧版本和本地导出，用新版导入后核对配置；本地配置导出不包含同步密钥。同步账户的升级保留和用户实际旧版本仍需单独核验。不要把同步密钥、导出文件或数据库上传到问题反馈中。

## 可选本机同步

```sh
node Backend_Lite/src/dev-server.mjs
```

仅监听 `127.0.0.1:8787`；新建的开发数据保存在 `Backend_Lite/.data`，不得提交。查看 `Backend_Lite/README.md` 的删除与保留边界。扩展只有在明确操作、同意数据说明和授予可选主机权限后才连接。

Cloudflare Workers/D1 适配器是自托管组件。公共 HTTPS、支持渠道、部署与计划任务需部署者配置和验证；本项目没有默认公共服务。开发服务器不能作为公网生产服务直接开放。

## 源码结构

- `src/extension/`：当前浏览器运行源码、界面与图标；其中 `core.js` 为共享规则。
- `scripts/`：构建、发行文件验证与测试入口。
- `tests/`：对当前源码的行为和回归测试。
- `Backend_Lite/`：可选本机/自托管同步组件与其测试。
- `legacy/`：历史 TypeScript/交付参考，不能用其测试冒充当前覆盖。
- `docs/`：历史设计与当前验收资料；以当前 README、源码和验证记录为准。

构建保持源码与发行文件一致，不从旧交付目录拼装发布。

## 验证状态

自动检查和浏览器验收的结果见 `docs/VALIDATION.md`。存在测试定义不等于通过；本机通过不等于所有用户环境都已验证。GitHub CI 只有实际运行成功后才算远端证据。

## 参与维护

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。请报告版本、系统、最小复现和实际行为；不要上传同步密钥、数据库或个人配置。维护工作按真实问题与适配需求开展，不以提交次数替代产品价值。

## 许可与归属

MIT，Copyright (c) 2026 Rulle560。维护者已确认代码、图标及文案可公开；外部平台与商标不受本项目 MIT 许可覆盖，参见 [THIRD_PARTY.md](THIRD_PARTY.md)。本项目与 Google/YouTube 无隶属或官方认可关系。

## English overview

Feed Switcher is a local-first Chrome extension for deliberate YouTube topic discovery. Save, favorite, switch and export search configurations combining topic, language, region and time preferences. It generates native search URLs and does not control YouTube recommendations or guarantee ranking. Local features work without a server; optional sync requires explicit consent and a separately managed backend. Build with Node.js 24 using `npm run check`, then load `dist/` as an unpacked extension. Licensed under MIT.
