# Graph Report - coze-js-api  (2026-07-10)

## Corpus Check
- 55 files · ~58,013 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 304 nodes · 483 edges · 22 communities (17 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea74c244`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- tool.js
- dependencies
- commonUtils.js
- navigationRoutes.js
- evolink.ai.js
- CustomError.js
- twitter_api.py
- network-log-analyze.mjs
- networkLogger.js
- volcengine.io.js
- readme.md
- fetch_hot_rise_list.py
- google_search.py
- web_search.py
- AGENTS
- start.sh
- aimlapi.js
- server.sh
- transcribe_douyin.sh
- start_lite.sh

## God Nodes (most connected - your core abstractions)
1. `redis` - 12 edges
2. `unkey` - 12 edges
3. `commonUtils` - 10 edges
4. `sanitizeUploadFileName()` - 6 edges
5. `analyze()` - 6 edges
6. `emit()` - 6 edges
7. `tool` - 6 edges
8. `listDownloadFiles()` - 5 edges
9. `createFileAccessTrackMiddleware()` - 5 edges
10. `main()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `zyteExtract()` --calls--> `htmlToQuerySelector()`  [EXTRACTED]
  index.js → utils/htmlContent.js
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosError()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logAxiosRequest()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js
- `attachAxiosRateLimitLogger()` --calls--> `logRateLimit()`  [EXTRACTED]
  utils/axiosInterceptors.js → utils/networkLogger.js

## Import Cycles
- None detected.

## Communities (22 total, 5 thin omitted)

### Community 2 - "index.js"
Cohesion: 0.05
Nodes (43): agent, app, buildChunkSessionDir(), buildFileAccessCountKey(), buildFileAccessHourKey(), buildSafeExistingFilePath(), buildSafeUploadTarget(), {
    canSearchGoogle,
    canUseHtmlParse,
    dailyUse,
    verifyApiAccess,
    consumeApiCredits,
} (+35 more)

### Community 4 - "tool.js"
Cohesion: 0.06
Nodes (29): BROWSER_SESSION_SWEEP_INTERVAL_MS, BROWSER_SESSION_TTL_MS, browserless, browserSessionSweeper, closeBrowserSession(), __dirname, disableLoadMedia(), __filename (+21 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (33): author, dependencies, axios, cheerio, @coze/api, dayjs, ejs, express (+25 more)

### Community 6 - "commonUtils.js"
Cohesion: 0.12
Nodes (14): calc_ba_zi, calc_zi_wei, points, commonUtils, CONFIG, qweather_tool, AD_CONSTANTS, tv_search (+6 more)

### Community 8 - "navigationRoutes.js"
Cohesion: 0.12
Nodes (14): router, serviceCards, serviceCategories, serviceStats, sitemapCategoryItems, sitemapPageItems, netdiskapi, redis (+6 more)

### Community 9 - "evolink.ai.js"
Cohesion: 0.11
Nodes (9): createApiAccessHelpers(), __dirname, envFilePath, __filename, ensureApiKey(), evolink, FINAL_STATUSES, getAxiosConfig() (+1 more)

### Community 11 - "CustomError.js"
Cohesion: 0.13
Nodes (7): BaseError, FileOperationError, InvalidApiKeyError, NotFoundError, QuotaExceededError, RateLimitError, ValidationError

### Community 12 - "twitter_api.py"
Cohesion: 0.33
Nodes (13): Any, ArgumentParser, build_parser(), get_api_key(), main(), normalize_detail(), normalize_search(), pick_first() (+5 more)

### Community 18 - "network-log-analyze.mjs"
Cohesion: 0.33
Nodes (10): analyze(), DEFAULT_FILE, inc(), main(), parseArgs(), printHelp(), printHuman(), statusClass() (+2 more)

### Community 19 - "networkLogger.js"
Cohesion: 0.40
Nodes (9): attachAxiosRateLimitLogger(), emit(), ensureFileLogger(), LOG_MODE, logAxiosError(), logAxiosRequest(), logHttpRequest(), logRateLimit() (+1 more)

### Community 20 - "volcengine.io.js"
Cohesion: 0.27
Nodes (10): decodeWebSearchResponse(), normalizeWebSearchEventFrames(), normalizeWebSearchPayload(), normalizeWebSearchResult(), safeJsonParse(), toBoolean(), toNumber(), ve_contents_generations_tasks (+2 more)

### Community 59 - "readme.md"
Cohesion: 0.29
Nodes (6): 启动项目, 国内腾讯云轻量级，只为了Chromium, 日志监控服务, 服务器环境准备, 服务器部署流程, 本地部署流程

### Community 61 - "fetch_hot_rise_list.py"
Cohesion: 0.53
Nodes (5): fetch_hot_rise_list(), get_api_key(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY

### Community 62 - "google_search.py"
Cohesion: 0.53
Nodes (5): get_api_key(), google_search(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY（免费版可不填）

### Community 63 - "web_search.py"
Cohesion: 0.60
Nodes (5): get_api_key(), main(), parse_bool(), print_results(), web_search()

### Community 65 - "AGENTS"
Cohesion: 0.50
Nodes (3): AGENTS, 工作原则, 推荐入口

## Knowledge Gaps
- **94 isolated node(s):** `__filename`, `__dirname`, `app`, `agent`, `{
    canSearchGoogle,
    canUseHtmlParse,
    dailyUse,
    verifyApiAccess,
    consumeApiCredits,
}` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `redis` connect `navigationRoutes.js` to `evolink.ai.js`, `index.js`, `tool.js`, `commonUtils.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `attachAxiosRateLimitLogger()` connect `networkLogger.js` to `index.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `app` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05254237288135593 - nodes in this community are weakly interconnected._
- **Should `tool.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06456456456456457 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `commonUtils.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._