# SKILL: release

## Purpose
Prepare clear handoff material after verification passes.

## Inputs
- `docs/TASK.md`
- `docs/PLAN.md`
- `docs/QA.md`

## Outputs
- Updated `docs/RELEASE.md`
- Updated `CHANGELOG.md`

## Procedure
1. Summarize what changed and why.
2. List impact scope:
   - Endpoints affected
   - Utilities/modules affected
   - Behavior changes
3. Add migration notes if needed.
4. Add rollback guidance.
5. Add operator notes (env vars, scripts, deployment order).
6. Append concise changelog entry.

## Release Quality Bar
- Human reader can understand impact in under 3 minutes.
- Risk and rollback are explicit.
- No hidden breaking changes.
