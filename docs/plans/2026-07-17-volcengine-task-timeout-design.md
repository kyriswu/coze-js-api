# Volcengine Task Timeout Handling Design

## Goal

Make Volcengine content-generation task calls resilient to slow upstream responses without retrying task creation and risking duplicate generation or charges.

## Scope

- Configure creation and query requests with `VOLCENGINE_TASK_TIMEOUT_MS`, defaulting to 300,000 ms (five minutes).
- Classify Axios timeout failures and return HTTP 504 while retaining the existing `{ code, msg, data }` response envelope.
- Emit structured, payload-free diagnostics containing operation, elapsed time, Axios error code, upstream status, and request ID when available.
- Keep all non-timeout failure status behavior compatible and do not add automatic retries.

## Error Flow

1. The handler starts a timer before making the upstream call.
2. If Axios rejects with a timeout code, the handler logs metadata only and replies with HTTP 504. Creation responses warn that the task might exist and must be checked before resubmission.
3. Other failures retain the current HTTP 200 plus `code: -1` envelope and safe diagnostic logging.
4. A successful upstream response retains its current HTTP 200 response and payload shape.

## Verification

- Unit tests cover timeout configuration parsing, timeout recognition, create-task 504 behavior, non-timeout compatibility, and the absence of retry behavior.
- Run the focused test, full test suite, syntax check, diff validation, and Graphify update.
