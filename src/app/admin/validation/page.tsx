import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime, formatPhone } from "@/lib/format";
import { ROLE } from "@/lib/labels";
import { EmptyState, Icon } from "@/components/ui";
import { approveUserAction, refuseUserAction } from "@/lib/actions/admin";
import { PendingButton } from "@/components/forms/pending-button";

export const metadata: Metadata = { title: "Validation des comptes" };

export default async function AdminValidationPage() {
  const pending = await db.user.findMany({
    where: { status: "PENDING" },
    include: { client: true, supplier: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Validation des comptes</h1>
        <p className="text-sm text-on-surface-variant">
          Vérifiez chaque demande (appel, visite ou référence) avant d&apos;activer l&apos;accès.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon="verified_user"
          title="Aucune demande en attente"
          description="Les nouvelles inscriptions clients pro et éleveurs apparaîtront ici."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pending.map((user) => {
            const isSupplier = user.role === "FOURNISSEUR";
            const client = user.client;
            const supplier = user.supplier;
            return (
              <article key={user.id} className="card border-l-[3px] border-l-secondary-container p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-bold">
                        {isSupplier ? supplier?.farmName : client?.establishment}
                      </p>
                      <span className="badge bg-surface-container text-on-surface-variant">
                        {ROLE[user.role]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{user.name}</p>
                    <p className="text-xs text-on-surface-variant">{formatPhone(user.phone)}</p>
                  </div>
                  <span className="badge bg-amber-50 text-amber-700">En attente</span>
                </div>

                <dl className="mt-3 grid gap-2 rounded-lg bg-surface-container-low p-3 text-xs sm:grid-cols-2">
                  {isSupplier ? (
                    <>
                      <div>
                        <dt className="text-on-surface-variant">Localisation</dt>
                        <dd className="font-semibold">{supplier?.location}</dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Capacité</dt>
                        <dd className="font-semibold">{supplier?.capacity} sujets/semaine</dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Type d&apos;élevage</dt>
                        <dd className="font-semibold">{supplier?.farmType ?? "Non précisé"}</dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Paiement</dt>
                        <dd className="font-semibold">
                          {supplier?.paymentProvider ?? "—"} {supplier?.paymentAccount ?? ""}
                        </dd>
                      </div>
                      {supplier?.description ? (
                        <div className="sm:col-span-2">
                          <dt className="text-on-surface-variant">Présentation</dt>
                          <dd>{supplier.description}</dd>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div>
                        <dt className="text-on-surface-variant">Activité</dt>
                        <dd className="font-semibold">{client?.activityType ?? "Non précisé"}</dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Zone</dt>
                        <dd className="font-semibold">{client?.district ?? "Non précisée"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-on-surface-variant">Adresse de livraison</dt>
                        <dd className="font-semibold">{client?.address}</dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">NINEA</dt>
                        <dd className="font-semibold">{client?.ninea ?? "Non fourni"}</dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt className="text-on-surface-variant">Demande reçue</dt>
                    <dd className="font-semibold">{formatDateTime(user.createdAt)}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={approveUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <PendingButton pendingLabel="Validation…">
                      <Icon name="check" className="text-lg" />
                      Approuver le compte
                    </PendingButton>
                  </form>
                  <form action={refuseUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <PendingButton variant="outline" className="text-[#a8421a]" pendingLabel="Refus…">
                      <Icon name="close" className="text-lg" />
                      Refuser
                    </PendingButton>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="card p-4 text-xs text-on-surface-variant">
        <p className="flex items-center gap-1.5 font-semibold text-on-surface">
          <Icon name="fact_check" className="text-base text-primary-container" />
          Checklist avant validation
        </p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>Éleveur : visite ou référence vérifiée, capacité réelle confirmée.</li>
          <li>Éleveur : numéro de paiement (Wave ou mobile money) confirmé par appel.</li>
          <li>Client : établissement joignable, adresse de livraison précise.</li>
          <li>Client : crédit non activé à l&apos;inscription (activation séparée).</li>
        </ul>
      </section>
    </div>
  );
}
