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

## 7. Wire des features mock → real

| Chantier | Commits | État |
|---|---|---|
| **Allocation** réel : `tacticReal` / `strategicReal` calculés depuis positions, card "Par devise" | `f745c18` | ✅ |
| **DCA helper** : filtre enveloppes par glyph (UUID-safe), `selectedEnvelope` dynamique | `a6903b3` | ✅ |
| **Comparateur ETF** : sélection multi (4 max), TCO 5A calculé depuis TER, drop hardcoded | `79d1ecd` | ✅ |
| **Calendar** : dividendes passés depuis tx + jalons PEA 5 ans, fenêtre ±3 mois glissante | `5e5db23` | ✅ |
| **Alerts** : endpoint `/api/alerts` génère 5 règles depuis données réelles, `AlertService` → `httpResource` | `a87f76d` | ✅ |
| **Performance** : `/api/performance/series?period=…` daily walking + Yahoo `chart()` cache 24 h | `db4a9f8` | ✅ |
| **Performance switcher** : tabs 1M/3M/6M/YTD/1A, multi-périodes table, card Méthodologie | `85c432c` | ✅ |
| **Performance benchmark** : MSCI World CW8.PA rebasé, alpha affiché, méthodologie mise à jour | `0b5fd4a` | ✅ |
| **Drawdown walker** : top 3 drawdowns calculés depuis série, durée + récupération, état "en cours" | `dedc7c9` | ✅ |

## 8. Persistance préférences + polish UX

| Chantier | Commits | État |
|---|---|---|
| Table `user_preferences` (JSONB targets) + endpoint `GET/PUT /api/users/me/preferences` + frontend `PreferencesService` httpResource | `4f7121e` | ✅ |
| Fix DI : `PortfolioModule` exporte `PortfolioService` (résout `AlertModule` boot crash) | `a1e9df9` | ✅ |
| Page `/settings/preferences` (form scalaires, accessible via avatar/⚙ sidebar) | `8179203` | ✅ |
| Allocation targets edit UI : stratégique / tactique / par ETF + validation Σ = 100 % | `25fbbd6` | ✅ |
| Topbar refresh button (`↻`) → POST `/api/portfolio/refresh` (bypass cache) + skeleton loaders dashboard | `f21f620` | ✅ |

---

## Stack vérifiée

- ✅ **Zoneless** : `provideZonelessChangeDetection()` + zéro `NgZone`
- ✅ **Signals partout** : `signal`, `computed`, `effect`, `inject()` — pas de `BehaviorSubject` / `EventEmitter` legacy
- ✅ **OnPush partout** : tous les composants `standalone: true` + `ChangeDetectionStrategy.OnPush`
- ✅ **`httpResource`** : Envelope, Etf, Transaction, Alert, Performance, Preferences exposent `value` + `isLoading` + `error` signals
- ✅ **Auth réactive** : `httpResource` gated sur `auth.isAuthenticated()` — auto-fetch dès que le gate flip true
- ✅ **CRUD end-to-end** : Envelopes + Transactions (GET / POST / PATCH / DELETE) avec ownership scope au niveau repo
- ✅ **Cache Redis** persistant + cron 9h Paris pré-chauffage Yahoo Finance + cache historical 24 h
- ✅ **Toutes les pages principales sur données réelles** : Dashboard, Patrimoine, Portefeuille, Transactions, Allocation, Performance, DCA, Calendar, Comparateur, Alerts, Settings
- ✅ **Préférences persistantes** : scalars + allocation targets éditables depuis `/settings/preferences`, reflétés partout via signals

## État runtime

- API : `http://localhost:3333/api` (NestJS)
- Web : `http://localhost:4200` (Angular dev server)
- Postgres : `:5432` (Docker)
- Redis : `:6379` (Docker)

```bash
npm run ports:free      # libère 3333 + 4200
npm run docker:up       # postgres + redis
npm run db:migrate      # migrations TypeORM (Init + UserPreferences)
npm run db:seed         # 1 dev user + 8 ETFs + 11 enveloppes + 13 transactions
npm start               # nx run-many -t serve -p web api
```

