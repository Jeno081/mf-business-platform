# Back-office Admin

Application Next.js séparée dans `apps/admin`.

## Fonctionnalités

- Connexion administrateur par e-mail + mot de passe.
- Configuration obligatoire de la 2FA TOTP à la première connexion.
- QR code + clé manuelle + codes de secours.
- Session access token + refresh cookie httpOnly.
- Dashboard : commandes, chiffre d’affaires, produits, alertes stock.
- Commandes : recherche, filtre statut, pagination, détail.
- Changement de statut avec workflow contrôlé.
- Encaissement / remise en attente du paiement.
- Produits : recherche, filtre statut, édition, création.
- Stocks : ajustement par variante, mouvements d’inventaire.
- Paramètres : profil, rôle, sécurité, déconnexion.

## Accès local

```bash
# API locale
pnpm --filter @mf/api build
pnpm --filter @mf/api start

# Admin
NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm --filter @mf/admin dev -p 3002
```

Ouvrir **http://localhost:3002**.

L’API locale doit autoriser `http://localhost:3002` dans `CORS_ORIGINS`.

## Déploiement Vercel

Créer **un second projet Vercel** :

1. **Add New… → Project**
2. Importer le même dépôt `mf-business-platform`
3. **Root Directory** : `apps/admin`
4. Framework : **Next.js**
5. `apps/admin/vercel.json` fournit :
   - Install : `cd ../.. && pnpm install --frozen-lockfile`
   - Build : `cd ../.. && pnpm --filter @mf/admin build`
6. **Environment Variable** :

```text
NEXT_PUBLIC_API_URL=https://mf-business-api.onrender.com
```

7. Node.js : **22.x**
8. Déployer.

Nom de projet recommandé :

```text
admin-mf-business
```

URL probable :

```text
https://admin-mf-business.vercel.app
```

Si le nom est déjà pris, Vercel ajoute un suffixe ; utilisez l’URL réelle.

## CORS Render

Après le déploiement admin, ajouter l’URL exacte dans Render :

```text
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,https://mf-business-platform.vercel.app,https://admin-mf-business.vercel.app
```

Sans slash final. Enregistrer et attendre le redéploiement Render.

Vérifier aussi :

```text
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=(vide)
```

Le cookie de refresh admin est `httpOnly`, `Secure`, `SameSite=None`, chemin
`/api/v1/admin/auth`.

## Première connexion

1. Ouvrir l’URL admin.
2. E-mail : `jenovicmulomba@gmail.com`
3. Saisir le mot de passe.
4. L’application propose un QR code 2FA.
5. Scanner avec Google Authenticator, Authy ou 1Password.
6. Saisir le code à 6 chiffres.
7. Conserver les 8 codes de secours.
8. Entrer dans le dashboard.

La 2FA est obligatoire. En cas de perte du téléphone, un code de secours permet
la connexion.

## Workflow commandes

```text
PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED → REFUNDED
PENDING / CONFIRMED / PREPARING → CANCELLED
```

- Une annulation restaure le stock.
- `DELIVERED` marque le paiement COD comme payé.
- Le bouton paiement permet aussi d’encaisser ou de remettre en attente.

## Limites de cette première version

- Les 60 premiers produits sont chargés pour le dashboard et les alertes stock.
- Pas encore de gestion clients, promotions ou messages.

## Images produits

L’admin permet d’uploader des images Cloudinary depuis :

- la création d’un produit ;
- la fiche d’édition (**Médias → Images du produit**).

Voir [`docs/cloudinary.md`](cloudinary.md).

## Vérifications

- Build Next.js admin : 10 routes.
- Connexion + configuration 2FA testées.
- Dashboard, commandes, détail commande, produits, édition produit et stocks testés.
- 2FA de test désactivée après validation pour laisser la première configuration au propriétaire.
- Commande réelle `MF-20261122-5454` visible dans la liste admin.
