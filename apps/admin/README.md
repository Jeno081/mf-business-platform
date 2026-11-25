# apps/admin — Back-office

Application Next.js séparée du site public.

- Connexion admin + 2FA TOTP obligatoire.
- Dashboard, commandes, messages, produits, stocks.
- Upload Cloudinary et gestion des images produit.
- Accès API protégé par JWT et 2FA.
- Déploiement Vercel dédié.

## Lancer

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm --filter @mf/admin dev -p 3002
```

Ouvrir http://localhost:3002.

## Documentation

Voir [`../../docs/admin.md`](../../docs/admin.md).
