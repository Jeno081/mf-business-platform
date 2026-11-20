# apps/admin — Back-office (Phase 4)

Application Next.js séparée, protégée par :

- 2FA TOTP obligatoire ;
- RBAC (`SUPPORT`, `STOCK`, `MANAGER`, `SUPER_ADMIN`) ;
- audit log ;
- domaine dédié en production.

Modules : dashboard, produits, stocks, commandes, clients, promotions, messages, paramètres.
