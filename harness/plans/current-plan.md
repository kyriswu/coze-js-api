# Current Plan

## Goal
Ensure file-transfer upload completion responses provide a full public URL generated from the request Host.

## Scope / Impact
- Primary backend module: `index.js`
- Delivery records: `docs/plans/2026-07-15-file-transfer-upload-full-url-design.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`
- Preserve the existing `data.url` response field and all upload routes.

## Implementation Steps
1. [x] Keep one public URL helper for file-transfer storage locations.
2. [x] Ensure both single-file upload and chunk-complete responses return the helper result.
3. [x] Verify statically that returned links use request protocol, request Host, and encoded public path.
4. [x] Run the requested syntax-only validation.
5. [x] Update delivery records.

## Risks
- Reverse-proxy protocol forwarding must be configured correctly for HTTPS links; Host remains derived from the incoming request.
- No fixed public hostname is introduced, so links intentionally follow the caller's Host.

## Validation
- `node --check index.js`
- Passed with no output. Per request, no upload request, test, or service run was performed.

## Goal
Add a Hermes chat-completions proxy interface and expose it through a new `/deployment` endpoint.

## Context
The user provided a direct `curl` example for `https://hermes.devtool.uk/v1/chat/completions` with a bearer token, `model: hermes-agent`, and a simple `messages` array. The implementation should be a thin wrapper that forwards that request shape with minimal behavior changes.

## Scope / Impact
- Primary backend module: `utils/ThirdParrtyApi/hermes-agent.js`
- Primary route wiring: `index.js`
- Docs sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`
- Keep the response as a direct upstream passthrough unless the upstream call fails.

## Implementation Steps
1. Add a dedicated Hermes client module that posts to `/v1/chat/completions` with the provided authorization token and JSON payload.
2. Add a `/deployment` endpoint in `index.js` that forwards the request body to the Hermes client.
3. Keep request and response handling thin, preserving upstream JSON and status details where possible.
4. Run focused syntax validation.
5. Sync QA/release/changelog notes for this batch.

## Risks
- Hardcoding a bearer token would make rotation harder; prefer env-driven configuration if the repo already supports it.
- Passing arbitrary request bodies through without validation could let unsupported upstream fields leak through, but that is acceptable for a thin proxy if the goal is direct compatibility.

## Validation
- `node --check utils/ThirdParrtyApi/hermes-agent.js`
- `node --check index.js`

## Goal
Add a one-click `file-transfer` action that moves a temporary file into the persistent whitelist directory `downloads/persistent`.

## Context
The first storage split is already in place with `temp` and `persistent` areas. The next slice is a direct promotion flow so a file already uploaded to the temp area can be moved into `downloads/persistent` without re-uploading it.

## Scope / Impact
- Primary backend module: `index.js`
- Primary frontend view: `views/file-transfer.ejs`
- Supporting docs sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`
- Keep existing upload/list/delete behavior compatible; add one storage promotion action for temp files only.

## Implementation Steps
1. Add a dedicated file-transfer move endpoint that only accepts `temp -> persistent` promotion.
2. Move the file on disk without exposing arbitrary paths, and migrate access counters from the temp relative path to the persistent relative path.
3. Expose a one-click UI action for temp files in the list and detail drawer; hide it for persistent files.
4. Run focused syntax/render validation.
5. Sync delivery/QA docs for this implementation batch.

## Risks
- If the move action accepts arbitrary source/target storage values, it could become a generic file move surface.
- If access counters are not migrated, promoted files will appear to lose historical popularity data.
- UI changes must avoid showing “转为永久” on files already in the persistent area.

## Validation
- `node --check index.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`
# Current Plan

## Goal
Simplify the `/docs/xiaohongshu/search_notes_v2` template presentation by removing upstream source display and footer template note.

## Context
The user requested a cleaner API doc page that keeps only practical integration information and removes non-essential explanatory metadata.

## Scope / Impact
- Primary file: `views/api-doc-template.ejs`
- Docs sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`

## Implementation Steps
1. Remove upstream chip rendering from the template hero metadata area.
2. Remove footer template note block at the bottom of the page.
3. Run minimal syntax/render validation.
4. Record validation and release note updates.

## Risks
- Existing route data may still include `upstream`, but it will no longer be visible in rendered docs.

## Validation
- `node --check routes/navigationRoutes.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-template.ejs',{doc:{name:'demo',method:'POST',path:'/x',requestParams:[],examples:[],responseFields:[]}}); console.log('api-doc-template.ejs render ok');"`

## Goal
Create a reusable API documentation HTML template page and publish one endpoint doc page for `/xiaohongshu/search_notes_v2` with polished call examples and response parameter descriptions.

## Context
User requested a standalone HTML page for this endpoint and asked to make it templated for future endpoint docs reuse.

