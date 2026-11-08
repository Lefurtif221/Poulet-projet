# Déploiement Phase 0 — Vercel + Neon Free + Vercel Blob

Objectif : mettre le MVP en ligne pour les premiers clients, à 0 FCFA/mois hors domaine.
Toutes les commandes Windows PowerShell sont fournies.

## 1. Créer la base Neon (Paris)

1. https://console.neon.tech → **New project**
   - Nom : `guanar-life`
   - Région : **AWS eu-west-3 (Paris)**
   - Version PostgreSQL : celle proposée par défaut
2. Dans **Connection string**, copier deux URL :
   - **Pooled connection** (hôte `...-pooler...`)
   - **Direct connection** (sans `-pooler`)
3. Ajouter les paramètres :
   - `DATABASE_URL` = URL poolée + `?sslmode=require&pgbouncer=true&connect_timeout=15`
   - `DIRECT_URL` = URL directe + `?sslmode=require`
4. Si le mot de passe contient des caractères spéciaux, l'encoder en URL (`@` → `%40`, etc.).

> Ne jamais mettre ces URL dans Git. Le fichier `.env` est ignoré.

## 2. Initialiser la base de production

Depuis le dossier du projet, avec les URL Neon :

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-west-3.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"
$env:DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.eu-west-3.aws.neon.tech/neondb?sslmode=require"
$env:ADMIN_PHONE="+221XXXXXXXXX"
$env:ADMIN_PIN="un-pin-solide-4-a-6-chiffres"
$env:ADMIN_NAME="Administrateur Guanar"

npx prisma migrate deploy
npx tsx prisma/seed-prod.ts
```

Résultat attendu :
- 18 tables créées ;
- un seul compte admin ;
- paramètres par défaut (commission 8 %, livraison 4 000 FCFA, seuil 85 000 FCFA, crédit 7 jours) ;
- aucune donnée de démonstration.

`npm run db:seed` reste réservé au développement local.

## 3. Créer le projet Vercel

1. https://vercel.com → **Add New → Project** → importer `Lefurtif221/Poulet-projet`.
2. Framework : **Next.js** (détecté).
3. Root directory : `./`.
4. Build : laisser Vercel utiliser `vercel-build` du `package.json`
   (`prisma generate && prisma migrate deploy && next build`).
5. Ajouter les variables d'environnement (Production) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL Neon poolée + paramètres |
| `DIRECT_URL` | URL Neon directe |
| `AUTH_SECRET` | secret long et aléatoire |
| `CRON_SECRET` | secret long et aléatoire |
| `BLOB_READ_WRITE_TOKEN` | ajouté automatiquement par le store Blob |

Générer un secret :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 4. Stockage photos (Vercel Blob)

1. Dans le projet Vercel → **Storage → Create Database → Blob**.
2. Nom : `guanar-photos`, accès public.
3. **Connect to project** → sélectionner le projet.
4. Vérifier que `BLOB_READ_WRITE_TOKEN` apparaît dans les variables d'environnement.
5. Redéployer si le store a été ajouté après le premier déploiement.

Limite Hobby : 1 Go et 2 000 uploads/mois. Les photos de litige sont limitées à 3 Mo
côté application.

## 5. Déployer et vérifier

1. **Deploy**. Le build applique la migration sur Neon.
2. Ouvrir `https://<projet>.vercel.app/api/health` → doit renvoyer
   `{"status":"ok","database":"up",...}`.
3. Se connecter sur `/connexion` avec `ADMIN_PHONE` et `ADMIN_PIN`.
4. Vérifier les pages : `/admin`, `/admin/validation`, `/admin/commandes`.
5. Tester le cron manuellement :

```powershell
curl.exe -H "Authorization: Bearer VOTRE_CRON_SECRET" https://<projet>.vercel.app/api/cron/recurring
```

Réponse attendue : `autoClosed`, `count`, `results`. Sans le bon secret : HTTP 401.

## 6. Domaine

- Tester d'abord avec `https://<projet>.vercel.app`.
- Puis Vercel → **Settings → Domains → Add**.
- Chez le registrar : suivre les enregistrements DNS indiqués (A / CNAME).
- HTTPS est généré automatiquement.

## 7. Sauvegardes (Phase 0)

Neon Free fournit 6 h de restauration et 1 snapshot manuel. Pour le pilote :

1. Chaque semaine : Neon → **Branches/Snapshots → Create snapshot**.
2. Ou export local si `pg_dump` est installé :

```powershell
pg_dump "$env:DIRECT_URL" --no-owner --no-privileges -f "backup-$(Get-Date -Format yyyyMMdd).sql"
```

L'automatisation quotidienne est prévue en V2.1.

## 8. Surveillance des quotas

| Où | Quoi surveiller | Seuil |
|---|---|---|
| Neon → Usage | CU-hours | 100 CU-h/projet/mois |
| Neon → Usage | Stockage | 1 Go/projet, 20 Go/compte |
| Vercel → Usage | Bande passante, invocations | quotas Hobby |
| Vercel → Storage | Blob | 1 Go, 2 000 uploads |

Si Neon atteint 100 CU-h : la base se suspend jusqu'au mois suivant (données intactes).
Soulagement : passer à Neon Launch (à l'usage) ou réduire les crons/keep-alive.

## 9. Rollback

- **Application** : Vercel → Deployments → ancien déploiement → **Promote to Production**.
- **Base** : Neon → Restore (fenêtre de 6 h) ou snapshot manuel.

## 10. Checklist avant d'ouvrir aux clients

- [ ] `/api/health` OK
- [ ] Connexion admin OK
- [ ] Un éleveur et un client créés et validés
- [ ] Une commande de test passée de bout en bout
- [ ] Un litige photo testé (upload Blob)
- [ ] Cron testé avec le bon secret
- [ ] Export CSV admin téléchargé
- [ ] Mot de passe admin fort, `AUTH_SECRET` unique
- [ ] Sauvegarde manuelle effectuée
- [ ] Conditions générales et confidentialité relues par un juriste
- [ ] WhatsApp Business / numéro d'assistance renseignés dans Paramètres

## Notes free tier

- Vercel Hobby est prévu pour un usage non commercial ; passer à Pro quand l'activité
  devient commerciale.
- Les quotas gratuits suspendent le service au lieu de facturer.
- La région Paris (`cdg1` pour Vercel, `eu-west-3` pour Neon) limite la latence depuis Dakar.
