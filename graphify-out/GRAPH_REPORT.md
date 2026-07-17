# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 398 nodes · 567 edges · 37 communities (20 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dcd2c698`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- index.js
- volcengine.io.js
- tool.js
- staticZipDeployment.js
- networkLogger.js
- navigationRoutes.js
- evolink.ai.js
- tikhub.io.js
- CustomError.js
- networkAnalytics.js
- twitter_api.py
- package.json
- network-log-analyze.mjs
- appLifecycle.test.js
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
- cleanup-stopped-app-containers.sh
- server.sh
- transcribe_douyin.sh
- start_lite.sh
- cleanupStoppedContainers.test.js
- startScript.test.js
- search1api.js
- feishu.js
- firecrawl.js
- tencentapi.js
- zyte.js

## God Nodes (most connected - your core abstractions)
1. `getNetworkDashboardMetrics()` - 11 edges
2. `redis` - 10 edges
3. `reject()` - 10 edges
4. `deployStaticZip()` - 9 edges
5. `commonUtils` - 9 edges
6. `unkey` - 8 edges
7. `emit()` - 7 edges
8. `listDownloadFiles()` - 7 edges
9. `analyze()` - 6 edges
10. `resolveTrustedZipPath()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosError()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosRequest()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logRateLimit()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js

## Import Cycles
- None detected.

## Communities (37 total, 17 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (44): axios, cheerio, @coze/api, dayjs, ejs, express, fluent-ffmpeg, http-proxy-agent (+36 more)

### Community 1 - "index.js"
Cohesion: 0.09
Nodes (33): agent, app, buildChunkSessionDir(), buildFileAccessCountKey(), buildFileAccessHourKey(), buildSafeExistingFilePath(), buildSafeUploadTarget(), buildStorageRelativePath() (+25 more)

### Community 2 - "volcengine.io.js"
Cohesion: 0.08
Nodes (24): calc_ba_zi, calc_zi_wei, points, commonUtils, CONFIG, qweather_tool, AD_CONSTANTS, tv_search (+16 more)

### Community 3 - "tool.js"
Cohesion: 0.06
Nodes (28): BROWSER_SESSION_SWEEP_INTERVAL_MS, BROWSER_SESSION_TTL_MS, browserless, browserSessionSweeper, closeBrowserSession(), __dirname, disableLoadMedia(), __filename (+20 more)

### Community 4 - "staticZipDeployment.js"
Cohesion: 0.22
Nodes (17): createValidArtifact(), sha256(), ALLOWED_STATIC_EXTENSIONS, assertReleaseRelativeStaticPaths(), assertWithin(), DeploymentRejected, deployStaticZip(), execFile (+9 more)

### Community 5 - "networkLogger.js"
Cohesion: 0.17
Nodes (15): attachAxiosRateLimitLogger(), netdiskapi, emit(), ensureFileLogger(), LOG_MODE, logAxiosError(), logAxiosRequest(), logHttpRequest() (+7 more)

### Community 6 - "navigationRoutes.js"
Cohesion: 0.14
Nodes (11): router, serviceCards, serviceCategories, serviceStats, sitemapCategoryItems, sitemapPageItems, chargeApiCredits(), createApiAccessHelpers() (+3 more)

### Community 7 - "evolink.ai.js"
Cohesion: 0.12
Nodes (8): __dirname, envFilePath, __filename, ensureApiKey(), evolink, FINAL_STATUSES, getAxiosConfig(), { verifyApiAccess, consumeApiCredits }

### Community 8 - "tikhub.io.js"
Cohesion: 0.14
Nodes (9): th_bilibili, th_douyin, th_douyin_billboard, th_tiktok, th_twitter, th_wechat_channels, th_wechat_media, th_xiaohongshu (+1 more)

### Community 9 - "CustomError.js"
Cohesion: 0.13
Nodes (7): BaseError, FileOperationError, InvalidApiKeyError, NotFoundError, QuotaExceededError, RateLimitError, ValidationError

### Community 10 - "networkAnalytics.js"
Cohesion: 0.29
Nodes (14): buildTimeline(), collectLastLines(), DEFAULT_SCAN_LIMIT, getNetworkDashboardMetrics(), incMap(), matchFilters(), minuteStart(), normalizeMethod() (+6 more)

### Community 11 - "twitter_api.py"
Cohesion: 0.33
Nodes (13): Any, ArgumentParser, build_parser(), get_api_key(), main(), normalize_detail(), normalize_search(), pick_first() (+5 more)

### Community 12 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, test (+2 more)

### Community 13 - "network-log-analyze.mjs"
Cohesion: 0.33
Nodes (10): analyze(), DEFAULT_FILE, inc(), main(), parseArgs(), printHelp(), printHuman(), statusClass() (+2 more)

### Community 14 - "appLifecycle.test.js"
Cohesion: 0.27
Nodes (3): createGracefulShutdown(), createHealthHandler(), createReadinessHandler()

### Community 15 - "start.sh"
Cohesion: 0.36
Nodes (5): restore_nginx_backend(), rollback_switched_traffic(), start.sh script, verify_nginx_candidate(), write_backend()

### Community 16 - "fetch_hot_rise_list.py"
Cohesion: 0.53
Nodes (5): fetch_hot_rise_list(), get_api_key(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY

### Community 17 - "google_search.py"
Cohesion: 0.53
Nodes (5): get_api_key(), google_search(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY（免费版可不填）

### Community 18 - "web_search.py"
Cohesion: 0.60
Nodes (5): get_api_key(), main(), parse_bool(), print_results(), web_search()

## Knowledge Gaps
- **122 isolated node(s):** `router`, `serviceCategories`, `serviceCards`, `serviceStats`, `sitemapPageItems` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `redis` connect `networkLogger.js` to `volcengine.io.js`, `tool.js`, `navigationRoutes.js`, `evolink.ai.js`, `networkAnalytics.js`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `createApiAccessHelpers()` connect `navigationRoutes.js` to `index.js`, `evolink.ai.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `router`, `serviceCategories`, `serviceCards` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09102564102564102 - nodes in this community are weakly interconnected._
- **Should `volcengine.io.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08408408408408409 - nodes in this community are weakly interconnected._