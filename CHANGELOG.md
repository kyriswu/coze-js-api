# CHANGELOG

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
