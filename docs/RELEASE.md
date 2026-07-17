# RELEASE

## Security Fix
2026-07-17 / gpt-image-2-atomic-credit-charge

### Summary
修复 GPT-Image-2 在“余额预检”和“成功后扣费”之间可被并发请求绕过的额度窗口。

### What Changed
- 新增严格的原子积分扣减辅助逻辑，只有 Unkey 接受 3 积分扣减后才允许请求进入生图流程。
- `POST /gpt-image-2/generate` 在下载参考图或调用上游前扣费，并移除成功后的第二次扣费。
- `POST /api/gpt-image-2/generate` 的底层 `aitoken.generate` 应用相同规则；余额不足（少于 3 积分）不会调用上游。

### API / Behavior
- 路径、请求体和成功响应结构不变。
- 对已进入生图流程的请求，若后续上游失败，3 积分不退款；这是本次明确确认的计费策略。

### Rollback Notes
- 恢复两个入口“成功后扣费”的旧顺序即可回退行为，但会重新引入并发超额调用风险，不建议作为常规回滚。

## Improvement
2026-07-17 / blue-green-deployment

### Summary
将单容器重启发布改为可验证的蓝绿切换：候选实例先在 loopback 端口启动并通过 `/readyz`，再以原子 Nginx include 切流；旧实例仅在成功切换后排空。

### What Changed
- `index.js` 与 `utils/appLifecycle.js` 新增 `/healthz`、基于 Redis PING 的 `/readyz`，以及 SIGTERM/SIGINT 的 HTTP server 排空。
- `Dockerfile` 在构建期执行 `npm ci --omit=dev` 并复制应用；运行时只挂载 `downloads`，不再挂载宿主源码或 `node_modules`。
- Compose 定义 profile 服务 `app-blue`/`app-green`，映射为 `127.0.0.1:3003` 与 `127.0.0.1:3004`。3001/3002 被宿主无关进程占用，故未使用以避免影响它们。
- 两个 Nginx vhost 共用 `include /etc/nginx/coze-js-api/active-backend.conf`；`start.sh` 仅在候选 healthy、`/readyz` 成功和 `nginx -t` 成功后通过临时文件 + `mv` 修改 active backend 并 reload。
- `start.sh` 失败时停止候选而不改 Nginx；reload 成功后立即把候选标记为承载流量，随后连续 3 次经本机 Nginx `/readyz` 验证。状态持久化或 post-switch 验证失败时，脚本恢复先前 backend；仅验证成功后才后台排空旧色。
- `scripts/cleanup-stopped-app-containers.sh` 与 `coze-js-api-container-cleanup.timer` 每小时检查一次；仅删除本项目 `app`/`app-blue`/`app-green` 中已退出且超过 24 小时的容器。它与 `start.sh` 共用部署锁，不会使用全局 Docker prune，也不会删除 Redis 或其他项目容器。

### Live Deployment Evidence
- 首次候选 blue 已健康，active backend 为 `server 127.0.0.1:3003;`。
- `https://coze-js-api.devtool.uk/` 和 `https://coze-js-api-noproxy.devtool.uk/` 均实测 HTTP 200；blue `/readyz` 返回 `{"status":"ready"}`。
- legacy 在确认无活跃 3000 TCP 连接后退出（exit 143，`restart=no`）；宿主 3000 不再监听。
- 后续 `blue → green` 已真实执行：green active backend 为 `server 127.0.0.1:3004;`；其经本机 Nginx 的连续 3 次 `/readyz` 均成功，blue 后台优雅排空并以 exit 0 退出。两个 HTTPS vhost 的 `/` 与 `/readyz` 均实测 HTTP 200。

### Rollback Notes
1. 保持 blue 运行即可回到已验证的 active 版本；若必须回退到首次迁移前的 legacy 镜像，执行 `docker start coze-js-api-app-1`。
2. 原子恢复 Nginx backend：写入 `server 127.0.0.1:3000;` 到 `/etc/nginx/coze-js-api/active-backend.conf` 的临时文件，`nginx -t` 成功后 `mv` 覆盖并 `systemctl reload nginx`，再将 `/var/lib/coze-js-api/active-color` 写回 `legacy`。
3. 仅在 legacy 可用的健康或业务检查通过后再停止 blue；不要直接编辑 live include 或在未经 `nginx -t` 的情况下 reload。


## Improvement
2026-07-16 / public-static-deployment-no-quota

### Summary
`POST /deployment` 取消 IP 免费额度与 `X-API-Key` 额度校验；任何调用者均可提交已由本服务上传、符合静态发布规则的 ZIP URL。

### What Changed
- 新增 `utils/deploymentRoute.js`，将部署入口收敛为 content-only 请求和 `deployStaticZip` 调用。
- `index.js` 不再查询 Redis 的 IP claim，也不再验证 Unkey API key 或返回 `FREE_DEPLOYMENT_LIMIT_REACHED`。
- 保留原有的 URL allowlist、ZIP/manifest/hash 校验、安全解压、immutable release 与 HTTP 公开校验。

### API / Behavior
- 请求形状保持 `{ "content": "<HTTPS ZIP URL>" }`；`X-API-Key` 不再需要，也不影响部署结果。
- 合格 ZIP 每次调用均返回 HTTP `201` 与独立 immutable release URL；无配额 `429`。

### Resource Boundary
- 此接口不消耗 LLM，但仍会消耗有限的网络、磁盘、CPU 和 Nginx 带宽。当前继续依靠受信本地 URL、ZIP 大小/条目/解压限制和静态类型限制降低滥用面。

### Rollback Notes
- 恢复原 `index.js` 中含 Redis/Unkey 检查的 `/deployment` 路由，并移除 `utils/deploymentRoute.js`；不会删除既有已发布 release。

## Improvement
2026-07-16 / openai-hub-domain-cutover

### Summary
将图像 API 上游从即将停止解析的 `api.openai-hub.com` 切换至 `api.openai-hub.net`。

### What Changed
- `utils/ThirdParrtyApi/aitoken.js` 中的共享 API 基础地址已更新；图像生成与编辑路径保持不变。

### Breaking Changes
- none

### Rollback Notes
- 将共享 API 基础地址恢复为原域名；原域名停止解析后该回滚不可用。

## Improvement
2026-07-15 / static-zip-deployment-executor

### Summary
将 `POST /deployment` 从 Hermes 文本代理替换为可执行、可验证且 fail-closed 的纯静态 ZIP 发布器。

### What Changed
- 新增 `utils/staticZipDeployment.js`：只解析本服务上传目录中的受信 HTTPS ZIP URL；先进行 ZIP 路径、符号链接/可执行文件、文件数量/解压大小/压缩比、静态文件类型、manifest SHA-256 和 dossier 校验，再发布。
- `index.js`：`POST /deployment` 请求体固定为仅 `{ "content": "<HTTPS ZIP URL>" }`，不再调用 Hermes chat-completions。成功后将 `site/` 原子移入 `/app/downloads/static-releases/release-.../`。
- 使用已有的 Nginx 静态根 `/root/coze-js-api/downloads`，新 release 对外地址为 `https://static.devtool.uk/static-releases/release-.../`；没有新增端口、域名、Nginx、Git 或 PM2 操作。

