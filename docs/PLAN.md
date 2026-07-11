# PLAN

## 2026-07-11 / add-reusable-api-doc-page-for-xiaohongshu-search-notes-v2

### Objective
新增一个可复用的接口文档 HTML 模板页，并先落地 `/xiaohongshu/search_notes_v2` 的调用示例和返回参数说明页面。

### Context
需要把接口使用说明以独立页面展示，且页面结构应可复用于后续其他接口文档。

### Scope
- `views/api-doc-template.ejs`：通用文档模板。
- `views/api-doc-xiaohongshu-search-notes-v2.ejs`：当前接口实例页。
- `routes/navigationRoutes.js`：新增文档路由与首页入口卡片。

### Plan
1. 设计可复用的文档模板结构（概览、参数表、curl、返回参数、返回示例、翻页说明）。
2. 为 `/xiaohongshu/search_notes_v2` 提供实例化文档数据并渲染独立页面。
3. 在路由中新增 `GET /docs/xiaohongshu/search_notes_v2`。
4. 在首页服务卡片新增该文档入口，便于发现。
5. 执行语法与模板渲染校验并同步 QA/RELEASE/CHANGELOG。

### Risks
- 若接口字段变更，文档示例与真实响应可能出现偏差，需要定期同步。

### Validation
- `node --check routes/navigationRoutes.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-template.ejs',{doc:{}}); console.log('api-doc-template.ejs render ok');"`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-xiaohongshu-search-notes-v2.ejs',{doc:{}}); console.log('api-doc-xiaohongshu-search-notes-v2.ejs render ok');"`

## 2026-07-11 / migrate-xiaohongshu-search-notes-v2-upstream

### Objective
将 `/xiaohongshu/search_notes_v2` 的上游调用切换到 TikHub App V2 搜索接口，并保持现有返回字段与兼容调用方式不变。

### Context
旧实现使用 `/api/v1/xiaohongshu/app/search_notes_v2`（`sort/type/publish_time` 参数），新上游为 `/api/v1/xiaohongshu/app_v2/search_notes`（`sort_type/note_type/time_filter` 等参数）。

### Scope
- `utils/tikhub.io.js`：仅调整 `th_xiaohongshu.search_notes_v2`。
- 保持路由、计费逻辑和响应外层结构 `{ code, msg, data }` 不变。

### Plan
1. 切换上游 URL 至 `/api/v1/xiaohongshu/app_v2/search_notes`。
2. 增加入参兼容映射：
	- `sort`/`sort_type` -> `sort_type`
	- `type`/`note_type` -> `note_type`
	- `publish_time`/`time_filter` -> `time_filter`
3. 支持透传翻页上下文（`search_id`、`search_session_id`）及可选参数（`source`、`ai_mode`）。
4. 将扣费从 1 分调整为 2 分。
5. 依据上游真实返回，规整输出为 `data.posts + data.pagination`，去除无用透传字段。
6. 执行最小语法校验并同步 QA/RELEASE/CHANGELOG。

### Risks
- App V2 上游返回体字段名可能变化；需持续保持列表字段兜底逻辑。
- 旧调用方可能混用中英文排序/类型值；需保持映射宽容。

### Validation
- `node --check utils/tikhub.io.js`

## 2026-07-10 / implement-network-log-dashboard-mvp

### Objective
开发一个专用单页看板，用于分析 `downloads/network.log`，并以可视化方式展示核心请求指标。

### Context
当前日志以 JSONL 写入本地文件，直接在浏览器解析大日志会造成性能负担。已确认采用“写日志时同步入 Redis + 看板读 Redis 聚合结果”的架构。

### Scope
- `utils/networkLogger.js`：日志双写（文件 + Redis），并限制 Redis 事件列表长度。
- `utils/networkAnalytics.js`（新增）：统一计算 MVP 指标（状态分布、Top 路径、慢请求、时间趋势）。
- `index.js`：新增 `GET /network-dashboard/metrics` 数据接口。
- `routes/navigationRoutes.js`：新增 `GET /network-dashboard` 页面路由与服务卡片入口。
- `views/network-dashboard.ejs`（新增）：单页可视化看板。

### Plan
1. 在日志写入路径上增加 Redis 持久化，失败不影响原有日志行为。
2. 提供后端分析层，统一对外输出看板所需数据结构。
3. 新增看板 metrics 接口，保持 `code/msg/data` 返回风格。
4. 新增可视化单页（卡片 + 图表 + 慢请求表）。
5. 增加“Redis 为空时从 `network.log` 自动回填”的首启兜底策略。
6. 完成最小语法和渲染验证并同步 QA/RELEASE/CHANGELOG。

### Risks
- Redis 不可用时看板数据会降级为空，但不能影响主流程日志记录。
- 回填读取大日志会增加首次分析耗时，需要控制扫描上限。

### Validation
- `node --check utils/networkLogger.js`
- `node --check utils/networkAnalytics.js`
- `node --check index.js`
- `node --check routes/navigationRoutes.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/network-dashboard.ejs',{seo:{}}); console.log('network-dashboard.ejs render ok');"`

## 2026-07-10 / retry-gpt-image-2-edit-on-transient-fetch-timeout

### Objective
在 `gpt_image_2_edit` 遇到瞬时网络抖动或 undici 头超时时自动进行有限重试，降低用户侧 `fetch failed` 失败率。

### Context
线上出现 `UND_ERR_HEADERS_TIMEOUT` 导致 `Error in /gpt-image-2/generate: 编辑图像失败: fetch failed`，当前逻辑在首次失败时直接返回错误。

### Scope
- `utils/ThirdParrtyApi/aitoken.js`：仅调整编辑图请求发送逻辑。
- 不改动接口入参、路由路径、响应结构。

