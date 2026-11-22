# apps/web — Boutique Next.js

Frontend public de MF Business, construit avec **Next.js 15 (App Router) + React 19 + TypeScript**.

## Routes

- `/` — accueil
- `/catalogue` — catalogue, filtres, recherche, pagination
- `/produit/[slug]` — fiche produit
- `/panier` — panier persistant
- `/checkout` — enregistrement de la commande et message WhatsApp
- `/offline` — page hors ligne
- `/manifest.webmanifest` — PWA

## Lancer en local

```bash
pnpm --filter @mf/web dev
```

Par défaut : http://localhost:3000

Si le port 3000 est occupé :

```bash
pnpm --filter @mf/web exec next dev -p 3001
```

## API

L’URL de l’API est configurée par :

```env
NEXT_PUBLIC_API_URL=https://mf-business-api.onrender.com
```

Le client typé est dans [`lib/api.ts`](lib/api.ts). Les pages utilisent les Server Components et un cache de 120 secondes.

## Design system

- Tokens dans [`app/globals.css`](app/globals.css) : noir, ivoire, graphite.
- Typographies : **Bodoni Moda** pour les titres, **DM Sans** pour le texte.
- Logo : `public/brand/logo-monogram.png`, `logo-full-white.png`, `logo-full-black.png`.
- Favicon : `app/icon.png`.
- Icônes PWA : `public/icons/`.

## Panier

`CartProvider` + `lib/cart.ts` :

- persistance `localStorage` clé `mf-cart-v1` ;
- compteur header ;
- tiroir panier ;
- page `/panier` ;
- checkout WhatsApp.

## PWA

- `app/manifest.ts`
- `public/sw.js`
- `components/PwaRegister.tsx`
- `components/PwaInstall.tsx`
- `app/offline/page.tsx`

Voir [`../../docs/pwa.md`](../../docs/pwa.md).
