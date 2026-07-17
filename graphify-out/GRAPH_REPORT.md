# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 412 nodes · 571 edges · 40 communities (22 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bdae1fa0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- index.js
- tool.js
- evolink.ai.js
- commonUtils.js
- staticZipDeployment.js
- volcengine.io.js
- tikhub.io.js
- CustomError.js
- networkAnalytics.js
- twitter_api.py
- redisClient.js
- networkLogger.js
- package.json
- network-log-analyze.mjs
- appLifecycle.test.js
- navigationRoutes.js
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
- migrate-redis-to-lite-chat.sh
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
2. `reject()` - 10 edges
3. `redis` - 10 edges
4. `deployStaticZip()` - 9 edges
5. `commonUtils` - 8 edges
6. `emit()` - 7 edges
7. `listDownloadFiles()` - 7 edges
8. `analyze()` - 6 edges
9. `resolveTrustedZipPath()` - 6 edges
10. `runArchiveCommand()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosError()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosRequest()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logRateLimit()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js

## Import Cycles
- None detected.

## Communities (40 total, 18 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (44): axios, cheerio, @coze/api, dayjs, ejs, express, fluent-ffmpeg, http-proxy-agent (+36 more)

### Community 1 - "index.js"
Cohesion: 0.09
Nodes (33): agent, app, buildChunkSessionDir(), buildFileAccessCountKey(), buildFileAccessHourKey(), buildSafeExistingFilePath(), buildSafeUploadTarget(), buildStorageRelativePath() (+25 more)

### Community 2 - "tool.js"
Cohesion: 0.06
Nodes (29): BROWSER_SESSION_SWEEP_INTERVAL_MS, BROWSER_SESSION_TTL_MS, browserless, browserSessionSweeper, closeBrowserSession(), __dirname, disableLoadMedia(), __filename (+21 more)

### Community 3 - "evolink.ai.js"
Cohesion: 0.09
Nodes (13): chargeApiCredits(), createApiAccessHelpers(), __dirname, envFilePath, __filename, aitoken, GPT_IMAGE_EDIT_MAX_RETRIES, GPT_IMAGE_EDIT_RETRY_BASE_DELAY_MS (+5 more)

### Community 4 - "commonUtils.js"
Cohesion: 0.12
Nodes (13): calc_ba_zi, calc_zi_wei, points, commonUtils, CONFIG, qweather_tool, AD_CONSTANTS, tv_search (+5 more)

### Community 5 - "staticZipDeployment.js"
Cohesion: 0.22
Nodes (17): createValidArtifact(), sha256(), ALLOWED_STATIC_EXTENSIONS, assertReleaseRelativeStaticPaths(), assertWithin(), DeploymentRejected, deployStaticZip(), execFile (+9 more)

### Community 6 - "volcengine.io.js"
Cohesion: 0.16
Nodes (15): calculateSeedanceCreditCost(), decodeWebSearchResponse(), getSeedanceSettlementKey(), getSeedanceSettlementLockKey(), normalizeWebSearchEventFrames(), normalizeWebSearchPayload(), normalizeWebSearchResult(), parseSettlementState() (+7 more)

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

### Community 11 - "redisClient.js"
Cohesion: 0.22
Nodes (7): netdiskapi, redis, redisOptions, getRedisConnectionOptions(), parseInteger(), config, cozecom

### Community 12 - "networkLogger.js"
Cohesion: 0.32
Nodes (11): attachAxiosRateLimitLogger(), emit(), ensureFileLogger(), LOG_MODE, logAxiosError(), logAxiosRequest(), logHttpRequest(), logRateLimit() (+3 more)

### Community 13 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, test (+2 more)

### Community 14 - "network-log-analyze.mjs"
Cohesion: 0.33
Nodes (10): analyze(), DEFAULT_FILE, inc(), main(), parseArgs(), printHelp(), printHuman(), statusClass() (+2 more)

### Community 15 - "appLifecycle.test.js"
Cohesion: 0.27
Nodes (3): createGracefulShutdown(), createHealthHandler(), createReadinessHandler()

### Community 16 - "navigationRoutes.js"
Cohesion: 0.22
Nodes (6): router, serviceCards, serviceCategories, serviceStats, sitemapCategoryItems, sitemapPageItems

### Community 17 - "start.sh"
Cohesion: 0.36
Nodes (5): restore_nginx_backend(), rollback_switched_traffic(), start.sh script, verify_nginx_candidate(), write_backend()

### Community 18 - "fetch_hot_rise_list.py"
Cohesion: 0.53
Nodes (5): fetch_hot_rise_list(), get_api_key(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY

### Community 19 - "google_search.py"
Cohesion: 0.53
Nodes (5): get_api_key(), google_search(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY（免费版可不填）

### Community 20 - "web_search.py"
Cohesion: 0.60
Nodes (5): get_api_key(), main(), parse_bool(), print_results(), web_search()

## Knowledge Gaps
- **125 isolated node(s):** `DEFAULT_FILE`, `server.sh script`, `transcribe_douyin.sh script`, `start_lite.sh script`, `api` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `redis` connect `redisClient.js` to `index.js`, `tool.js`, `evolink.ai.js`, `commonUtils.js`, `networkAnalytics.js`, `networkLogger.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `commonUtils` connect `commonUtils.js` to `evolink.ai.js`, `tikhub.io.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `DEFAULT_FILE`, `server.sh script`, `transcribe_douyin.sh script` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09446693657219973 - nodes in this community are weakly interconnected._
- **Should `tool.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06401137980085349 - nodes in this community are weakly interconnected._