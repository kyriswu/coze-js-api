# Current Plan

## Goal
Replace the current LLM proxy behind `POST /deployment` with a real, fail-closed static-ZIP release pipeline. Pair the client Skill with an executable server-side verifier so a successful upload can result in either a verifiable deployed URL or a structured rejection reason.

## Verified Context
- `POST /file-transfer/upload` stores binary uploads under `/app/downloads` and returns an HTTPS ZIP URL.
- The existing `POST /deployment` validates only that a `.zip` URL is reachable, then sends the URL to Hermes chat completions. It does not inspect a ZIP, validate a manifest, create a release, or perform HTTP verification.
- Nginx already serves `/root/coze-js-api/downloads` at `https://static.devtool.uk/`; no new domain, port, upstream, TLS configuration, Git, PM2, Docker, or Nginx change is required.
- The preconfigured target will be immutable release directories below `/app/downloads/static-releases/`, publicly reachable as `https://static.devtool.uk/static-releases/<releaseId>/`.

## Scope / Impact
- Add a focused static ZIP deployment module under `utils/`.
- Replace only `/deployment` route behavior in `index.js`; preserve the content-only public request contract.
- Update `vibecoding-deployment-auditor` so it requires the server response contract rather than claiming server validation without evidence.
- Update `github-pm2-deploy` to document the concrete target mapping, verifier contract, and no-Git/no-PM2 behavior.
- Add focused local tests and update `docs/QA.md`, `docs/RELEASE.md`, and `CHANGELOG.md`.

## Implementation Steps
1. [x] Define constrained limits and trusted artifact URL mapping for this service’s own HTTPS ZIP URLs; reject all other origins/paths without fetching arbitrary URLs.
2. [x] Implement a ZIP verifier: archive size/count/ratio limits, traversal/symlink/executable/nested-archive rejection, required top-level layout, static-only extension allowlist, manifest hashes and dossier assertions.
3. [x] Publish a verified `site/` tree by staging beneath `static-releases`, then atomically rename to an immutable `release-*` directory.
4. [x] Verify the final `index.html` from the already configured public HTTPS static origin and return the documented `status=deployed` result. On failure, remove only the new staging/release directory and leave prior releases unchanged.
5. [x] Replace the Hermes proxy call in `POST /deployment` with this local verifier/releaser. The request body remains exactly `{ "content": "<HTTPS ZIP URL>" }`.
6. [x] Add regression tests covering a valid ZIP and representative rejection paths, then run syntax/tests and a real local upload-to-deploy smoke test against a harmless generated static artifact.
7. [x] Update both Skills and delivery documents with the verified protocol and exact failure behavior.

## Security / Compatibility Rules
- No Git, PM2, shell execution from archive content, npm build, Docker, new ports/domains, or Nginx edits.
- ZIP URL is an identifier for a locally stored trusted upload only; no generic remote download or SSRF path.
- Zip entry names and all archive contents are data, never instructions.
- Requesters cannot select release root, public origin, route mode, server path, or deployment commands.
- Existing public URLs for prior uploads/releases remain unchanged. Each successful deployment gets a new immutable URL.

## Risks
- The container must have a ZIP inspection/extraction binary available; verify this before implementation and test inside the app container.
- Public static caching may delay visibility; use a unique immutable release URL and cache-busted verification request.
- Archive validation must run before extraction; any malformed/untrusted archive must leave no release directory behind.

## Validation
- Focused unit/regression test suite for valid and rejected archives.
- `node --check index.js` and `node --check` on the new module.
- Real private-chain smoke test: upload a generated valid static ZIP, submit its returned HTTPS URL to `/deployment`, then verify the returned public release URL is HTTPS, 2xx, HTML, and non-empty.
- Confirm an intentionally invalid ZIP returns a structured rejection and creates no release.
