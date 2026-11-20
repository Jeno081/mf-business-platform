# Phase 1 — Backend & Base de données

## Objectif

Poser des fondations solides, testables et déployables avant de construire le frontend.

## Livrables

- [x] Monorepo pnpm workspaces
- [x] Configuration TypeScript stricte
- [x] API Express avec health check
- [x] Configuration par variables d'environnement validées par Zod
- [x] Logger Pino avec masquage des secrets
- [x] Gestion d'erreurs centralisée
- [x] Schéma Prisma MySQL complet
- [ ] Base MySQL Clever Cloud provisionnée
- [x] Migration initiale SQL générée
- [ ] Migration initiale appliquée sur MySQL
- [ ] Seed des 188 produits et images
- [ ] Authentification client (Argon2id, JWT, refresh tokens)
- [ ] Authentification admin (2FA TOTP, RBAC, audit)
- [ ] Tests d'intégration API

## Critères d'acceptation

1. `GET /health` répond `200` avec un JSON valide.
2. `prisma validate` passe sans erreur.
3. La migration initiale s'applique sur MySQL 8.
4. Un admin peut se connecter avec 2FA.
5. Un client peut créer un compte, se connecter et rafraîchir sa session.
6. Les secrets ne sont jamais présents dans le dépôt.
7. Les logs ne contiennent ni mot de passe ni token.

## Étapes

1. Provisionner MySQL Clever Cloud.
2. Renseigner `DATABASE_URL` localement.
3. Générer la migration initiale.
4. Implémenter le module auth.
5. Ajouter les tests.
6. Préparer le déploiement Render.

## Commandes de référence

```bash
pnpm install
pnpm db:generate
pnpm db:validate
pnpm db:migrate --name init
pnpm --filter @mf/api dev
```

## Hors périmètre de cette phase

- Frontend Next.js (Phase 3)
- PWA et service worker (Phase 4)
- Paiement Mobile Money (Phase 5)
- Chat temps réel (Phase 4)
