# Patrimo

Application web de suivi de patrimoine personnel : enveloppes (PEA, AV, CTO, livrets, cash), ETFs, transactions, positions live, allocation cible, alertes, performance vs benchmark.

> Stack : **Angular 21.2** (standalone, zoneless, signals, `httpResource`, OnPush) · **NestJS 11** (hexagonal, TypeORM 0.3, Passport Google OAuth2 BFF) · **PostgreSQL 18.4** · **Redis 8.6** · **Yahoo Finance v3** (+ fallback JustETF pour l'exposition géo/secteur). Monorepo **Nx 22.7**.

---

## Démarrage rapide

```bash
npm install
cp .env.example .env        # remplir GOOGLE_CLIENT_ID / SECRET (voir docs/dev-setup.md §7)
npm run docker:up           # postgres + redis
npm run db:migrate          # schéma TypeORM
npm start                   # web :4200 + api :3333 en watch
```

Détails complets (Node 24 LTS, Docker Desktop, OAuth Google pas-à-pas, structure, dépannage) : [`docs/dev-setup.md`](docs/dev-setup.md).

Référence exhaustive des commandes `npm run …` : [`docs/commands.md`](docs/commands.md).

---

## Documentation publique

| Doc | Contenu |
|---|---|
| [`docs/dev-setup.md`](docs/dev-setup.md) | Installation locale, Docker, OAuth Google, structure du projet, problèmes courants |
| [`docs/commands.md`](docs/commands.md) | Toutes les commandes npm — démarrer, build, test, lint, Docker, release, combinaisons |
| [`design/README.md`](design/README.md) | Prototype HTML/JSX servant de source de vérité visuelle |

> Documentation interne (planification, modèles de données, état d'avancement, port plan Angular) : `tmp/` — gitignored, non distribuée.

---

## Layout

```
patrimo/
├── apps/                     # Points d'entrée minces — le vrai code vit dans libs/
│   ├── api/                  # NestJS 11 — port 3333 (composition root ports → adapters)
│   ├── web/                  # Angular 21 — port 4200 (bootstrap + styles globaux)
│   └── web-e2e/              # E2E Playwright
├── libs/
│   ├── api/
│   │   ├── domain/           # Entités + ports (hexagonal, TS pur)
│   │   ├── application/      # Use-cases + controllers + auth
│   │   ├── infrastructure/   # Adapters TypeORM, OAuth, Redis, Yahoo/JustETF + migrations
│   │   └── shared/
│   ├── web/
│   │   ├── ui/               # Composants atomiques (bar, donut, sparkline, toast, …)
│   │   ├── data-access/      # Services httpResource + signals
│   │   └── features/         # Pages routées (dashboard, patrimoine, portefeuille,
│   │                         #   passifs, transactions, allocation, performance,
│   │                         #   analyses, bilan, DCA, calendrier, comparateur,
│   │                         #   alertes, glossaire, préférences, …)
│   └── shared/contracts/     # DTOs partagés web ↔ api
├── design/                   # Prototype de référence visuelle
├── docs/                     # Documentation publique (+ docs/adr/ — décisions)
├── docker-compose.yml        # postgres:18.4-alpine + redis:8.6-alpine
├── libs/api/application/src/lib/market/synthetic-exposures.ts    # Config des ETF Synthétiques
└── .env.example
```

---

## Convention

- Commits **Conventional Commits** en anglais, validés par `commitlint` + Husky.
- Code et docs : anglais. UI utilisateur : français.
- Versioning + CHANGELOG via `nx release` — voir [`docs/commands.md`](docs/commands.md) §6.
