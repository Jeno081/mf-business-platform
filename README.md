# MF Business Platform

Plateforme e-commerce **MF Business — Maison Forlife Business** : boutique PWA, back-office, API temps réel et base MySQL.

> **État actuel : Phase 1 — fondations Backend & Base de données.**
> Le site statique validé reste la référence visuelle. Le frontend Next.js sera construit en Phase 3.

---

## Architecture cible

```text
apps/web       Next.js — boutique publique + PWA
apps/admin     Next.js — back-office
apps/api       Express + Socket.io — API métier
packages/database   Prisma + MySQL
packages/types      Types et schémas partagés
packages/ui         Design system partagé
```

Hébergement cible :

| Service | Rôle |
| --- | --- |
| Vercel | `apps/web` et `apps/admin` |
| Render | `apps/api` + Socket.io |
| Clever Cloud | MySQL 8 |
| Cloudinary | Images produits et pièces jointes |
| Firebase | Notifications push |
| Upstash | Redis (cache, files, Socket.io) |

---

## Prérequis

- Node.js **22+**
- pnpm **10+**
- Git
- Une base MySQL 8 (Clever Cloud en production, MySQL local en développement)

Le projet utilise `pnpm` workspaces.

```bash
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
```

Renseigner `DATABASE_URL` dans `apps/api/.env`.

---

## Démarrage du backend

```bash
pnpm db:generate
pnpm db:validate
pnpm --filter @mf/api dev
```

API : <http://localhost:4000>  
Health check : <http://localhost:4000/health>

### Authentification

Les endpoints clients sont sous `/api/v1/auth`, les endpoints administrateur sous
`/api/v1/admin/auth`.

- Argon2id, JWT court, refresh token rotatif et hashé.
- 2FA TOTP obligatoire pour les admins.
- RBAC : `SUPPORT`, `STOCK`, `MANAGER`, `SUPER_ADMIN`.
- Création d'un admin :

```bash
pnpm admin:create -- --email admin@mfbusiness.cm --password "MotDePasseTresFort123!" --firstName Jenovic --lastName Mulomba
```

Voir [`docs/auth.md`](docs/auth.md) pour les flux complets.

---

## Scripts utiles

| Commande | Effet |
| --- | --- |
| `pnpm dev` | Lance les apps en développement |
| `pnpm build` | Build de production |
| `pnpm typecheck` | Vérification TypeScript |
| `pnpm db:generate` | Génère le client Prisma |
| `pnpm db:validate` | Valide le schéma Prisma |
| `pnpm db:migrate` | Crée/applique une migration en développement |
| `pnpm db:deploy` | Applique les migrations en production |
| `pnpm db:studio` | Ouvre Prisma Studio |
| `pnpm admin:create` | Crée ou promeut un administrateur |

---

## Sécurité — principes déjà posés

- Aucun secret dans Git : `.env` est ignoré.
- Helmet, CORS allowlist, validation Zod, logs structurés avec masquage.
- Prisma = requêtes paramétrées.
- Les mots de passe sont hashés avec **Argon2id**.
- Les admins sont protégés par **2FA TOTP obligatoire** et un **RBAC**.
- Les refresh tokens sont hashés, rotatifs et révocables.
- Les webhooks Mobile Money seront signés, idempotents et audités.
- Les images et pièces jointes seront validées avant upload.

---

## Comptes nécessaires

| Service | Usage | Statut |
| --- | --- | --- |
| **Clever Cloud** | MySQL 8 production | Créée — connexion à vérifier |
| **GitHub** | Dépôt `mf-business-platform` | Créé — push effectué |
| Vercel | Frontend | Plus tard |
| Render | API | Plus tard |
| Cloudinary | Images | Plus tard |
| Firebase | Push | Plus tard |
| Upstash | Redis | Plus tard |

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/phase-1.md`](docs/phase-1.md)
- [`docs/auth.md`](docs/auth.md)
- [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma)
