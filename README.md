# Patrimo

Application web de suivi de patrimoine personnel : enveloppes (PEA, AV, CTO, livrets, cash), ETFs, transactions, positions live, allocation cible, alertes, performance vs benchmark.

> Stack : **Angular 21.2** (standalone, zoneless, signals, `httpResource`, OnPush) · **NestJS 11** (hexagonal, TypeORM 0.3, Passport Google OAuth2 BFF) · **PostgreSQL 18.4** · **Redis 8.6** · **Yahoo Finance v3**. Monorepo **Nx 22.7**.

---

## Démarrage rapide

```bash
npm install
cp .env.example .env        # remplir GOOGLE_CLIENT_ID / SECRET (voir docs/dev-setup.md §6)
npm run docker:up           # postgres + redis
npm run db:migrate          # schéma TypeORM
npm run db:seed             # 1 user dev + 8 ETFs + 11 enveloppes + 13 transactions
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
├── apps/
│   ├── api/                  # NestJS 11 — port 3333
│   └── web/                  # Angular 21 — port 4200
├── libs/
│   ├── api/
│   │   ├── domain/           # Entités + ports (hexagonal)
│   │   ├── application/      # Use-cases
│   │   ├── infrastructure/   # Adapters TypeORM, OAuth, Redis, Yahoo
│   │   └── shared/
│   ├── web/
│   │   ├── ui/               # Composants atomiques (bar, donut, sparkline, …)
│   │   ├── data-access/      # Services + modèles
│   │   └── features/         # Composants métier (à venir)
│   └── shared/contracts/     # DTOs partagés web ↔ api
├── design/                   # Prototype de référence visuelle
├── docs/                     # Documentation publique
├── docker-compose.yml        # postgres:18.4-alpine + redis:8.6-alpine
└── .env.example
```

---

## Convention

- Commits **Conventional Commits** en anglais, validés par `commitlint` + Husky.
- Code et docs : anglais. UI utilisateur : français.
- Versioning + CHANGELOG via `nx release` — voir [`docs/commands.md`](docs/commands.md) §6.
