# Blue/Green Deployment Implementation Plan

> **For Hermes:** Execute in small verified slices; use test-first for new application logic.

**Goal:** Replace the single-container restart flow with a blue/green deployment that starts and verifies the new version before Nginx switches traffic, then drains the old version.

**Architecture:** The Node process exposes liveness/readiness endpoints and handles SIGTERM/SIGINT by stopping new accepts while existing requests drain. Compose defines two on-demand app services with independent loopback-only host ports and a shared Redis/downloads volume. Nginx proxies both public hostnames to one named upstream whose active backend is atomically changed by `start.sh` only after the inactive color passes readiness.

**Tech Stack:** Node.js 22 / Express / ioredis, Docker Compose, Nginx, Bash.

## Safety Follow-up — 2026-07-17

**Finding:** Post-cutover failure handling had a state-order window: an error after Nginx reload but before active-color persistence could stop the newly active candidate. The script also began old-color drain without verifying the candidate through Nginx.

**Smallest safe slice:** Add a regression test for these two ordering invariants; after reload, mark the candidate as traffic-serving before any fallible state persistence; then verify Nginx routes to its `/readyz`. On failure, atomically restore the prior include and retain the old color. Start drain only after this verification succeeds.

- [ ] Add failing deployment-script regression test and implement the ordered rollback guard.
- [ ] Execute a live `blue → green` cutover to prove the post-switch validation and drain ordering.
- [ ] Update QA/Release/Graphify evidence for the follow-up.

## Completion Status — 2026-07-17

- [x] Task 1 complete: lifecycle endpoints and graceful shutdown implemented and tested.
- [x] Task 2 complete: immutable image and on-demand blue/green services implemented. The intended 3001/3002 were occupied by unrelated host processes, so the verified loopback ports are 3003/3004.
- [x] Task 3 complete: Nginx active-backend include and rollback-safe candidate-first deployment flow are live.
- [x] Task 4 complete: first live cutover verified; blue is active and healthy, both public HTTPS vhosts returned 200, and legacy was drained and stopped.

---

### Task 1: Add testable process lifecycle behavior

**Objective:** Provide deterministic liveness/readiness handlers and graceful server shutdown without changing existing API routes.

**Files:**
- Create: `utils/appLifecycle.js`
- Create: `test/appLifecycle.test.js`
- Modify: `index.js`

**Steps:**
1. Write a failing Node test for `/healthz` returning `200`, readiness returning `200` only when `redis.ping()` resolves, and readiness returning `503` when it rejects.
2. Run `node --test test/appLifecycle.test.js`; confirm the missing module failure.
3. Implement the minimal lifecycle helper and wire its handlers before navigation routes in `index.js`.
4. Add an injected graceful-shutdown helper test: `server.close()` is called once and completion exits cleanly; the hard timeout is configurable.
5. Run the focused test and then all `test/*.test.js` tests.

### Task 2: Make the application image immutable and add blue/green Compose services

**Objective:** Let both application colors run concurrently without exposing an application port publicly or sharing source files at runtime.

**Files:**
- Create: `.dockerignore`
- Modify: `Dockerfile`
- Modify: `docker-compose.yaml`

**Steps:**
1. Extend the image build to install production dependencies from the lockfile and copy application code.
2. Exclude host dependencies, runtime downloads, secrets, Git metadata, and harness output from the build context.
3. Replace the single `app` service with `app-blue` and `app-green`; each keeps container port 3000 but maps only to the verified available loopback ports `127.0.0.1:3003` and `127.0.0.1:3004` (3001/3002 were occupied by unrelated host processes).
4. Keep Redis and `downloads` data shared; do not mount the repository into `/app`.
5. Add an HTTP Docker healthcheck calling `/healthz`, then validate `docker compose config`.

### Task 3: Add atomic Nginx backend selection and a rollback-safe deployment script

**Objective:** Build and verify the inactive color, switch only after readiness succeeds, and drain the prior color after a successful Nginx graceful reload.

**Files:**
- Create: `/etc/nginx/coze-js-api/active-backend.conf` (runtime state; not repository tracked)
- Modify: `/etc/nginx/conf.d/coze-js-api.conf`
- Modify: `/etc/nginx/conf.d/coze-js-api-noproxy.conf`
- Modify: `start.sh`

**Steps:**
1. Define a shared Nginx upstream that includes the active backend file; point both vhosts to it while preserving all existing proxy timeout and WebSocket/SSE settings.
2. Initialize the backend state to the currently serving color before Nginx reload.
3. Rewrite `start.sh`: fetch source, build/start only the inactive service, wait for `/readyz`, atomically write the inactive backend file, run `nginx -t`, gracefully reload Nginx, persist active-color, then gracefully stop the old service.
4. On build/readiness/Nginx failure, leave current Nginx state unchanged and stop the failed inactive service.
5. Keep image cleanup best-effort and avoid printing secrets.

### Task 4: Verify the live deployment and document evidence

**Objective:** Prove the first cutover does not expose public service interruption and leaves one active app process.

**Files:**
- Modify: `harness/validation/test-checklist.md`
- Modify: `harness/validation/acceptance-criteria.md`
- Modify: `docs/QA.md`
- Modify: `docs/RELEASE.md`
- Modify: `CHANGELOG.md`

**Steps:**
1. Run Node tests, syntax checks, `docker compose config`, `nginx -t`, and `git diff --check`.
2. Execute `./start.sh` against the live project and capture readiness plus both HTTPS hostnames before/after the active-color change.
3. Confirm only the selected color remains running, downloads remain available, and the public endpoints return HTTP 200.
4. Update QA/release/changelog records with commands, actual results, rollback instructions, and resource behavior.
5. Update Graphify using `graphify . --update`, verify `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md`, then review the final diff.
