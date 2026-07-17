# Current Plan

## Goal

Add a TikHub-compatible WeChat universal search endpoint at `POST /wechat_search/v2/fetch_search`.

## Steps

1. [x] Read repository workflow, project context, coding rules, API rules, and the upstream API document.
2. [x] Confirm the local route, response-preservation approach, daily free trial, and paid credit cost with the user.
3. [x] Add the narrow TikHub handler and Express route.
4. [x] Add focused validation coverage and run syntax checks.
5. [x] Update delivery records and refresh the Graphify knowledge graph.

## Scope

- Preserve existing API behavior and route compatibility.
- Accept request parameters from JSON body or query string.
- Preserve upstream JSON text so 64-bit IDs are not rounded by JavaScript.
- Allow one free request per identity per day; successful paid requests consume 3 credits.
