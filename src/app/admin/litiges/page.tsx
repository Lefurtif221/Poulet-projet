import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatFCFA } from "@/lib/format";
import { DisputeBadge, EmptyState, Icon, StatusBadge, buttonClass } from "@/components/ui";
import { resolveDisputeAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Litiges" };

export default async function AdminDisputesPage() {
  const disputes = await db.dispute.findMany({
    include: {
      order: { include: { client: true, supplier: true, items: true, payments: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const open = disputes.filter((dispute) => dispute.status === "OPEN");
  const closed = disputes.filter((dispute) => dispute.status !== "OPEN");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Arbitrage des litiges</h1>
        <p className="text-sm text-on-surface-variant">
          Décision sous 48 h. Le paiement de l&apos;éleveur reste suspendu jusqu&apos;à la clôture.
        </p>
      </div>

      {open.length === 0 ? (
        <EmptyState
          icon="gavel"
          title="Aucun litige ouvert"
          description="Les signalements clients avec photo apparaîtront ici."
        />
      ) : (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="report" className="text-xl text-[#862a01]" />
            À trancher
            <span className="badge bg-red-50 text-red-700">{open.length}</span>
          </h2>
          {open.map((dispute) => (
            <article key={dispute.id} className="card border-l-[3px] border-l-[#a8421a] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/commandes/${dispute.orderId}`}
                      className="font-display text-sm font-bold text-primary-container hover:underline"
                    >
                      #{dispute.order.reference}
                    </Link>
                    <DisputeBadge status={dispute.status} />
                    <StatusBadge status={dispute.order.status} />
                  </div>
                  <p className="mt-1 text-xs font-semibold">{dispute.reason}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {dispute.order.client.establishment} · {dispute.order.supplier.farmName} · ouvert le{" "}
                    {formatDateTime(dispute.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="money text-base">{formatFCFA(dispute.order.total)}</p>
                  <p className="text-[10px] text-on-surface-variant">Montant commande</p>
                </div>
              </div>

              {dispute.description ? (
                <p className="mt-2 rounded-lg bg-surface-container-low p-2.5 text-xs text-on-surface-variant">
                  {dispute.description}
                </p>
              ) : null}

              <div className="mt-2 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                {dispute.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dispute.photoUrl}
                    alt="Preuve du litige"
                    className="max-h-48 w-full rounded-lg border border-outline-variant/40 object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-outline-variant/60 text-[11px] text-on-surface-variant">
                    Aucune photo fournie
                  </div>
                )}

                <form action={resolveDisputeAction} className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="disputeId" value={dispute.id} />
                  <div>
                    <label className="field-label" htmlFor={`decision-${dispute.id}`}>
                      Décision
                    </label>
                    <select id={`decision-${dispute.id}`} name="decision" className="input text-xs">
                      <option value="NO_ACTION">Rejet (aucune action)</option>
                      <option value="REPLACEMENT">Remplacement</option>
                      <option value="CREDIT_NOTE">Avoir prochaine commande</option>
                      <option value="PARTIAL_REFUND">Remboursement partiel</option>
                      <option value="FULL_REFUND">Remboursement total</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor={`amount-${dispute.id}`}>
                      Déduction éleveur (FCFA)
                    </label>
                    <input
                      id={`amount-${dispute.id}`}
                      name="adjustedAmount"
                      type="number"
                      min={0}
                      defaultValue={0}
                      className="input text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor={`note-${dispute.id}`}>
                      Note d&apos;arbitrage
                    </label>
                    <input
                      id={`note-${dispute.id}`}
                      name="adminNote"
                      placeholder="Constat, échange avec les parties…"
                      className="input text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" className={buttonClass("danger", "sm", "w-full")}>
                      <Icon name="gavel" className="text-base" />
                      Trancher et clôturer
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="history" className="text-xl text-primary-container" />
            Litiges traités
          </h2>
          <div className="card overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Motif</th>
                  <th>Décision</th>
                  <th className="text-right">Déduction</th>
                  <th>Clôturé le</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((dispute) => (
                  <tr key={dispute.id}>
                    <td>
                      <Link href={`/admin/commandes/${dispute.orderId}`} className="font-semibold text-primary-container hover:underline">
                        #{dispute.order.reference}
                      </Link>
                    </td>
                    <td className="text-xs">{dispute.reason}</td>
                    <td className="text-xs">{dispute.decision ?? "—"}</td>
                    <td className="text-right">
                      <span className="money text-xs">{formatFCFA(dispute.adjustedAmount)}</span>
                    </td>
                    <td className="text-xs text-on-surface-variant">{formatDate(dispute.resolvedAt)}</td>
                    <td>
                      <DisputeBadge status={dispute.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="card p-4 text-xs text-on-surface-variant">
        <p className="flex items-center gap-1.5 font-semibold text-on-surface">
          <Icon name="fact_check" className="text-base text-primary-container" />
          Procédure d&apos;arbitrage
        </p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>1. Client ouvre le litige avec photo sous 24 h.</li>
          <li>2. Paiement éleveur suspendu pour cette commande.</li>
          <li>3. Admin contacte les deux parties et tranche sous 48 h.</li>
          <li>4. Décision tracée : remplacement, avoir, remboursement ou déduction.</li>
        </ol>
      </section>
    </div>
  );
}
