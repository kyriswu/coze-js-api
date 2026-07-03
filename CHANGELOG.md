# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added 24-hour access aggregation and `hotTopN` ranking in `GET /file-transfer/files`, powered by Redis hourly buckets.
- Added Redis-backed per-file access counting for `/downloads/:filename` and exposed `accessCount` in file-transfer listing data.
- Added chunked upload support for file transfer via `POST /file-transfer/upload/chunk` and `POST /file-transfer/upload/complete` to improve large-file upload reliability behind unstable HTTP/2 gateways.
- Added Volcengine task query endpoint `GET /volcengine/contents/generations/tasks/:task_id` for convenient local task status checks without project `api_key`.
- Added `DELETE /file-transfer/file` for manual file removal in the downloads file-transfer workflow.
- Added isolated network logging utility `utils/networkLogger.js` with configurable output modes (`off|console|file|both`).
- Added a downloads-based file relay page at `GET /file-transfer` for browsing, searching, and URL retrieval.
- Added file relay APIs: `GET /file-transfer/files` and `POST /file-transfer/upload`.
- Added Volcengine video generation task wrapper at `POST /volcengine/contents/generations/tasks`, backed by `POST /api/v3/contents/generations/tasks`.
- Added Evolink image generation integration with local endpoints `POST /evolink/images/generations` and `GET /evolink/tasks/:task_id`.
- Added Evolink credits query endpoint `GET /evolink/credits`.
- Added lightweight `.env` loading via `utils/loadEnv.js` and a root `.env.example` template for local configuration.
- Added TikTok user profile endpoint wrappers `POST /tiktok/handler_user_profile` and `GET /tiktok/handler_user_profile`, backed by TikHub `handler_user_profile`.
- Added a new plugin services showcase homepage at `GET /` with category filtering, keyword search, service cards, stats, and documentation-oriented entry points.
- Added `/assets` static hosting and a homepage WeChat QR image slot at `/assets/wechat-qr.png`.
- Introduced project harness structure under `harness/` and Copilot entry points under `.github/`.
- Refactored `index.js` to move shared helper logic into dedicated utility modules.
- Added new Twitter skill package for tweet detail and search timeline calls.
- Added WeChat MP endpoint `POST /wx_gzh/fetch_search_article` backed by TikHub `fetch_search_article` API integration.
- Added reusable skills:
  - `spec-to-plan`
  - `implementation`
  - `verification`
  - `release`
- Added workflow docs templates in `docs/`:
  - `TASK.md`
  - `PLAN.md`
  - `QA.md`
  - `RELEASE.md`
- Added Twitter endpoint `POST /twitter/fetch_tweet_detail` backed by TikHub `fetch_tweet_detail` API integration.
- Added Twitter endpoint `POST /twitter/fetch_search_timeline` backed by TikHub `fetch_search_timeline` API integration.

