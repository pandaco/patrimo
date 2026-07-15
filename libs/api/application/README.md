# api-application

Application layer (hexagonal) : use-cases, REST controllers (envelopes, etfs, transactions, portfolio, performance, alerts, dca-plans, liabilities, strategy-versions, preferences, audit-log, market) and auth (Google OAuth BFF, `SessionGuard`, CSRF). Depends on `api-domain` ports only — adapters are wired in `apps/api` (composition root).
