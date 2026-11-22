# API Catalogue — documentation

## Données importées

Le seed importe les **188 produits** du site statique :

- **144 smartphones**
- **23 tablettes**
- **8 produits audio**
- **13 accessoires**
- **16 marques**
- **503 variantes**
- **188 images WebP** servies par l'API

Les images sont dans :

```text
apps/api/public/images/products/
```

Elles sont exposées sur :

```text
http://localhost:4000/images/products/<fichier>.webp
```

## Endpoints publics

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/products` | Liste paginée, recherche, filtres, tri |
| `GET` | `/api/v1/products/:slug` | Fiche complète |
| `GET` | `/api/v1/products/:slug/related` | Produits associés |
| `GET` | `/api/v1/brands` | Marques + nombre de produits |
| `GET` | `/api/v1/categories` | Catégories + nombre de produits |

### Paramètres de `/products`

| Paramètre | Valeurs | Défaut |
| --- | --- | --- |
| `page` | entier ≥ 1 | `1` |
| `perPage` | 1–60 | `24` |
| `search` | texte | — |
| `category` | slug de catégorie | — |
| `brand` | slug de marque | — |
| `minPrice` / `maxPrice` | USD | — |
| `featured` | `true` / `false` | — |
| `inStock` | `true` / `false` | — |
| `sort` | `newest`, `price-asc`, `price-desc`, `rating`, `name` | `newest` |

Exemples :

```text
GET /api/v1/products?search=iPhone%2015
GET /api/v1/products?category=smartphones&sort=price-asc&page=1
GET /api/v1/products?brand=Samsung&inStock=true
GET /api/v1/products?minPrice=100&maxPrice=300
```

### Réponse liste

```json
{
  "data": [
    {
      "id": "cm...",
      "slug": "iphone-15",
      "name": "iPhone 15",
      "subtitle": "128 Go · Noir",
      "series": "iPhone",
      "brand": { "id": "cm...", "name": "Apple", "slug": "Apple" },
      "category": { "id": "cm...", "name": "Smartphones", "slug": "smartphones" },
      "price": 899,
      "compareAtPrice": null,
      "currency": "USD",
      "status": "ACTIVE",
      "rating": 4.8,
      "reviews": 148,
      "stock": 24,
      "inStock": true,
      "featured": false,
      "image": "/images/products/iphone-15.webp",
      "colors": ["Noir", "Bleu"],
      "variants": [
        { "id": "cm...", "color": "Noir", "storage": "128 Go", "stockQuantity": 12 }
      ]
    }
  ],
  "meta": { "page": 1, "perPage": 24, "total": 188, "totalPages": 8 }
}
```

### Fiche produit

`GET /api/v1/products/:slug` ajoute :

- `description`
- `features`
- `specs`
- `images`
- `metaTitle`, `metaDescription`
- `reviewsList`

## Endpoints admin

Tous protégés par JWT admin + RBAC.

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/products` | Liste admin (brouillons inclus) |
| `POST` | `/api/v1/admin/products` | Création |
| `GET` | `/api/v1/admin/products/:id` | Détail admin |
| `PATCH` | `/api/v1/admin/products/:id` | Mise à jour |
| `DELETE` | `/api/v1/admin/products/:id` | Archivage logique |
| `PATCH` | `/api/v1/admin/variants/:id/stock` | Mouvement de stock |

Exemple de mouvement de stock :

```json
{
  "quantityDelta": 10,
  "type": "RESTOCK",
  "note": "Réapprovisionnement fournisseur"
}
```

Le stock ne peut jamais devenir négatif. Chaque mouvement crée une ligne
`InventoryMovement` avec l'administrateur auteur.

## Seed

```bash
pnpm seed
```

Le seed est idempotent par `slug` de produit : il met à jour les produits existants
et recrée leurs variantes, images, specs et caractéristiques.

## Tests effectués

- `GET /products` → 188 produits.
- `GET /products?search=iPhone 15` → 3.
- `GET /products?search=Fold` → 10.
- `GET /products?search=Samsung` → 40.
- `GET /products?category=accessoires` → 13.
- `GET /products?brand=Apple` → 32.
- `GET /products?minPrice=100&maxPrice=300` → 36.
- Image produit → `200 image/webp`.
- Fiche `iphone-duo-fold` → 6 specs, 5 features, 1 image, 2 variantes.
- Admin : création, liste, mise à jour, archivage.
- Stock : +1 puis -1, stock restauré.
