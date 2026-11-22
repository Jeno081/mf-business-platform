# Déploiement de l'API sur Render

## Prérequis

- Compte Render
- Dépôt GitHub `Jeno081/mf-business-platform`
- Base MySQL Clever Cloud accessible
- Migrations déjà appliquées

## Création du Web Service

1. Render Dashboard → **New +** → **Web Service**
2. Connecter le dépôt `Jeno081/mf-business-platform`
3. Nom : `mf-business-api`
4. Région : **Frankfurt** (la plus proche de Clever Cloud Paris)
5. Branche : `main`
6. Root Directory : laisser vide
7. Runtime : **Node**
8. Build Command :

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @mf/types build && pnpm --filter @mf/database build && pnpm --filter @mf/api build
```

9. Start Command :

```bash
node apps/api/dist/server.js
```

10. Health Check Path : `/health`
11. Auto-Deploy : **Yes**
12. Plan : **Free** pour commencer

## Variables d'environnement

À créer dans **Environment** :

| Variable | Valeur |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URI MySQL Clever Cloud complète, avec `?connection_limit=1&pool_timeout=30&connect_timeout=20` |
| `JWT_ACCESS_SECRET` | secret local de 64+ caractères |
| `JWT_REFRESH_SECRET` | autre secret local de 64+ caractères |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_DAYS` | `30` |
| `COOKIE_SAME_SITE` | `none` |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` |
| `ADMIN_2FA_ISSUER` | `MF Business` |
| `LOG_LEVEL` | `info` |

Ne pas définir `PORT` : Render l'injecte automatiquement.

Ne pas mettre `ADMIN_PASSWORD` sur Render : ce secret ne sert qu'au CLI local.

## Vérification

Remplacer `<service>` par le nom Render :

```text
https://<service>.onrender.com/health
https://<service>.onrender.com/api/v1/products?perPage=1
https://<service>.onrender.com/api/v1/products/iphone-15
https://<service>.onrender.com/images/products/iphone-15.webp
```

Réponses attendues :

- `/health` → `200` avec `"status": "ok"`
- `/api/v1/products?perPage=1` → `"total": 188`
- fiche produit → JSON complet
- image → `200 image/webp`

## Erreurs fréquentes

- **Build pnpm** : vérifier que `corepack enable` est bien dans la Build Command.
- **Prisma** : `DATABASE_URL` doit être disponible au build pour `prisma generate`.
- **P1001** : vérifier l'URI Clever Cloud et que la base est Running.
- **P1000** : identifiants MySQL incorrects.
- **Port** : ne pas définir `PORT` manuellement.
- **CORS** : ajouter plus tard le domaine Vercel exact.

## Mise à jour

Chaque `git push` sur `main` déclenche un nouveau déploiement Render.
