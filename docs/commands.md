# Commandes — Patrimo

Référence canonique de toutes les commandes `npm run …`. Pas besoin de connaître Nx.

> Setup initial (Node, Docker, `.env`, OAuth Google) : voir [`dev-setup.md`](dev-setup.md).

---

## TL;DR — dev quotidien

```bash
npm run docker:up         # postgres + redis (1× au démarrage de la journée)
npm start                 # web + api en parallèle (watch)
```

C'est tout. `Ctrl+C` pour arrêter les apps. `npm run docker:down` pour arrêter postgres/redis.

---

## 1. Démarrer (dev server, watch automatique)

Toutes ces commandes recompilent au moindre changement de fichier.

| Commande | Effet |
|---|---|
| `npm start` | web + api en parallèle |
| `npm run serve` | alias de `npm start` |
| `npm run start:web` | frontend seul → <http://localhost:4200> |
| `npm run start:api` | backend seul → <http://localhost:3333/api> |
| `npm run serve:web` | alias de `start:web` |
| `npm run serve:api` | alias de `start:api` |

> Pas de variante "sans watch" : un dev server **est** un watcher par définition. Pour compiler sans serveur, voir [§2 Build](#2-build).

---

## 2. Build

Build = compile sans démarrer de serveur. Production par défaut (optimisé, minifié).

### Build prod

| Commande | Effet |
|---|---|
| `npm run build` | build prod web + api → `dist/` |
| `npm run build:web` | build prod frontend |
| `npm run build:api` | build prod backend |

### Build dev (sourcemaps, pas d'optim — utile pour debug du bundle)

| Commande | Effet |
|---|---|
| `npm run build:dev` | build dev web + api |
| `npm run build:dev:web` | build dev frontend |
| `npm run build:dev:api` | build dev backend |

### Build avec watch (recompile sans démarrer de serveur)

| Commande | Effet |
|---|---|
| `npm run build:watch:web` | watch + rebuild du frontend |
| `npm run build:watch:api` | watch + rebuild du backend |

---

## 3. Tests unitaires

Tests une seule fois par défaut (mode CI).

### Test single-run

| Commande | Effet |
|---|---|
| `npm test` | tous les tests (web + api + libs) |
| `npm run test:web` | tests du frontend |
| `npm run test:api` | tests du backend |

### Test watch (relance au changement)

| Commande | Effet |
|---|---|
| `npm run test:watch` | watch tous les projets |
| `npm run test:watch:web` | watch frontend |
| `npm run test:watch:api` | watch backend |

### Test coverage

| Commande | Effet |
|---|---|
| `npm run test:cov` | coverage tous projets → `coverage/` |
| `npm run test:cov:web` | coverage frontend |
| `npm run test:cov:api` | coverage backend |

### Test affected (uniquement projets impactés par tes changements git)

| Commande | Effet |
|---|---|
| `npm run test:affected` | calcule la diff vs main, teste seulement les projets touchés (idéal en CI) |

---

## 4. Lint

ESLint sur tous les projets. Sans `--fix` = check seulement. Avec `--fix` = autofix.

### Lint check

| Commande | Effet |
|---|---|
| `npm run lint` | check tous les projets |
| `npm run lint:web` | check frontend |
| `npm run lint:api` | check backend |

### Lint autofix

| Commande | Effet |
|---|---|
| `npm run lint:fix` | autofix tous les projets |
| `npm run lint:fix:web` | autofix frontend |
| `npm run lint:fix:api` | autofix backend |

### Lint affected

| Commande | Effet |
|---|---|
| `npm run lint:affected` | lint uniquement les projets impactés par tes changements |

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

## 6. Release (`nx release`)

Versioning + changelog auto depuis Conventional Commits.

| Commande | Effet |
|---|---|
| `npm run release:dry` | preview (aucune écriture) |
| `npm run release` | bump version + CHANGELOG + commit + tag |
| `npm run release:version` | bump version seul |
| `npm run release:changelog` | génère CHANGELOG seul |
| `npm run release:publish` | publish (si on pousse des libs sur npm) |

---

## 7. Outils Nx (rares)

Le plus souvent inutile au quotidien. Ces commandes existent pour les cas où Nx fait des choses bizarres.

| Commande | Effet |
|---|---|
| `npm run nx:graph` | UI navigable du dependency graph (utile pour comprendre les boundaries) |
| `npm run nx:projects` | liste tous les projets Nx (api, web, ui, data-access, …) |
| `npm run nx:reset` | vide le cache Nx (à utiliser si une commande renvoie un vieux résultat) |

---

## 8. Combinaisons fréquentes

```bash
# Démarrer ma journée
npm run docker:up && npm start

# Vérification avant de commit
npm run lint:fix && npm test

# Vérification "comme la CI" (seulement ce qui a changé)
npm run lint:affected && npm run test:affected

# Wipe complet et repartir from scratch
npm run docker:reset && npm run nx:reset && npm install && npm run docker:up
```
