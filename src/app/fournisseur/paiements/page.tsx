import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatFCFA } from "@/lib/format";
import { PayoutBadge, ButtonLink, EmptyState, Icon, StatCard, buttonClass } from "@/components/ui";
import { requestPayoutAction } from "@/lib/actions/supplier";

export const metadata: Metadata = { title: "Reversements" };

export default async function SupplierPaymentsPage() {
  const user = await requireUser("FOURNISSEUR");
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  if (!supplier) return null;

  const [payouts, eligibleOrders] = await Promise.all([
    db.payout.findMany({
      where: { supplierId: supplier.id },
      include: { items: { include: { order: { include: { client: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: { supplierId: supplier.id, status: "CLOSED", payoutItems: { none: {} } },
      include: { items: true },
    }),
  ]);

  const paid = payouts.filter((payout) => payout.status === "PAID").reduce((total, payout) => total + payout.amount, 0);
  const pending = payouts
    .filter((payout) => payout.status === "PENDING" || payout.status === "PROCESSING")
    .reduce((total, payout) => total + payout.amount, 0);
  const eligible = eligibleOrders.reduce((total, order) => total + order.supplierTotal, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Reversements</h1>
        <p className="text-sm text-on-surface-variant">
          Suivi des montants dus, payés et des demandes de virement.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total reversé" value={formatFCFA(paid)} icon="check_circle" tone="success" />
        <StatCard label="En attente de virement" value={formatFCFA(pending + eligible)} icon="schedule" tone="warning" />
        <StatCard
          label="Compte de paiement"
          value={supplier.paymentProvider ?? "—"}
          hint={supplier.paymentAccount ?? "À renseigner dans votre profil"}
          icon="account_balance"
        />
      </div>

      {eligible > 0 ? (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-l-[3px] border-l-secondary-container p-4">
          <div>
            <p className="font-display text-sm font-semibold">Reversement disponible</p>
            <p className="text-xs text-on-surface-variant">
              {eligibleOrders.length} commande(s) clôturée(s) sans litige en attente de virement.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="money text-xl">{formatFCFA(eligible)}</span>
            <form action={requestPayoutAction}>
              <button type="submit" className={buttonClass("primary")}>
                <Icon name="send" className="text-lg" />
                Demander le virement
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="history" className="text-xl text-primary-container" />
            Historique des reversements
          </h2>
          <ButtonLink href="/fournisseur/profil" variant="outline" size="sm">
            <Icon name="edit" className="text-base" />
            Modifier mon compte
          </ButtonLink>
        </div>

        {payouts.length === 0 ? (
          <EmptyState
            icon="account_balance"
            title="Aucun reversement pour l'instant"
            description="Les reversements sont créés après confirmation de livraison par le client."
          />
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <article key={payout.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold">{payout.reference ?? `RV-${payout.id.slice(-6).toUpperCase()}`}</p>
                      <PayoutBadge status={payout.status} />
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Demandé le {formatDate(payout.createdAt)}
                      {payout.paidAt ? ` · payé le ${formatDate(payout.paidAt)}` : ""}
                    </p>
                  </div>
                  <span className="money text-lg">{formatFCFA(payout.amount)}</span>
                </div>

                {payout.items.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-outline-variant/30 pt-2 text-[11px] text-on-surface-variant">
                    {payout.items.map((item) => (
                      <li key={item.id}>
                        #{item.order.reference} · {item.order.client.establishment} · {formatFCFA(item.amount)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-display text-base font-semibold">Comment ça marche</h2>
        <ul className="mt-2 space-y-1.5 text-xs text-on-surface-variant">
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            Le client confirme la réception (ou la commande est clôturée automatiquement après 24 h).
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            Un reversement est créé pour le prix éleveur des quantités réellement livrées.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            En cas de litige, le paiement de la commande concernée est suspendu jusqu&apos;à décision.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            Virement par Wave ou Orange Money sur le compte confirmé dans votre profil.
          </li>
        </ul>
      </section>
    </div>
  );
}
