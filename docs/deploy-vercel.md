# Déploiement du frontend sur Vercel

## Service déployé

**URL :** https://mf-business-platform.vercel.app

Vérifications du 22 novembre 2026 : /, /contact, /panier, /checkout, /catalogue, /produit/iphone-15, /manifest.webmanifest, /sw.js, /offline → 200. Manifest standalone, service worker mf-business-v2.

## Prérequis

- Compte Vercel (connexion GitHub recommandée)
- Dépôt `Jeno081/mf-business-platform`
- API Render : `https://mf-business-api.onrender.com`

## Configuration du projet

1. Vercel Dashboard → **Add New…** → **Project**
2. Importer le dépôt **`mf-business-platform`**
3. **Root Directory** : cliquer sur **Edit** et choisir **`apps/web`**
4. Framework Preset : **Next.js**
5. Install Command :

```bash
cd ../.. && pnpm install --frozen-lockfile
```

6. Build Command :

```bash
cd ../.. && pnpm --filter @mf/web build
```

7. Output Directory : laisser vide (Next.js par défaut)
8. Node.js Version : **22.x**

> Le fichier `apps/web/vercel.json` contient déjà ces commandes. Si Vercel les détecte, gardez-les.

## Variables d'environnement

Dans **Environment Variables** :

| Variable | Valeur | Environnements |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://mf-business-api.onrender.com` | Production, Preview, Development |

Aucun secret n’est nécessaire côté frontend.

## Déploiement

1. Cliquer sur **Deploy**
2. Attendre la fin du build
3. Copier l’URL de production, par exemple :

```text
https://mf-business-xxxx.vercel.app
```

## Après le déploiement

### 1. Mettre à jour CORS sur Render

Dans Render → service `mf-business-api` → **Environment** → modifier `CORS_ORIGINS` :

```text
http://localhost:3000,http://localhost:3001,https://VOTRE-URL.vercel.app
```

Enregistrer : Render redéploie automatiquement.

### 2. Vérifier

```text
https://VOTRE-URL.vercel.app
https://VOTRE-URL.vercel.app/catalogue
https://VOTRE-URL.vercel.app/produit/iphone-15
https://VOTRE-URL.vercel.app/manifest.webmanifest
https://VOTRE-URL.vercel.app/sw.js
```

### 3. Tester la PWA

- **Android / Chrome** : menu → Installer l’application.
- **iPhone** : Safari → Partager → Sur l’écran d’accueil.
- **PC** : icône d’installation dans la barre d’adresse.

## Notes

- Le build Vercel récupère l’API Render pour générer l’accueil.
- Les images produit sont servies par Render, pas par Vercel.
- Le service worker et le manifest sont dans `apps/web/public` et `apps/web/app`.
- Le domaine `*.vercel.app` est HTTPS, donc la PWA est installable.