### API / Behavior
- 成功：HTTP `201`，返回 `{ status, releaseId, url, zipSha256, httpVerification }`，其中 `status=deployed`。
- 资格不合格：HTTP `422`，返回 `{ status:"rejected", reason, checks }`；上传成功不等于上线成功。
- 请求体多字段或缺少 `content`：HTTP `400`。
- 非受信 URL 不会被下载，返回 `UNTRUSTED_ARTIFACT_URL`。

### Rollback Notes
- 恢复 `index.js` 中原 `/deployment` 路由并移除 `utils/staticZipDeployment.js`；不影响既有上传文件与已发布 release 目录。

## Improvement
2026-07-15 / file-transfer-upload-https-url

### Summary
`file-transfer` 上传完成响应统一返回 HTTPS 文件链接。

### What Changed
- `index.js`
  - 共享链接生成逻辑固定使用 `https://`，并继续使用请求 Host、存储路径和已编码文件名。
  - `POST /file-transfer/upload` 与 `POST /file-transfer/upload/complete` 均保持复用该逻辑。

### Impact
#### API/Behavior
- 保持 `data.url` 字段和响应结构兼容；两个上传完成接口返回的链接协议由请求协议改为 HTTPS。

### Breaking Changes
- none

### Rollback Notes
- 恢复共享链接生成逻辑使用 `req.protocol`。

## Improvement
2026-07-15 / file-transfer-upload-full-url

### Summary
`file-transfer` 上传完成响应统一返回基于当前请求域名的完整文件链接。

### What Changed
- `index.js`
  - `POST /file-transfer/upload` 与 `POST /file-transfer/upload/complete` 的 `data.url` 均通过同一链接生成逻辑返回。
  - 链接使用请求的协议和 Host；临时文件指向 `/downloads/`，永久文件指向 `/downloads/persistent/`。

### Impact
#### API/Behavior
- 保持既有 `data.url` 字段与响应结构兼容；调用方可直接使用完整链接。

### Breaking Changes
- none

### Rollback Notes
- 恢复为原有的 `data.url` 生成逻辑。

## Enhancement
2026-07-14 / add-hermes-deployment-proxy

### Summary
新增 Hermes chat-completions 薄代理接口，并通过 `POST /deployment` 对外暴露。

### What Changed
- 新增 `utils/ThirdParrtyApi/hermes-agent.js`
	- 封装 `https://hermes.devtool.uk/v1/chat/completions` 的 JSON POST 调用。
	- 固定使用授权值 `Bearer 4f3f1c7d9b2a6e8c5d0f9a1b3e7c2d4f6`。
- 更新 `index.js`
	- 新增 `POST /deployment`。
	- 直接回传 Hermes 上游的状态码与 JSON 响应。
	- 基于最终客户端 IP 增加一次性调用限制，同一 IP 仅允许成功调用一次。
	- 当同一 IP 达到免费次数后，需要提供可用 unkey 才能继续调用。

### Impact
#### API/Behavior
- 新增只读代理入口：`POST /deployment`。
- 默认行为保持薄代理，不额外包装 Hermes 的返回内容。
- `POST /deployment` 对最终客户端 IP 做一次性限制，适配多层代理链路。
- `POST /deployment` 在免费次数耗尽后要求提供 unkey，作为继续使用的兜底通道。

#### Internal Modules
- 影响 `index.js`。
- 新增 `utils/ThirdParrtyApi/hermes-agent.js`。

### Breaking Changes
- none

### Rollback Notes
- 删除 `index.js` 中 `/deployment` 路由。
- 删除 `utils/ThirdParrtyApi/hermes-agent.js`。

## Enhancement
2026-07-12 / add-file-transfer-promote-temp-to-persistent

### Summary
为 `file-transfer` 增加“一键转为永久文件”动作，允许把已存在于临时区的文件直接迁移到 `downloads/persistent`，无需重新上传。

### What Changed
- 更新 `index.js`
	- 新增 `POST /file-transfer/file/promote`，仅允许将 `temp` 文件提升到 `persistent`。
	- 提升成功后返回新的 `storage`、`relativePath`、`url` 等文件元数据。
	- 同步迁移文件访问统计 key，避免提升后热度数据断档。
- 更新 `views/file-transfer.ejs`
	- 列表卡片对临时文件新增“转为永久”按钮。
	- 详情抽屉对临时文件新增“转为永久”按钮，永久文件不显示该动作。

### Impact
#### API/Behavior
- 新增只读外观之外的一个写操作：`POST /file-transfer/file/promote`。
- 仅支持 `temp -> persistent`，不支持任意目录之间的通用移动。

#### Internal Modules
- 影响 `index.js`、`views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 中 `/file-transfer/file/promote` 路由与访问统计迁移逻辑。
- 回滚 `views/file-transfer.ejs` 中“转为永久”按钮与调用逻辑。

## Enhancement
2026-07-12 / add-file-transfer-persistent-storage-first-slice

### Summary
为 `file-transfer` 增加第一版永久文件区，支持把手动保留文件上传到 `downloads/persistent`，并在页面中按临时区/永久区进行查看和删除。

### What Changed
- 更新 `index.js`
	- 新增 `temp` 与 `persistent` 两个 file-transfer 存储白名单。
	- `GET /file-transfer/files` 新增 `storage` 维度筛选，并返回 `storage`、`relativePath` 元数据。
	- `POST /file-transfer/upload`、`POST /file-transfer/upload/chunk`、`POST /file-transfer/upload/complete`、`DELETE /file-transfer/file` 支持 `storage` 参数。
	- 文件访问统计 key 从纯文件名升级为相对路径，避免临时区与永久区同名文件统计串扰。
- 更新 `views/file-transfer.ejs`
	- 新增上传位置选择：临时文件 `/downloads`、永久文件 `/downloads/persistent`。
	- 新增列表范围筛选：全部目录、临时区、永久区。
	- 文件卡片与详情面板新增存储位置信息，删除操作按 storage 定位文件。

### Impact
#### API/Behavior
- `file-transfer` 默认行为仍兼容旧逻辑：未传 `storage` 时继续写入临时区 `downloads/`。
- 新增 `storage=persistent` 后，可显式写入 `downloads/persistent/`。

#### Internal Modules
- 影响 `index.js`、`views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 中 file-transfer 的 storage 白名单与路径级访问统计逻辑。
- 回滚 `views/file-transfer.ejs` 中上传位置选择与目录范围筛选 UI。

## Improvement
2026-07-11 / simplify-api-doc-template-display-for-xiaohongshu-page

### Summary
精简接口模板页展示，移除“上游信息”与底部“模板说明”，提升对外阅读聚焦度。

### What Changed
- 更新 `views/api-doc-template.ejs`
	- 删除 Hero 区域的“上游”信息 chip。
	- 删除页面底部模板说明区块。

### Impact
#### API/Behavior
- 不影响任何接口行为，仅影响文档页面展示内容。

#### Internal Modules
- 仅影响 `views/api-doc-template.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/api-doc-template.ejs` 对上游 chip 与 footer 区块的移除改动。

## Enhancement
2026-07-11 / add-reusable-api-doc-page-for-xiaohongshu-search-notes-v2

### Summary
新增可复用的接口文档模板页，并落地 `/xiaohongshu/search_notes_v2` 的独立文档页面，集中展示调用示例与返回参数。

### What Changed
- 新增 `views/api-doc-template.ejs`
	- 提供统一文档结构：接口概览、请求参数表、curl 示例、返回参数、返回示例、翻页说明。
- 新增 `views/api-doc-xiaohongshu-search-notes-v2.ejs`
	- 作为模板实例页，当前只覆盖一个接口。
