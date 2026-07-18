# API Rules

- Validate required inputs before calling upstream services.
- Keep request and response payloads stable where possible.
- Normalize errors through the existing project error style.
- Prefer narrow route handlers over generic catch-all logic.
