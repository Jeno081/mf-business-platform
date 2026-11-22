# Frontend Next.js — premier lot

## Périmètre livré

- Scaffold Next.js 15 (App Router), React 19, TypeScript.
- Design system noir/ivoire, Bodoni Moda + DM Sans.
- Header sticky, navigation desktop, menu mobile, recherche, tiroir panier.
- Footer complet avec logo blanc, coordonnées, newsletter et moyens de paiement.
- Client API typé vers `https://mf-business-api.onrender.com`.
- Page d’accueil : hero, catégories, 8 produits en vedette, accessoires, valeurs, avis, CTA.
- Responsive 390 px / 1440 px, sans débordement horizontal.
- Build de production Next.js validé.

## Points d’attention

- **Catalogue et fiches produit** : prochain lot.
- **Panier réel** : prochain lot ; le tiroir actuel affiche un état vide.
- **Recherche** : le panneau est en place ; la recherche détaillée sera branchée avec le catalogue.
- **PWA** : manifest, service worker et notifications prévus après le catalogue/panier.
- **CORS/Render** : les images produit sont servies avec `Cross-Origin-Resource-Policy: cross-origin`.
- **API** : la page est pré-rendue avec un revalidate de 120 secondes.

## Vérifications effectuées

- `next build` : succès.
- `next dev` : `http://localhost:3001` (3000 occupé par une autre application locale).
- 390 px : `scrollWidth = 390`.
- 1440 px : `scrollWidth = 1425` (largeur client, pas de débordement).
- Aucune image cassée.
- Menu mobile, tiroir panier et panneau recherche fonctionnels.
- Aucune erreur console.
