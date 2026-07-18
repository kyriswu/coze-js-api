# GPT-Image-2 Atomic Credit Charge Design

## Goal

Close the concurrent balance-check window for both GPT-Image-2 HTTP entry points without changing their request or response shapes.

## Decision

After local input validation and before any image download or upstream generation call, charge three credits with one non-zero-cost Unkey verification. A request proceeds only when that operation returns `valid: true`.

The product decision is that this charge is final: once the request enters the generation workflow, an upstream failure does not refund credits.

## Alternatives considered

1. **Pre-charge with Unkey (selected):** relies on the provider's atomic credit consumption and prevents concurrent requests from passing on the same balance.
2. Redis per-key lock plus post-success charge: adds lease and multi-instance failure modes while retaining a delayed charge.
3. Pre-charge plus refund: requires an idempotent refund ledger and conflicts with the agreed billing policy.

## Scope

- Add a narrow strict charging helper that reports whether Unkey accepted the debit.
- Use it before the expensive work in `POST /gpt-image-2/generate`.
- Apply the same pre-charge rule in `aitoken.generate`, which backs `POST /api/gpt-image-2/generate`.
- Remove the existing post-success charge from both paths so a request is charged at most once.
- Add focused tests for successful/failed debit handling and verify syntax plus the full Node test suite.

## Error handling and compatibility

Local input errors remain free. Invalid or insufficient-credit keys are rejected before upstream work. Existing public route paths and successful response structures are unchanged. Once debit succeeds, later failures retain the charged-credit behavior explicitly approved for this change.
