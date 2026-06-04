# Suivi — Patrimo

État chronologique des chantiers livrés. Référence rapide pour savoir où on en est et ce qui reste.

> 📦 **Stack actuelle**
> Nx 22.7 monorepo · Angular 21.2 (zoneless, signals, `httpResource`, OnPush partout) · NestJS 11 (TypeORM 0.3 · Passport Google OAuth2 BFF) · PostgreSQL 18.4 · Redis 8.6 · Yahoo Finance v3.

---

## 1. Bootstrap & port du prototype

| Chantier | Commits | État |
|---|---|---|
| Workspace Nx 22.7 (hexagonal) | `98bab85` `a453e6d` | ✅ |
| Drop des scaffolds générateur Nx, `passWithNoTests` sur libs vides | `03ac327` | ✅ |
| Primitives design-system (`ui-bar`, `ui-donut`, `ui-sparkline`, `ui-delta`, `ui-env-glyph`, `ui-kbd`, `app-ico`, `format.*`) | `82cff02` | ✅ |
| Domain models + mocks signal-based (Envelope, Etf, Transaction, Alert, …) | `2ec34f4` | ✅ |
| Shell Angular standalone : sidebar/topbar/router, raccourcis clavier `G+X`, dialogs lazy, locale FR, prototype → Angular | `3abc14a` | ✅ |
| Scripts npm rationalisés + `docs/dev-setup.md` + `docs/commands.md` | `d854a1d` | ✅ |

## 2. Backend — auth + persistance hexagonale

| Chantier | Commits | État |
|---|---|---|
| Domain layer (entités + ports `*_REPOSITORY`) | `29b8277` | ✅ |
| Infra TypeORM (adapters, migration `Init`, seed runner, decimal transformer) | `a57cfc6` | ✅ |
| BFF Google OAuth2 (`/api/auth/google`, `/callback`, `/me`, `/logout`) + sessions cookie signé HttpOnly + env validation `class-validator` | `7083ec8` | ✅ |
| Frontend auth : `AuthService`, interceptor, guards réels, app initializer | `099b610` | ✅ |
| Persistence users → Postgres + TypeORM dans AuthModule | `fbec62b` | ✅ |
| Postgres 18 volume mount fix (`/var/lib/postgresql` au lieu de `…/data`) | `ee2c6ff` | ✅ |
| Source-only libs bundlées par webpack (résout les conflits `@nx/js:tsc` + alias) | `5086161` | ✅ |
| Lockfile nettoyé (entrées workspaces obsolètes) | `18f6847` | ✅ |

## 3. API REST + wiring frontend

| Chantier | Commits | État |
|---|---|---|
| DTOs partagés (`libs/shared/contracts`) | `42aa365` | ✅ |
| Endpoints `/api/envelopes`, `/etfs`, `/transactions` (GET + POST) derrière `SessionGuard` | `026c359` | ✅ |
| Frontend hydrate `EnvelopeService` depuis l'API | `9b76fcd` | ✅ |
| Frontend hydrate `EtfService` + `TransactionService` depuis l'API | `8190fc4` | ✅ |
| Hoist `inject()` avant `await` dans `provideAppInitializer` | `c24c176` | ✅ |
| Dialog transaction → POST `/api/transactions` | `16eb4eb` | ✅ |
| Envelope dialog + POST `/api/envelopes` + nom Google côté sidebar | `d65b4db` | ✅ |

## 4. Position & market data

| Chantier | Commits | État |
|---|---|---|
| `PortfolioService` agrège positions depuis transactions (qty + PRU + invested) | `769e962` | ✅ |
| Enrichissement prix Yahoo Finance + cache in-mem | `28d13a0` | ✅ |
| `PriceCacheService` constructor zero-arg (fix Nest DI) | `d986f9b` | ✅ |
| `pg date` strings → `Date` + yahoo-finance2 v3 API | `2579e53` | ✅ |
| Callout "C'est quoi une position ?" + entrée glossaire Position | `fe3c78f` | ✅ |
| Glossaire PnL + tooltip `<abbr>` | `caf2092` | ✅ |
| Badges sidebar (Tx + Alertes) live depuis signal | `f767f02` | ✅ |

## 5. CRUD complet

