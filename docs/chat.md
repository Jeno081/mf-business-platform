# Chat en direct — architecture préparée

## Objectif

Permettre à un client de discuter avec la boutique depuis le site public, et à
l’administrateur de répondre depuis le back-office, en temps réel.

## Stack

- **Socket.io** attaché au serveur HTTP Express.
- **MySQL** pour les conversations et messages.
- **REST** pour l’historique et le fallback.
- **JWT guest** pour identifier un visiteur sans compte.
- **JWT admin** existant + 2FA pour le back-office.
- Redis uniquement plus tard, si plusieurs instances Render.

## Modèle existant

Le schéma Prisma contient déjà :

- `Conversation`
  - `userId` / `guestToken`
  - `orderId`
  - `assignedAdminId`
  - `status` (`OPEN`, `PENDING`, `CLOSED`)
  - `lastMessageAt`
- `ConversationParticipant`
- `Message`
  - `senderType` (`CUSTOMER`, `ADMIN`, `SYSTEM`)
  - `body`, `attachments`, `readAt`
- `Notification` (`CHAT`).

Aucune migration majeure n’est nécessaire pour le premier lot.

## Identité client

- À la première ouverture du chat, l’API crée un **guest token signé** :
  - stocké dans `localStorage` ;
  - durée longue ;
  - lié à une conversation ouverte.
- Si le client possède un compte, la conversation est reliée à `userId`.
- Le guest token ne donne accès qu’à ses propres conversations.

## API REST

```text
POST   /api/v1/chat/conversations
GET    /api/v1/chat/conversations/:id/messages
POST   /api/v1/chat/conversations/:id/messages
POST   /api/v1/chat/conversations/:id/read
GET    /api/v1/admin/chat/conversations
GET    /api/v1/admin/chat/conversations/:id
POST   /api/v1/admin/chat/conversations/:id/messages
PATCH  /api/v1/admin/chat/conversations/:id
```

## Socket.io

Namespace `/chat`.

### Authentification handshake

```text
auth: { role: 'customer', guestToken } 
ou    { role: 'admin', accessToken }
```

### Rooms

- `conversation:{id}` : client + admins assignés.
- `admin:inbox` : tous les admins connectés.

### Événements

```text
conversation:join
conversation:leave
message:send       → ack { message }
message:new
typing:start
typing:stop
message:read
conversation:updated
conversation:closed
```

Le message est **persisté avant** l’émission `message:new`.

## Interface client

Widget flottant :

- bouton discret au-dessus de la bottom nav mobile ;
- panneau plein écran sur mobile ;
- conversation persistante ;
- indicateur « en ligne » ;
- saisie + envoi ;
- historique ;
- messages non lus ;
- reconnexion automatique ;
- fallback REST si Socket.io indisponible.

## Interface admin

Nouvelle entrée **Messages** :

- liste des conversations ;
- filtres : ouvertes, en attente, fermées ;
- compteur non lus ;
- fil de discussion ;
- réponse en temps réel ;
- assignation à un admin ;
- fermeture / réouverture ;
- lien vers la commande ou le client.

## Sécurité

- Auth obligatoire sur Socket.io et REST.
- Rate limit par conversation et par IP.
- Longueur maximale des messages.
- XSS : React échappe le texte ; aucun HTML brut.
- Pas de pièces jointes dans le premier lot.
- Guest token signé, non devinable.
- Admin : 2FA + RBAC.
- CORS et cookies déjà configurés.

## Découpage proposé

### Lot 1 — Fondations

- Service conversations/messages.
- Guest token.
- REST + Socket.io.
- Tests deux clients + admin.

### Lot 2 — Client

- Widget public.
- Historique, envoi, réception.
- Badge non lus.
- Fallback.

### Lot 3 — Admin

- Inbox et fil.
- Réponse, assignation, statut.
- Notifications.

### Lot 4 — Finitions

- Typing indicator.
- Read receipts.
- Web Push (optionnel).
- Pièces jointes (optionnel).
- Redis si montée en charge.

## Prérequis techniques

- Ajouter `socket.io` à l’API et `socket.io-client` au web/admin.
- Attacher Socket.io au serveur HTTP existant.
- Vérifier le support WebSocket de Render.
- Adapter `CORS` aux origines publiques et admin.
- Prévoir un heartbeat et une reconnexion.

## Statut — Lot 1 backend livré

Le backend chat est implémenté :

- JWT guest signé (365 jours) ;
- session guest + conversation persistée ;
- REST invité : session, conversation, historique, envoi, lecture ;
- REST admin : liste, détail, réponse, lecture, statut ;
- Socket.io /chat avec authentification guest/admin ;
- rooms conversation:{id} et dmin:inbox ;
- persistance MySQL avant émission ;
- rate limits REST et anti-spam socket ;
- index Conversation.guestToken.

### Endpoints REST livrés