### Changed
- Reorganized file-transfer dashboard blocks into a collapsible overview section (collapsed by default) so the file list appears earlier on the page.
- Updated file-transfer dashboard UI to include a 24h access stat card and Top N hot-file leaderboard.
- Updated file-transfer UI cards and detail drawer to display per-file access counts.
- Hardened chunk-upload completion by switching frontend complete calls to query-based POST with timeout/retry and explicit queue success state updates.
- Adjusted server-side uploaded file naming to preserve original filename prefix (plus timestamp/random suffix) for easier post-upload search.
- Updated the file-transfer frontend uploader to automatically switch large files to chunked upload (with staged progress) while keeping small-file single-request uploads for compatibility.
- Enhanced `GET /file-transfer` with a slide-in detail drawer that provides richer single-file metadata and quick actions (open/copy/delete) without changing backend APIs.
- Revamped `GET /file-transfer` page into a modern file-manager panel with drag-and-drop multi-file queue upload, per-file progress, chip-based filtering, action buttons (open/copy/delete), and preserved pagination/statistics/chart behavior.
- Extended `ve_contents_generations_tasks` with a query wrapper that proxies upstream `GET /api/v3/contents/generations/tasks/{task_id}` using server-side Ark credentials.
- Enhanced the file-transfer page with inline preview support for common rich media files (images, audio, video, PDF).
- Set the global default request body limit to `500mb` and unified `express.json`, `express.text`, and `/file-transfer/upload` raw body parsing limits (overridable via `REQUEST_BODY_LIMIT`).
- Enhanced file-transfer listing with file-type filtering, size/name/time sorting, file-type counts, and a recent-15-days creation dashboard dataset.
- Added pagination support to `GET /file-transfer/files` with `page` and `pageSize`, and updated the file-transfer page with previous/next controls.
- Added a file relay service entry card on the homepage service list to expose `GET /file-transfer`.
- Added unified incoming HTTP request logging in `index.js` (method/path/status/duration/ip) for easier network troubleshooting.
- Extended `utils/axiosInterceptors.js` to log axios request latency and status for both success and failure paths, while retaining detailed 429 diagnostics.
- Extended `utils/volcengine.io.js` with a thin video generation task proxy that preserves existing `api_key` validation and `code/msg/data` response shape.
- Routed the new Volcengine video generation task wrapper through `index.js`.
- Migrated `th_wechat_media.get_wechat_mp_article_list` to the new upstream contract using `POST /api/v1/wechat_mp/v2/fetch_account_articles` with JSON body parameters (`username`, `page_size`, `offset`, `item_show_type`, `raw`) and a 30s timeout.
- Preserved local response compatibility for `POST /wx_gzh/get_user_articles` by normalizing upstream payload to legacy-compatible `data: { list, offset }` (with list item key mapping such as `ContentUrl/CoverImgUrl/...`), and hardening binding to always request simplified upstream shape (`raw=false`) while keeping existing auth and billing flow unchanged.
- `POST /evolink/images/generations` now submits the upstream Evolink async task and automatically polls until the task completes, fails, or times out before returning the final result payload.
- `POST /evolink/images/generations` now requires a project `api_key` and charges Unkey credits based on the computed `creditCost` only after successful completion.
- Simplified successful Evolink generation responses to return only `image`, `credit_used`, and computed `creditCost` (`ceil(credit_used * 0.12) * 0.05`).
- Enhanced `th_douyin.fetch_general_search_v1` success message to append next-search hint `下次搜索search_id为：[search_id]`, extracting `search_id` from upstream metadata with fallback paths.
- Optimized TikTok profile response output by adding `params_used` and normalized `profile` summary fields while preserving upstream raw `data`; fixed profile metrics mapping to extract counts from `data.user` based on live test results.
- Clarified `skills/douyin-transcribe-api` API key guidance to explicitly state that free keys are not provided, and aligned missing-key prompts in both `SKILL.md` and `scripts/transcribe_douyin.sh` to direct users to purchase/renew at `https://devtool.uk/plugin`.
- Fixed paid API pre-check in `verifyApiAccess` to enforce endpoint-specific required credits (now blocks `POST /gpt-image-2/generate` when remaining credits are below its 3-credit cost).
- Redesigned the plugin services homepage with a liquid ripple background, animated highlights, and glass-style service cards.
- Added a direct paid-plan prompt on the plugin services homepage with WeChat contact `xiaowu_azt` and the required purchase note.
- Updated `ve_seedream_5_0_lite.generate_image` to download generated images into local `downloads/` storage and return local `/downloads/...` URLs in `data.data[].url`.
- Updated `POST /wx_gzh/fetch_search_article` API key billing from 1 credit to 2 credits per request.
- Added 3-attempt retry with short randomized backoff for `POST /wx_gzh/fetch_search_article` on transient upstream failures.
- Improved `downloadImageUrlToTempFile` for `POST /gpt-image-2/generate` with a 30s timeout and one retry on transient download errors (timeout/network/429/5xx).
