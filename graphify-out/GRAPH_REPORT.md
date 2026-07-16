# Graph Report - .  (2026-07-16)

## Corpus Check
- 62 files · ~65,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 370 nodes · 621 edges · 30 communities (21 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Navigation and Bazi
- Node Dependencies
- Browser Automation
- HTTP API Server
- Static ZIP Deployment
- API Access Control
- Application Errors
- Network Analytics
- Twitter API Script
- Request Logging
- TikHub Integrations
- Volcengine Tools
- Package Metadata
- Network Log CLI
- File Transfer Storage
- File Access Metrics
- Hot Rise Script
- Google Search Script
- Web Search Script
- HTML Extraction
- Deployment Route Tests
- Hermes Agent
- Startup Script
- AIML API Client
- Cloudflare Client
- Lemonfox Client
- Server Script
- Douyin Transcript
- Lite Startup Script

## God Nodes (most connected - your core abstractions)
1. `redis` - 14 edges
2. `getNetworkDashboardMetrics()` - 12 edges
3. `unkey` - 12 edges
4. `reject()` - 11 edges
5. `commonUtils` - 10 edges
6. `deployStaticZip()` - 10 edges
7. `listDownloadFiles()` - 7 edges
8. `emit()` - 7 edges
9. `getFileTransferStorageConfig()` - 6 edges
10. `analyze()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `downloadPdf()` --indirect_call--> `reject()`  [INFERRED]
  index.js → utils/staticZipDeployment.js
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

## Communities (30 total, 9 thin omitted)

### Community 0 - "Navigation and Bazi"
Cohesion: 0.07
Nodes (27): router, serviceCards, serviceCategories, serviceStats, sitemapCategoryItems, sitemapPageItems, calc_ba_zi, calc_zi_wei (+19 more)

### Community 1 - "Node Dependencies"
Cohesion: 0.04
Nodes (45): axios, cheerio, @coze/api, dayjs, ejs, express, fluent-ffmpeg, http-proxy-agent (+37 more)

### Community 2 - "Browser Automation"
Cohesion: 0.06
Nodes (29): BROWSER_SESSION_SWEEP_INTERVAL_MS, BROWSER_SESSION_TTL_MS, browserless, browserSessionSweeper, closeBrowserSession(), __dirname, disableLoadMedia(), __filename (+21 more)

### Community 3 - "HTTP API Server"
Cohesion: 0.09
Nodes (18): agent, app, buildChunkSessionDir(), {
    canSearchGoogle,
    canUseHtmlParse,
    dailyUse,
    verifyApiAccess,
    consumeApiCredits,
}, __dirname, downloadPdf(), downloadsDir, extract_pdf_url() (+10 more)

### Community 4 - "Static ZIP Deployment"
Cohesion: 0.22
Nodes (17): createValidArtifact(), sha256(), ALLOWED_STATIC_EXTENSIONS, assertReleaseRelativeStaticPaths(), assertWithin(), DeploymentRejected, deployStaticZip(), execFile (+9 more)

### Community 5 - "API Access Control"
Cohesion: 0.11
Nodes (9): createApiAccessHelpers(), __dirname, envFilePath, __filename, ensureApiKey(), evolink, FINAL_STATUSES, getAxiosConfig() (+1 more)

### Community 6 - "Application Errors"
Cohesion: 0.13
Nodes (7): BaseError, FileOperationError, InvalidApiKeyError, NotFoundError, QuotaExceededError, RateLimitError, ValidationError

### Community 7 - "Network Analytics"
Cohesion: 0.29
Nodes (14): buildTimeline(), collectLastLines(), DEFAULT_SCAN_LIMIT, getNetworkDashboardMetrics(), incMap(), matchFilters(), minuteStart(), normalizeMethod() (+6 more)

### Community 8 - "Twitter API Script"
Cohesion: 0.33
Nodes (13): Any, ArgumentParser, build_parser(), get_api_key(), main(), normalize_detail(), normalize_search(), pick_first() (+5 more)

### Community 9 - "Request Logging"
Cohesion: 0.32
Nodes (11): attachAxiosRateLimitLogger(), emit(), ensureFileLogger(), LOG_MODE, logAxiosError(), logAxiosRequest(), logHttpRequest(), logRateLimit() (+3 more)

### Community 10 - "TikHub Integrations"
Cohesion: 0.15
Nodes (9): th_bilibili, th_douyin, th_douyin_billboard, th_tiktok, th_twitter, th_wechat_channels, th_wechat_media, th_xiaohongshu (+1 more)

### Community 11 - "Volcengine Tools"
Cohesion: 0.24
Nodes (11): tool, decodeWebSearchResponse(), normalizeWebSearchEventFrames(), normalizeWebSearchPayload(), normalizeWebSearchResult(), safeJsonParse(), toBoolean(), toNumber() (+3 more)

### Community 12 - "Package Metadata"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, test (+2 more)

### Community 13 - "Network Log CLI"
Cohesion: 0.33
Nodes (10): analyze(), DEFAULT_FILE, inc(), main(), parseArgs(), printHelp(), printHuman(), statusClass() (+2 more)

### Community 14 - "File Transfer Storage"
Cohesion: 0.42
Nodes (9): buildSafeExistingFilePath(), buildSafeUploadTarget(), buildStorageRelativePath(), getFilePublicUrl(), getFileTransferStorageConfig(), listDownloadFiles(), listStorageFiles(), normalizeFileTransferStorage() (+1 more)

### Community 15 - "File Access Metrics"
Cohesion: 0.39
Nodes (8): buildFileAccessCountKey(), buildFileAccessHourKey(), buildTrackedFileKey(), createFileAccessTrackMiddleware(), formatHourId(), getLast24HourIds(), migrateFileAccessStats(), sanitizeStoragePathSegment()

### Community 16 - "Hot Rise Script"
Cohesion: 0.53
Nodes (5): fetch_hot_rise_list(), get_api_key(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY

### Community 17 - "Google Search Script"
Cohesion: 0.53
Nodes (5): get_api_key(), google_search(), main(), print_results(), 优先使用参数传入的 key，否则读取环境变量 AZT_API_KEY（免费版可不填）

### Community 18 - "Web Search Script"
Cohesion: 0.60
Nodes (5): get_api_key(), main(), parse_bool(), print_results(), web_search()

### Community 19 - "HTML Extraction"
Cohesion: 0.50
Nodes (4): zyteExtract(), extract_html_conent(), extract_html_conent_standard(), htmlToQuerySelector()

## Knowledge Gaps
- **91 isolated node(s):** `__filename`, `__dirname`, `app`, `downloadsDir`, `agent` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Node Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `deployStaticZip()` connect `Static ZIP Deployment` to `HTTP API Server`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `getNetworkDashboardMetrics()` connect `Network Analytics` to `HTTP API Server`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `app` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Navigation and Bazi` be split into smaller, more focused modules?**
  _Cohesion score 0.06648936170212766 - nodes in this community are weakly interconnected._
- **Should `Node Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Browser Automation` be split into smaller, more focused modules?**
  _Cohesion score 0.06456456456456457 - nodes in this community are weakly interconnected._