## Scope / Impact
- Primary module: `routes/navigationRoutes.js`
- New view templates: `views/api-doc-template.ejs`, `views/api-doc-xiaohongshu-search-notes-v2.ejs`
- Optional discovery entry in home service cards for doc page access.
- Docs sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`

## Implementation Steps
1. Add a generic EJS API-doc template with reusable sections (overview, endpoint, params, request examples, response schema).
2. Add one dedicated page wrapper for `/xiaohongshu/search_notes_v2` using the template and concrete data.
3. Wire a route in `routes/navigationRoutes.js` for this doc page.
4. Keep page content focused on current implemented response (`data.posts` + `data.pagination`) and practical curl examples.
5. Run minimal syntax/render validation and sync docs.

## Risks
- Doc examples may diverge from implementation if endpoint fields change later.
- Too much hardcoded text could reduce reuse value; keep structure templated.

## Validation
- `node --check routes/navigationRoutes.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-template.ejs',{doc:{}}); console.log('api-doc-template.ejs render ok');"`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-xiaohongshu-search-notes-v2.ejs',{seo:{}}); console.log('api-doc-xiaohongshu-search-notes-v2.ejs render ok');"`

## Goal
Migrate `/xiaohongshu/search_notes_v2` to TikHub App V2 search endpoint while preserving existing API response contract and caller-visible field behavior.

## Context
Current implementation calls `https://api.tikhub.io/api/v1/xiaohongshu/app/search_notes_v2` using legacy query params (`sort`, `type`, `publish_time`). Upstream now provides `https://api.tikhub.io/api/v1/xiaohongshu/app_v2/search_notes` with updated params (`sort_type`, `note_type`, `time_filter`, pagination context fields).

## Scope / Impact
- Primary module: `utils/tikhub.io.js` (`th_xiaohongshu.search_notes_v2`)
- Backward compatibility: keep route path and response envelope unchanged (`{ code, msg, data }`)
- Docs sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`

## Implementation Steps
1. Switch upstream URL from `/app/search_notes_v2` to `/app_v2/search_notes`.
2. Add compatibility mapping from legacy request fields to new upstream fields:
	- `sort`/`sort_type` -> `sort_type`
	- `type`/`note_type` -> `note_type`
	- `publish_time`/`time_filter` -> `time_filter`
3. Pass-through pagination/context fields (`search_id`, `search_session_id`, `source`, `ai_mode`) when provided.
4. Increase API key credit deduction from 1 to 2 for this endpoint.
5. Keep response envelope stable while normalizing payload to `data.posts` + `data.pagination`.
6. Run minimal syntax validation and sync QA/release/changelog notes.

## Risks
- Upstream V2 response shape may differ (list key name differences); normalization must preserve current `data` field expectation.
- Legacy caller values may mix Chinese labels and new enum values; mapping must be tolerant.

## Validation
- `node --check utils/tikhub.io.js`

## Goal
Implement a dedicated single-page network log analytics dashboard backed by Redis ingestion on write-path.

## Context
`downloads/network.log` already captures HTTP/Axios request telemetry in JSONL format. The new dashboard should avoid heavy browser-side log parsing by ingesting log events into Redis during logging and reading analytics from Redis-backed APIs.

## Scope / Impact
- Primary modules: `utils/networkLogger.js`, `index.js`, `routes/navigationRoutes.js`, new `utils/networkAnalytics.js`, new `views/network-dashboard.ejs`
- Documentation sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`
- Backward compatibility: keep existing routes and response shape conventions unchanged.

## Implementation Steps
1. Extend network logger to dual-write telemetry into Redis with bounded retention and failure-safe behavior.
2. Add a small analytics utility that loads recent events from Redis and computes MVP metrics (summary, status distribution, top paths, slow requests, minute trend).
3. Add JSON API endpoint(s) in `index.js` for dashboard metrics with optional filters.
4. Add a dedicated dashboard page route in `routes/navigationRoutes.js`.
5. Create `views/network-dashboard.ejs` single-page dashboard with cards/charts/table fed by the new API.
6. Run minimal syntax/render validation and sync docs.

## Risks
- Redis write failures should not block existing log output.
- Timeline/query cost must stay bounded by limiting scanned event count.
- UI must handle empty dataset and partial parse issues gracefully.

## Validation
- `node --check utils/networkLogger.js`
- `node --check utils/networkAnalytics.js`
- `node --check index.js`
- `node --check routes/navigationRoutes.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/network-dashboard.ejs',{seo:{}}); console.log('network-dashboard.ejs render ok');"`

## Goal
Harden `gpt_image_2_edit` against transient OpenAI-Hub edit timeouts by adding bounded retry on network/header-timeout failures.

## Context
`POST /gpt-image-2/generate` can fail when `utils/ThirdParrtyApi/aitoken.js` calls `fetch` for image edits and hits undici header timeout (`UND_ERR_HEADERS_TIMEOUT`), resulting in user-visible `编辑图像失败: fetch failed`.

