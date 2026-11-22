# apps/web — Boutique Next.js

Frontend public de MF Business, construit avec **Next.js 15 (App Router) + React 19 + TypeScript**.

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

## Structure

```text
app/
  layout.tsx        header, footer, fonts, métadonnées
  page.tsx          accueil
  globals.css       design system + responsive
components/
  Header.tsx        navigation, menu mobile, recherche, panier
  Footer.tsx        pied de page complet
  ProductCard.tsx   carte produit
  CategoryCard.tsx  carte catégorie
lib/api.ts          client API typé
```
