# CHANGELOG

## 2026-07-17

### Added
- 新增 TikHub 微信搜一搜综合搜索接口：`POST /wechat_search/v2/fetch_search`。

### Changed
- 新接口保留 TikHub 原始 JSON 文本，避免 `docID`、`feedNonceId` 等 64 位 ID 经 JavaScript 解析后失真。
- 新接口每个身份每天可免费试用 1 次；使用 `api_key` 的成功请求扣 3 积分，并在调用上游前校验余额不少于 3 积分。

## 2026-07-16

### Changed
- 图像 API 上游基础域名由 `api.openai-hub.com` 切换为 `api.openai-hub.net`，现有请求路径和接口行为保持不变。

## 2026-07-15

### Added
- `POST /deployment` 现执行本地、受控的静态 ZIP 验证与发布：仅接受本服务上传目录中的 HTTPS `.zip` 地址，校验 ZIP 布局、路径、权限、大小、压缩比、静态扩展名、manifest 哈希和 dossier 声明后，发布为 `https://static.devtool.uk/static-releases/release-.../` 的不可变 release。
- 新增 `utils/staticZipDeployment.js` 以及覆盖成功发布、非受信 URL 拒绝、manifest 哈希不匹配拒绝的回归测试。

### Changed
- `POST /deployment` 不再把 ZIP URL 交给 Hermes chat-completions 解析；成功时返回结构化 `status=deployed`、release ID、公开 URL、ZIP SHA-256 与 HTTP 验证，失败时返回结构化 `status=rejected` 和可验证原因。
- 免费额度仅在真实发布成功后才写入，非法请求或验证失败不会消耗免费额度。
- `POST /file-transfer/upload` 与 `POST /file-transfer/upload/complete` 的 `data.url` 现固定使用 HTTPS，保留请求 Host 和既有公开文件路径。
- `file-transfer` 的普通上传和分片合并完成响应均在 `data.url` 返回当前请求域名下的完整可访问链接；临时和永久文件分别使用对应公开路径。

## 2026-07-14

### Added
- 新增 Hermes chat-completions 薄代理 `POST /deployment`，用于转发到 `https://hermes.devtool.uk/v1/chat/completions`。
- 新增 `utils/ThirdParrtyApi/hermes-agent.js` 作为 Hermes 上游封装。

### Changed
- `POST /deployment` 保持上游 JSON 与状态码直通，不再额外包装响应结构。
- Hermes 上游授权改为固定值 `Bearer 4f3f1c7d9b2a6e8c5d0f9a1b3e7c2d4f6`。
- `POST /deployment` 按最终客户端 IP 做一次性调用限制，适配多层代理场景。
- `POST /deployment` 在 IP 超限后要求输入可用 unkey 才能继续调用。

## 2026-07-12

### Added
- `file-transfer` 新增一键“转为永久文件”动作，可将临时区文件直接迁移到 `downloads/persistent`。

### Changed
- 新增 `POST /file-transfer/file/promote`，且仅允许 `temp -> persistent`。
- 提升文件时同步迁移访问统计，避免转永久后热度数据丢失。
- 文件列表卡片和详情抽屉对临时文件显示“转为永久”按钮。

## 2026-07-12

### Changed
- `file-transfer` 新增第一版永久文件区支持，可通过 `storage=persistent` 将文件上传到 `downloads/persistent`。
- `GET /file-transfer/files`、上传分片完成和删除流程新增 storage 感知，列表项返回 `storage` 与 `relativePath` 元数据。
- `views/file-transfer.ejs` 新增上传位置选择、目录范围筛选和存储位置展示。
- 文件访问统计 key 从文件名升级为相对路径，避免临时区与永久区同名文件串统计。

## 2026-07-11

### Changed
- 精简 `views/api-doc-template.ejs` 展示：移除“上游信息”chip 与底部“模板说明”区块。

## 2026-07-11

### Added
- 新增可复用接口文档模板页面 `views/api-doc-template.ejs`。
- 新增小红书搜索文档实例页 `views/api-doc-xiaohongshu-search-notes-v2.ejs`。
- 新增文档路由 `GET /docs/xiaohongshu/search_notes_v2`。

### Changed
- 首页服务卡片新增“小红书搜索文档”入口（`GET /docs/xiaohongshu/search_notes_v2`）。

## 2026-07-11

### Changed
- `th_xiaohongshu.search_notes_v2` 上游接口由 `xiaohongshu/app/search_notes_v2` 切换为 `xiaohongshu/app_v2/search_notes`。
- `search_notes_v2` 增加参数兼容映射，支持旧字段（`sort/type/publish_time`）与新字段（`sort_type/note_type/time_filter`）并存。
- `search_notes_v2` 新增透传分页上下文参数：`search_id`、`search_session_id`，并支持 `source`、`ai_mode`。
- `search_notes_v2` 的 `api_key` 扣费从 1 分调整为 2 分。
- `search_notes_v2` 返回结构规整为 `data.posts`（帖子核心字段）与 `data.pagination`（翻页关键字段）。
- 修复 `search_notes_v2` 的图片映射：补齐 `images_list` 的 `url/url_size_large` 提取，避免 `posts[].images` 漏图。

### Notes
- 本地路由路径与返回外层结构保持不变，仍为 `POST /xiaohongshu/search_notes_v2` + `{ code, msg, data }`。

## 2026-07-10

### Added
- 新增网络日志分析页面 `GET /network-dashboard`，用于可视化查看 `network.log` 的核心指标。
- 新增接口 `GET /network-dashboard/metrics`，返回状态分布、Top 路径、慢请求和分钟趋势。
- 新增 `utils/networkAnalytics.js` 作为统一日志聚合模块。
- 新增 `views/network-dashboard.ejs` 单页看板。

### Changed
- `utils/networkLogger.js` 增加日志双写 Redis（并保留文件日志），用于看板实时/近实时分析。
- `routes/navigationRoutes.js` 增加“网络日志看板”服务卡片入口和 sitemap 页面条目。
- `views/network-dashboard.ejs` 增强交互与视觉：新增自动刷新开关/周期、状态码分色图例、Top 路径占比条。

### Notes
- 兼容现有 API 行为，无破坏性变更。
- Redis 无数据时，看板分析模块会尝试从 `downloads/network.log` 自动回填近期日志。
