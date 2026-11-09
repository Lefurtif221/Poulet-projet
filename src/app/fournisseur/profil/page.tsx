import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Alert, Icon } from "@/components/ui";
import { SupplierProfileForm } from "@/components/supplier/profile-form";
import { pauseSupplierAction } from "@/lib/actions/supplier";
import { PendingButton } from "@/components/forms/pending-button";

export const metadata: Metadata = { title: "Mon élevage" };

export default async function SupplierProfilePage() {
  const user = await requireUser("FOURNISSEUR");
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  if (!supplier) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Mon élevage</h1>
        <p className="text-sm text-on-surface-variant">
          Informations visibles par l&apos;administration et utilisées pour vos reversements.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Statut</p>
          <p className="mt-1 flex items-center gap-1.5 font-semibold">
            <span className={`h-2 w-2 rounded-full ${supplier.isOpen ? "bg-primary" : "bg-outline"}`} />
            {supplier.isOpen ? "Réception ouverte" : "Réception fermée"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Compte de paiement</p>
          <p className="mt-1 text-sm font-semibold">
            {supplier.paymentProvider ?? "Non renseigné"} {supplier.paymentAccount ?? ""}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Inscrit le</p>
          <p className="mt-1 text-sm font-semibold">{formatDateTime(supplier.createdAt)}</p>
        </div>
      </div>

      {!supplier.isOpen ? (
        <Alert tone="warning" title="Vous êtes en pause">
          Motif : {supplier.pauseReason ?? "non précisé"}. Vous ne recevez plus de nouvelles commandes.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-4 md:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Informations de l&apos;élevage</h2>
          <SupplierProfileForm supplier={supplier} />
        </section>

        <aside className="space-y-5">
          <section className="card p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="pause_circle" className="text-lg text-primary-container" />
              Déclarer une rupture / pause
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Vous cessez de recevoir des commandes immédiatement. Vous pouvez rouvrir à tout moment.
            </p>
            <form action={pauseSupplierAction} className="mt-3 space-y-2">
              <select name="reason" className="input" defaultValue="Rupture de stock">
                <option value="Rupture de stock">Rupture de stock</option>
                <option value="Pause technique">Pause technique</option>
                <option value="Problème sanitaire">Problème sanitaire</option>
                <option value="Congé / absence">Congé / absence</option>
              </select>
              <PendingButton variant="danger" className="w-full" pendingLabel="Fermeture…">
                <Icon name="pause" className="text-lg" />
                Fermer la réception
              </PendingButton>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="font-display text-base font-semibold">Capacité déclarée</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {supplier.capacity} sujets par semaine. L&apos;administration utilise cette capacité pour
              répartir les commandes et prévoir un éleveur de secours.
            </p>
          </section>

          <section className="card p-4 text-xs text-on-surface-variant">
            <p className="font-semibold text-on-surface">Engagements qualité</p>
            <ul className="mt-2 space-y-1 text-[11px]">
              <li>Poids réel pesé et annoté avant enlèvement.</li>
              <li>Emballage propre et étiqueté (date, élevage).</li>
              <li>Chaîne du froid respectée pour la volaille abattue.</li>
              <li>Prévenir l&apos;administration en cas de problème sanitaire.</li>
            </ul>
          </section>

        </aside>
      </div>
    </div>
  );
}
