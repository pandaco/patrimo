# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Patrimo — personal wealth-tracking web app (French UI): envelopes (PEA, AV, CTO, livrets, cash), ETFs, transactions, live positions, target allocation, alerts, performance vs benchmark. Single-user MVP authenticated via Google OAuth only.

## Commands

```bash
npm run docker:up           # postgres:5432 + redis:6379 (required before API)
npm run db:migrate          # TypeORM migrations
npm run db:seed             # dev user + 8 ETFs + 11 envelopes + 13 transactions
npm start                   # web :4200 + api :3333/api, both in watch
npm run start:web           # frontend only
npm run start:api           # backend only

npm test                    # all tests (web + api + libs)
npx nx test web             # one project; single file: npx nx test web --testFile=path/to/file.spec.ts
npm run lint / lint:fix
npm run typecheck
npm run db:reset            # wipe volumes + recreate + migrate + seed
npm run ports:free          # kill 3333 + 4200
```

Full command reference: `docs/commands.md`. Setup (Node 24, Docker, Google OAuth step-by-step): `docs/dev-setup.md`.

- Single `.env` at repo root (never in `apps/api/`). `.env.example` matches `docker-compose.yml` creds.
- E2E (Playwright, `apps/web-e2e`) uses `/api/auth/dev-login` — enabled only when `NODE_ENV !== 'production'` AND `ALLOW_DEV_LOGIN=true`.

## Private planning docs — `tmp/` (gitignored)

`tmp/progress.md` is the **backlog and single source of truth for project state**: shipped work per commit, open TODO table (prioritized), known limitations, exposed endpoints. Update it when shipping a feature. Other notable files: `tmp/mcd.md`/`tmp/mpd.md` (data model), `tmp/architecture.md` (hexagonal spec), `tmp/auth.md` (OAuth BFF spec), `tmp/best-practices.md` (engineering standards), `tmp/security-audit.md`, `tmp/ux-novice-analysis.md`.

## Architecture

Nx monorepo. Apps are thin entry points; all real code lives in `libs/`.

**Backend (NestJS 11) — hexagonal, dependency rule points inward:**
- `libs/api/domain` — entities + ports (`Symbol` tokens like `TRANSACTION_REPOSITORY`). Pure TS, no Nest, no TypeORM, no I/O.
- `libs/api/application` — use cases + controllers + auth (Nest DI allowed here).
- `libs/api/infrastructure` — adapters: TypeORM repos (ORM entities separate from domain entities, joined by mappers), Redis cache, Yahoo Finance, Google OAuth. Migrations + seeds under `src/lib/persistence/`.
- `apps/api` — composition root wiring ports to adapters (`{ provide: TOKEN, useClass: Adapter }`).

**Frontend (Angular 21) — strict modern idioms, verified across the codebase:**
- Zoneless (`provideZonelessChangeDetection`), signals/computed everywhere, `inject()` over constructors, standalone components, `ChangeDetectionStrategy.OnPush` on every component. No `BehaviorSubject`, no `NgZone`, no NgModules.
- `libs/web/data-access` — services exposing `httpResource` (value/isLoading/error signals), gated on `auth.isAuthenticated()` so they auto-fetch after login.
- `libs/web/features` — route-level pages (dashboard, wealth, portfolio, transactions, allocation, performance, dca, calendar, compare, alerts, glossary, tips, preferences).
- `libs/web/ui` — atomic presentational components (`ui-bar`, `ui-donut`, `ui-sparkline`, toast, …) with `input()`/`output()` only.
- `libs/shared/contracts` — DTOs shared web ↔ api.
- `design/` (committed JSX/HTML prototype) is the visual source of truth; the Angular port must match it pixel-wise.

**Auth flow (BFF):** Google OAuth → signed HttpOnly cookie `patrimo_sid` → in-memory session Map → `SessionGuard` on every API route. CSRF via response-header double-submit (`CsrfMiddleware` backend, `csrfInterceptor` frontend); Helmet (CSP off, see ADR 003); global + per-route throttling. Never put tokens in localStorage.

**Money flows:** positions are computed by replaying transactions (qty, PRU/avgPrice, invested) in `PortfolioService`, enriched with Yahoo prices cached in Redis (daily 9h Paris pre-warm cron, 24h historical cache). Realized P&L uses fee-aware FIFO lot replay (`realized-pnl.ts` pure function, see ADR 001). Money columns are `decimal` with a decimal.js transformer — never float.

## Conventions

- Conventional Commits in **English** (commitlint + Husky enforced). Code, comments, docs: English. **User-facing UI strings: French.**
- Canonical glossary (code ↔ French UI): `Envelope`=enveloppe, `Transaction`=mouvement/opération, `avgPrice`=PRU, `pnl`=plus-value latente, `ter`=frais de gestion, `drift`=écart d'allocation. Full table in `tmp/README.md` §4.
- TypeORM: migrations only, never `synchronize: true`. Repos scope every query by `userId` (ownership at repo level).
- DTO validation: global `ValidationPipe` with `whitelist + forbidNonWhitelisted` — unknown fields are rejected, so new API fields require DTO updates in `libs/shared/contracts`.
- Architectural decisions go in `docs/adr/` (existing: FIFO realized P&L, ToastService, security baseline).
- User feedback: shared `ToastService` + `<ui-toast>` — never native `alert()`.
