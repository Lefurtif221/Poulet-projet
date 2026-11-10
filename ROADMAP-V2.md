# Plan V2 — SunuVolaille

## 1. Principe directeur

Pas de V2 « au calendrier » : chaque chantier est déclenché par un seuil mesuré pendant le pilote.
Tant que le MVP n'a pas 4 semaines de données réelles, on ne code pas de nouvelle fonctionnalité.

Règle : **une fonctionnalité = un problème mesuré + un seuil + un critère d'acceptation.**

> Décision : **les paiements en ligne (Wave/OM/carte via API) sont reportés en V3.**
> En V2, les paiements restent manuels : Wave/OM vers le compte marchand, espèces à la livraison,
> crédit validé par l'admin. On améliore le suivi et le rapprochement, pas l'encaissement automatique.

---

## 2. État actuel du MVP

Déployé sur https://sunuvolaille.vercel.app

| Brique | État |
|---|---|
| Application | Next.js 15 sur Vercel (`cdg1`) |
| Base | PostgreSQL Neon Frankfurt (`eu-central-1`) |
| Photos | Vercel Blob Paris |
| Auth | Téléphone + PIN, rôles, blocage 5 essais |
| Client | Catalogue, panier, commande, paiement manuel, suivi, litige, crédit, facture, récurrentes |
| Éleveur | Commandes, acceptation 2 h, préparation, prêt à enlever, produits, stocks, reversements |
| Admin | Validation, utilisateurs, catalogue, commandes, commissions, crédit, livraisons, paiements, litiges, notifications, journal, exports |
| Automatisations | Cron quotidien (récurrentes + clôture 24 h), file de notifications |
| Limites assumées | Paiements manuels, WhatsApp manuel, livraison manuelle, pas de particuliers, pas de GPS, pas d'avis |

---

## 3. Les chantiers V2 (sans paiement en ligne)

### V2.0 — Fiabiliser (P0, à démarrer tout de suite)

Objectif : pouvoir encaisser et livrer sans risque opérationnel.

| # | Fonction | Pourquoi | Effort |
|---|---|---|---|
| 0.1 | Sauvegarde quotidienne chiffrée + test de restauration mensuel | Neon Free n'offre que 6 h de restauration | 2 j |
| 0.2 | Monitoring : Sentry, uptime, alertes cron/impayés | Détecter avant le client | 1 j |
| 0.3 | CI GitHub Actions : typecheck, lint, build, E2E | Éviter les régressions | 1 j |
| 0.4 | Staging : branche Git + branche Neon + variables Preview | Tester sans toucher la production | 1 j |
| 0.5 | Rate limiting login/actions + 2FA admin | Sécurité des comptes | 2 j |
| 0.6 | Facture PDF serveur + numérotation | Comptabilité | 2 j |
| 0.7 | Upload photo produit (Blob) au lieu d'une URL | Utilisable par les éleveurs | 1 j |
| 0.8 | Preuve de paiement manuelle (référence + capture) | Wave/OM restent manuels mais traçables | 1 j |
| 0.9 | Poids/quantité livrés + ajustement facture | Écarts de poids fréquents | 2 j |
| 0.10 | CGU/CGV, contrats éleveurs, CDP, assurance | Vendre légalement | externe |

**Critère de sortie** : une commande réelle peut être payée manuellement, livrée, facturée, sauvegardée et auditée sans intervention technique.

### V2.1 — Réduire le manuel (P0/P1)

Déclencheurs : **> 100 notifications/semaine**, **> 15 min d'admin par commande**.

| # | Fonction | Détail |
|---|---|---|
| 1.1 | WhatsApp Business API | Templates commande, confirmation, prête, livrée, paiement, crédit |
| 1.2 | Opt-in et heures de silence | Conformité, pas de messages entre 21 h et 6 h |
| 1.3 | File d'envoi automatique | Reprise sur échec, statut envoyé/échoué |
| 1.4 | Relances crédit automatiques | J-2, jour J, J+3, blocage J+7 |
| 1.5 | Reçus et relevés | Reçu de paiement, relevé de crédit |
| 1.6 | Clôture de caisse quotidienne | Espèces, Wave, OM, crédit |
| 1.7 | Lots de reversements éleveurs | Préparer un lot, double validation, marquer payé |
| 1.8 | Journal financier non modifiable | Traçabilité comptable |

