# Commandes — Patrimo

Référence canonique de toutes les commandes `npm run …`. Pas besoin de connaître Nx.

> Setup initial (Node, Docker, `.env`, OAuth Google) : voir [`dev-setup.md`](dev-setup.md).

---

## TL;DR — dev quotidien

```bash
npm run docker:up         # postgres + redis (1× au démarrage de la journée)
npm run db:migrate        # applique les migrations en attente (si besoin)
npm start                 # web + api en parallèle (watch)
```

C'est tout. `Ctrl+C` pour arrêter les apps. `npm run docker:down` pour arrêter postgres/redis.

---

## 1. Démarrer (dev server, watch automatique)

Toutes ces commandes recompilent au moindre changement de fichier.

| Commande | Effet |
|---|---|
| `npm start` | web + api en parallèle |
| `npm run start:web` | frontend seul → <http://localhost:4200> |
| `npm run start:api` | backend seul → <http://localhost:3333/api> |
| `npm run ports:free` | libère les ports 3333 + 4200 (kill des process) |

---

## 2. Build

Build = compile sans démarrer de serveur. Production par défaut (optimisé, minifié).

| Commande | Effet |
|---|---|
| `npm run build` | build prod web + api → `dist/` |
| `npx nx build web` / `npx nx build api` | build d'un seul projet |

---

## 3. Tests

Tests une seule fois par défaut (mode CI). Les runners sont séparés par couche :
`libs/web/*` en **Vitest**, libs api / apps / `libs/shared/contracts` en **Jest**.

| Commande | Effet |
|---|---|
| `npm test` | tous les tests (web + api + libs) |
| `npm run test:affected` | teste seulement les projets impactés par ta diff vs main (idéal CI) |
| `npm run test:integration` | repos TypeORM contre un vrai Postgres (nécessite `docker:up` ; base dédiée `patrimo_integration`, la base dev n'est jamais touchée) |
| `npm run test:e2e` | Lancer les tests E2E sur tous les navigateurs (nécessite `ALLOW_DEV_LOGIN=true` dans `.env`) |
| `npm run test:e2e:fast` | Lancer les tests E2E uniquement sur Chromium (plus rapide) |
| `npx nx e2e web-e2e --ui` | Ouvre l'interface de Playwright pour visualiser le navigateur en direct et déboguer les tests E2E |
| `npx nx test web` | un seul projet |
| `npx nx test web --testFile=path/to/file.spec.ts` | un seul fichier |

---

## 4. Qualité

| Commande | Effet |
|---|---|
| `npm run lint` | ESLint check tous les projets |
| `npm run lint:fix` | ESLint autofix tous les projets |
| `npm run lint:affected` | lint uniquement les projets impactés |
| `npm run typecheck` | `tsc --noEmit` sur les 19 tsconfig feuilles (`tools/typecheck.mjs`) |

> Pas de mode watch pour le lint : il tourne via les hooks Husky avant chaque commit, et via `lint:fix` à la demande.

---

## 5. Infrastructure (Docker)

PostgreSQL + Redis en conteneurs. Données persistées dans des volumes Docker.

| Commande | Effet |
|---|---|
| `npm run docker:up` | démarre postgres + redis en arrière-plan |
| `npm run docker:down` | arrête + supprime les conteneurs (données conservées) |
| `npm run docker:logs` | suit les logs des services |
| `npm run docker:reset` | ⚠️ supprime conteneurs **+ volumes** (efface la base) |

Accès direct aux services (pas en `npm run`, commandes Docker brutes) :

```bash
docker exec -it patrimo-postgres psql -U patrimo -d patrimo   # shell psql
docker exec -it patrimo-redis redis-cli                       # shell redis
docker compose ps                                             # statut + healthcheck
```

---

## 6. Base de données (migrations TypeORM)

Les migrations sont écrites à la main (pas de `migration:generate`) dans
`libs/api/infrastructure/src/lib/persistence/migrations/` et ne s'exécutent
jamais automatiquement.

| Commande | Effet |
|---|---|
| `npm run db:migrate` | applique les migrations en attente |
| `npm run db:revert` | annule la dernière migration appliquée |
| `npm run db:show` | liste les migrations (appliquées / en attente) |
| `npm run db:reset` | ⚠️ wipe volumes + recreate + migrate — la base repart **vide** (pas de seed : le user dev est provisionné par `/api/auth/dev-login`, tout le reste est créé via l'UI) |

---

## 7. Release (`nx release`)

Versioning + changelog auto depuis Conventional Commits.

| Commande | Effet |
|---|---|
| `npm run release:dry` | preview (aucune écriture) |
| `npm run release` | bump version + CHANGELOG + commit + tag |

---

## 8. Outils Nx (rares)

| Commande | Effet |
|---|---|
| `npm run graph` | UI navigable du dependency graph (utile pour comprendre les boundaries) |
| `npx nx show projects` | liste tous les projets Nx (api, web, ui, data-access, …) |
| `npx nx reset` | vide le cache Nx (à utiliser si une commande renvoie un vieux résultat) |

---

## 9. Combinaisons fréquentes

```bash
# Démarrer ma journée
npm run docker:up && npm start

# Vérification de base (avant de commit)
npm run lint:fix && npm run typecheck && npm test

# Vérification complète (avant de push/PR) : lint, build, unit, et E2E
npm run validate

# Vérification "comme la CI" (seulement ce qui a changé)
npm run lint:affected && npm run test:affected

# Wipe complet et repartir from scratch
npm run docker:reset && npx nx reset && npm install && npm run db:reset
```
