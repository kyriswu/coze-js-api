# Seedance Ten-Minute Upstream Timeouts

## Goal

Give both Seedance task creation and task polling up to ten minutes for a single upstream response.

## Design

- Define one `SEEDANCE_TASK_TIMEOUT_MS` constant as `600_000` milliseconds.
- Use that shared constant in the upstream Axios POST and GET requests for content-generation tasks.
- Do not add retries: retrying task creation can create duplicate videos and duplicate settlement.
- Preserve the existing response envelope and non-timeout error behavior.

## Verification

Run JavaScript syntax and diff checks only, as requested. Do not run automated tests or live upstream calls.
