# OpenAI Hub domain cutover design

## Goal

Replace the retiring OpenAI Hub API host before `openai-hub.com` stops resolving.

## Design

The image client keeps one `OPENAI_HUB_BASE` constant. Change only that value from `https://api.openai-hub.com` to `https://api.openai-hub.net`. Existing image-generation and image-edit calls continue appending their current `/v1/images/...` paths, so their request payloads, authentication, retry behavior, error handling, and exported API are unchanged.

## Alternatives considered

- Recommended: a one-line base-host replacement. It is the smallest change and preserves all behavior except the authority.
- Environment-driven host selection. This adds deployment configuration and failure modes without being needed for this urgent cutover.
- Dual-host fallback. This delays failure instead of completing the required migration and could send requests to an unavailable host.

## Validation

Search tracked files for the retiring host, confirm the new host is present in the client, and run `node --check utils/ThirdParrtyApi/aitoken.js`.
