# WeChat universal search design

## Goal

Expose TikHub's WeChat universal search at `POST /wechat_search/v2/fetch_search` while preserving its pagination behavior and 64-bit identifier precision.

## Design

The handler is added to `th_wechat_media` in `utils/tikhub.io.js`, with a narrow route registration in `index.js`. It accepts parameters from either the JSON request body or query string: `keyword`, `business_type`, `sort`, `publish_time`, `offset`, `cursor`, `raw`, and optional `api_key`.

It validates the required keyword after trimming (1–100 characters), the documented business-type and filter enums, and a non-negative integer offset. It sends the accepted values to TikHub's `POST /api/v1/wechat_search/v2/fetch_search` with a 30-second timeout.

The upstream response is requested as text and sent through unchanged. This avoids JSON parsing in JavaScript, which would otherwise round 64-bit values such as `docID` and `feedNonceId`. The handler therefore preserves the upstream response shape, including `cursor` and `continue_flag` for pagination.

Existing `valid_redis_key` access control is reused with an endpoint-specific key. It gives each identity one free daily trial request when no `api_key` is supplied. A successful request with an `api_key` consumes 3 credits through the existing Unkey integration; the access check requires at least 3 credits before an upstream call is made.

## Alternatives considered

- Recommended: pass through the upstream JSON text. It preserves documented large integer values and the complete upstream contract without an additional parser dependency.
- Wrap the response in the project's usual `{ code, msg, data }` envelope. This would require safe large-integer parsing and reserialization, increasing implementation risk.
- Force `raw=false` and normalize the results. This would remove useful upstream options and would no longer be a corresponding interface.

## Validation

Run syntax checks for changed JavaScript files and focused handler tests for required fields, enum validation, and default/forwarded request behavior. Review `docs/QA.md`, `docs/RELEASE.md`, and `CHANGELOG.md`, then refresh Graphify outputs.
