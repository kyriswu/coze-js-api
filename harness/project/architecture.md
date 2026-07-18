# Architecture

## High-level layout

- `index.js` wires HTTP routes.
- `routes/` contains route grouping and navigation helpers.
- `utils/` contains integration clients and shared helpers.
- `views/` contains EJS templates.
- `skills/` contains reusable task-oriented skill definitions and scripts.

## Working principle

Keep changes close to the owning module. Prefer adding a narrow helper or route handler over reshaping the whole tree.
