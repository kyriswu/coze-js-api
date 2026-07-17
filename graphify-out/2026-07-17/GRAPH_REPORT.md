# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 371 nodes · 545 edges · 32 communities (17 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `846fc96e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- dependencies
- navigationRoutes.js
- tool.js
- staticZipDeployment.js
- evolink.ai.js
- CustomError.js
- networkAnalytics.js
- twitter_api.py
- networkLogger.js
- volcengine.io.js
- package.json
- network-log-analyze.mjs
- Network Log CLI
- File Transfer Storage
- File Access Metrics
- deploymentRoute.test.js
- htmlContent.js
- hermes-agent.js
- start.sh
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
4. `commonUtils` - 10 edges
5. `deployStaticZip()` - 9 edges
6. `unkey` - 9 edges
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

## Communities (32 total, 15 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.06
Nodes (44): agent, app, buildChunkSessionDir(), buildFileAccessCountKey(), buildFileAccessHourKey(), buildSafeExistingFilePath(), buildSafeUploadTarget(), buildStorageRelativePath() (+36 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (44): axios, cheerio, @coze/api, dayjs, ejs, express, fluent-ffmpeg, http-proxy-agent (+36 more)

### Community 2 - "navigationRoutes.js"
Cohesion: 0.07
Nodes (22): router, serviceCards, serviceCategories, serviceStats, sitemapCategoryItems, sitemapPageItems, calc_ba_zi, calc_zi_wei (+14 more)

### Community 3 - "tool.js"
Cohesion: 0.06
Nodes (28): BROWSER_SESSION_SWEEP_INTERVAL_MS, BROWSER_SESSION_TTL_MS, browserless, browserSessionSweeper, closeBrowserSession(), __dirname, disableLoadMedia(), __filename (+20 more)

### Community 4 - "staticZipDeployment.js"
Cohesion: 0.22
Nodes (17): createValidArtifact(), sha256(), ALLOWED_STATIC_EXTENSIONS, assertReleaseRelativeStaticPaths(), assertWithin(), DeploymentRejected, deployStaticZip(), execFile (+9 more)

### Community 5 - "evolink.ai.js"
Cohesion: 0.11
Nodes (9): createApiAccessHelpers(), __dirname, envFilePath, __filename, ensureApiKey(), evolink, FINAL_STATUSES, getAxiosConfig() (+1 more)

### Community 6 - "CustomError.js"
Cohesion: 0.13
Nodes (7): BaseError, FileOperationError, InvalidApiKeyError, NotFoundError, QuotaExceededError, RateLimitError, ValidationError

### Community 7 - "networkAnalytics.js"
Cohesion: 0.29
Nodes (14): buildTimeline(), collectLastLines(), DEFAULT_SCAN_LIMIT, getNetworkDashboardMetrics(), incMap(), matchFilters(), minuteStart(), normalizeMethod() (+6 more)

### Community 8 - "twitter_api.py"
Cohesion: 0.33
Nodes (13): Any, ArgumentParser, build_parser(), get_api_key(), main(), normalize_detail(), normalize_search(), pick_first() (+5 more)

### Community 9 - "networkLogger.js"
Cohesion: 0.32
Nodes (11): attachAxiosRateLimitLogger(), emit(), ensureFileLogger(), LOG_MODE, logAxiosError(), logAxiosRequest(), logHttpRequest(), logRateLimit() (+3 more)

### Community 10 - "volcengine.io.js"
Cohesion: 0.24
Nodes (11): tool, decodeWebSearchResponse(), normalizeWebSearchEventFrames(), normalizeWebSearchPayload(), normalizeWebSearchResult(), safeJsonParse(), toBoolean(), toNumber() (+3 more)

### Community 11 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, test (+2 more)

### Community 12 - "network-log-analyze.mjs"
Cohesion: 0.33
Nodes (10): analyze(), DEFAULT_FILE, inc(), main(), parseArgs(), printHelp(), printHuman(), statusClass() (+2 more)

### Community 13 - "Network Log CLI"
Cohesion: 0.53
Nodes (5): fetch_hot_rise_list(), get_api_key(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY

### Community 14 - "File Transfer Storage"
Cohesion: 0.53
Nodes (5): get_api_key(), google_search(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY（免费版可不填）

### Community 15 - "File Access Metrics"
Cohesion: 0.60
Nodes (5): get_api_key(), main(), parse_bool(), print_results(), web_search()

## Knowledge Gaps
- **110 isolated node(s):** `name`, `type`, `version`, `main`, `test` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `redis` connect `navigationRoutes.js` to `networkLogger.js`, `tool.js`, `evolink.ai.js`, `networkAnalytics.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `commonUtils` connect `index.js` to `navigationRoutes.js`, `volcengine.io.js`, `evolink.ai.js`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.059322033898305086 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `navigationRoutes.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07152496626180836 - nodes in this community are weakly interconnected._