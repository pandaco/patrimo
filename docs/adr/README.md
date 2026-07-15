# Architecture Decision Records

Short, focused records of decisions that future-you (or future contributors) need
to understand to navigate the codebase without re-deriving the reasoning.

## Format

Each ADR follows a flat structure:

- **Status** — Accepted / Superseded by ADR XXX. Includes the commit that
  landed it and the date.
- **Scope** — files this decision applies to.
- **Context** — what was wrong with the previous state.
- **Decision** — what we are doing now and why.
- **Consequences** — what changes for the next person to touch this area,
  including explicit *non*-goals.

Trade-offs that don't survive into the running code (e.g. "we considered
weighted-average but went FIFO because…") belong here, not in code comments.

## Index

| #   | Title                                              | Status   |
|-----|----------------------------------------------------|----------|
| 001 | [FIFO realized P&L (cost-basis-aware)](./001-fifo-realized-pnl.md) | Accepted |
| 002 | [App-wide toast pattern via `ToastService`](./002-toast-service.md) | Accepted |
| 003 | [Security baseline (auth, headers, rate limit, dev-login gate)](./003-security-baseline.md) | Accepted |
| 004 | [Redis-backed sessions with sliding TTL](./004-redis-sessions.md) | Accepted |

## When to write an ADR

- A decision that constrains future code in a non-obvious way (data model,
  shared abstraction, third-party choice).
- A decision someone is likely to question or accidentally revert later.
- A fix whose *why* is more interesting than its *what* — especially fixes
  that emerge from a code review (cf. ADR 001).

If the decision is reversible at low cost and the code makes the intent
obvious, skip the ADR — comments and a good commit message are enough.
