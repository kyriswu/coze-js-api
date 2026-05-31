# AGENTS

## 1) Mission
- Turn task requests into safe, incremental, verifiable code changes.
- Keep project behavior stable while improving implementation quality.
- Produce clear handoff artifacts in `docs/` for human review.

## 2) Working Contract
- Single source of task truth: `docs/TASK.md`.
- No coding before plan exists in `docs/PLAN.md` and is marked approved.
- Implement in small chunks; each chunk must be independently testable.
- After each chunk, update `docs/QA.md` with evidence.
- Before closing, update `docs/RELEASE.md` and `CHANGELOG.md`.

## 3) Project-Specific Guardrails
- Runtime baseline: Node.js (ESM), Express API server.
- Existing API response shape must stay backward compatible unless task explicitly allows breaking change.
- Keep Chinese user-facing messages consistent with existing style in this repo.
- Prefer reusing helpers in `utils/` over introducing duplicate utilities.
- Do not log secrets, tokens, or sensitive payloads.
- Do not add heavy dependencies unless justified in `docs/PLAN.md`.

## 4) Execution Flow
1. Read `docs/TASK.md` and restate scope, constraints, acceptance criteria.
2. Run `SKILLS/spec-to-plan` and write plan into `docs/PLAN.md`.
3. Wait for approval flag in `docs/PLAN.md` (`Approved: yes`).
4. Run `SKILLS/implementation` for chunked delivery.
5. Run `SKILLS/verification` and append results to `docs/QA.md`.
6. Run `SKILLS/release` and finalize `docs/RELEASE.md` + `CHANGELOG.md`.

## 5) Stop Conditions
Stop and request clarification when any of the following occurs:
- Task conflicts with existing API contracts and no migration strategy is approved.
- Required env vars, credentials, or external services are unavailable.
- A failing test indicates unrelated critical regression.
- Plan scope expands beyond approved boundaries.

## 6) Definition of Done
- All acceptance criteria in `docs/TASK.md` are checked.
- Implemented files are listed in `docs/QA.md`.
- Verification evidence recorded (commands, outputs summary, or manual checks).
- Release notes and impact statement completed in `docs/RELEASE.md`.
- `CHANGELOG.md` updated with meaningful user-facing changes.
