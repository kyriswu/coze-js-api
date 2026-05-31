# SKILL: spec-to-plan

## Purpose
Convert a raw request into an ordered, reviewable implementation plan before coding.

## Inputs
- `docs/TASK.md`
- Current codebase context

## Outputs
- Updated `docs/PLAN.md`

## Procedure
1. Extract from `docs/TASK.md`:
   - Problem statement
   - Scope (in/out)
   - Constraints
   - Acceptance criteria
2. Inspect relevant files and list impacted modules.
3. Propose an ordered plan with phases and small executable tasks.
4. Add risk table with mitigation.
5. Add rollback plan and verification strategy.
6. Set `Approved: pending` until human approves.

## PLAN Format
- Title
- Approved: `pending | yes`
- Context summary
- Scope
- Assumptions
- Implementation steps
- Verification plan
- Risks and mitigations
- Rollback strategy

## Quality Bar
- Steps are atomic and testable.
- No hidden work.
- Every acceptance criterion maps to at least one step.