| Chantier | Commits | État |
|---|---|---|
| Transactions PATCH/DELETE + edit dialog + actions ✎/× | `a1e01f7` | ✅ |
| Yahoo survey suppress + OAuth `invalid_grant` filter (redirect `/login?error=oauth_failed`) | `d9c9e66` | ✅ |
| Envelopes PATCH/DELETE + edit dialog + actions ✎/× | `070f630` | ✅ |
| Refresh portfolio post-action centralisé dans services | `d14990b` | ✅ |

## 6. Infrastructure & modernité

| Chantier | Commits | État |
|---|---|---|
| Redis cache (remplace in-mem) + cron quotidien 9h Paris pré-chauffage prix | `8a7d199` | ✅ |
| Tests unitaires PortfolioService / PriceService / yahoo-symbol / format (26 tests) | `aa3fd76` | ✅ |
| `selectedEnv()` typé `Envelope \| undefined` (NG8107 fix x2) | `74ba729` `975df28` | ✅ |
| Zoneless audit : `NgZone` éliminé, services list migrés sur `httpResource`, app initializer simplifié | `80c63f3` | ✅ |

---

## Stack vérifiée

- ✅ **Zoneless** : `provideZonelessChangeDetection()` + zéro `NgZone`
- ✅ **Signals partout** : `signal`, `computed`, `effect`, `inject()` — pas de `BehaviorSubject` / `EventEmitter` legacy
- ✅ **OnPush partout** : tous les composants `standalone: true` + `ChangeDetectionStrategy.OnPush`
- ✅ **`httpResource`** : `EnvelopeService`, `EtfService`, `TransactionService` exposent `value` + `isLoading` + `error` signals
- ✅ **Auth réactive** : `httpResource` gated sur `auth.isAuthenticated()` — auto-fetch dès que le gate flip true
- ✅ **CRUD end-to-end** : Envelopes + Transactions (GET / POST / PATCH / DELETE) avec ownership scope au niveau repo
- ✅ **Cache Redis** persistant + cron 9h Paris pré-chauffage Yahoo Finance

## État runtime

- API : `http://localhost:3333/api` (NestJS)
- Web : `http://localhost:4200` (Angular dev server)
- Postgres : `:5432` (Docker)
- Redis : `:6379` (Docker)

```bash
npm run ports:free      # libère 3333 + 4200
npm run docker:up       # postgres + redis
npm run db:migrate      # migrations TypeORM
npm run db:seed         # 1 dev user + 8 ETFs + 11 enveloppes + 13 transactions
npm start               # nx run-many -t serve -p web api
```

## TODO — chantiers ouverts

| Priorité | Chantier | Détails |
|---|---|---|
| 🟢 Haute | Wire features mock | Allocation, Performance, DCA, Calendar, Compare, Alerts — backend calculs (perf historique, dividendes projetés) + frontend pages |
| 🟢 Haute | Tests étendus | Couvrir `AuthService`, guards, dialogs, `EnvelopeService.update`, repos TypeORM. Cible ≥ 70 %. E2E Playwright (login + créer tx) |
| 🟡 Moyenne | PWA + offline | Service worker, manifest installable, mode offline degradant |
| 🟡 Moyenne | i18n FR/EN | Angular Localize, language switcher |
| 🟡 Moyenne | Refresh prix sur action | Bouton « refresh prix » manuel sur dashboard pour bypass cache 15 min |
| 🔵 Basse | Audit log | Track des mutations user (création/suppression) |
| 🔵 Basse | Multi-currency | Conversion EUR ↔ USD ↔ GBP via FX provider |
| 🔵 Basse | Préférences user | Endpoint `/api/users/me/preferences` (riskProfile, horizon, monthlyTarget, displayCurrency) |
| 🔵 Basse | Pagination transactions | Page Transactions → infinite scroll / "Charger 30 mouvements de plus" actif |

## Limitations connues

- **Sidebar badge Alertes** : encore mock (`AlertService` non branché API). Pas d'endpoint alerts pour l'instant.
- **Sparklines** : encore mock (`MOCK_SPARKS`). Pas d'historique prix en DB.
- **Performance historique** : page Performance reste mock — nécessite stocker `daily_prices` ou interroger Yahoo `historicalQuotes()`.
- **Position fermées** : pas listées (`qty ≤ 0` skip). PV/MV réalisées non affichées.
- **Yahoo overrides** : 8 ETFs seedés hardcodés. ETF user-créé avec ticker inconnu → fallback `<ticker>.PA`, peut échouer silencieusement.
- **OAuth scope** : single-user MVP via `GOOGLE_ALLOWED_EMAILS`. Pas de gestion multi-user / signup ouvert.
