# Coding Rules

## General

- Prefer the smallest safe change.
- Do not add unrelated refactors.
- Reuse existing helpers before creating new abstractions.
- Keep user-facing Chinese messages consistent with the repository style.
- Do not log secrets, tokens, or sensitive payloads.

## Compatibility

- Keep existing API behavior backward compatible unless the task explicitly allows breaking changes.
- Preserve route naming and response shape unless instructed otherwise.

## Dependencies

- Avoid heavy new dependencies unless there is a clear reason.
- If a new dependency is needed, document why before using it.
