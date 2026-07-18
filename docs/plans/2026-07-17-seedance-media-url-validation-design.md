# Seedance Media URL Validation Design

## Goal

Reject inaccessible or unsafe Seedance reference-media URLs before creating an upstream task, returning the affected content index and a reason without disclosing credentials or payload contents.

## Scope

Validate only `content` entries whose type is `image_url`, `video_url`, or `audio_url`. Each entry must provide a URL either as its media field string or as that field's `url` property.

## Validation

1. Accept HTTP(S) URLs on normal ports only; reject malformed URLs and embedded credentials.
2. Resolve every destination host and reject loopback, private, link-local, multicast, unspecified, and reserved IPv4/IPv6 addresses.
3. Probe with HEAD and follow at most five redirects manually, validating every redirect target before connecting.
4. When a server rejects HEAD, retry with a one-byte Range GET; do not download media content.
5. Require a successful response and a media-compatible Content-Type. A request is rejected with its content index, media type, and a safe reason when any check fails.

## Boundaries

- Validation runs before the upstream creation request and before task ownership is stored.
- No raw media URL is written to logs or error messages.
- The change does not affect text-only Seedance requests or other project APIs.
