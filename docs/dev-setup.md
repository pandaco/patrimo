# Dev setup — Patrimo

Guide pour faire tourner l'app en local, de zéro.

---

## 1. Prérequis

| Outil | Version min | Vérifier | Installer |
|---|---|---|---|
| **Node.js** | 24 LTS | `node --version` | [nodejs.org](https://nodejs.org) ou `nvm install 24` |
| **npm** | 11+ | `npm --version` | Inclus avec Node |
| **Docker Desktop** | 4.30+ | `docker --version` | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Git** | 2.40+ | `git --version` | [git-scm.com](https://git-scm.com) |

> **Recommandé :** [nvm](https://github.com/nvm-sh/nvm) pour gérer la version de Node.
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> nvm install --lts
> ```

> **Pas besoin d'installer PostgreSQL ni Redis localement.** Docker Compose les fournit, prêts à l'emploi.

---

## 2. Installation

```bash
git clone <url-du-repo>
cd patrimo
npm install
```

---

## 3. Variables d'environnement

> **Un seul fichier `.env`, à la racine du projet.** Pas dans `apps/api/`, pas ailleurs.
> NestJS le lit automatiquement via `@nestjs/config` depuis `process.cwd()` = racine quand tu lances `npm run start:api`.

```bash
cp .env.example .env
```

Le fichier `.env.example` contient déjà :
- les credentials qui matchent `docker-compose.yml` → **rien à changer pour PostgreSQL/Redis en local**
- les variables Google OAuth à remplir (voir [section 7](#7-configurer-google-oauth-pas-à-pas))
- des secrets `JWT_SECRET` / `SESSION_SECRET` à générer (`openssl rand -base64 48`)
- `ALLOW_DEV_LOGIN=true` — active `/api/auth/dev-login` (login sans OAuth, utilisé par les E2E ; jamais en prod)

Sécurité : `.env` est gitignored. Seul `.env.example` (sans secrets) est versionné.

---

## 4. Démarrer l'infrastructure

PostgreSQL + Redis tournent en conteneurs Docker.

```bash
# Démarrer postgres + redis en arrière-plan
npm run docker:up

# Vérifier que les services sont up + healthy
docker compose ps

# Voir les logs (Ctrl+C pour quitter, les services continuent)
npm run docker:logs
```

Les données persistent dans les volumes Docker (`pgdata`, `redisdata`) entre les redémarrages.

| Commande | Effet |
|---|---|
| `npm run docker:up` | Démarre postgres + redis en background |
| `npm run docker:down` | Arrête + supprime les conteneurs (données conservées) |
| `docker compose down -v` | ⚠️ Supprime aussi les volumes (efface la base) |
| `docker exec -it patrimo-postgres psql -U patrimo -d patrimo` | Shell psql |
| `docker exec -it patrimo-redis redis-cli` | Shell redis |

---

## 5. Créer le schéma de base

Les migrations TypeORM ne s'exécutent jamais automatiquement :

```bash
npm run db:migrate
```

À relancer après chaque `git pull` qui ajoute une migration (`npm run db:show` liste l'état). La base démarre **vide** — pas de seed : le user dev est provisionné à la volée par `/api/auth/dev-login`, et toutes les données (ETFs, enveloppes, transactions) se créent via l'UI.

---

## 6. Lancer les apps

**Option A — tout en un terminal**
```bash
npm start                          # web + api en parallèle (watch)
```

**Option B — terminaux séparés** (logs plus lisibles)

```bash
# Terminal 1
npm run start:web                  # → http://localhost:4200
# Terminal 2
npm run start:api                  # → http://localhost:3333/api
```

### Vérifier que tout tourne

```bash
curl http://localhost:3333/api      # → {"message":"Hello API"}
open http://localhost:4200          # ouvre le frontend
```

---

## 7. Configurer Google OAuth (pas à pas)

Patrimo utilise Google OAuth pour l'authentification. Il faut un **Client ID** + **Client Secret**.

### Étape 1 — Créer un projet Google Cloud

1. Va sur [console.cloud.google.com](https://console.cloud.google.com)
2. En haut à gauche, sélecteur de projet → **"Nouveau projet"**
3. Nom : `patrimo-dev` (peu importe)
4. **"Créer"** → attends quelques secondes
5. Sélectionne le projet créé

### Étape 2 — Configurer l'écran de consentement OAuth

1. Menu → **"API et services"** → **"Écran de consentement OAuth"**
2. Type d'utilisateur : **"Externe"** → **"Créer"**
3. Champs obligatoires :
   - Nom de l'application : `Patrimo`
   - Email d'assistance : ton email
   - Email du développeur (en bas) : ton email
4. **"Enregistrer et continuer"**
5. **"Champs d'application"** → **"Enregistrer et continuer"** (rien à ajouter)
6. **"Utilisateurs test"** → **"+ Add users"** → ajoute **ton email Google**
7. **"Enregistrer et continuer"** → **"Retour au tableau de bord"**

> En mode "Test", seuls les emails dans "Utilisateurs test" peuvent se connecter. Parfait pour le dev.

### Étape 3 — Créer les credentials OAuth

1. Menu → **"API et services"** → **"Identifiants"**
2. **"+ Créer des identifiants"** → **"ID client OAuth"**
3. Type d'application : **"Application Web"**
4. Nom : `patrimo-local`
5. **"Origines JavaScript autorisées"** → **"+ Ajouter un URI"** :
   ```
   http://localhost:4200
   ```
6. **"URI de redirection autorisés"** → **"+ Ajouter un URI"** :
   ```
   http://localhost:3333/api/auth/google/callback
   ```
7. **"Créer"**

Popup avec :
- **ID client** → copie dans `GOOGLE_CLIENT_ID`
- **Secret client** → copie dans `GOOGLE_CLIENT_SECRET`

### Étape 4 — Mettre à jour `.env` (à la racine)

```dotenv
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

Redémarre l'API : `Ctrl+C` dans le terminal API puis `npm run start:api`.

---

## 8. Structure du projet

Apps = points d'entrée minces ; tout le vrai code vit dans `libs/`.

```
patrimo/
├── apps/
│   ├── web/              # Entrée Angular 21 (port 4200) + styles globaux
│   ├── api/              # Entrée NestJS 11 (port 3333) — composition root (ports → adapters)
│   └── web-e2e/          # E2E Playwright (via /api/auth/dev-login)
├── libs/
│   ├── web/
│   │   ├── ui/           # Composants atomiques (bar, donut, sparkline, toast, …)
│   │   ├── data-access/  # Services Angular (httpResource + signals)
│   │   └── features/     # Pages routées (dashboard, wealth, portfolio, …)
│   ├── api/
│   │   ├── domain/       # Entités + ports (hexagonal, TS pur)
│   │   ├── application/  # Use-cases + controllers + auth
│   │   ├── infrastructure/ # Adapters TypeORM, OAuth, Redis, Yahoo/JustETF + migrations
│   │   └── shared/
│   └── shared/contracts/ # DTOs partagés web ↔ api
├── design/               # Prototype HTML/JSX — source de vérité visuelle
├── docker-compose.yml    # postgres + redis
├── .env                  # Local, gitignored
├── .env.example          # Template versionné
└── docs/                 # Documentation
```

---

## 9. Commandes

Référence complète : [`commands.md`](commands.md).

TL;DR au quotidien :

```bash
npm run docker:up         # 1× au démarrage de la journée
npm start                 # web + api en parallèle (watch)
```

Catégories disponibles :

| Catégorie | Cheatsheet |
|---|---|
| Démarrer | `npm start` · `start:web` · `start:api` · `ports:free` |
| Build | `npm run build` (prod web + api) |
| Tests | `npm test` · `test:affected` · `test:integration` · `npx nx e2e web-e2e` |
| Qualité | `npm run lint` · `lint:fix` · `lint:affected` · `typecheck` |
| Base de données | `npm run db:migrate` · `db:revert` · `db:show` · `db:reset` |
| Docker | `npm run docker:up` · `docker:down` · `docker:reset` |
| Release | `npm run release:dry` · `release` |

Voir [`commands.md`](commands.md) pour la liste exhaustive + combinaisons fréquentes.

---

## 10. Problèmes courants

**Port 4200 / 3333 / 5432 / 6379 déjà occupé**
```bash
npm run ports:free                      # libère 3333 + 4200
# pour postgres / redis : arrête une autre instance, ou change le port dans docker-compose.yml
```

**`docker compose` dit que postgres n'est pas healthy**
```bash
docker compose logs postgres            # voir l'erreur
docker compose down -v                  # ⚠️ wipe + redémarrer propre
npm run docker:up
```

**Erreur TypeORM "password authentication failed"**
→ Vérifie que `DATABASE_URL` dans `.env` matche les creds de `docker-compose.yml` (`patrimo:patrimo`).

**"Cannot find module" après un `git pull`**
```bash
npm install
```

**L'auth Google redirige vers une erreur 400 `redirect_uri_mismatch`**
→ L'URI de callback dans Google Console doit être exactement `http://localhost:3333/api/auth/google/callback` (étape 3, point 6).

**Le cache Nx me renvoie un vieux build**
```bash
npx nx reset
```

**L'API boote mais toutes les routes renvoient 401**
→ Session absente ou expirée. Se reconnecter via Google, ou en dev `http://localhost:3333/api/auth/dev-login` (nécessite `ALLOW_DEV_LOGIN=true`).