- 更新 `routes/navigationRoutes.js`
	- 新增路由：`GET /docs/xiaohongshu/search_notes_v2`。
	- 首页服务卡片新增“`GET /docs/xiaohongshu/search_notes_v2`”文档入口。

### Impact
#### API/Behavior
- 不影响业务接口行为，仅新增文档展示页面路由。

#### Internal Modules
- 影响 `routes/navigationRoutes.js`。
- 新增 `views/api-doc-template.ejs` 和 `views/api-doc-xiaohongshu-search-notes-v2.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 删除文档路由与首页文档入口卡片。
- 删除两个新增视图文件。

## Enhancement
2026-07-11 / migrate-xiaohongshu-search-notes-v2-upstream

### Summary
小红书搜索接口上游切换至 TikHub App V2，兼容历史调用参数并保持现有返回结构不变。

### What Changed
- 更新 `utils/tikhub.io.js`
	- `th_xiaohongshu.search_notes_v2` 上游地址由 `/app/search_notes_v2` 调整为 `/app_v2/search_notes`。
	- 增加兼容映射：`sort/type/publish_time` 与 `sort_type/note_type/time_filter` 双写法均可使用。
	- 新增透传参数支持：`search_id`、`search_session_id`、`source`、`ai_mode`。
	- `api_key` 场景扣费由 1 分调整为 2 分。
	- 响应数据规整为 `data.posts` 与 `data.pagination`，聚焦帖子与翻页关键信息，移除无用透传字段。

### Impact
#### API/Behavior
- 不变更本地路由 `POST /xiaohongshu/search_notes_v2`。
- 不变更外层响应结构：`{ code, msg, data }`。

#### Internal Modules
- 仅影响 `utils/tikhub.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `search_notes_v2` 的上游 URL 与参数映射改动。

## Enhancement
2026-07-10 / enhance-network-dashboard-visual-and-auto-refresh

### Summary
网络日志看板第二轮增强：新增自动刷新控制、状态码分色图例、Top 路径占比展示，提升监控可读性和连续观察体验。

### What Changed
- 更新 `views/network-dashboard.ejs`
	- 新增自动刷新开关与周期选择（10/20/30/60 秒）。
	- 状态码分布图新增类别颜色映射（1xx~5xx/unknown）与占比图例。
	- Top 路径面板新增占比进度条列表，展示请求占比与数量。
	- 保持响应式布局与窗口 resize 重绘行为。

### Impact
#### API/Behavior
- 不新增后端接口，不改变 `GET /network-dashboard/metrics` 返回结构。
- 页面默认开启自动刷新（30 秒），可手动关闭。

#### Internal Modules
- 仅影响 `views/network-dashboard.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/network-dashboard.ejs` 中自动刷新控件、状态图例与路径占比区域相关代码。

## Enhancement
2026-07-10 / implement-network-log-dashboard-mvp

### Summary
新增 `network.log` 专用可视化单页看板，并接入 Redis 写入与后端聚合分析能力，用于快速定位状态分布、热点路径和慢请求。

### What Changed
- 新增 `utils/networkAnalytics.js`
	- 提供统一聚合能力：状态码分布、Top 路径、慢请求、分钟趋势。
	- 支持过滤参数（窗口、method、level、tag、pathContains）。
	- Redis 为空时自动回填 `downloads/network.log` 最近日志。
- 更新 `utils/networkLogger.js`
	- 日志写入路径新增 Redis 双写（列表保留上限可配置）。
	- Redis 异常降级为错误日志，不中断原有写日志流程。
- 更新 `index.js`
	- 新增 `GET /network-dashboard/metrics`。
- 更新 `routes/navigationRoutes.js`
	- 新增 `GET /network-dashboard` 页面路由。
	- 首页服务卡片新增“网络日志看板”入口。
	- sitemap 增加 `/network-dashboard` 页面条目。
- 新增 `views/network-dashboard.ejs`
	- 单页看板包含统计卡片、状态分布图、Top 路径图、趋势图、慢请求表。

### Impact
#### API/Behavior
- 新增只读接口：`GET /network-dashboard/metrics`。
- 不影响既有业务接口与响应结构。

#### Internal Modules
- 影响 `utils/networkLogger.js`、`index.js`、`routes/navigationRoutes.js`。
- 新增 `utils/networkAnalytics.js`、`views/network-dashboard.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚新增文件 `utils/networkAnalytics.js`、`views/network-dashboard.ejs`。
- 回滚 `index.js` 的 `/network-dashboard/metrics` 路由。
- 回滚 `routes/navigationRoutes.js` 的看板页面/服务入口/sitemap 条目。
- 回滚 `utils/networkLogger.js` Redis 双写逻辑。

## Hotfix
2026-07-10 / retry-gpt-image-2-edit-on-transient-fetch-timeout

### Summary
为 `gpt-image-2` 编辑流程增加瞬时故障重试，缓解第三方 `fetch failed`/`UND_ERR_HEADERS_TIMEOUT` 导致的偶发失败。

### What Changed
- 更新 `utils/ThirdParrtyApi/aitoken.js`
	- `gpt_image_2_edit` 改为每次尝试重建 `FormData` 请求体。
	- 新增有限重试与指数退避（默认 2 次重试）。
	- 仅在瞬时错误场景重试：网络/超时类异常与 HTTP 408/429/5xx。
	- 保持既有错误包装格式 `编辑图像失败: ...`。

### Impact
#### API/Behavior
- 不改变 `POST /gpt-image-2/generate` 的入参和返回结构。
- 在第三方编辑接口偶发超时场景下，成功率提升，失败更可恢复。

#### Internal Modules
- 仅影响 `utils/ThirdParrtyApi/aitoken.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/ThirdParrtyApi/aitoken.js` 中 `gpt_image_2_edit` 的重试循环与重建请求体逻辑。

## Enhancement
2026-07-07 / build-google-friendly-sitemap-for-service-crawling

### Summary
升级站点地图为 Google 友好的分表结构，并新增机器可读服务目录接口，便于后续爬虫按分类稳定采集服务清单。

### What Changed
- 更新 `routes/navigationRoutes.js`
	- 将 `GET /sitemap.xml` 从单一 `urlset` 升级为 `sitemapindex`。
	- 新增 `GET /sitemap-pages.xml`：聚合核心页面与分类入口 URL。
	- 新增 `GET /sitemap-services.xml`：聚合服务采集入口 URL。
	- 新增 `GET /services/catalog.json`：返回结构化服务目录（支持 `category` 过滤）。
	- 新增 `GET /services/catalog.txt`：返回纯文本服务目录（TSV 风格）。
- `GET /robots.txt` 继续通过 `Sitemap: /sitemap.xml` 提供统一发现入口。

### Impact
#### API/Behavior
- 搜索引擎与爬虫可通过统一 sitemap index 发现更多可采集入口。
- 新增两个只读服务目录接口，不影响既有业务接口协议。

#### Internal Modules
- 仅影响 `routes/navigationRoutes.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `routes/navigationRoutes.js` 中 sitemap 与服务目录相关路由。
- 将 `GET /sitemap.xml` 恢复为旧版单文件输出。

## Hotfix
2026-07-06 / reduce-restart-downtime-in-start-script

### Summary
优化部署脚本重启流程，避免每次更新时先停掉整套容器，降低服务中断时长。

