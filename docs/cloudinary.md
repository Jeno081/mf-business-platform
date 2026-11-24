# Images produits — Cloudinary

## Variables API

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_FOLDER=mf-business/products
```

À définir uniquement sur **Render** (et dans `apps/api/.env` en local).
Aucune variable Cloudinary n’est nécessaire sur Vercel.

### Attention au Cloud name

Le **Cloud name** est la valeur courte affichée dans le Dashboard Cloudinary,
par exemple :

```text
dxxxxxxxx
```

Ce n’est pas le nom du compte ni le nom de l’environnement (« Location App
Production »). Si l’API répond :

```text
Invalid cloud_name
```

corriger `CLOUDINARY_CLOUD_NAME` dans Render et dans `apps/api/.env`.

## Endpoints

### Upload

```text
POST /api/v1/admin/uploads/product-image
Authorization: Bearer <admin token>
Content-Type: multipart/form-data
file: <image>
```

Réponse :

```json
{
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "mf-business/products/...",
    "width": 1200,
    "height": 1200,
    "format": "webp",
    "bytes": 42000
  }
}
```

- Admin + 2FA requis.
- JPG / PNG / WebP.
- 6 Mo maximum.
- 20 uploads / minute.
- Dossier `CLOUDINARY_FOLDER`.
- Transformation Cloudinary `quality:auto`, `fetch_format:auto`.

### Associer à un produit

```text
POST /api/v1/admin/products/:id/images
```

```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "mf-business/products/...",
  "alt": "iPhone 15 — Black"
}
```

### Image principale

```text
POST /api/v1/admin/products/:id/images/:imageId/primary
```

### Supprimer

```text
DELETE /api/v1/admin/products/:id/images/:imageId
```

La suppression efface la ligne `ProductImage` et l’asset Cloudinary si
`publicId` est présent.

## Base de données

Migration :

```text
20261124190000_add_product_image_public_id
```

Ajoute `ProductImage.publicId`.

## Utilisation admin

1. Ouvrir **Produits**.
2. Modifier un produit.
3. Panneau **Médias → Images du produit**.
4. **+ Ajouter**, choisir une ou plusieurs images.
5. ★ pour définir l’image principale.
6. × pour supprimer.
7. L’image principale est utilisée sur les cartes catalogue et la fiche produit.

À la création d’un produit, les images peuvent être ajoutées directement dans le
formulaire **Images du produit** avant l’enregistrement.

## Vérification

- L’image est visible dans l’admin.
- Elle apparaît sur `/produit/:slug`.
- Si elle est principale, elle apparaît sur les cartes du catalogue.
- Le stockage Cloudinary ne reçoit jamais de fichier non administrateur.
