# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 387 nodes · 557 edges · 35 communities (21 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db888c89`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- dependencies
- volcengine.io.js
- staticZipDeployment.js
- evolink.ai.js
- tool.js
- browserless.js
- tikhub.io.js
- CustomError.js
- networkAnalytics.js
- twitter_api.py
- navigationRoutes.js
- networkLogger.js
- package.json
- network-log-analyze.mjs
- redisClient.js
- start.sh
- fetch_hot_rise_list.py
- google_search.py
- web_search.py
- deploymentRoute.test.js
- htmlContent.js
- hermes-agent.js
- aimlapi.js
- cloudflare.js
- lemonfoxai.js
- server.sh
- transcribe_douyin.sh
- start_lite.sh
- search1api.js
- feishu.js
- firecrawl.js
- tencentapi.js
- zyte.js

## God Nodes (most connected - your core abstractions)
1. `getNetworkDashboardMetrics()` - 11 edges
2. `redis` - 11 edges
3. `reject()` - 10 edges
4. `deployStaticZip()` - 9 edges
5. `unkey` - 9 edges
6. `commonUtils` - 9 edges
7. `emit()` - 7 edges
8. `listDownloadFiles()` - 7 edges
9. `analyze()` - 6 edges
10. `resolveTrustedZipPath()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `extract_pdf_url()` --indirect_call--> `error()`  [INFERRED]
  index.js → test/appLifecycle.test.js
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosError()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosRequest()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logRateLimit()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js

## Import Cycles
- None detected.

## Communities (35 total, 14 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.07
Nodes (37): agent, app, buildChunkSessionDir(), buildFileAccessCountKey(), buildFileAccessHourKey(), buildSafeExistingFilePath(), buildSafeUploadTarget(), buildStorageRelativePath() (+29 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (44): axios, cheerio, @coze/api, dayjs, ejs, express, fluent-ffmpeg, http-proxy-agent (+36 more)

### Community 2 - "volcengine.io.js"
Cohesion: 0.09
Nodes (23): calc_ba_zi, calc_zi_wei, points, commonUtils, CONFIG, qweather_tool, AD_CONSTANTS, tv_search (+15 more)

### Community 3 - "staticZipDeployment.js"
Cohesion: 0.22
Nodes (17): createValidArtifact(), sha256(), ALLOWED_STATIC_EXTENSIONS, assertReleaseRelativeStaticPaths(), assertWithin(), DeploymentRejected, deployStaticZip(), execFile (+9 more)

### Community 4 - "evolink.ai.js"
Cohesion: 0.11
Nodes (9): createApiAccessHelpers(), __dirname, envFilePath, __filename, ensureApiKey(), evolink, FINAL_STATUSES, getAxiosConfig() (+1 more)

### Community 5 - "tool.js"
Cohesion: 0.11
Nodes (16): __dirname, DOWNLOAD_MAX_RETRIES, DOWNLOAD_PARALLEL_CHUNK_SIZE, DOWNLOAD_PARALLEL_CONCURRENCY, DOWNLOAD_PARALLEL_MIN_SIZE, DOWNLOAD_RATE_LIMIT, DOWNLOAD_RETRY_BASE_DELAY, DOWNLOAD_STREAM_HWM (+8 more)

### Community 6 - "browserless.js"
Cohesion: 0.13
Nodes (12): BROWSER_SESSION_SWEEP_INTERVAL_MS, BROWSER_SESSION_TTL_MS, browserless, browserSessionSweeper, closeBrowserSession(), __dirname, disableLoadMedia(), __filename (+4 more)

### Community 7 - "tikhub.io.js"
Cohesion: 0.14
Nodes (9): th_bilibili, th_douyin, th_douyin_billboard, th_tiktok, th_twitter, th_wechat_channels, th_wechat_media, th_xiaohongshu (+1 more)

### Community 8 - "CustomError.js"
Cohesion: 0.13
Nodes (7): BaseError, FileOperationError, InvalidApiKeyError, NotFoundError, QuotaExceededError, RateLimitError, ValidationError

### Community 9 - "networkAnalytics.js"
Cohesion: 0.29
Nodes (14): buildTimeline(), collectLastLines(), DEFAULT_SCAN_LIMIT, getNetworkDashboardMetrics(), incMap(), matchFilters(), minuteStart(), normalizeMethod() (+6 more)

### Community 10 - "twitter_api.py"
Cohesion: 0.33
Nodes (13): Any, ArgumentParser, build_parser(), get_api_key(), main(), normalize_detail(), normalize_search(), pick_first() (+5 more)

### Community 11 - "navigationRoutes.js"
Cohesion: 0.15
Nodes (10): router, serviceCards, serviceCategories, serviceStats, sitemapCategoryItems, sitemapPageItems, aitoken, GPT_IMAGE_EDIT_MAX_RETRIES (+2 more)

### Community 12 - "networkLogger.js"
Cohesion: 0.32
Nodes (11): attachAxiosRateLimitLogger(), emit(), ensureFileLogger(), LOG_MODE, logAxiosError(), logAxiosRequest(), logHttpRequest(), logRateLimit() (+3 more)

### Community 13 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, test (+2 more)

### Community 14 - "network-log-analyze.mjs"
Cohesion: 0.33
Nodes (10): analyze(), DEFAULT_FILE, inc(), main(), parseArgs(), printHelp(), printHuman(), statusClass() (+2 more)

### Community 15 - "redisClient.js"
Cohesion: 0.32
Nodes (4): netdiskapi, redis, config, cozecom

### Community 16 - "start.sh"
Cohesion: 0.38
Nodes (3): restore_nginx_backend(), start.sh script, write_backend()

### Community 17 - "fetch_hot_rise_list.py"
Cohesion: 0.53
Nodes (5): fetch_hot_rise_list(), get_api_key(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY

### Community 18 - "google_search.py"
Cohesion: 0.53
Nodes (5): get_api_key(), google_search(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY（免费版可不填）

### Community 19 - "web_search.py"
Cohesion: 0.60
Nodes (5): get_api_key(), main(), parse_bool(), print_results(), web_search()

## Knowledge Gaps
- **119 isolated node(s):** `router`, `serviceCategories`, `serviceCards`, `serviceStats`, `sitemapPageItems` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `redis` connect `redisClient.js` to `volcengine.io.js`, `evolink.ai.js`, `tool.js`, `browserless.js`, `networkAnalytics.js`, `navigationRoutes.js`, `networkLogger.js`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `commonUtils` connect `volcengine.io.js` to `evolink.ai.js`, `tikhub.io.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `router`, `serviceCategories`, `serviceCards` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07183673469387755 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `volcengine.io.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._