### What Changed
- 更新 `start.sh`
	- 新增 `#!/usr/bin/env bash` 与 `set -euo pipefail` 提升脚本健壮性。
	- `git pull` 调整为 `git pull --ff-only`，避免隐式 merge。
	- 保持 Podman 优先、Docker 回退，并统一为单一 compose 调用函数。
	- 移除 `compose down` 与强制 `rmi`。
	- 改为先 `compose build app`，再 `compose up -d --no-deps app`。
	- 增加悬空镜像清理（失败不阻断发布）。

### Impact
#### API/Behavior
- 不影响 API 行为。
- 部署时从“全量停机重启”改为“仅 app 服务重建切换”，中断窗口显著缩短。

#### Internal Modules
- 影响 `start.sh`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `start.sh` 到旧版 `compose down` 流程（不推荐）。

## Enhancement
2026-07-06 / support-file-transfer-clipboard-paste-upload

### Summary
文件中转站新增页面内 `Ctrl+V` 粘贴上传入队能力，支持直接粘贴剪贴板中的图片或文件。

### What Changed
- 更新 `views/file-transfer.ejs`
	- 新增剪贴板文件提取逻辑（`clipboardData.items`/`clipboardData.files`）。
	- 新增全局 `paste` 监听：检测到文件时直接加入上传队列。
	- 保持上传节奏不变：粘贴后仅入队，用户手动点击“开始上传”。
	- 更新上传区提示文案，明确支持拖拽/选择/粘贴（Ctrl+V）。

### Impact
#### API/Behavior
- 不涉及后端 API 变更。
- 前端上传交互新增“粘贴即入队”路径，减少中间步骤。

