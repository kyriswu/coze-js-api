# SKILL: verification

## Purpose
Validate that the implementation matches acceptance criteria and does not regress existing behavior.

## Inputs
- `docs/TASK.md`
- `docs/PLAN.md`
- Current code diff

## Outputs
- Updated `docs/QA.md`

## Verification Layers
1. Static checks
   - Syntax and import integrity
   - Obvious runtime hazards
2. Functional checks
   - Endpoint behavior (status code, response schema, key fields)
   - Error-path behavior
3. Regression checks
   - Adjacent routes/utilities still behave as expected

## Procedure
1. Build a checklist from acceptance criteria.
2. Execute checks with command evidence where possible.
3. For untestable items, add explicit manual check notes.
4. Log each result in `docs/QA.md`:
   - Case ID
   - Step
   - Expected
   - Actual
   - Status (pass/fail/block)
5. If failures exist, loop back to implementation.

## Exit Criteria
- All required checks are pass or explicitly accepted as known issue.
- No unresolved critical regression.
