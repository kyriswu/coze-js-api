# Seedance 2.0 Token Billing Design

## Goal

Bill completed Seedance 2.0 video-generation tasks from the requesting project's API Key using the actual upstream output token count. A successful task is returned even when settlement cannot be collected; that response is marked as an outstanding balance.

## Confirmed Rules

- The upstream terminal-success response exposes `usage.completion_tokens`.
- Use the highest configured price for every task: ¥46 per million completion tokens.
- One project credit represents ¥0.05.
- Charge `ceil(completion_tokens * 46 / 50,000) + 10` credits.
- Only `status: succeeded` tasks with a valid positive completion-token count are billable.
- Failed tasks and task responses without billable usage are not charged.

## Flow

1. Creation still requires an API Key. After the upstream task is accepted, store only a SHA-256 digest of that key against the returned task ID in Redis with a 30-day TTL.
2. Polling requires the same API Key. Its digest must match the recorded task owner before the upstream task is exposed.
3. When polling sees `status: succeeded`, calculate the total credit charge from `usage.completion_tokens`.
4. Use Redis state `pending`/`charged`/`outstanding` under the task ID to make settlement idempotent across repeat polls. A temporary pending lock is released after an unexpected charge error so a later poll can retry.
5. If the key cannot cover the charge, preserve and return the upstream video response, mark settlement as outstanding, and report the final credit charge and remaining balance. A later poll with replenished balance may settle it.

## Boundaries

- Raw API Keys are never persisted in Redis or logs.
- The public documentation describes the required polling API Key and final charged-credit field, but does not expose internal cost components.
- Existing response envelopes remain `code`, `msg`, and `data`; settlement metadata is added as a sibling field only for completed billable tasks.