`	ext
POST /api/v1/chat/session
POST /api/v1/chat/conversations
GET  /api/v1/chat/conversations/:id
GET  /api/v1/chat/conversations/:id/messages
POST /api/v1/chat/conversations/:id/messages
POST /api/v1/chat/conversations/:id/read

GET   /api/v1/admin/chat/conversations
GET   /api/v1/admin/chat/conversations/:id
POST  /api/v1/admin/chat/conversations/:id/messages
POST  /api/v1/admin/chat/conversations/:id/read
PATCH /api/v1/admin/chat/conversations/:id
`

### Événements Socket.io livrés

Connexion :

`js
io('https://mf-business-api.onrender.com', {
  auth: { role: 'customer', guestToken },
});
// ou
io('https://mf-business-api.onrender.com', {
  auth: { role: 'admin', token: accessToken },
});
`

Événements :

`	ext
conversation:ready
admin:ready
conversation:join
conversation:leave
message:send
message:new
message:read
typing
chat:error
`

Le message est créé en base avant message:new.

### Tests effectués

`	ext
Session guest REST              → 200
Message guest REST              → 201
Historique guest                → OK
Admin login + 2FA               → OK
Liste admin                     → 1 conversation, non-lu
Détail admin                    → messages
Réponse admin REST              → ADMIN
Historique guest après réponse  → 2 messages
Lecture guest                   → OK
Changement statut PENDING       → OK
Socket guest connecté           → conversation:ready
Socket admin connecté           → admin:ready
Message socket guest → admin    → reçu
Réponse socket admin → guest    → ack OK
`

Les conversations et administrateurs de test ont été supprimés.

### Déploiement

Aucune variable supplémentaire : les guest tokens utilisent
JWT_REFRESH_SECRET.

Render supporte WebSocket sur le service web. Aucun Redis n’est utilisé pour
le Lot 1.

### Prochain lot

Lot 2 : widget client public (bulle, panneau, historique, envoi, reconnexion,
fallback REST).


---

## Lot 2 — Widget client & inbox admin

### Widget public

Composant ChatWidget, monté dans le layout global :

- bulle flottante en bas à droite ;
- au-dessus de la bottom nav sur mobile ;
- panneau plein écran mobile, panneau 390 px desktop ;
- session guest créée à la première ouverture ;
- token conservé dans localStorage (mf_chat_guest_token) ;
- historique REST ;
- Socket.io pour la réception temps réel ;
- envoi REST avec mise à jour immédiate ;
- reconnexion Socket ;
- badge de messages non lus lorsque le panneau est fermé ;
- indicateur de saisie admin ;
- design Maison Forlife.

### Inbox admin

Nouvelle entrée **Messages** :

- liste des conversations ;
- compteur non lus ;
- fil de discussion ;
- réponse ;
- changement de statut (ouverte / en attente / fermée) ;
- actualisation automatique toutes les 5 secondes.

Cette inbox est volontairement en REST/polling pour le Lot 2. Le temps réel
admin complet (Socket.io admin) reste prévu pour le Lot 3.

### Tests

`	ext
Widget mobile 390                → OK
Widget desktop 1440              → OK
Session guest + token            → OK
Envoi client                     → affiché
Rechargement page + réouverture  → historique conservé
Socket guest connecté            → en ligne
Réponse admin → widget           → reçue en temps réel
Inbox admin / liste / réponse    → OK
Nettoyage des conversations test → OK
`


---

## Lot 3 — Admin temps réel

### Temps réel admin

- Connexion Socket.io admin via AdminChatProvider.
- Room dmin:inbox.
- Join/leave automatique de la conversation sélectionnée.
- Remplacement du polling 5 s par le temps réel (fallback REST 30 s).
- Mise à jour de la liste et du fil à chaque événement.

### Notifications

- Badge global dans le menu **Messages** (total non-lus).
- Rafraîchissement du badge sur les événements.
- Son de notification Web Audio pour les nouveaux messages clients.
- Bouton **Son activé / Son coupé** mémorisé dans localStorage.

### Typing

- Le client envoie 	yping à l'admin.
- L'admin envoie 	yping au client.
- Affichage « Le client écrit… » dans l'inbox.
- Affichage des trois points dans le widget client.

### Accusés de lecture

- 
eadAt exposé dans les messages.
- Le client voit ✓ puis ✓✓ bleu quand l'admin lit.
- L'admin voit les mêmes coches pour ses réponses lues par le client.
- Événement message:read émis par les routes REST et Socket.
- Marques de lecture automatiques à l'ouverture d'une conversation.

### Fichiers

- pps/admin/components/AdminChatProvider.tsx
- pps/admin/app/(dashboard)/messages/page.tsx
- pps/api/src/lib/chat-realtime.ts
- routes chat invité/admin pour emitConversationRead.

### Tests

`	ext
Admin connecté Socket.io          → OK
Message client → admin temps réel → OK
Réponse admin → client temps réel → OK
Typing admin → client             → OK
Accusé client ✓✓ bleu             → OK
Accusé admin ✓✓ bleu              → OK
Liste et fil mis à jour           → OK
Nettoyage des données de test     → OK
`

Le test sonore n’est pas automatisable en headless ; le son Web Audio est déclenché sur les messages clients entrants et peut être coupé depuis l’inbox.
