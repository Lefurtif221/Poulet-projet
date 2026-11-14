import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatFCFA } from "@/lib/format";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import {
  Card,
  EmptyState,
  Icon,
  PayoutBadge,
  PaymentBadge,
  StatCard,
  buttonClass,
} from "@/components/ui";
import {
  approvePayoutAction,
  createPayoutBatchAction,
  markPayoutPaidAction,
  recordPaymentAction,
  setPayoutStatusAction,
} from "@/lib/actions/admin";
import { PendingButton } from "@/components/forms/pending-button";

export const metadata: Metadata = { title: "Paiements" };

export default async function AdminPaymentsPage() {
  const admin = await requireUser("ADMIN");
  const [payments, payouts, eligibleOrders] = await Promise.all([
    db.payment.findMany({
      include: { order: { include: { client: true, supplier: true } }, client: true, supplier: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.payout.findMany({
      include: {
        supplier: true,
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: { include: { order: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.order.findMany({
      where: { status: "CLOSED", payoutItems: { none: {} } },
      include: { supplier: true, dispute: true },
    }),
  ]);

  const batchMap = new Map<string, { supplierName: string; count: number; amount: number }>();
  for (const order of eligibleOrders) {
    const amount = Math.max(0, order.supplierTotal - (order.dispute?.adjustedAmount ?? 0));
    if (amount <= 0) continue;
    const current = batchMap.get(order.supplierId) ?? {
      supplierName: order.supplier.farmName,
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += amount;
    batchMap.set(order.supplierId, current);
  }
  const batchRows = [...batchMap.entries()].map(([supplierId, value]) => ({ supplierId, ...value }));

  const received = payments.filter((payment) => payment.status === "PAID").reduce((total, payment) => total + payment.amount, 0);
  const pendingClient = payments
    .filter((payment) => ["PENDING", "DECLARED"].includes(payment.status))
    .reduce((total, payment) => total + payment.amount, 0);
  const payableSupplier = payouts
    .filter((payout) => payout.status === "PENDING" || payout.status === "PROCESSING")
    .reduce((total, payout) => total + payout.amount, 0);
  const paidSupplier = payouts.filter((payout) => payout.status === "PAID").reduce((total, payout) => total + payout.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Paiements &amp; reversements</h1>
          <p className="text-sm text-on-surface-variant">
            Confirmer les encaissements clients et payer les éleveurs après livraison validée.
          </p>
        </div>
        <a href="/api/admin/export?type=payments" className={buttonClass("outline", "sm")}>
          <Icon name="download" className="text-base" />
          Export CSV
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Encaissé" value={formatFCFA(received)} icon="check_circle" tone="success" />
        <StatCard label="À encaisser" value={formatFCFA(pendingClient)} icon="hourglass_top" tone="warning" />
        <StatCard label="À reverser aux éleveurs" value={formatFCFA(payableSupplier)} icon="outbox" tone="warning" />
        <StatCard label="Reversé" value={formatFCFA(paidSupplier)} icon="account_balance" />
      </div>

      <Card className="p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Icon name="account_balance" className="text-lg text-primary-container" />
          Préparer un lot de reversement
        </h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          Un lot regroupe toutes les commandes clôturées non encore payées d&apos;un éleveur. Un
          administrateur prépare le lot, un <strong>autre</strong> administrateur l&apos;approuve.
        </p>
        {batchRows.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">Aucune commande éligible pour le moment.</p>
        ) : (
          <div className="mt-3 divide-y divide-outline-variant/25">
            {batchRows.map((row) => (
              <div key={row.supplierId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold">{row.supplierName}</p>
                  <p className="text-[11px] text-on-surface-variant">{row.count} commande(s) éligible(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="money text-sm">{formatFCFA(row.amount)}</span>
                  <form action={createPayoutBatchAction}>
                    <input type="hidden" name="supplierId" value={row.supplierId} />
                    <PendingButton size="sm" pendingLabel="Création…">
                      <Icon name="add" className="text-base" />
                      Préparer le lot
                    </PendingButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="call_received" className="text-xl text-primary-container" />
          Encaissements clients
        </h2>
        {payments.length === 0 ? (
          <EmptyState icon="payments" title="Aucun paiement" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-base min-w-[860px]">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Moyen</th>
                  <th className="text-right">Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th className="text-right">Confirmation</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="text-xs font-semibold">
                      {payment.order ? `#${payment.order.reference}` : "—"}
                    </td>
                    <td className="text-xs">
                      {payment.order?.client.establishment ?? payment.client?.establishment ?? "—"}
                    </td>
                    <td className="text-xs">{PAYMENT_METHOD[payment.method].label}</td>
                    <td className="text-right">
                      <span className="money text-xs">{formatFCFA(payment.amount)}</span>
                    </td>
                    <td>
                      <PaymentBadge status={payment.status} />
                    </td>
                    <td className="text-xs text-on-surface-variant">
                      {formatDate(payment.paidAt ?? payment.createdAt)}
                    </td>
                    <td>
                      {["PENDING", "DECLARED"].includes(payment.status) ? (
                        <form action={recordPaymentAction} className="flex items-center justify-end gap-1.5">
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input
                            name="reference"
                            placeholder="Réf. reçu"
                            className="input h-8 w-28 text-[11px]"
                            aria-label="Référence du paiement"
                          />
                          <PendingButton size="sm" pendingLabel="…">
                            Payé
                          </PendingButton>
                        </form>
                      ) : (
                        <p className="text-right text-[11px] text-on-surface-variant">
                          {payment.reference ?? PAYMENT_STATUS[payment.status].label}
                          {payment.proofUrl ? (
                            <a
                              href={payment.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 font-semibold text-primary-container underline"
                            >
                              Preuve
                            </a>
                          ) : null}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="call_made" className="text-xl text-primary-container" />
          Reversements éleveurs
        </h2>
        {payouts.length === 0 ? (
          <EmptyState icon="account_balance" title="Aucun reversement" description="Ils sont créés après clôture des commandes." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {payouts.map((payout) => (
              <Card key={payout.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold">
                        {payout.reference ?? `RV-${payout.id.slice(-6).toUpperCase()}`}
                      </p>
                      <PayoutBadge status={payout.status} />
                    </div>
                    <p className="mt-1 text-xs font-semibold">{payout.supplier.farmName}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {payout.supplier.paymentProvider ?? "—"} {payout.supplier.paymentAccount ?? ""}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Créé le {formatDate(payout.createdAt)}
                      {payout.items.length > 0 ? ` · ${payout.items.length} commande(s)` : ""}
                    </p>
                    {payout.createdBy ? (
                      <p className="text-[11px] text-on-surface-variant">
                        Préparé par {payout.createdBy.name}
                      </p>
                    ) : null}
                    {payout.approvedBy ? (
                      <p className="text-[11px] text-primary-container">
                        Approuvé par {payout.approvedBy.name} le {formatDate(payout.approvedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="money text-lg">{formatFCFA(payout.amount)}</p>
                  </div>
                </div>

                {payout.items.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-outline-variant/30 pt-2 text-[10px] text-on-surface-variant">
                    {payout.items.map((item) => (
                      <li key={item.id}>#{item.order.reference}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-outline-variant/30 pt-2">
                  {payout.status === "PAID" ? (
                    <p className="text-[11px] font-semibold text-primary-container">
                      Payé le {formatDate(payout.paidAt)}
                      {payout.reference ? ` · ${payout.reference}` : ""}
                    </p>
                  ) : (
                    <>
                      {payout.status === "PENDING" ? (
                        payout.createdById && payout.createdById === admin.id ? (
                          <p className="w-full text-[11px] text-amber-700">
                            Lot préparé par vous : un autre administrateur doit l&apos;approuver.
                          </p>
                        ) : (
                          <form action={approvePayoutAction}>
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <PendingButton size="sm" pendingLabel="Approbation…">
                              <Icon name="check" className="text-base" />
                              Approuver le lot
                            </PendingButton>
                          </form>
                        )
                      ) : null}

                      {payout.status === "PROCESSING" ? (
                        <form action={markPayoutPaidAction} className="flex flex-1 items-center gap-1.5">
                          <input type="hidden" name="payoutId" value={payout.id} />
                          <input
                            name="reference"
                            placeholder="Réf. virement"
                            className="input h-9 min-w-40 flex-1 text-[11px]"
                            aria-label="Référence du virement"
                          />
                          <PendingButton size="sm" pendingLabel="Envoi…">
                            <Icon name="check" className="text-base" />
                            Marquer payé
                          </PendingButton>
                        </form>
                      ) : null}

                      <form action={setPayoutStatusAction}>
                        <input type="hidden" name="payoutId" value={payout.id} />
                        <input type="hidden" name="status" value={payout.status === "BLOCKED" ? "PENDING" : "BLOCKED"} />
                        <PendingButton variant="outline" size="sm" className={payout.status === "BLOCKED" ? "" : "text-[#a8421a]"} pendingLabel="…">
                          {payout.status === "BLOCKED" ? "Débloquer" : "Bloquer"}
                        </PendingButton>
                      </form>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card className="p-4 text-xs text-on-surface-variant">
        <p className="flex items-center gap-1.5 font-semibold text-on-surface">
          <Icon name="security" className="text-base text-primary-container" />
          Sécurité des fonds
        </p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>Aucun reversement sans commande clôturée.</li>
          <li>Double validation recommandée au-delà de 500 000 FCFA.</li>
          <li>Journal financier non modifiable pour chaque opération.</li>
          <li>Rapprochement hebdomadaire compte marchand / application.</li>
        </ul>
      </Card>
    </div>
  );
}
