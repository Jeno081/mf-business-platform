# Notifications Push — Firebase Cloud Messaging

## Vue d’ensemble

```text
Client web / PWA
  └─ bouton « Activer les notifications »
      ├─ permission navigateur
      ├─ Service Worker Firebase /firebase-messaging-sw.js
      └─ token FCM → POST /api/v1/push/subscribe

Admin → Marketing
  └─ POST /api/v1/admin/push/send
      └─ Firebase Admin SDK → FCM → téléphones abonnés
```

Les tokens FCM sont conservés dans `PushSubscription.endpoint` (le modèle existant
est réutilisé : `p256dh` et `auth` valent `fcm`). Les tokens invalides sont
révoqués automatiquement après un envoi.

## 1. Créer le projet Firebase

1. Ouvrir <https://console.firebase.google.com>.
2. **Ajouter un projet** (ex. `mf-business`).
3. Dans le projet : **Paramètres du projet** → **Général**.
4. Ajouter une application **Web** (`</>`), nom `MF Business Web`.
5. Copier les valeurs de `firebaseConfig` :
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## 2. Récupérer la clé VAPID

1. **Paramètres du projet** → **Cloud Messaging**.
2. Section **Certificats Web Push**.
3. **Générer une paire de clés**.
4. Copier la **clé publique** : c’est `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

La clé privée reste dans Firebase : ne pas la copier.

## 3. Variables Vercel — application web

Dans Vercel → projet web → **Settings** → **Environment Variables** (Production) :

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
```

Puis **Redeploy** : ces variables sont intégrées au build. Le bouton
« Activer les notifications » apparaît dans le footer uniquement lorsque la
configuration est complète.

## 4. Compte de service — API Render

1. Firebase → **Paramètres du projet** → **Comptes de service**.
2. **Générer une nouvelle clé privée** → télécharger le JSON.
3. Convertir le JSON en base64 (recommandé) :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccount.json"))
```

4. Render → service API → **Environment** :

```text
FIREBASE_SERVICE_ACCOUNT_BASE64=<la longue chaîne base64>
```

Alternative :

```text
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Avec l’option JSON, la clé privée doit contenir `\n` échappés ; le code les
convertit en vrais retours à la ligne.

5. Redéployer / redémarrer l’API Render.

Ne jamais mettre le compte de service dans Vercel ni dans le dépôt Git.

## 5. Abonnement sur le téléphone

1. Ouvrir <https://mf-business-platform.vercel.app> en HTTPS.
2. Descendre dans le footer.
3. Cliquer **Activer les notifications**.
4. Accepter la permission.
5. Vérifier dans Admin → **Marketing** que le compteur « appareils actifs » augmente.

### iPhone / iPad

Les notifications web nécessitent **iOS 16.4+** et l’application installée sur
l’écran d’accueil. Si l’app n’est pas installée, le bouton affiche une consigne.

### Android

Fonctionne dans Chrome / navigateur compatible, sans installation obligatoire.

## 6. Envoyer une notification

Admin → **Marketing** :

1. Rédiger le titre (120 caractères max).
2. Rédiger le message (500 caractères max).
3. Choisir le lien ouvert au clic (`/catalogue`, `/produit/...`, etc.).
4. Vérifier l’aperçu.
5. **Envoyer la notification**.

Le résultat affiche le nombre d’appareils servis, les échecs et les tokens
invalidés.

## 7. Tester

- Téléphone déverrouillé : la notification apparaît immédiatement.
- Téléphone verrouillé / application en arrière-plan : notification système.
- Cliquer la notification : ouverture du lien configuré.
- Admin → Marketing : le compteur doit refléter les abonnés.

## Dépannage

| Problème | Cause probable |
|---|---|
| Bouton absent | Variables `NEXT_PUBLIC_FIREBASE_*` absentes ou build non redéployé |
| « Firebase non configuré » dans l’admin | `FIREBASE_SERVICE_ACCOUNT_BASE64` absent sur Render |
| Permission refusée | Réglages du navigateur / site |
| Aucun abonné | Personne n’a cliqué sur le bouton |
| 0 envoyé | Tokens expirés ou projet Firebase différent entre web et admin |
| Pas de notification sur iPhone | App non installée sur l’écran d’accueil ou iOS < 16.4 |

## Fichiers

- `apps/web/components/PushSubscribe.tsx`
- `apps/web/lib/firebase-config.ts`
- `apps/web/app/firebase-messaging-sw.js/route.ts`
- `apps/api/src/lib/firebase-admin.ts`
- `apps/api/src/modules/push/`
- `apps/admin/app/(dashboard)/marketing/page.tsx`


## Service Worker unique et rafraîchissement du token

Depuis la version du 28 novembre 2026, le site n’utilise plus deux Service
Workers à la racine. `firebase-messaging-sw.js` et le cache PWA sont fusionnés
dans **`/sw.js`** :

- scope unique `/` ;
- cache PWA (`mf-business-v3`) ;
- Firebase Messaging et gestion des notifications en arrière-plan ;
- notification click → ouverture du lien.

L’ancien `/firebase-messaging-sw.js` ne sert plus qu’à rediriger les anciennes
installations vers `/sw.js`.

### Vérification automatique du token

À chaque chargement de la page, si :

- la permission est accordée ;
- `mf_push_enabled` vaut `1` ;

le client :

1. supprime un éventuel ancien Service Worker Firebase ;
2. enregistre `/sw.js` ;
3. appelle `getToken()` ;
4. réinscrit le token auprès de l’API ;
5. affiche **Notifications activées**.

Cela corrige automatiquement un token expiré ou un abonnement perdu après une
mise à jour.

### Rafraîchissement manuel

Le footer propose **Rafraîchir l’abonnement** sous le bouton activé. Il relance
la vérification sans redemander la permission.

### En cas de problème

1. Fermer complètement l’application / l’onglet.
2. Rouvrir le site.
3. Le worker `/sw.js` doit être mis à jour automatiquement.
4. Si nécessaire, utiliser **Rafraîchir l’abonnement**.
5. En dernier recours, effacer les données du site et réautoriser.
