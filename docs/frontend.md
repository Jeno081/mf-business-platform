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

### Lot 3 — Panier, checkout & PWA

- Panier persistant dans `localStorage` (`mf-cart-v1`).
- Header : compteur réel, tiroir panier avec quantités, suppression et sous-total.
- Ajout au panier depuis la fiche produit avec variante et quantité.
- `/panier` : lignes, quantités, suppression, sous-total, livraison, total.
- `/checkout` : coordonnées, adresse, commune, paiement, validation, récapitulatif.
- Génération du message WhatsApp complet (client, adresse, produits, totaux).
- PWA : manifest, icônes, service worker, page hors ligne, bouton d’installation.
- Mode standalone sur Android, iOS (écran d’accueil) et PC.

### Lot 4 — UX mobile app-like

- Bottom navigation fixe : Accueil, Boutique, Panier, Contact.
- Burger du header masqué sur mobile.
- Safe areas iOS (encoche, Dynamic Island, barre de gestes).
- `display_override` standalone dans le manifest.
- Suppression du tap bleu, de la sélection de texte sur les contrôles et du zoom double-tap.
- Champs à 16 px sur mobile (pas de zoom iOS).
- Transitions de page douces.
- Skeleton loaders sur l’accueil, le catalogue et les fiches produit.
- Page `/contact`.
- Voir [`docs/mobile-ux.md`](docs/mobile-ux.md).

## Routes

| Route | Rôle |
| --- | --- |
| `/` | Accueil |
| `/catalogue` | Catalogue et filtres |
| `/produit/[slug]` | Fiche produit |
| `/panier` | Panier |
| `/checkout` | Validation de commande |
| `/offline` | Page hors ligne |
| `/manifest.webmanifest` | Manifest PWA |

## Points d’attention

- **Commande** : le checkout génère un message WhatsApp ; aucun paiement n’est prélevé sur le site.
- **PWA** : voir [`docs/pwa.md`](docs/pwa.md).
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
- Ajout au panier : persistence après navigation et rechargement.
- `/panier` : quantités, suppression, total.
- `/checkout` : validation, message WhatsApp généré avec produit et adresse.
- Manifest 200, icônes 200, service worker `activated`.
- 390 px : pas de débordement.
- 1440 px : pas de débordement.
- Aucune image cassée.
- Aucune erreur console.
