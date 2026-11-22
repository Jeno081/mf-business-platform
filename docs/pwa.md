# PWA — installation et mode hors ligne

## Manifest

Généré par [`apps/web/app/manifest.ts`](apps/web/app/manifest.ts) et servi sur
`/manifest.webmanifest`.

- Nom : **MF Business — Maison Forlife**
- Nom court : **MF Business**
- `display: standalone`
- `display_override: ['standalone', 'minimal-ui']`
- `start_url: /`
- Couleurs : noir `#0f0f0f`, ivoire `#f3efe6`
- Icônes 192, 512 et maskable 512 dans `apps/web/public/icons/`
- Raccourcis : Catalogue, Panier

## Service worker

Fichier [`apps/web/public/sw.js`](apps/web/public/sw.js), enregistré par
`PwaRegister` au chargement.

- Cache `mf-business-v2`.
- Pré-cache : page hors ligne, icônes, logos.
- Navigation : réseau d’abord, cache en secours, puis `/offline`.
- `_next/static` : réseau puis cache.
- Icônes/logos : cache d’abord.
- Ne met jamais en cache les réponses API externes.

## Installation

### Android / Chrome / Edge / PC

Le bouton **Installer l’application** apparaît dans le footer lorsque le
navigateur émet `beforeinstallprompt`. Sinon, utiliser le menu du navigateur
« Installer l’application ».

### iPhone / iPad

Safari → bouton **Partager** → **Sur l’écran d’accueil**.
Le bouton du footer rappelle cette procédure.

### Après installation

L’application s’ouvre en mode standalone, sans barre d’adresse, avec l’icône
MF Business.

## Vérifications

- `/manifest.webmanifest` → 200, JSON valide.
- Icônes 192 / 512 / maskable → 200.
- `/sw.js` → 200.
- Service worker enregistré, état `activated`.
- `/offline` → 200.
- Build Next.js avec routes PWA.
