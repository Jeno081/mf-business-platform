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
- [x] Base MySQL Clever Cloud provisionnée
- [x] Connexion MySQL Clever Cloud vérifiée
- [x] Migration initiale SQL générée
- [x] Migration 2FA générée
- [x] Migrations appliquées sur MySQL
- [ ] Seed des 188 produits et images
- [x] Authentification client (Argon2id, JWT, refresh tokens)
- [x] Authentification admin (2FA TOTP, RBAC, audit)
- [x] Tests d'intégration API avec base réelle

## Critères d'acceptation

1. `GET /health` répond `200` avec un JSON valide.
2. `prisma validate` passe sans erreur.
3. La migration initiale s'applique sur MySQL 8.
4. Un admin peut se connecter avec 2FA.
5. Un client peut créer un compte, se connecter et rafraîchir sa session.
6. Les secrets ne sont jamais présents dans le dépôt.
7. Les logs ne contiennent ni mot de passe ni token.

## Résultats des tests — 21 novembre 2026

- **45 tables** créées sur Clever Cloud, dont `_prisma_migrations`.
- Migrations appliquées :
  - `20261120224500_init`
  - `20261121230000_add_two_factor`
- Colonnes 2FA vérifiées : `twoFactorSecret`, `twoFactorEnabled`, `twoFactorRecoveryCodes`.
- Client :
  - inscription `201` ;
  - `GET /auth/me` avec token `200` ;
  - refresh token `200` ;
  - login `200`.
- Admin :
  - login → `requiresTwoFactorSetup: true` ;
  - génération du secret + QR code ;
  - activation 2FA + 8 codes de secours ;
  - `GET /admin/auth/me` → `SUPER_ADMIN` ;
  - désactivation 2FA → `204` ;
  - login après reset → setup requis.
- Compte de test client supprimé après les tests.
- Compte admin conservé : `jenovicmulomba@gmail.com`, rôle `SUPER_ADMIN`, 2FA à configurer à la première connexion.

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
