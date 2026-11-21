# Authentification — conception et endpoints

## Clients

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Création de compte + session |
| `POST` | `/api/v1/auth/login` | Connexion e-mail / mot de passe |
| `POST` | `/api/v1/auth/refresh` | Rotation du refresh token |
| `POST` | `/api/v1/auth/logout` | Révocation de la session |
| `GET` | `/api/v1/auth/me` | Profil courant |
| `POST` | `/api/v1/auth/change-password` | Changement de mot de passe |

- Mot de passe hashé avec **Argon2id** (`hash-wasm`, memory 19 MiB, 3 iterations).
- Access token **JWT 15 min**, signé avec `JWT_ACCESS_SECRET`.
- Refresh token **opaque**, 48 octets aléatoires, hashé SHA-256 en base, rotation à chaque usage.
- Détection de réutilisation : toute réutilisation d'un refresh token révoque la famille.
- Cookie `mf_refresh` : `HttpOnly`, `SameSite`, `Secure` en production, chemin `/api/v1/auth`.
- Rate limiting sur register/login/refresh.
- Les comptes non-`CUSTOMER` ne peuvent pas utiliser la connexion client.

## Administrateurs

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/admin/auth/login` | Mot de passe puis TOTP |
| `POST` | `/api/v1/admin/auth/2fa/setup` | Génère le secret et le QR code |
| `POST` | `/api/v1/admin/auth/2fa/enable` | Active la 2FA et retourne les codes de secours |
| `POST` | `/api/v1/admin/auth/2fa/disable` | Désactive la 2FA (mot de passe + code) |
| `POST` | `/api/v1/admin/auth/refresh` | Rotation de la session admin |
| `GET` | `/api/v1/admin/auth/me` | Profil admin |
| `POST` | `/api/v1/admin/auth/logout` | Déconnexion admin |

### Première connexion

1. Un mot de passe valide renvoie `{ requiresTwoFactorSetup: true, setupToken }`.
2. `POST /2fa/setup` avec ce `setupToken` renvoie `secret`, `otpauthUrl` et `qrCodeDataUrl`.
3. L'admin scanne le QR code dans Google Authenticator, Authy ou 1Password.
4. `POST /2fa/enable` avec le code à 6 chiffres active la 2FA et retourne **8 codes de secours**.
5. Les connexions suivantes exigent le mot de passe **et** un code TOTP (ou un code de secours).

Le cookie admin est `mf_admin_refresh`, séparé du cookie client, avec le chemin `/api/v1/admin/auth`.

## Créer un administrateur

```bash
pnpm admin:create -- --email admin@mfbusiness.cm --password "MotDePasseTresFort123!" --firstName Jenovic --lastName Mulomba
```

Ou via les variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`.

La 2FA sera configurée à la première connexion.

## RBAC

| Rôle | Usage |
| --- | --- |
| `CUSTOMER` | Boutique |
| `SUPPORT` | Chat, commandes, clients |
| `STOCK` | Produits et stocks |
| `MANAGER` | Commandes, promotions, rapports |
| `SUPER_ADMIN` | Tout, y compris les comptes admin |

## Secrets

Variables obligatoires :

```env
JWT_ACCESS_SECRET="..."
JWT_REFRESH_SECRET="..."
JWT_ACCESS_TTL="15m"
JWT_REFRESH_DAYS="30"
COOKIE_SAME_SITE="lax"
```

En production, utiliser des secrets de 64 caractères générés aléatoirement et `COOKIE_SAME_SITE=none` si le frontend et l'API sont sur des domaines différents.

## Mesures de sécurité

- Aucune énumération de comptes sur le login.
- Verrouillage par rate limit.
- 2FA obligatoire pour les admins.
- Audit log des connexions admin, activations/désactivations 2FA.
- Access tokens courts.
- Refresh tokens hashés, rotatifs, révocables.
- Mot de passe minimum 10 caractères côté client, 12 côté admin.
