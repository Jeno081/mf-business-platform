# Architecture — MF Business Platform

## Vue d'ensemble

```text
PWA Next.js ──HTTPS/REST──► API Express ──Prisma──► MySQL Clever Cloud
     │                          │
     ├──Socket.io (WSS)────────►│── Redis (chat, présence, files)
     ├──Firebase FCM◄───────────│── Firebase Admin
     └──Cloudinary◄─────────────│── uploads signés

Admin Next.js ──HTTPS/REST──► même API (RBAC renforcé)
```

## Décisions structurantes

| Sujet | Décision |
| --- | --- |
| Monorepo | pnpm workspaces |
| Frontend | Next.js 15 App Router + React 19 + TypeScript |
| UI | Tailwind + composants accessibles, identité noir/ivoire |
| Backend | Node.js 22 + Express 5 + TypeScript |
| ORM | Prisma + MySQL 8 |
| Temps réel | Socket.io + adaptateur Redis |
| Jobs | BullMQ + Redis |
| Auth | JWT court + refresh token rotatif, Argon2id, 2FA admin |
| Paiement initial | Cash on Delivery |
| Paiement futur | Adaptateur Mobile Money (M-Pesa, Airtel, Orange) |
| Images | Cloudinary (ou Cellar S3) |
| Push | Firebase Cloud Messaging |
| PWA | Serwist / service worker, manifest, offline shell |

## Séparation des applications

- `apps/web` : public, SEO, PWA, panier, compte client.
- `apps/admin` : back-office, 2FA, RBAC, audit.
- `apps/api` : logique métier, REST, Socket.io, webhooks.
- `packages/database` : schéma Prisma et migrations.
- `packages/types` : contrats partagés (DTO, Zod).
- `packages/ui` : composants partagés.

## Domaines cibles

| Environnement | Domaine |
| --- | --- |
| Boutique | `mfbusiness.cm` |
| Admin | `admin.mfbusiness.cm` |
| API | `api.mfbusiness.cm` |
| Staging | `staging.mfbusiness.cm` |

En développement, Vercel/Render fourniront des URLs gratuites.

## Flux de données

1. Le frontend interroge l'API REST versionnée `/api/v1`.
2. Le panier invité est identifié par un `guestToken` ; le panier client par `userId`.
3. La commande est créée avec des **snapshots** de prix et de libellés.
4. Le paiement COD passe en `PENDING` puis `PAID` à la livraison.
5. Les événements Mobile Money futurs arriveront par webhook signé et idempotent.
6. Socket.io authentifie chaque connexion et vérifie l'appartenance à la conversation.
7. Firebase Admin envoie les push aux abonnements enregistrés.

## Principes de sécurité

- Secrets uniquement en variables d'environnement.
- Aucun mot de passe ou token en clair en base.
- Refresh tokens hashés et rotatifs.
- Cookies `HttpOnly`, `Secure`, `SameSite`.
- RBAC et audit log pour chaque action admin.
- Validation Zod de toutes les entrées.
- Rate limiting et CAPTCHA sur les endpoints sensibles.
- Webhooks signés + idempotence.
- Aucune donnée de paiement sensible stockée.
