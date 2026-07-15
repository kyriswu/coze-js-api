# File Transfer Upload HTTPS URL Design

## Goal

Ensure the public URL returned after a file-transfer upload always uses HTTPS.

## Scope

- `POST /file-transfer/upload`
- `POST /file-transfer/upload/complete`

## Decision

Keep the existing shared `getFilePublicUrl` helper, but construct its URL with the fixed `https` scheme. Continue deriving the authority from the request `Host`, and preserve the existing storage-specific public path and encoded filename.

## Alternatives Considered

- Use `req.protocol`: rejected because an HTTP reverse-proxy hop can produce an HTTP URL.
- Use `X-Forwarded-Proto`: rejected because it still depends on proxy configuration.
- Configure a fixed public hostname: rejected because it would change existing host-derived behavior.

## Validation

- Syntax-check `index.js`.
- Statically verify both upload completion handlers call the shared HTTPS URL helper.