### Plan
1. 将编辑请求改为“每次尝试重建 FormData”，避免请求体复用问题。
2. 新增有限重试（默认 2 次重试，共最多 3 次尝试）与指数退避。
3. 仅在可恢复错误上重试：`fetch failed`、`UND_ERR_HEADERS_TIMEOUT`、超时/网络类错误，及 408/429/5xx。
4. 保持最终错误包装风格不变：`编辑图像失败: ...`。
5. 执行最小语法校验并记录到 QA/RELEASE/CHANGELOG。

### Risks
- 重试会增加单次请求最长耗时。
- 第三方服务持续故障时仍会失败，但能减少瞬时故障误伤。

### Validation
- `node --check utils/ThirdParrtyApi/aitoken.js`
- `node --check index.js`

## 2026-07-07 / build-google-friendly-sitemap-for-service-crawling

### Objective
建立适合 Google 收录与后续爬虫采集的站点地图体系，覆盖核心页面、服务分类入口和机器可读服务目录。

### Context
现有 `GET /sitemap.xml` 仅包含极少量 URL，无法有效表达站点可抓取范围，也不利于服务目录自动化采集。

### Scope
- `routes/navigationRoutes.js`：重构 sitemap 输出并新增服务目录路由。
- `robots.txt` 保持通过 `Sitemap: /sitemap.xml` 暴露入口。
- 不改动现有业务 API 返回结构。

### Plan
1. 将 `GET /sitemap.xml` 升级为 sitemap index。
2. 新增 `GET /sitemap-pages.xml`，收录核心页面与分类查询入口。
3. 新增 `GET /sitemap-services.xml`，收录服务目录采集入口。
4. 新增 `GET /services/catalog.json`（机器可读）与 `GET /services/catalog.txt`（纯文本）供爬虫直接采集。
5. 执行最小语法验证并同步 QA/RELEASE/CHANGELOG。

### Risks
- 若后续新增页面未同步到 sitemap 生成列表，可能导致收录滞后。
- 第三方跳转页（如 `/plugin`）可收录但不承载站内正文，需与内容页搭配使用。

### Validation
- `node --check routes/navigationRoutes.js`
- `node --check index.js`

## 2026-07-06 / reduce-restart-downtime-in-start-script

### Objective
将部署重启从“全量停机再拉起”改为“仅重建并重启 app 服务”，尽量缩短中断窗口。

### Context
旧脚本使用 `compose down` 会先停掉全部容器，再重新启动，导致服务与 Redis 均出现可感知中断。

### Scope
- `start.sh`：重启流程改造。
- 不修改 API、路由和业务逻辑。

### Plan
1. 使用 `git pull --ff-only` 保证部署拉取行为可预测。
2. 统一抽象 `podman/docker compose` 调用。
3. 先 `compose build app`，再 `compose up -d --no-deps app`。
4. 删除强制 `compose down` 与 `rmi` 操作，避免全局停机。
5. 增加悬空镜像清理，控制磁盘增长。

### Risks
- 单实例 compose 仍会在容器切换时产生短暂抖动，不是严格零停机。
- `--ff-only` 在存在分叉提交时会失败并中断部署。

### Validation
- `bash -n start.sh`

## 2026-07-06 / support-file-transfer-clipboard-paste-upload

### Objective
让文件中转站支持在页面内通过 `Ctrl+V` 直接粘贴剪贴板中的图片或文件，并沿用现有上传队列流程。

### Context
当前页面已支持拖拽和选择文件，但用户在截图或复制文件后仍需额外操作。补齐粘贴能力可降低上传路径成本。

### Scope
- `views/file-transfer.ejs`：新增粘贴解析与入队逻辑，补充交互提示文案。
- 后端接口不变，继续复用 `POST /file-transfer/upload` 与分片上传接口。

### Plan
1. 增加剪贴板文件提取逻辑（优先读取 `clipboardData.items` 中 `kind=file`，回退 `clipboardData.files`）。
2. 监听全局 `paste` 事件，仅在检测到文件时拦截并将文件加入上传队列。
3. 保持现有行为：粘贴后仅入队，不自动上传。
4. 更新页面提示文案，明确支持拖拽/选择/粘贴三种入队方式。
5. 执行最小可行验证并记录到 `docs/QA.md`。

### Risks
- 粘贴事件可能与普通文本粘贴冲突；已通过“仅检测到文件时拦截”降低影响。
- 某些浏览器对剪贴板文件支持有限，可能出现兼容性差异。

### Validation
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`
- `node --check index.js`

## 2026-07-03 / revamp-file-transfer-core-panel-multi-upload

### Objective
完成文件中转站核心界面改版，优先交付现代化管理面板与批量上传体验，不做详情抽屉。

### Context
当前后端 API 已具备文件列表、上传、删除、分页、筛选、排序、统计和近 15 天趋势数据能力。主要缺口在前端交互体验与信息架构。

### Scope
- `views/file-transfer.ejs`：核心页面重构。
- 后端保持兼容，不引入新依赖与破坏性变更。

### Plan
1. 重构布局为上传侧栏 + 管理主区。
2. 新增拖拽上传、多文件队列、逐文件进度。
3. 保留并重组搜索/筛选/排序/分页控制。
4. 将文件操作统一为按钮交互（打开、复制链接、删除）。
5. 保留统计卡片、类型分布和近 15 天图表。
6. 执行最小可行验证并记录到 `docs/QA.md`。

### Risks
- UI 重构可能引入浏览器端交互回归。
- 多文件上传在弱网络下可能出现部分成功场景，需要明确反馈。

### Validation
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`
- `node --check index.js`
