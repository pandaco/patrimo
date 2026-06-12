# ADR 004 — Redis-backed sessions with sliding TTL

**Status:** Accepted (2026-06-12)
**Scope:** `libs/api/application/src/lib/auth/session.service.ts`, `session.guard.ts`, `auth.controller.ts`.

---

## Context

`SessionService` stored sessions in an in-memory `Map`. Two consequences, both flagged in the security audit (P2) and ADR 003's deferred list:

1. **Every API restart logged every user out.** Tolerable for a single-user MVP, hostile beyond it.
2. **No horizontal scaling.** A second replica would need sticky sessions.

A third, smaller finding (P3): the 7-day cookie `maxAge` was fixed — a session never extended on activity, and never shrank for an idle user either.

## Decision

Port the session store to Redis (`REDIS_URL` was already provisioned for the price cache), keeping the same opaque-cookie BFF contract:

- **Key layout:** `session:<id>` → `{"userId": "..."}` with a native Redis TTL (`PX`). The id stays 32 random bytes base64url; nothing about cookie handling changes.
- **Sliding window:** every `get()` hit re-arms the TTL (`PEXPIRE`). A session now dies after 7 days of *inactivity* instead of 7 days after login. This implements the audit's P3 recommendation at zero extra cost.
- **Graceful degradation:** the service keeps a local `Map` mirror, written on `create`/`get`. When Redis is unreachable (`status !== 'ready'` or a command throws), reads and writes fall back to the mirror — the same pattern `PriceCacheService` already uses. Worst case during an outage equals the pre-Redis behaviour (restart = logout), never worse.
- **API became async** (`create`/`get`/`destroy` return promises). `SessionGuard.canActivate` was already async; the three controller call sites now `await`.

## Why not a sticky TTL ceiling

A hard "absolute max lifetime" (e.g. force re-login after 30 days regardless of activity) is standard for financial-grade apps. Deferred: Google OAuth re-auth is cheap, but the cookie's own `maxAge` (7 days, fixed at issuance) already caps each cookie's life — the sliding Redis TTL can outlive the cookie only if the browser keeps re-sending it, which `maxAge` prevents.

## Consequences

- Sessions survive deploys and restarts; replicas can share the store.
- Logout (`DEL`) is global across replicas, not per-process.
- Redis going down no longer breaks auth — it quietly narrows it to single-process semantics until Redis returns.
- `SESSION_TTL_MS` keeps its meaning (now: inactivity window).
