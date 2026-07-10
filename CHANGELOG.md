# CHANGELOG

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
