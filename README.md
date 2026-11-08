# Guanar Life — Marché B2B avicole Dakar

Plateforme de mise en relation directe entre éleveurs avicoles et clients professionnels
(restaurants, fast-foods, rôtisseries, traiteurs, hôtels, cantines) à Dakar et dans les Niayes.

Le MVP couvre : catalogue, commande, paiement manuel Wave / Orange Money / comptant / crédit,
suivi de livraison, confirmation et litige, espace éleveur, cockpit administrateur, crédit,
commissions, reversements, notifications et exports comptables.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 (design system repris des maquettes Stitch)
- PostgreSQL + Prisma 6
- Authentification téléphone + PIN (bcrypt), sessions JWT httpOnly
- PWA (manifest, service worker limité aux ressources statiques)

## Démarrage local

Prérequis : Node.js 20+ et PostgreSQL.

```bash
npm install

# Terminal 1 — PostgreSQL embarqué (aucun Docker/WSL requis)
npm run db:dev

# Terminal 2 — schéma + données de démonstration + application
npm run db:push
npm run db:seed
npm run dev
```

Ouvrir http://localhost:3000.

> Docker Desktop ou WSL ne sont pas nécessaires. `npm run db:dev` télécharge et démarre un
> PostgreSQL local dans `.pgdata` (UTF-8). Pour utiliser un PostgreSQL existant, renseigner
> `DATABASE_URL` dans `.env`. `docker compose up -d` reste disponible comme alternative.

### Variables d'environnement

Copier `.env.example` vers `.env` et adapter :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (`postgresql://guanar:guanar@localhost:5432/guanar`) |
| `AUTH_SECRET` | Clé de signature des sessions (longue et aléatoire en production) |
| `CRON_SECRET` | Protège `/api/cron/recurring` |

## Comptes de démonstration (PIN `1234`)

| Rôle | Téléphone | Usage |
|---|---|---|
| Admin | `+221770000000` | Cockpit, validation, crédit, commissions |
| Éleveur | `+221771111111` | Élevage Keur Mbaye (Sébikotane) |
| Éleveur | `+221773333333` | Ferme des Niayes (Sangalkam) |
| Client pro | `+221772222222` | Le Teranga Grill & Rôtisserie |
| En attente | `+221774444444` | Fast Food Almandies (à valider) |

## Parcours couverts

1. **Inscription** client pro et éleveur → compte en attente.
2. **Validation admin** → activation + notification.
3. **Commande client** : catalogue, filtres, panier, créneau, adresse, mode de règlement, crédit.
4. **Éleveur** : acceptation/refus sous 2 h, préparation, « prêt à enlever » avec photo, stocks.
5. **Admin** : paiement, livraison, changement de statut, réassignation, litige.
6. **Client** : confirmation de réception ou litige photo sous 24 h.
7. **Clôture** → reversement éleveur + notification.
8. **Commande récurrente** hebdomadaire via `/api/cron/recurring`.
9. **Clôture automatique** 24 h après livraison sans signalement (même cron).

Le parcours complet est vérifié par `npm run test:e2e` (serveur `npm run dev` et base seedés requis).

## Structure

```
prisma/schema.prisma      Modèle de données (utilisateurs, commandes, paiements, crédit…)
prisma/seed.ts            Données de démonstration
src/app/                  Routes (client, fournisseur, admin, auth, facture, API)
src/components/           UI partagée, formulaires, coquilles de navigation
src/lib/actions/          Server Actions (auth, commandes, fournisseur, admin)
src/lib/                  Auth, DB, commission, formatage, notifications, uploads
scripts/dev-db.mjs        PostgreSQL embarqué local
scripts/e2e.mjs           Test de bout en bout (Playwright + Chrome installé)
public/                   Manifest, service worker, icônes
design/                   Maquettes Stitch d'origine (non déployées)
```

## Opérations courantes

### Ajouter un produit
Éleveur → « Mes produits » → « Nouveau produit ». Le prix saisi est le prix éleveur ; la
commission est ajoutée pour obtenir le prix client.

### Ajouter un utilisateur
Le parcours normal est l'inscription publique puis validation admin. Un PIN oublié se
réinitialise depuis Admin → Utilisateurs → PIN.

