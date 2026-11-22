# UX mobile app-like

## Bottom navigation

Composant `apps/web/components/BottomNav.tsx`.

Sur mobile (≤ 960 px) :

- navigation fixe en bas : **Accueil**, **Boutique**, **Panier**, **Contact** ;
- badge panier dynamique ;
- état actif ;
- burger du header masqué ;
- contenu et footer protégés par un padding bas.

Sur desktop, la barre est masquée et la navigation du header reste active.

## Safe areas

- `viewportFit: 'cover'` dans le layout Next.
- `padding-top: env(safe-area-inset-top)` sur la topbar.
- `padding-bottom: env(safe-area-inset-bottom)` sur la bottom nav, les tiroirs et le footer.
- `body` réserve la hauteur de la bottom nav.
- `apple-mobile-web-app-status-bar-style: black-translucent`.

## Comportement tactile

- `-webkit-tap-highlight-color: transparent` global.
- `user-select: none` sur les liens, boutons, menus.
- `touch-action: manipulation` sur le body et les contrôles : pas de zoom double-tap.
- Champs de formulaire à `16px` sur mobile pour éviter le zoom automatique iOS.

## Transitions

`PageTransition` enveloppe les pages et rejoue une animation douce
(`opacity` + `translateY`) à chaque changement de `pathname`.

Désactivée avec `prefers-reduced-motion`.

## Skeleton loaders

Fichiers :

- `app/loading.tsx`
- `app/catalogue/loading.tsx`
- `app/produit/[slug]/loading.tsx`
- `components/Skeletons.tsx`

Formes grises animées pendant le chargement des produits et des fiches.