## Scope / Impact
- Primary module: `utils/ThirdParrtyApi/aitoken.js`
- No route contract changes; keep existing response shape and Chinese error style.

## Implementation Steps
1. Keep current input normalization logic, but split request-body assembly from send logic so retries can rebuild `FormData` safely.
2. Add small bounded retry loop with exponential backoff for transient fetch failures (`fetch failed`, `UND_ERR_HEADERS_TIMEOUT`, timeout/network classes).
3. Optionally retry on transient HTTP statuses (408/429/5xx) without changing non-transient error semantics.
4. Preserve existing final error wrapping (`编辑图像失败: ...`).
5. Run minimal syntax validation and sync QA/RELEASE/CHANGELOG/PLAN notes.

## Risks
- Excessive retry may increase latency; keep retry count low and backoff short.
- Reusing consumed request body across retries would fail; must rebuild `FormData` per attempt.

## Validation
- `node --check utils/ThirdParrtyApi/aitoken.js`
- `node --check index.js`

## Goal
Reduce restart interruption by replacing full compose teardown with app-only rolling recreation in `start.sh`.

## Context
Current restart flow executes `compose down` and image removal before startup, which guarantees full service interruption and also restarts Redis unnecessarily.

## Scope / Impact
- Primary script: `start.sh`
- Deployment behavior: compose lifecycle for `app` service only
- No API or route behavior changes

## Implementation Steps
1. Keep repository update step, but harden it to fast-forward pull (`git pull --ff-only`).
2. Detect container engine (`podman` preferred, fallback `docker`) and unify compose invocation.
3. Replace `compose down` + `rmi` with:
	- `compose build app`
	- `compose up -d --no-deps app`
4. Add optional dangling image cleanup to prevent disk growth.
5. Run minimal script syntax validation and record QA notes.

## Risks
- Single-instance compose still has a short switch gap during container replacement; true zero-downtime requires blue/green + reverse proxy.
- If local branch cannot fast-forward, `git pull --ff-only` will stop and require manual conflict handling.

## Validation
- `bash -n start.sh`

## Goal
Implement the core file-transfer panel revamp (modernized UI and upload experience) while keeping existing API behavior backward compatible and deferring the detail drawer to a later iteration.

## Context
The current file-transfer feature already supports upload, listing, search, pagination, filtering, sorting, delete, type stats, recent 15-day chart, and inline previews. The next step is a UI/interaction refresh with better information architecture and upload UX.

## Scope / Impact
- Primary frontend file: `views/file-transfer.ejs`
- Minimal backend compatibility updates: `index.js` (only if needed for new filters/fields and without breaking existing query semantics)
- Navigation/routes should remain unchanged unless a compatibility fix is needed.

## Implementation Steps
1. Refactor `views/file-transfer.ejs` layout into a modern two-zone manager panel (controls + content area).
2. Add drag-and-drop and multi-file upload flow with per-file progress and result feedback.
3. Add clipboard paste enqueue support (Ctrl+V) for image/file upload workflows while keeping manual upload trigger.
4. Replace raw URL-heavy presentation with action buttons (copy/open/delete) and readable metadata chips.
5. Keep existing search/filter/sort/pagination behavior, but present controls as clearer chips/segmented actions.
6. If frontend needs extra metadata, add minimal non-breaking fields in `/file-transfer/files` response in `index.js`.
7. Validate EJS render and Node syntax checks.
8. Sync `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`, and `docs/PLAN.md` with this implementation batch.

## Risks
- Regressing existing upload/list query semantics.
- UI rewrite introducing escaping/XSS or rendering bugs.
- Multi-file upload causing poor UX when partial failures occur.

## Validation
- `node --check index.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`
- Manual quick smoke via API response shape consistency for `/file-transfer/files`.

## Goal
Build a Google-friendly sitemap structure for service discovery and future crawler collection.

## Context
The current `GET /sitemap.xml` only contains a tiny subset of pages, which is insufficient for indexing service pages and structured crawling of available capabilities.

## Scope / Impact
- Primary module: `routes/navigationRoutes.js`
- Documentation sync: `docs/PLAN.md`, `docs/QA.md`, `docs/RELEASE.md`, `CHANGELOG.md`
- No breaking API behavior changes.

## Implementation Steps
1. Replace the minimal sitemap implementation with a sitemap index design.
2. Add `GET /sitemap-pages.xml` for key landing/tool pages and category entry URLs.
3. Add `GET /sitemap-services.xml` for service collection URLs.
4. Add a machine-readable catalog endpoint for crawlers (`GET /services/catalog.json`) and include it in sitemap entries.
5. Keep `robots.txt` pointing to `GET /sitemap.xml`.
6. Run minimal syntax validation and sync docs.

## Risks
- Over-including redirect/helper routes may reduce sitemap quality; prioritize stable content-bearing URLs.
- Category query URLs should remain valid even if frontend filtering logic changes.

## Validation
- `node --check routes/navigationRoutes.js`
- `node --check index.js`