### Ajouter un moyen de paiement
1. Ajouter la valeur dans l'enum Prisma `PaymentMethod`.
2. Ajouter le libellé dans `src/lib/labels.ts`.
3. Ajouter l'option dans `src/components/orders/checkout-form.tsx`.
4. Gérer la confirmation dans Admin → Paiements (aujourd'hui manuelle).

### Notifications
Les événements créent une entrée `Notification` (file d'attente WhatsApp/SMS). Admin →
Notifications permet d'ouvrir le message dans WhatsApp (lien `wa.me`) puis de le marquer
comme envoyé. L'API WhatsApp Business pourra remplacer l'envoi manuel sans changer les appels.

### Tâche planifiée
`GET /api/cron/recurring?secret=$CRON_SECRET` (ou en-tête `x-cron-secret`) :
- génère les commandes récurrentes du jour,
- clôture les commandes livrées depuis plus de 24 h sans signalement.

À planifier une fois par jour (cron serveur, Vercel Cron, Task Scheduler…).

## Déploiement gratuit (Vercel Hobby + Neon Free + Vercel Blob)

Guide pas à pas : **[DEPLOY.md](./DEPLOY.md)**.

Cible recommandée pour les premiers clients : **0 FCFA/mois**, hors nom de domaine.

### 1. Base Neon Free

1. Créer un projet sur https://neon.com dans la région **Paris (eu-west-3)**.
2. Récupérer la chaîne **pooled** (hôte `...-pooler...`) et la chaîne **directe**.
3. Renseigner dans Vercel :
   - `DATABASE_URL` = URL poolée + `?sslmode=require&pgbouncer=true&connect_timeout=15`
   - `DIRECT_URL` = URL directe + `?sslmode=require`

### 2. Stockage photos

Dans Vercel → Storage → créer un store **Blob**, le connecter au projet. La variable
`BLOB_READ_WRITE_TOKEN` est ajoutée automatiquement. En local, l'absence de token fait
basculer l'upload vers `public/uploads`.

### 3. Application Vercel

1. Importer le dépôt GitHub dans Vercel (framework Next.js détecté).
2. Ajouter `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`.
3. Le script `vercel-build` exécute `prisma generate && prisma migrate deploy && next build`.
4. Déployer. Le cron `0 6 * * *` (06h00 Dakar) est déclaré dans `vercel.json` et appelle
   `/api/cron/recurring` avec `Authorization: Bearer $CRON_SECRET`.

### 4. Initialiser la production

Une seule fois, depuis la machine locale avec les variables Neon :

```bash
npm run db:seed:prod
```

Cela crée uniquement le compte admin (`ADMIN_PHONE`, `ADMIN_PIN`) et les paramètres par
défaut. `db:seed` reste réservé à la démo.

### Quotas gratuits et limites

| Ressource | Quota gratuit | Ce que ça couvre |
|---|---|---|
| Neon Free | 1 Go, 100 CU-h/mois, 5 Go réseau | Des dizaines de milliers de commandes ; compute suffisant pour un trafic faible |
| Vercel Hobby | Fonctions, 100 Go bande passante, 2 crons/jour | App, Server Actions, cron quotidien |
| Vercel Blob | 1 Go, 2 000 uploads/mois | ~300 photos à 3 Mo, ~3 000 à 300 Ko |
| Neon veille | Suspension après 5 min | +0,5 à 2 s au premier appel après inactivité |

Points de vigilance :

- **Sauvegardes** : Neon Free offre 6 h de restauration instantanée et 1 snapshot manuel,
  pas de sauvegarde quotidienne automatique. Pour un vrai lancement, faire un `pg_dump`
  hebdomadaire ou passer à Neon Launch.
- **Dépassement** : les quotas gratuits suspendent le service au lieu de facturer.
- **Vercel Hobby** est réservé à un usage non commercial ; passer à Pro quand l'activité
  devient réellement commerciale.
- **Latence** : héberger Neon et les fonctions à Paris (`cdg1`) limite la latence depuis Dakar.

### Alternative VPS

Un VPS Paris avec Docker Compose (app + PostgreSQL + Caddy) coûte ~8–12 €/mois, avec disque
persistant et sauvegardes locales, mais demande l'administration du serveur.

## Limites assumées du MVP / V2

- Paiement Wave / Orange Money **semi-manuel** (confirmation admin) ; API en V2.
- Livraison pilotée manuellement (Yango ou chauffeur) ; API et app chauffeur en V2.
- Pas de géolocalisation temps réel ni d'avis publics (V2).
- Clients particuliers : réglages présents, parcours dédié désactivé au lancement.
- Notifications WhatsApp en file d'attente + envoi manuel, pas encore d'API.
- Photos : Vercel Blob en production, `public/uploads` en local (bascule automatique).
- Le crédit est accordé manuellement, sans score automatique.
- Juridique, fiscalité, CDP et agréments sanitaires sont à valider avant la première vente
  (voir `src/app/legal`).

## Sécurité

- PIN haché (bcrypt), blocage 5 essais, sessions JWT httpOnly.
- Contrôle d'accès par rôle dans chaque espace + vérification de propriété des commandes.
- Aucun numéro échangé entre client et éleveur avant livraison.
- Journal d'activité pour les actions sensibles, exports réservés à l'admin.
- Le service worker ne met jamais en cache les pages authentifiées.
