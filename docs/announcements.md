# Annonces client & historique

## Objectif

Chaque campagne envoyée depuis Admin → Marketing est :

1. conservée en base dans `Announcement` ;
2. envoyée en notification push Firebase ;
3. affichée dans la cloche du header public.

## Base de données

Modèle `Announcement` :

```prisma
model Announcement {
  id          String   @id @default(cuid())
  title       String   @db.VarChar(120)
  body        String   @db.VarChar(500)
  url         String?  @db.VarChar(500)
  pushSuccess Int      @default(0)
  pushFailed  Int      @default(0)
  publishedAt DateTime @default(now())
  createdAt   DateTime @default(now())
}
```

Migration : `20261128100000_add_announcements`.

## API publique

```http
GET /api/v1/announcements?limit=20
```

Réponse :

```json
{
  "data": [
    {
      "id": "...",
      "title": "Nouvel arrivage iPhone 18",
      "body": "Les nouveaux modèles sont disponibles...",
      "url": "/catalogue?category=smartphones",
      "publishedAt": "2026-11-28T09:18:31.316Z"
    }
  ]
}
```

Aucune authentification : les annonces sont publiques.

## Interface client

- cloche dans le header, à côté du panier ;
- badge rouge avec le nombre de nouvelles annonces ;
- panneau latéral avec titre, message, date et lien ;
- état lu/non lu conservé dans `localStorage` (`mf_announcements_read`) ;
- rafraîchissement automatique toutes les 60 secondes ;
- première visite : les annonces existantes apparaissent non lues ; elles
  sont marquées lues à l’ouverture de la cloche.

## Envoi admin

`POST /api/v1/admin/push/send` :

1. envoie la campagne FCM ;
2. enregistre `Announcement` avec les compteurs de succès/échec ;
3. renvoie `announcementId`.

Si aucun abonné n’est présent, l’annonce est quand même enregistrée pour
l’historique web (avec `pushSuccess = 0`), à condition que Firebase soit
configuré sur l’API.

## Fichiers

- `apps/api/src/modules/announcements/routes.ts`
- `apps/api/src/modules/push/service.ts`
- `packages/database/prisma/schema.prisma`
- `apps/web/components/Header.tsx`
- `apps/web/lib/announcements.ts`
- `apps/web/app/globals.css`