#### Internal Modules
- 影响 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/file-transfer.ejs` 中粘贴事件监听与剪贴板文件解析逻辑。

## Hotfix
2026-07-04 / broaden-file-access-tracking-beyond-download-route

### Summary
文件访问统计从“下载路由计数”升级为“静态资源访问行为计数”，覆盖直链与命令行访问。

### What Changed
- 更新 `index.js`
	- 移除仅针对 `GET /downloads/:filename` 的计数路由。
	- 新增静态资源前置计数中间件。
	- 在 `/downloads/*` 与 `/audio/*` 的成功响应后统一写入 Redis 访问计数。

### Impact
#### API/Behavior
- 统计语义从“下载”扩大为“访问行为”。
- 支持统计浏览器直链、`wget/curl`、`HEAD`、分段请求等访问。

#### Internal Modules
- 影响 `index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 静态前置计数中间件，恢复到原 `GET /downloads/:filename` 计数方式。

## Enhancement
2026-07-04 / compact-overview-to-prioritize-file-list

### Summary
优化文件中转站信息层级：将统计展示区默认折叠，优先保证文件列表首屏可见。

### What Changed
- 更新 `views/file-transfer.ejs`
	- 新增“数据概览（可展开）”容器。
	- 将统计卡片、趋势图与热门榜单收纳到概览区。
	- 概览区默认折叠，支持展开/收起切换。

### Impact
#### API/Behavior
- 不涉及 API 变更。
- 页面信息展示顺序优化，文件列表更靠前。

#### Internal Modules
- 影响 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/file-transfer.ejs` 的概览折叠容器与切换逻辑。

## Enhancement
2026-07-04 / add-24h-access-stats-and-topn-hot-files

### Summary
文件中转站新增“最近 24h 访问量”和“Top N 热门文件”榜单，并接入 Redis 小时级聚合。

### What Changed
- 更新 `index.js`
	- 下载访问埋点新增小时桶计数键（按小时聚合，48h 过期）。
	- `GET /file-transfer/files` 返回新增：
		- `accessStats.totalAccess24h`
		- `hotTopN`（可通过 `topN` 参数控制，默认 8）
- 更新 `views/file-transfer.ejs`
	- 新增“最近 24h 访问量”统计卡片。
	- 新增“Top N 热门文件”展示区（按访问总数排序）。

### Impact
#### API/Behavior
- `GET /file-transfer/files` 返回结构扩展（向后兼容）：`accessStats` 与 `hotTopN`。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 小时聚合与 `hotTopN/accessStats` 返回。
- 回滚 `views/file-transfer.ejs` 新增统计卡片和热门榜单区域。

## Enhancement
2026-07-04 / add-file-access-count-with-redis

### Summary
文件中转站接入 Redis 访问计数，支持按文件查看累计访问次数。

### What Changed
- 更新 `index.js`
	- 新增访问计数键生成逻辑。
	- 为 `GET /downloads/:filename` 增加访问埋点（成功响应后 `INCR`）。
	- `GET /file-transfer/files` 回填每个文件的 `accessCount`。
- 更新 `views/file-transfer.ejs`
	- 文件卡片新增“访问 N”标签。
	- 详情抽屉新增“访问次数”字段。

### Impact
#### API/Behavior
- `GET /file-transfer/files` 返回新增 `accessCount`（向后兼容扩展字段）。
- 文件访问路径不变：`/downloads/<filename>`。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 访问埋点与 `accessCount` 回填逻辑。
- 回滚 `views/file-transfer.ejs` 访问次数展示。

## Hotfix
2026-07-04 / harden-chunk-complete-and-searchable-filename

### Summary
继续修复大文件分片上传最后一步卡住的问题：增强合并请求稳定性，并优化保存文件名可搜索性。

### What Changed
- 更新 `views/file-transfer.ejs`
	- 分片合并请求改为 query 参数提交，避免依赖 JSON body。
	- 合并请求增加超时与重试机制。
	- 分片成功后队列状态明确更新为“上传成功”。
	- 上传会话 ID 改为稳定可复用形式（基于文件名/大小/修改时间）。
- 更新 `index.js`
	- 合并成功返回增加 `uploadId`。
	- 文件落盘命名策略改为“原文件名前缀 + 时间戳 + 随机后缀”，便于搜索。

### Impact
#### API/Behavior
- `POST /file-transfer/upload/complete` 仍兼容 body/query，前端默认使用 query。
- 上传成功文件在列表中更易按原名关键字搜索。

#### Internal Modules
- 影响 `views/file-transfer.ejs` 与 `index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/file-transfer.ejs` 合并请求重试与会话 ID 逻辑。
- 回滚 `index.js` 文件命名策略和合并响应字段变更。

## Hotfix
2026-07-03 / fix-file-transfer-upload-http2-interruption-with-chunking

### Summary
针对大文件上传过程中出现的 `ERR_HTTP2_PING_FAILED` / 网络异常，文件中转站新增分片上传与服务端合并机制，降低单请求链路中断风险。

### What Changed
- 更新 `index.js`
	- 新增分片上传接口：`POST /file-transfer/upload/chunk`。
	- 新增合并接口：`POST /file-transfer/upload/complete`。
	- 新增分片会话目录安全处理与路径校验。
- 更新 `views/file-transfer.ejs`
	- 新增大文件自动分片上传策略（阈值 16MB，分片 8MB）。
	- 小文件继续走原单请求上传，保持兼容。
	- 分片上传时队列状态显示当前分片进度。

### Impact
#### API/Behavior
- 保留原接口：`POST /file-transfer/upload`。
- 新增接口：`POST /file-transfer/upload/chunk`、`POST /file-transfer/upload/complete`。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 分片上传与合并接口。
- 回滚 `views/file-transfer.ejs` 分片上传调用逻辑。

## Enhancement
2026-07-03 / add-file-transfer-detail-drawer

### Summary
文件中转站新增详情抽屉，支持在列表页内查看单文件丰富元信息与快捷操作。

### What Changed
- 更新 `views/file-transfer.ejs`
	- 文件卡片新增“查看详情”操作按钮。
	- 新增右侧详情抽屉，展示：类型、体积、创建/更新时间、访问链接、相对路径。
	- 抽屉内保留文件预览并新增快捷操作：打开、复制链接、删除。
	- 新增遮罩点击关闭和 `Esc` 快捷关闭交互。

### Impact
#### API/Behavior
- 不新增 API，不修改后端响应结构。
- 页面交互能力增强。

#### Internal Modules
- 影响 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/file-transfer.ejs` 中详情抽屉相关结构、样式和脚本逻辑。

## Enhancement
2026-07-03 / revamp-file-transfer-core-panel-multi-upload

### Summary
文件中转站完成核心面板改版，升级为更现代的文件管理体验，支持拖拽与多文件队列上传。

### What Changed
- 更新 `views/file-transfer.ejs`
	- 重构页面信息架构：上传侧栏 + 管理主区。
	- 新增拖拽上传与多文件队列上传，显示逐文件进度与状态。
	- 文件列表改为卡片式管理视图，保留行内媒体预览能力。
	- 将文件操作改为按钮式：打开文件、复制链接、删除文件。
	- 保留并重排搜索、排序、类型筛选、分页、统计卡片与近 15 天图表。

### Impact
#### API/Behavior
- 不新增后端 API，沿用现有 `/file-transfer/files`、`/file-transfer/upload`、`/file-transfer/file`。
- 页面交互升级，不改变服务端返回结构。

#### Internal Modules
- 影响 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/file-transfer.ejs` 到改版前版本。

## Enhancement
2026-07-03 / add-file-transfer-inline-rich-media-preview

### Summary
文件中转站页面新增行内富媒体预览，便于直接查看常见媒体文件而无需跳转打开。

### What Changed
- 更新 `views/file-transfer.ejs`
	- 文件列表新增“预览”列。
	- 图片文件支持缩略图预览。
	- 音频文件支持行内播放器预览。
	- 视频文件支持行内播放器预览。
	- PDF 文件支持行内 iframe 预览。
	- 其他类型显示“不可预览”，仍保留原始 URL 访问方式。

### Impact
#### API/Behavior
- 不新增 API，不修改后端返回结构。
- 页面展示层增强。

#### Internal Modules
- 影响 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/file-transfer.ejs` 的预览列与媒体组件渲染逻辑。

## Hotfix
2026-07-02 / add-volcengine-task-query-endpoint-without-local-apikey

### Summary
新增 Volcengine 视频任务查询接口封装，并在本地提供无需项目 `api_key` 的查询路由。

### What Changed
- 更新 `utils/volcengine.io.js`
	- 在 `ve_contents_generations_tasks` 中新增 `get_task` 方法。
	- 转发上游 `GET /api/v3/contents/generations/tasks/{task_id}`。
	- 查询流程不再校验本地项目 `api_key`。
- 更新 `index.js`
	- 新增路由 `GET /volcengine/contents/generations/tasks/:task_id`。

### Query Example
```bash
curl --request GET \
  --url http://127.0.0.1:3000/volcengine/contents/generations/tasks/cgt-20260702191225-gvkdq
```

### Impact
#### API/Behavior
- 新增本地任务查询入口，返回结构保持 `code/msg/data`。
- 查询接口无需本地 `api_key`。

#### Internal Modules
- 影响 `utils/volcengine.io.js` 与 `index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/volcengine.io.js` 中 `get_task` 相关改动。
- 回滚 `index.js` 中新增查询路由。

## Hotfix
2026-07-02 / set-global-request-body-limit-500mb

### Summary
将服务全局默认请求体大小限制提升为 500MB，缓解上传 zip 文件时的 413 问题。

### What Changed
- 更新 `index.js`
	- 新增统一配置：`globalBodyLimit`，默认值为 `500mb`。
	- `express.json` 与 `express.text` 统一使用该限制。
	- `/file-transfer/upload` 的 `express.raw` 限制由 `100mb` 提升为统一配置值。
	- 支持环境变量 `REQUEST_BODY_LIMIT` 覆盖默认值。

### Impact
#### API/Behavior
- API 路径与返回结构不变。
- 请求体上限默认提升为 500MB。

#### Internal Modules
- 影响 `index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 的 body limit 统一配置。

## Feature
2026-07-02 / enhance-file-transfer-delete-filter-sort-dashboard

### Summary
文件中转站增强为可管理视图：支持手动删除文件、按大小排序、按类型筛选、类型数量统计，以及最近 15 天创建数量日看板。

### What Changed
- 更新 `index.js`
	- 扩展 `GET /file-transfer/files`：支持 `fileType/sortBy/sortOrder`。
	- 列表返回新增：
		- `typeStats`（文件类型计数）
		- `recent15Days`（近 15 天每日创建数量）
		- `recent30Days`（兼容字段，当前与 `recent15Days` 保持一致）
	- 新增 `DELETE /file-transfer/file`，支持按文件名删除。
- 更新 `views/file-transfer.ejs`
	- 新增类型筛选和排序控件。
	- 新增每行删除按钮（带确认弹窗）。
	- 新增类型统计标签区域。
	- 新增近 15 天日看板（SVG 柱状图，支持 hover 显示日期和数量）。

### Impact
#### API/Behavior
- `GET /file-transfer/files` 返回结构扩展，兼容原有分页字段。
- 新增删除接口：`DELETE /file-transfer/file?filename=...`。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 的删除接口与统计扩展。
- 回滚 `views/file-transfer.ejs` 的筛选/排序/删除/图表功能。

## Enhancement
2026-07-02 / add-file-transfer-pagination

### Summary
文件中转站页面新增分页展示，避免 `downloads/` 文件过多时一次性渲染过载。

### What Changed
- 更新 `index.js`
	- `GET /file-transfer/files` 新增查询参数 `page`、`pageSize`。
	- 返回新增分页元数据：`total/page/pageSize/totalPages`。
	- 默认每页 20 条，`pageSize` 最大限制 100。
- 更新 `views/file-transfer.ejs`
	- 新增分页控件：上一页/下一页。
	- 搜索和刷新会自动回到第 1 页。
	- 页面展示当前页信息。

### Impact
#### API/Behavior
- `GET /file-transfer/files` 向后兼容（不传分页参数时默认第 1 页、20 条）。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 的分页参数与返回字段。
- 回滚 `views/file-transfer.ejs` 的分页控件与逻辑。

## Enhancement
2026-07-02 / isolate-network-logs-from-business-logs

### Summary
将 HTTP 与 axios 网络日志从主业务日志中独立出来，默认写入独立日志文件，减少控制台噪音并保留网络排障能力。

### What Changed
- 新增 `utils/networkLogger.js`
	- 提供统一网络日志输出入口：`logHttpRequest`、`logAxiosRequest`、`logAxiosError`、`logRateLimit`。
	- 支持环境变量控制输出模式：
		- `NETWORK_LOG_MODE=off|console|file|both`（默认 `file`）
		- `NETWORK_LOG_FILE`（默认 `downloads/network.log`）
		- `NETWORK_LOG_HTTP`、`NETWORK_LOG_AXIOS`（默认开启）
- 更新 `index.js`
	- 入站请求日志改为调用 `logHttpRequest`，不再直接 `console.log`。
- 更新 `utils/axiosInterceptors.js`
	- axios 成功/失败/429 日志改为调用独立 logger。

### Impact
#### API/Behavior
- API 行为与响应结构不变。
- 网络日志默认不再占用主控制台输出（除非设置 `NETWORK_LOG_MODE=console|both`）。

#### Internal Modules
- 影响 `utils/networkLogger.js`、`index.js`、`utils/axiosInterceptors.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 与 `utils/axiosInterceptors.js` 的 logger 调用。
- 删除 `utils/networkLogger.js`。

## Feature
2026-07-02 / add-downloads-file-transfer-page

### Summary
新增基于 `downloads/` 目录的文件中转站页面，支持文件查看、搜索、上传任意格式文件，并返回可直接访问的 URL。

### What Changed
- 更新 `routes/navigationRoutes.js`
	- 新增页面路由 `GET /file-transfer`。
	- 首页服务列表新增“文件中转站”入口。
- 更新 `index.js`
	- 新增 `GET /file-transfer/files`：读取 `downloads/` 文件列表并支持 `search` 过滤。
	- 新增 `POST /file-transfer/upload`：接收二进制上传并写入 `downloads/`。
	- 返回统一结构 `code/msg/data`，包含文件名、大小、更新时间、访问 URL。
- 新增 `views/file-transfer.ejs`
	- 提供上传控件、搜索框、文件列表和 URL 展示。
	- 上传成功后自动刷新列表。

### Impact
#### API/Behavior
- 新增页面入口：`GET /file-transfer`。
- 新增接口：`GET /file-transfer/files`、`POST /file-transfer/upload`。
- 复用已有静态托管：`/downloads/<filename>` 直接访问文件。

#### Internal Modules
- 影响 `routes/navigationRoutes.js`、`index.js`、`views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `routes/navigationRoutes.js` 的新页面路由与服务入口。
- 回滚 `index.js` 的列表/上传接口。
- 删除 `views/file-transfer.ejs`。

## Enhancement
2026-07-02 / add-unified-request-and-axios-latency-logging

### Summary
为排查网络问题，新增 Node 入站请求统一日志与 axios 出站请求耗时日志，便于快速定位慢请求和失败请求。

### What Changed
- 更新 `index.js`
	- 新增全局请求日志中间件。
	- 在请求完成时记录 `method/path/status/durationMs/ip`。
- 更新 `utils/axiosInterceptors.js`
	- 新增 axios request 拦截器，记录请求起始时间。
	- 新增 axios response 拦截器日志：成功/失败均记录 `method/url/status/durationMs`。
	- 保留现有 429 详细日志，并补充 `durationMs`。
	- 增加幂等保护，避免拦截器重复挂载导致重复日志。

### Impact
#### API/Behavior
- 不改变任何 API 路由、参数或响应结构。
- 仅增加服务端观测日志输出。

#### Internal Modules
- 影响 `index.js` 与 `utils/axiosInterceptors.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 中新增的请求日志中间件。
- 回滚 `utils/axiosInterceptors.js` 中新增的耗时日志与幂等保护逻辑。

## Hotfix
2026-07-01 / add-volcengine-video-generation-task-wrapper

### Summary
新增火山方舟视频生成任务接口封装，并通过本地路由暴露 `POST /volcengine/contents/generations/tasks`。

### What Changed
- 更新 `utils/volcengine.io.js`
	- 新增 `ve_contents_generations_tasks.create_task`，向上游 `POST /api/v3/contents/generations/tasks` 发起请求。
	- 请求体默认去掉本地 `api_key`，其余业务参数按原样转发。
	- 兼容将字符串形式的 `content` / `tools` 尝试解析为 JSON。
	- 请求超时设置为 30 秒。
- 更新 `index.js`
	- 新增本地路由 `POST /volcengine/contents/generations/tasks`。
	- 路由保持与现有 Volcengine 封装一致的挂载方式。

### Reference Example
```json
{
	"api_key": "your_project_api_key",
	"model": "doubao-seedance-2-0-260128",
	"content": [
		{
			"type": "text",
			"text": "一只猫在雨夜的霓虹街道上缓慢行走，镜头轻微跟随，氛围电影感。"
		},
		{
			"type": "image_url",
			"image_url": {
				"url": "https://example.com/reference-first-frame.png"
			},
			"role": "first_frame"
		},
		{
			"type": "video_url",
			"video_url": {
				"url": "https://example.com/reference-video.mp4"
			},
			"role": "reference_video"
		},
		{
			"type": "audio_url",
			"audio_url": {
				"url": "https://example.com/reference-audio.mp3"
			},
			"role": "reference_audio"
		}
	],
	"generate_audio": true,
	"resolution": "720p",
	"ratio": "16:9",
	"duration": 5,
	"watermark": false
}
```

```bash
curl --request POST \
	--url http://127.0.0.1:3000/volcengine/contents/generations/tasks \
	--header 'Content-Type: application/json' \
	--data '{
		"api_key": "your_project_api_key",
		"model": "doubao-seedance-2-0-260128",
		"content": [
			{
				"type": "text",
				"text": "一只猫在雨夜的霓虹街道上缓慢行走，镜头轻微跟随，氛围电影感。"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-first-frame.png"
				},
				"role": "first_frame"
			},
			{
				"type": "video_url",
				"video_url": {
					"url": "https://example.com/reference-video.mp4"
				},
				"role": "reference_video"
			},
			{
				"type": "audio_url",
				"audio_url": {
					"url": "https://example.com/reference-audio.mp3"
				},
				"role": "reference_audio"
			}
		],
		"generate_audio": true,
		"resolution": "720p",
		"ratio": "16:9",
		"duration": 5,
		"watermark": false
	}'
```

	### Multi-Reference-Image Example
	```json
	{
		"api_key": "your_project_api_key",
		"model": "doubao-seedance-2-0-260128",
		"content": [
			{
				"type": "text",
				"text": "根据多张参考图生成一段统一风格的城市漫步视频，保持人物服装和色调一致。"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-1.png"
				},
				"role": "reference_image"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-2.png"
				},
				"role": "reference_image"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-3.png"
				},
				"role": "reference_image"
			}
		],
		"generate_audio": true,
		"resolution": "720p",
		"ratio": "adaptive",
		"duration": 5,
		"watermark": false
	}
	```

### Impact
#### API/Behavior
- 新增本地视频生成任务创建入口。
- 响应结构保持 `code/msg/data`，其中 `data` 直接透传上游返回。

#### Internal Modules
- 影响 `utils/volcengine.io.js` 与 `index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/volcengine.io.js` 中新增的视频生成任务封装。
- 回滚 `index.js` 中新增的路由。

## Hotfix
2026-06-27 / migrate-wechat-mp-article-list-post-body

### Summary
修复微信公众号文章列表接口上游调用失效问题，切换到新版 body 传参调用方式，并保持本地响应结构兼容。

### What Changed
- 更新 `utils/tikhub.io.js`：`th_wechat_media.get_wechat_mp_article_list`
	- 上游调用从 `GET` 改为 `POST /api/v1/wechat_mp/v2/fetch_account_articles`。
	- 请求参数从 `ghid` 查询参数改为 body `username`，并支持 `page_size/offset/item_show_type/raw`。
	- 本地兼容历史参数：若传入 `gh_id`，内部自动映射为 `username`。
	- 为保持历史 `data` 数组结构一致性，内部固定使用 `raw=false` 请求上游精简结果。
	- 增加 `timeout: 30000` 以适配上游慢响应场景。
	- 返回结构保持兼容：`data` 统一映射为旧版结构 `{ list, offset }`，其中 `list` 来源于上游 `data.articles`。

### Impact
#### API/Behavior
- 本地入口 `POST /wx_gzh/get_user_articles` 不变。
- 成功响应仍为 `code/msg/data`，其中 `data` 为 `{ list, offset }`。
- 计费与鉴权逻辑不变（`valid_redis_key` + `unkey.verifyKey`）。

#### Internal Modules
- 影响 `utils/tikhub.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `get_wechat_mp_article_list` 的本轮改动。

## Feature
2026-06-22 / add-evolink-image-generation-api

### Summary
新增 Evolink 图片生成第三方接口集成，支持提交图片生成任务、查询任务详情，并在本地图片生成接口中自动轮询上游 task 直到返回最终结果。

### What Changed
- 新增 `utils/ThirdParrtyApi/evolink.ai.js`
	- 封装 `image_generation`：提交 `POST /v1/images/generations` 后自动轮询任务结果。
	- 封装 `get_task_detail`：查询 `GET /v1/tasks/{task_id}`。
	- 封装 `wait_task_result`：统一轮询 `pending/processing/completed/failed` 状态并处理超时。
- 更新 `index.js`：新增本地 API 路由
	- `POST /evolink/images/generations`
	- `GET /evolink/tasks/:task_id`
	- `GET /evolink/credits`
- 安全调整：Evolink API Key 不写入仓库文件，改为通过标准 `.env` 文件读取 `EVOLINK_API_KEY`。
- 新增 `.env.example` 作为配置模板，并在启动时通过 `utils/loadEnv.js` 加载 `.env`。
- 使用方式：参考 `.env.example` 手动创建根目录 `.env`；`start.sh` 不负责生成或同步环境文件。

### Impact
#### API/Behavior
- 新增可直接调用的 Evolink 图片生成接口。
- `POST /evolink/images/generations` 不再只返回上游 task 创建结果，而是默认等待最终任务完成后一次性返回。
- `POST /evolink/images/generations` 请求体现在要求提供项目内 `api_key`，并在成功后按 `creditCost` 扣除对应积分。
- `GET /evolink/credits` 为无计费的账号额度查询接口，仅依赖服务端配置的 Evolink 上游 key。
- 返回结构已进一步收敛为：
	- `image`：最终生成图片地址
	- `credit_used`：上游实际消耗额度
	- `creditCost`：按 `ceil(credit_used * 0.12) * 0.05` 计算后的成本字段

#### Internal Modules
- 影响 `utils/ThirdParrtyApi/evolink.ai.js`、`index.js`。

### Breaking Changes
- none

### Rollback Notes
- 删除 `utils/ThirdParrtyApi/evolink.ai.js`。
- 回滚 `index.js` 中 `/evolink/images/generations` 与 `/evolink/tasks/:task_id` 路由。

## Enhancement
2026-06-18 / append-douyin-general-search-id-to-msg

### Summary
优化抖音综合搜索接口 `fetch_general_search_v1` 的提示文案：成功响应时将可用于翻页续搜的 `search_id` 提取并追加到 `msg`。

### What Changed
- 更新 `utils/tikhub.io.js`：`th_douyin.fetch_general_search_v1`
	- 新增 `search_id` 提取链路：`data.search_id -> data.log.search_id -> data.log_pb.impr_id -> data.extra.search_request_id -> data.extra.logid`。
	- 在原有 `msg` 基础上追加提示：`下次搜索search_id为：[search_id]`。

### Impact
#### API/Behavior
- 响应结构保持兼容：`code`、`data` 不变，仅增强 `msg` 文案。
- 用户可直接从 `msg` 获取下次搜索建议使用的 `search_id`。

#### Internal Modules
- 影响 `utils/tikhub.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `fetch_general_search_v1` 的 `search_id` 提取与 `msg` 拼接逻辑。

## Feature
2026-06-17 / add-tiktok-handler-user-profile-api

### Summary
新增 TikTok 指定用户信息接口封装，接入 TikHub `handler_user_profile`，并基于实测优化返回摘要字段。

### What Changed
- 更新 `utils/tikhub.io.js`：在 `th_tiktok` 中新增 `handler_user_profile`。
	- 支持 `sec_user_id > user_id > unique_id` 参数优先级。
	- 参数至少一个必填，且 `user_id` 必须为纯数字字符串。
	- 对接上游 `GET /api/v1/tiktok/app/v3/handler_user_profile`。
	- 成功响应新增 `params_used` 与 `profile` 摘要字段，保留原始 `data`。
- 更新 `index.js`：新增本地 API 路由
	- `POST /tiktok/handler_user_profile`
	- `GET /tiktok/handler_user_profile`

### Impact
#### API/Behavior
- 新增可直接调用的 TikTok 用户信息接口。
- 返回结构保持兼容：`data` 未破坏；新增 `params_used`、`profile` 提升可读性。
- `profile` 统计字段基于实测从 `data.user` 提取，避免错误默认值。

#### Internal Modules
- 影响 `utils/tikhub.io.js`、`index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `handler_user_profile` 相关改动。
- 回滚 `index.js` 中 `/tiktok/handler_user_profile` 路由注册。

## Hotfix
2026-06-12 / align-douyin-transcribe-api-key-messaging

### Summary
统一 `douyin-transcribe-api` 缺少 API Key 场景提示，明确该服务不提供免费 key，避免用户误解。

### What Changed
- 更新 `skills/douyin-transcribe-api/SKILL.md`：
	- 缺 key 提示改为“本服务不提供免费 API Key”。
	- 新增缺 key 强制规则与标准回复模板。
	- 无效 key 指引改为“购买/续费”语义。
- 更新 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`：
	- 缺 key 输出改为购买/续费指引，不再使用“申请或反馈”。

### Impact
#### API/Behavior
- 仅影响技能文案和脚本提示语，不影响接口调用协议与返回结构。
- 缺少 `DOUYIN_TRANSCRIBE_API_KEY` 时，用户将明确获知“不提供免费 key”。

#### Internal Modules
- 影响 `skills/douyin-transcribe-api/SKILL.md` 与 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `skills/douyin-transcribe-api/SKILL.md` 文案改动。
- 回滚 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh` 文案改动。

## Hotfix
2026-06-12 / fix-unkey-required-credits-precheck

### Summary
修复付费接口积分前置校验门槛：当接口成本大于 1 时，调用前会按所需积分校验，避免 `remaining=1` 仍可调用 `gpt-image-2`（成本 3）成功。

### What Changed
- 更新 `utils/apiAccess.js`：`verifyApiAccess` 新增 `requiredCredits` 参数（默认 1）。
- 调整付费校验逻辑：`remaining < requiredCredits` 时返回积分不足。
- 更新 `index.js`：`POST /gpt-image-2/generate` 在校验时传入 `requiredCredits: 3`。

### Impact
#### API/Behavior
- `POST /gpt-image-2/generate` 现在会在调用上游生图服务前拦截余额不足（<3 积分）的请求。
- 其他基于 `verifyApiAccess` 且单次 1 积分的接口行为保持不变。

#### Internal Modules
- 影响 `utils/apiAccess.js`、`index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/apiAccess.js` 中 `requiredCredits` 校验改动。
- 回滚 `index.js` 中 `gpt-image-2` 的 `requiredCredits` 传参。

## Feature
2026-06-09 / redesign-homepage-liquid-ripple-style

### Summary
重设插件服务首页视觉风格，将原本偏规整的服务目录升级为水波纹背景和玻璃质感的潮流展示页。

### What Changed
- 更新 `views/home.ejs` CSS：新增水波纹背景层、流动高光动画和液态视觉变量。
- 调整导航、搜索、分类、统计、付费提示、服务卡片和底部快捷入口为玻璃拟态样式。
- 保持现有服务数据、筛选脚本、二维码位和 API 路由不变。

### Impact
#### UI/Behavior
- 首页视觉更时尚、前卫、潮流。
- 用户仍可按分类和关键词浏览插件服务。

#### Internal Modules
- 仅影响 `views/home.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/home.ejs` 中本轮 CSS 样式调整。

## Feature
2026-06-09 / build-plugin-services-showcase-homepage

### Summary
新增 DevTool 插件服务首页，将原 `/` 的 `Hello World!` 替换为插件服务展示页。

### What Changed
- 新增 `views/home.ejs`：提供分类筛选、关键词搜索、服务统计、插件卡片网格和快捷入口。
- 更新 `routes/navigationRoutes.js`：为 `/` 路由传入插件分类、服务卡片、统计和 SEO 信息。
- 首页移除登录、注册、控制台主入口，定位为纯插件服务展示页。
- 首页新增付费购买提示，直接展示微信 `xiaowu_azt` 和备注“购买插件额度”。
- 新增 `/assets` 静态目录，并在付费提示中预留 `/assets/wechat-qr.png` 二维码图片位。

### Impact
#### API/Behavior
- `GET /` 现在返回插件服务 HTML 页面。
- 现有 API 路由和响应结构不变。

#### Internal Modules
- 影响 `index.js`、`routes/navigationRoutes.js`、`views/home.ejs` 与 `assets/`。

### Breaking Changes
- none

### Rollback Notes
- 将 `/` 路由恢复为 `res.send('Hello World!')`。
- 删除 `views/home.ejs`。

## Hotfix
2026-06-05 / return-local-download-urls-for-volcengine-generated-images

### Summary
调整 `ve_seedream_5_0_lite.generate_image` 返回结果：将上游生成图片下载到本地 `downloads/`，并返回当前服务可访问的本地图片链接。

### What Changed
- 更新 `utils/tool.js`：新增远程图片保存到 `downloads/` 的复用 helper。
- 更新 `utils/volcengine.io.js`：在图片生成成功后逐张下载远程图片。
- 保持外层响应结构不变，仅将 `data.data[].url` 改写为本地 `/downloads/...` 地址，并补充 `remote_url` 便于追踪原始链接。

### Impact
#### API/Behavior
- `ve_seedream_5_0_lite.generate_image` 返回的图片地址从上游临时 URL 改为当前服务的本地静态链接。
- 原有 `code`、`msg`、`data.model`、`data.usage` 等字段保持兼容。

#### Internal Modules
- 影响 `utils/tool.js` 与 `utils/volcengine.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tool.js` 中新增的图片落盘 helper。
- 回滚 `utils/volcengine.io.js` 中的本地下载和 URL 改写逻辑。

## Hotfix
2026-06-02 / fix-gpt-image-2-image-download-timeout-retry

### Summary
修复 `/gpt-image-2/generate` 在下载参考图阶段因 20 秒超时导致的失败问题，增加 1 次可恢复错误重试，提高成功率。

### What Changed
- 更新 `utils/tool.js`：`downloadImageUrlToTempFile` 改为最多 2 次尝试（首次 + 1 次重试）。
- 新增可恢复错误判定：仅对超时/网络临时错误及 `429/5xx` 重试。
- 重试前增加短延迟（600ms）退避。
- 单次下载超时从 20 秒提升到 30 秒。

### Impact
#### API/Behavior
- `POST /gpt-image-2/generate` 下载参考图阶段对瞬时网络问题更稳健。
- 非可恢复错误仍按原逻辑直接失败，避免掩盖输入问题。

#### Internal Modules
- 仅影响 `utils/tool.js` 中图片下载辅助方法。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tool.js` 中 `downloadImageUrlToTempFile` 与 `isRetryableImageDownloadError` 相关改动。

## Summary
本次交付新增了微信公众号文章搜索接口，基于 TikHub `fetch_search_article` 能力对外提供统一路由。

## What Changed
- 在 `utils/tikhub.io.js` 的 `th_wechat_media` 中新增 `fetch_search_article`。
- 在 `index.js` 新增路由：`POST /wx_gzh/fetch_search_article`。
- 新增参数校验与默认值：
	- `keyword` 必填
	- `offset` 默认 `0`
	- `sort_type` 默认 `_0`，限制 `_0/_2/_4`
- 积分计费调整：`/wx_gzh/fetch_search_article` 使用 API Key 调用时每次扣 2 分。
- 稳健性增强：在该接口内新增默认 3 次请求尝试与短随机退避（300-1200ms），用于缓解上游瞬时失败。
- 对接上游：`GET /api/v1/wechat_mp/web/fetch_search_article`。

## Impact
### API/Behavior
- 新增对外接口：`POST /wx_gzh/fetch_search_article`。
- 维持项目统一响应结构 `{code,msg,data}`。

### Internal Modules
- 更新 `th_wechat_media` 模块，扩展微信公众号能力。

## Breaking Changes
- none / 详细描述

## Migration Notes
- 无需迁移；新接口可直接调用。

## API Usage Notes
- OpenAPI 建议：客户端实现 3-5 次重试并加入短暂随机退避，以提高成功率。

## Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `fetch_search_article` 方法。
- 回滚 `index.js` 中 `/wx_gzh/fetch_search_article` 路由。

## Deployment Notes
- 环境变量：
- 启动命令：
- 验证命令：

## Feature
2026-07-17 / add-wechat-universal-search

### Summary
新增微信搜一搜综合搜索接口，按 TikHub 文档提供公众号、文章、视频、直播等垂类搜索与 cursor 翻页能力。

### What Changed
- 在 `utils/tikhub.io.js` 的 `th_wechat_media` 中新增 `fetch_universal_search`。
- 在 `index.js` 新增 `POST /wechat_search/v2/fetch_search`。
- 请求支持 `keyword`、`business_type`、`sort`、`publish_time`、`offset`、`cursor`、`raw` 和可选 `api_key`，并校验文档规定的枚举和值域。
- 上游调用使用 30 秒超时，并以 JSON 文本直通响应，保留 64 位 ID 的精确值。
- 每个身份每天可免费试用 1 次；成功的 API Key 调用扣 3 积分，且调用前要求至少有 3 积分余额。
- `valid_redis_key` 增加可选最低积分参数，既有调用保持默认 1 积分行为不变。

### Impact

#### API/Behavior
- 新增接口：`POST /wechat_search/v2/fetch_search`。
- 该接口响应保持 TikHub 上游 JSON 结构，而非本项目常规包装结构，以避免大整数精度损失。

#### Internal Modules
- 更新 `utils/tikhub.io.js`、`utils/commonUtils.js`、`index.js`，并新增离线单元测试。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中的 `fetch_universal_search`。
- 移除 `index.js` 中 `/wechat_search/v2/fetch_search` 的路由注册。
- 如不再需要最低余额预检，回滚 `utils/commonUtils.js` 的可选 `requiredCredits` 参数。