### V2.2 — Logistique (P1)

Déclencheurs : **> 20 livraisons/semaine**, retards > 10 %, ou plus de 2 livreurs.

| # | Fonction | Détail |
|---|---|---|
| 2.1 | API Yango / prestataire livraison | Création de course, suivi, webhook |
| 2.2 | Application chauffeur (PWA d'abord) | Enlèvement, photo, signature, échec |
| 2.3 | Preuve de livraison | Photo + heure + température |
| 2.4 | Tournées groupées | Regrouper les clients d'un quartier |
| 2.5 | Frais par zone + créneaux capacitaires | Éviter la survente de créneaux |
| 2.6 | Suivi client | ETA, retard, annulation sans frais |
| 2.7 | Échec de livraison | Procédure, retour, remboursement |
| 2.8 | GPS temps réel | **Après** l'app chauffeur |

### V2.3 — Crédit, qualité et croissance (P1/P2)

| # | Fonction | Déclencheur |
|---|---|---|
| 3.1 | Score de crédit simple (historique, retards, litiges) | 3 mois de données |
| 3.2 | Plafond suggéré automatiquement | 3 mois de données |
| 3.3 | Scorecard éleveur interne | 100 commandes livrées |
| 3.4 | Avis internes client/éleveur | 100 commandes livrées |
| 3.5 | Favoris + listes de commande | Retours clients |
| 3.6 | Commandes groupées B2B | Densité de clients |
| 3.7 | Clients particuliers P1–P6 | Retards pros < 15 % |
| 3.8 | Autres produits (poisson, légumes, viande) | Rétention stable volaille |
| 3.9 | Wolof vocal / messages vocaux | Retours utilisateurs |

---

## 4. V3 — Paiements et automatisation financière

À ouvrir seulement quand le volume et la demande le justifient.

Déclencheurs : **> 30 paiements/semaine**, **> 10 reversements/semaine**, ou plus de 2 h/jour de rapprochement manuel.

| # | Fonction |
|---|---|
| 4.1 | Paiement Wave / Orange Money / carte via agrégateur (PayDunya, PayTech, CinetPay) |
| 4.2 | Webhooks et confirmation automatique |
| 4.3 | Rapprochement automatique paiement ↔ commande |
| 4.4 | Remboursements et avoirs automatiques |
| 4.5 | Reversements éleveurs automatisés par lot |
| 4.6 | Relevés de crédit et relances sans intervention |
| 4.7 | Export comptable automatisé |
| 4.8 | Score de crédit enrichi, financement éleveurs, prévision de demande |
| 4.9 | Autres villes (Thiès, Mbour, Saint-Louis) |

Décisions à prendre avant V3 : frais, couverture Wave/OM, webhooks, délais de reversement, KYC, contrat agrégateur.

---

## 5. Backlog priorisé

| Priorité | Chantier | Impact | Effort | Quand |
|---|---|---|---|---|
| P0 | V2.0 fiabilisation | Évite perte d'argent/données | 2–3 sem. | Maintenant |
| P0 | WhatsApp API | Réactivité éleveurs | 1–2 sem. | 100 msg/sem. |
| P0 | Suivi manuel des paiements | Encaissement traçable | 1 sem. | Maintenant |
| P1 | Crédit : relevés + relances | Impayés < 2 % | 2 sem. | 10 clients crédit |
| P1 | Yango API + preuve livraison | Ponctualité > 90 % | 3–4 sem. | 20 livraisons/sem. |
| P1 | App chauffeur PWA | Contrôle qualité | 3 sem. | API livraison en place |
| P2 | Particuliers | Volume + écoulement | 4–6 sem. | Retards < 15 % |
| P2 | Avis/scorecards | Qualité | 2 sem. | 100 commandes |
| P3 | Paiement API, reversements auto | Réduction du manuel | 4–6 sem. | **V3**, > 30 paiements/sem. |
| P3 | Autres produits/villes | Croissance | 6+ sem. | V3 |

---

## 6. Plan des 90 premiers jours

### Semaines 1–2 — Fiabiliser
Sauvegardes, monitoring, CI, staging, rate limiting, 2FA admin, facture PDF, photos produits, preuve de paiement manuelle.
Objectif : aucune commande réelle ne peut être perdue.

### Semaines 3–4 — Réduire le manuel
WhatsApp API, templates, relances crédit, reçus/relevés, clôture de caisse, ajustement poids/quantité.
Objectif : moins de 15 min d'admin par commande.

### Semaines 5–8 — Logistique
Yango/prestataire, preuve de livraison, tournées groupées, frais par zone, échecs de livraison.
Objectif : 90 % à l'heure, retards sous contrôle.

### Semaines 9–12 — Crédit et qualité
Score de crédit simple, scorecards éleveurs, avis internes, favoris, améliorations issues du terrain.
Objectif : impayés < 2 %, rétention > 60 %.

> Les semaines sont des hypothèses. Les déclencheurs priment : si le volume n'est pas là, on ne code pas.

---

## 7. KPI et alertes à suivre chaque semaine

| Indicateur | Seuil sain | Action si dépassé |
|---|---|---|
| Commandes livrées à l'heure | ≥ 90 % | Geler le recrutement, revoir les créneaux |
| Taux de litige | < 3 % | Audit qualité éleveur |
| Taux d'acceptation éleveur | ≥ 85 % | Réassignation, suspension |
| Impayés > échéance | < 2 % du CA | Bloquer le crédit, relancer |
| Marge nette | > 2 % du CA | Ajuster commission/livraison |
| Rétention client | ≥ 60 % à 2 mois | Parler aux clients avant de coder |
| Panier moyen | à suivre | Fixer la commande minimum |
| Coût livraison / commission | < 50 % | Négocier ou facturer |
| Temps de confirmation éleveur | < 2 h | Alerte + réassignation |

Tableau de bord admin V2 : cohortes, encours par ancienneté, marge par commande, scorecard éleveur, délais de livraison, coût réel par course.

---

## 8. Décisions à prendre avant les chantiers

1. **WhatsApp** : Meta Cloud API directe ou BSP ? Coût par template, validation des modèles, opt-in.
2. **Livraison** : Yango, Yassir, Gozem ou chauffeurs indépendants ? Zone, tarif, assurance, preuve.
3. **Crédit** : plafond global que l'on accepte de perdre, procédure de recouvrement, document signé.
4. **Sauvegardes** : Neon Launch (PITR) ou dump quotidien vers R2/stockage objet.
5. **Juridique** : statut, TVA, CDP, hygiène, contrats éleveurs/clients.
6. **Qualité** : tolérance poids, seuil œufs cassés, procédure de remplacement.
7. **Paiement en ligne** : reporté en V3, à comparer le moment venu.

---

## 9. Definition of Done V2

Une fonctionnalité V2 est terminée seulement si :

- testée en staging puis en production ;
- couverte par un test E2E si elle touche une commande, un paiement ou un crédit ;
- journalisée (audit) ;
- monitorée (erreur + alerte) ;
- documentée dans le README/DEPLOY ;
- réversible (feature flag ou rollback) ;
- sans impact sur la sécurité des données personnelles.

---

## 10. Hors périmètre V2 (plus tard)

- Paiement en ligne et reversements automatiques → **V3**.
- Application mobile native (la PWA suffit jusqu'à preuve du contraire).
- ML/IA de prévision avant 1 an de données.
- Multi-pays.
- Marketplace ouverte à tous les éleveurs sans validation.
- Paiement par carte international.
- Comptes particuliers avant stabilité logistique.
