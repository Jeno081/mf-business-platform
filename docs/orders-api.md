# API commandes

## Création publique

`POST /api/v1/orders`

En-tête recommandé :

```text
Idempotency-Key: <uuid>
```

Corps :

```json
{
  "items": [{ "variantId": "cm...", "quantity": 1 }],
  "customer": {
    "name": "Jean Client",
    "phone": "+243 811 860 632",
    "email": "client@example.com",
    "city": "Kinshasa",
    "commune": "Gombe",
    "address": "Avenue de la République du Tchad",
    "note": "Appeler avant la livraison"
  },
  "paymentMethod": "CASH_ON_DELIVERY",
  "idempotencyKey": "<uuid>"
}
```

`paymentMethod` accepte `CASH_ON_DELIVERY` et `MOBILE_MONEY`.

Réponse `201` :

```json
{
  "data": {
    "id": "cm...",
    "orderNumber": "MF-20261122-1234",
    "status": "PENDING",
    "subtotal": 699,
    "deliveryFee": 0,
    "total": 699,
    "items": []
  }
}
```

### Garanties serveur

- prix et libellés recalculés depuis la base ;
- variantes actives et produits publiés uniquement ;
- contrôle et décrémentation atomique du stock ;
- sous-total, livraison (offerte dès 150 $, sinon 5 $) et total calculés côté serveur ;
- `Order`, `OrderItem`, `Payment`, `OrderStatusHistory` et `InventoryMovement` créés dans une transaction ;
- idempotence : une même clé renvoie la même commande ;
- numéro `MF-AAAAMMJJ-XXXX` unique ;
- rate limit de 40 commandes / 10 minutes / IP.

### Erreurs

- `PRODUCT_NOT_FOUND`
- `PRODUCT_UNAVAILABLE`
- `OUT_OF_STOCK`
- `VALIDATION_ERROR`
- `RATE_LIMITED`

## Admin

Toutes les routes exigent un token administrateur + 2FA.

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/v1/admin/orders` | Liste paginée, filtres statut/paiement/recherche/dates |
| GET | `/api/v1/admin/orders/:id` | Détail complet |
| PATCH | `/api/v1/admin/orders/:id/status` | Changer le statut |
| PATCH | `/api/v1/admin/orders/:id/payment` | Encaisser / remettre en attente |

Statuts :

```text
PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED → REFUNDED
PENDING / CONFIRMED / PREPARING → CANCELLED
```

Une annulation restaure le stock et crée un mouvement `RETURN`.
Le passage à `DELIVERED` marque le paiement COD comme `PAID`.

## Migration

```text
20261122200000_add_order_idempotency
```

Ajoute `Order.idempotencyKey` avec index unique.

## Vérification locale

```bash
# API
pnpm --filter @mf/api build
pnpm --filter @mf/api start

# Frontend avec l’API locale
NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm --filter @mf/web dev -p 3001
```

Créer une commande depuis `/checkout`, puis vérifier :

```sql
SELECT orderNumber, customerName, total, status, paymentStatus, createdAt
FROM `Order`
ORDER BY createdAt DESC
LIMIT 5;
```

Le numéro `MF-...` affiché sur l’écran de confirmation permet de retrouver la ligne.

## Nettoyage des tests

Les commandes de test ont été supprimées de la base ; le stock des variantes a été restauré.


## Tester une commande depuis le site

1. Ouvrir https://mf-business-platform.vercel.app
2. Ajouter un produit au panier.
3. Aller sur /checkout.
4. Remplir nom, téléphone, commune, adresse.
5. Valider.
6. Sur l’écran de confirmation, noter le numéro :

`	ext
MF-20261122-1234
`

7. WhatsApp s’ouvre avec la référence. Même si WhatsApp est fermé, la commande reste en base.

### Vérifier dans Clever Cloud

Dans Clever Cloud → add-on MySQL → console / phpMyAdmin (ou MySQL Workbench avec
les identifiants MYSQL_ADDON_URI) :

`sql
SELECT orderNumber, customerName, customerPhone, total, status, paymentStatus, createdAt
FROM Order
ORDER BY createdAt DESC
LIMIT 10;
`

Puis :

`sql
SELECT productName, variantLabel, quantity, unitPrice, lineTotal
FROM OrderItem
WHERE orderId = (SELECT id FROM Order WHERE orderNumber = 'MF-...');
`

### Vérifier le stock

`sql
SELECT id, color, storage, stockQuantity
FROM ProductVariant
WHERE productId = (SELECT id FROM Product WHERE slug = 'iphone-15');
`

Le stock doit avoir diminué de la quantité commandée. Une annulation admin le restaure.
