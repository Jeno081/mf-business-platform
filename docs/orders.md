# Commandes internes, suivi et facture PDF

## Parcours client

1. Le client valide son panier dans `/checkout`.
2. La commande est créée dans l’API (`POST /api/v1/orders`).
3. Le client voit immédiatement :
   - son numéro de commande ;
   - un lien de suivi personnel ;
   - l’accès à la facture dès que la commande est validée.
4. WhatsApp n’est plus ouvert automatiquement. Il reste disponible comme
   option secondaire.
5. La page `/suivi/[token]` affiche le statut, la timeline, le détail du panier,
   l’adresse de livraison et la facture PDF.

## Jeton de suivi

À la création, l’API signe un JWT `order_tracking` valable 365 jours.
Il contient uniquement l’identifiant de la commande.

- URL : `https://mf-business-platform.vercel.app/suivi/<token>`
- API : `GET /api/v1/orders/track/:token`
- Facture : `GET /api/v1/orders/track/:token/invoice`

La facture publique n’est disponible qu’après validation de la commande
(statut différent de `PENDING` et `CANCELLED`).

## Statuts

```text
PENDING   → Reçue
CONFIRMED → Validée
PREPARING → En préparation
SHIPPED   → Expédiée
DELIVERED → Livrée
CANCELLED → Annulée
REFUNDED  → Remboursée
```

## Facture PDF

Génération serveur avec **PDFKit** :

- logo Maison Forlife ;
- numéro de facture `FAC-<orderNumber>` ;
- coordonnées client et livraison ;
- détail du panier, sous-total, livraison, total ;
- statut de paiement et mentions légales ;
- téléchargement / impression navigateur.

Routes :

```http
GET /api/v1/admin/orders/:id/invoice
Authorization: Bearer <admin>
```

```http
GET /api/v1/orders/track/:token/invoice
```

`?download=1` force le téléchargement.

## Notifications

- nouvelle commande → push aux appareils `ADMIN` ;
- changement de statut → push au token client enregistré avec la commande ;
- clic sur la notification → page de suivi.

Le token push du client est envoyé au checkout depuis `localStorage`
(`mf_push_token`) et stocké dans `Order.customerPushToken`.

## Base de données

- `Order.customerPushToken`
- `PushSubscription.role` (`CUSTOMER` / `ADMIN`)
- `PushSubscription.conversationId` pour les réponses chat.

## Fichiers

- `apps/api/src/modules/orders/`
- `apps/api/src/lib/invoice.ts`
- `apps/api/src/lib/order-token.ts`
- `apps/web/app/suivi/[token]/page.tsx`
- `apps/web/app/checkout/page.tsx`
- `apps/admin/app/(dashboard)/commandes/[id]/page.tsx`
