# SKILL: implementation

## Purpose
Execute approved work in small, safe chunks while preserving service stability.

## Preconditions
- `docs/PLAN.md` exists
- `docs/PLAN.md` contains `Approved: yes`

## Inputs
- `docs/PLAN.md`

## Outputs
- Code changes
- Incremental notes in `docs/QA.md`

## Rules
- Implement one plan step at a time.
- Prefer minimal-diff edits.
- Keep API responses compatible unless explicitly approved otherwise.
- For this repository, reuse existing helpers in `utils/` whenever possible.

## Procedure
1. Pick next incomplete step from `docs/PLAN.md`.
2. Apply code changes for that step only.
3. Run targeted checks (lint/test/manual endpoint check).
4. Record result in `docs/QA.md` under current iteration.
5. Mark step status in `docs/PLAN.md` (`todo/in_progress/done`).
6. Continue until all approved steps are done.

## Chunk Size Guidance
- Prefer small cohesive edits.
- Avoid mixing refactor + feature + formatting in one chunk.
- If a chunk touches critical paths (e.g. `index.js` routing), include extra verification notes.
