# Statistiques & analytique

## Page admin

**Statistiques** (`/statistiques`) affiche :

- chiffre d’affaires sur la période ;
- nombre de commandes ;
- panier moyen ;
- commandes livrées / annulées ;
- courbe du chiffre d’affaires par jour ;
- graphique des commandes par statut ;
- top 6 des produits les plus vendus (quantité et CA).

Périodes : 7, 30 ou 90 jours.

## API

```http
GET /api/v1/admin/analytics?days=30
Authorization: Bearer <access admin>
```

Réponse :

```json
{
  "data": {
    "range": { "days": 30, "from": "..." },
    "summary": {
      "revenue": 4796,
      "orders": 3,
      "averageOrderValue": 1598.67,
      "delivered": 0,
      "pending": 2,
      "cancelled": 0
    },
    "revenueByDay": [{ "date": "2026-11-01", "revenue": 0, "orders": 0 }],
    "ordersByStatus": [{ "status": "PENDING", "count": 2 }],
    "topProducts": [{ "name": "Pixel 11 Pro", "quantity": 2, "revenue": 2198 }]
  }
}
```

## Règles de calcul

- Le chiffre d’affaires exclut les commandes `CANCELLED` et `REFUNDED`.
- Les commandes par statut incluent tous les statuts.
- Les produits sont agrégés par `productId` (ou nom si le produit a été supprimé).
- Les journées sans vente sont renvoyées à zéro pour garder une courbe continue.
- Les dates sont calculées en UTC.

## Stack

- API Express + Prisma.
- Recharts côté admin.
- Aucun entrepôt de données externe : les agrégats sont calculés à partir des
  commandes et lignes de commande existantes.

## Fichiers

- `apps/api/src/modules/analytics/routes.ts`
- `apps/admin/app/(dashboard)/statistiques/page.tsx`
- `apps/admin/app/globals.css`