## Endpoints exposés

| Méthode | URL | Garde |
|---|---|---|
| `GET`    | `/api/auth/google`                | — (redirect Google) |
| `GET`    | `/api/auth/google/callback`       | `GoogleAuthFilter` |
| `GET`    | `/api/auth/me`                    | `SessionGuard` |
| `POST`   | `/api/auth/logout`                | — |
| `GET`    | `/api/envelopes`                  | `SessionGuard` |
| `POST`   | `/api/envelopes`                  | `SessionGuard` |
| `PATCH`  | `/api/envelopes/:id`              | `SessionGuard` |
| `DELETE` | `/api/envelopes/:id`              | `SessionGuard` |
| `GET`    | `/api/etfs`                       | `SessionGuard` |
| `GET`    | `/api/transactions`               | `SessionGuard` |
| `POST`   | `/api/transactions`               | `SessionGuard` |
| `PATCH`  | `/api/transactions/:id`           | `SessionGuard` |
| `DELETE` | `/api/transactions/:id`           | `SessionGuard` |
| `GET`    | `/api/portfolio`                  | `SessionGuard` |
| `POST`   | `/api/portfolio/refresh`          | `SessionGuard` (bypass cache Yahoo) |
| `GET`    | `/api/alerts`                     | `SessionGuard` |
| `GET`    | `/api/performance/series?period=` | `SessionGuard` (+ benchmark CW8 + drawdowns) |
| `GET`    | `/api/users/me/preferences`       | `SessionGuard` |
| `PUT`    | `/api/users/me/preferences`       | `SessionGuard` |

## TODO — chantiers ouverts

| Priorité | Chantier | Détails |
|---|---|---|
| 🟢 Haute | Tests étendus + E2E | Couvrir `AlertService` rules, drawdown walker, `PreferencesService`, `PerformanceService` walking, repos TypeORM. E2E Playwright (login + créer tx). Cible ≥ 70 %. |
| 🟡 Moyenne | Skeletons étendus | Étendre le `.skeleton` aux cards portfolio / transactions / alerts du dashboard et à la page Performance. |
| 🟡 Moyenne | PWA + offline | Service worker Angular, manifest installable, mode offline degradant. |
| 🟡 Moyenne | i18n FR/EN | Angular Localize, language switcher. La devise display est déjà persistée mais inutilisée. |
| 🟡 Moyenne | Conversion FX | Provider FX (Frankfurter / ExchangeRate-host). Convertit positions USD/GBP en `displayCurrency` choisie. |
| 🟡 Moyenne | Sparklines réelles | Dériver de l'historique Yahoo (déjà caché 24 h). Drop `MOCK_SPARKS`. |
| 🔵 Basse | Audit log | Track des mutations user (création/suppression). |
| 🔵 Basse | Pagination transactions | Page Transactions → infinite scroll / "Charger 30 mouvements de plus" actif. |
| 🔵 Basse | DCA programmé | Persistance d'un plan DCA + exécution mensuelle. Calendar affichera les exécutions futures. |
| 🔵 Basse | Versions de stratégie | Strategy versioning + persistance historique. Page Allocation a un mock "v1/v2/v3" prêt à recevoir. |
| 🔵 Basse | Positions fermées | Listing des PV/MV réalisées (qty ≤ 0). |

## Limitations connues

- **Yahoo overrides** : 8 ETFs seedés hardcodés. ETF user-créé avec ticker inconnu → fallback `<ticker>.PA`, peut échouer silencieusement.
- **OAuth scope** : single-user MVP via `GOOGLE_ALLOWED_EMAILS`. Pas de gestion multi-user / signup ouvert.
- **`displayCurrency`** : persistée mais non appliquée — l'app affiche tout en EUR brut pour l'instant.
- **Sparklines** : encore mock (`MOCK_SPARKS`).
- **Pagination tx** : page Transactions affiche tout d'un coup. Bouton "Charger 30 de plus" inactif.
- **Targets enveloppe** : la sous-clé `envelope` de `MOCK_TARGETS` n'a pas encore d'UI d'édition (les autres targets sont éditables).
