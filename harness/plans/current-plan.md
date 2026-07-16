# Current Plan

## Goal
Before `openai-hub.com` stops resolving on 2026-07-16 evening, switch the image API client to `api.openai-hub.net` without changing request paths or behavior.

## Verified Context
- `utils/ThirdParrtyApi/aitoken.js` is the only tracked source reference to the retiring domain and centralizes the base URL for image-generation and image-edit requests.

## Implementation Steps
1. [x] Replace the base URL constant only.
2. [x] Confirm no executable configuration references the retiring domain and run a Node syntax check.
3. [x] Record the verification and release note in the delivery documents.

## Compatibility Rules
- Preserve endpoint paths, authentication, timeouts, request bodies, response handling, and public API shape.
- Do not add fallback routing or new configuration.
