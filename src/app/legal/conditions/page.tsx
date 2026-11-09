import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales" };

export default function LegalTermsPage() {
  return (
    <article className="card p-5 md:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Conditions générales d&apos;utilisation</h1>
      <p className="mt-1 text-xs text-on-surface-variant">Version de lancement · à faire valider par un juriste</p>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-on-surface-variant">
        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">1. Objet</h2>
          <p className="mt-1">
            SunuVolaille met en relation des éleveurs avicoles vérifiés et des clients professionnels
            (restaurants, fast-foods, traiteurs, hôtels, cantines) pour la vente de poulets et d&apos;œufs
            à Dakar et dans les Niayes. La plateforme organise la commande, la livraison, le paiement et
            le crédit.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">2. Comptes et validation</h2>
          <p className="mt-1">
            Chaque compte est identifié par un numéro de téléphone et un code PIN personnel. Les comptes
            clients professionnels et éleveurs sont activés après vérification par l&apos;administration.
            Le PIN ne doit jamais être partagé. Après cinq tentatives erronées, le compte est
            temporairement bloqué.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">3. Commandes et prix</h2>
          <p className="mt-1">
            L&apos;éleveur fixe son prix de vente. La plateforme ajoute sa commission et affiche un prix
            final unique au client. Un prix modifié ne s&apos;applique qu&apos;aux nouvelles commandes.
            L&apos;éleveur dispose de deux heures pour accepter une commande ; à défaut, elle peut être
            réassignée.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">4. Annulation</h2>
          <p className="mt-1">
            Le client annule sans frais avant la confirmation de l&apos;éleveur. Après confirmation,
            l&apos;annulation reste possible jusqu&apos;à une heure limite ; au-delà, des frais peuvent
            s&apos;appliquer. Trois annulations d&apos;un éleveur après confirmation entraînent un
            avertissement puis une suspension.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">5. Paiement et crédit</h2>
          <p className="mt-1">
            Les moyens acceptés sont Wave, Orange Money, le paiement à la livraison et le crédit B2B.
            Le crédit n&apos;est jamais automatique : il est accordé par l&apos;administration avec un
            plafond et un délai. Tout retard peut entraîner le blocage du crédit et des commandes à
            crédit jusqu&apos;au règlement.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">6. Qualité, poids et litiges</h2>
          <p className="mt-1">
            Le client contrôle la marchandise à la réception. Le prix est ajusté au poids réel livré dans
            une tolérance de 5 %. Les œufs cassés au-delà de 3 % sont remboursés ou remplacés. Tout
            problème doit être signalé avec photo dans le délai indiqué ; l&apos;administration tranche
            sous 48 heures.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">7. Non-contournement</h2>
          <p className="mt-1">
            Pendant une période de douze mois à compter de la première mise en relation, les parties
            s&apos;interdisent de conclure directement des transactions initiées par la plateforme, hors
            accord écrit. Une pénalité peut être appliquée en cas de contournement.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-on-surface">8. Données personnelles</h2>
          <p className="mt-1">
            Les données collectées servent exclusivement à la gestion des commandes, du crédit et de la
            relation commerciale. Les coordonnées directes de l&apos;éleveur et du client ne sont pas
            échangées avant la livraison. Le traitement est déclaré conformément à la réglementation
            sénégalaise applicable.
          </p>
        </section>

        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          Ce document est un modèle de travail. Il doit être relu et validé par un juriste avant la
          première vente, notamment sur le statut de la plateforme, la TVA, le crédit et les obligations
          sanitaires.
        </p>
      </div>
    </article>
  );
}
