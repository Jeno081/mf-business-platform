# Frontend Next.js — boutique

## Périmètre livré

### Lot 1 — Accueil

- Scaffold Next.js 15 (App Router), React 19, TypeScript.
- Design system noir/ivoire, Bodoni Moda + DM Sans.
- Header sticky, navigation desktop, menu mobile, recherche, tiroir panier.
- Footer complet avec logo blanc, coordonnées, newsletter et moyens de paiement.
- Client API typé vers `https://mf-business-api.onrender.com`.
- Page d’accueil : hero, catégories, 8 produits en vedette, accessoires, valeurs, avis, CTA.
- Responsive 390 px / 1440 px, sans débordement horizontal.
- Build de production Next.js validé.

### Lot 2 — Catalogue & fiches produit

- `/catalogue` : 188 produits, recherche, filtres catégorie/marque/budget/stock, tri, pagination.
- `/catalogue?category=…`, `?brand=…`, `?search=…`, `?minPrice=…&maxPrice=…`, `?page=…`, `?sort=…`.
- `/produit/[slug]` : galerie, marque, prix, note, variantes, quantité, commande WhatsApp, onglets description/caractéristiques/livraison, produits associés.
- Cartes produits et catégories cliquables.
- Navigation header/footer branchée sur le catalogue.
- Recherche du header redirige vers `/catalogue?search=…`.

## Routes

| Route | Rôle |
| --- | --- |
| `/` | Accueil |
| `/catalogue` | Catalogue et filtres |
| `/produit/[slug]` | Fiche produit |

## Points d’attention

- **Panier réel / checkout** : prochain lot ; la fiche produit commande directement sur WhatsApp.
- **PWA** : manifest, service worker et notifications prévus après le panier.
- **CORS/Render** : images servies avec `Cross-Origin-Resource-Policy: cross-origin`.
- **API** : accueil pré-rendu avec revalidate 120 s ; catalogue et fiche produit dynamiques.
- **Port local** : 3001 si 3000 est occupé.

## Vérifications effectuées

- `next build` : succès.
- `/` : 200.
- `/catalogue` : 200, 188 produits.
- `/catalogue?search=iPhone 15` : 3 résultats.
- `/catalogue?category=accessoires` : 13.
- `/catalogue?page=2` : 24 produits.
- `/produit/iphone-15` : 200.
- Variantes : changement de coloris et quantité fonctionnel.
- Onglets produit : description, caractéristiques, livraison.
- Cartes produits : liens vers `/produit/[slug]`.
- 390 px : pas de débordement.
- 1440 px : pas de débordement.
- Aucune image cassée.
- Aucune erreur console.
