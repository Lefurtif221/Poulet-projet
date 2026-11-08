import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité" };

export default function LegalPrivacyPage() {
  return (
    <article className="card p-5 md:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Politique de confidentialité</h1>
      <p className="mt-1 text-xs text-on-surface-variant">Version de lancement · à faire valider par un juriste</p>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-on-surface-variant">
        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">Données collectées</h2>
          <p className="mt-1">
            Identité du responsable, raison sociale, numéro de téléphone, adresse de livraison, quartier,
            type d&apos;activité, NINEA le cas échéant, historique des commandes, paiements, encours de
            crédit et photos transmises lors d&apos;un litige.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">Finalités</h2>
          <p className="mt-1">
            Exécution des commandes et livraisons, gestion du crédit et des paiements, prévention de la
            fraude, service client, obligations comptables et légales.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">Partage</h2>
          <p className="mt-1">
            L&apos;éleveur reçoit uniquement les informations nécessaires à la préparation et à la
            livraison. Aucune coordonnée directe n&apos;est échangée entre client et éleveur avant la
            livraison. Les prestataires de paiement et de livraison reçoivent les données strictement
            nécessaires.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">Sécurité et conservation</h2>
          <p className="mt-1">
            Les PIN sont stockés de façon chiffrée. Les échanges sont protégés par HTTPS. Les sauvegardes
            sont quotidiennes et conservées trente jours. Les données sont conservées pendant la durée de
            la relation commerciale, puis selon les obligations légales et comptables.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">Vos droits</h2>
          <p className="mt-1">
            Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données, ainsi
            que la limitation de leur traitement, en contactant l&apos;administrateur de la plateforme.
            Une réclamation peut être adressée à la Commission de protection des données personnelles
            (CDP) du Sénégal.
          </p>
        </section>

        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          À vérifier avec un juriste : déclaration préalable auprès de la CDP, mentions d&apos;information
          et consentement à l&apos;inscription, lieu d&apos;hébergement des données et durée de
          conservation après fermeture d&apos;un compte.
        </p>
      </div>
    </article>
  );
}
