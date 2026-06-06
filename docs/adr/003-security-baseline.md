# ADR 003 — Security baseline (auth, headers, rate limit, dev-login gate)

**Status:** Accepted — `002f5a1`, `475b1e5`, `dcd4c7f` (2026-06-06)
**Scope:** `apps/api/src/main.ts`, `apps/api/src/app/app.module.ts`, `libs/api/application/src/lib/auth/auth.controller.ts`, `apps/api/src/app/env.validation.ts`, `.env.example`.

---

## Context

A targeted security audit covered auth (cookies, sessions), input validation, headers, rate limiting, dev backdoors, and SQL/XSS surface. Findings are detailed in `TMP/security-audit.md`. This ADR captures the **decisions** behind what shipped — and, just as important, what we explicitly deferred.

## What was already strong

These are kept as-is and worth not re-litigating later:

- **Session cookie** — `httpOnly + secure (in prod) + sameSite=lax + signed + path=/`, 7-day `maxAge`. Signed by `SESSION_SECRET` (≥ 32 chars, env-required).
- **Session ID** — 32 raw bytes → base64url via `node:crypto.randomBytes`. In-memory `Map` with an hourly sweep of expired entries.
- **CORS** — explicit `origin` whitelist parsed from `FRONTEND_URL`, no `*`, `credentials: true`.
- **ValidationPipe** — `whitelist + forbidNonWhitelisted + transform`. Unknown DTO fields are rejected, not stripped.
- **SQL** — TypeORM end-to-end. No raw queries, no string concatenation.
- **XSS** — no `innerHTML`/`DomSanitizer.bypassSecurity*` anywhere in the frontend; Angular auto-escapes interpolations.

## Decisions

### 1. Dev-login backdoor needs *two* signals to enable

Before: the `/api/auth/dev-login` endpoint refused to serve when `process.env.NODE_ENV === 'production'`. A single mis-set env (typo, missing value, build artefact missing the file) would silently expose a credential-free admin login on a public host.

After: the endpoint is reachable iff **both**

1. `NODE_ENV !== 'production'`, **and**
2. `ALLOW_DEV_LOGIN` is a truthy spelling (`true`, `TRUE`, `1`, …).

The check is computed once in the controller constructor and cached as a boolean. The truthy-spelling normaliser (`?.toLowerCase()` + accept `'1'`) is deliberate — an ops typing `ALLOW_DEV_LOGIN=TRUE` in caps shouldn't hit a silent 403 they can't debug.

**Why double-gate.** Defence in depth. The cost of mis-setting `NODE_ENV` is high; the cost of also having to mis-set a second flag is much lower (the flag itself documents the danger).

### 2. Helmet with CSP disabled

Mounted `helmet()` immediately after `cookie-parser` in `main.ts`. Default header set ships X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-DNS-Prefetch-Control, Referrer-Policy, etc.

Content-Security-Policy is explicitly set to `false`. The Yahoo Finance fetches run server-side so no inline asset needs a `script-src` whitelist yet — turning CSP on with the bundled default would silently break logo/favicon loads. CSP is deferred until we have an asset inventory worth pinning.

**Why ship Helmet now anyway.** Most of its value isn't CSP — it's the cheap, no-config headers. Shipping them costs ~5 lines and zero behaviour change.

### 3. Global rate limit at the bottom of the stack

`ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])` registered globally via `APP_GUARD`. Per IP. 100 RPM is generous for a single-user SPA (the dashboard signal cascade is dominated by computeds, not network calls) but tight enough to choke a scraper or brute-force.

**Why not stricter on auth routes yet.** We don't have password auth — Google OAuth handles the only credential-checking flow. A per-route `@Throttle()` on `/api/auth/dev-login` and `/api/transactions/import` is a low-hanging follow-up but not urgent.

### 4. CORS origin parsing now validates URLs

`parseOrigins` previously did `split(',').map(trim).filter(Boolean)`. A typo'd fragment (`http//foo.com`, missing colon) silently entered the whitelist.

After: every fragment is fed through `new URL()`. Invalid entries are dropped with a `Bootstrap` logger warning so the operator notices at boot instead of debugging cross-origin failures later. Falls back to `http://localhost:4200` if every entry was rejected.

## Consequences

- **The dev-login backdoor is now operator-opt-in.** A `.env.example` warning documents the flag. Local dev keeps `ALLOW_DEV_LOGIN=true` set; staging/prod must explicitly opt in (which they shouldn't).
- **The API ships baseline security headers and a global RPS cap.** Adding tighter buckets per-route is now decorator-level.
- **CORS misconfig fails loud at boot.** Not silent at request time.
- **Bundle size is unchanged** for the frontend; backend pulls in `helmet` (~30 kB) and `@nestjs/throttler` (~50 kB). Negligible.

## What we are NOT solving here

These are P1 items from the audit deliberately deferred — each documented separately in `TMP/security-audit.md`:

- **CSRF token.** `SameSite=Lax` handles most cross-site mutation vectors; adding a full token round-trip means a frontend `AuthInterceptor` change and is bigger than this ADR's appetite. Tracked as ADR-future.
- **Redis-backed sessions.** Operational, not security. The in-memory `Map` loses every session on restart and prevents horizontal scaling. Needed before this app sees more than a single user or a single replica.
- **Sliding session window.** Cookie `maxAge` is 7 days fixed; no refresh-on-activity. Acceptable for a personal tracker; revisit when multi-user.
- **Per-route stricter throttle buckets.** Easy follow-up — `@Throttle({ default: { ttl:60_000, limit:5 } })` on `/auth/*` and `/transactions/import`.

If any of those become urgent (multi-user beta, public deployment), they get their own ADR.
