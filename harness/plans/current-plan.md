# Current Plan

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
