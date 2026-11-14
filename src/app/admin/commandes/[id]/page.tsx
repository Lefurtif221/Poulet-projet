import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatFCFA, formatPhone } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, PRODUCT_UNIT } from "@/lib/labels";
import {
  Alert,
  ButtonLink,
  Card,
  DeliveryBadge,
  Icon,
  StatusBadge,
} from "@/components/ui";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { PendingButton } from "@/components/forms/pending-button";
import {
  changeOrderStatusAction,
  reassignOrderAction,
  recordPaymentAction,
  resolveDisputeAction,
  saveDeliveryAction,
  setOrderPaymentLinkAction,
} from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Détail commande" };

type Params = Promise<{ id: string }>;

const MANUAL_STATUSES = [
  "CONFIRMED",
  "PREPARING",
  "READY",
  "IN_DELIVERY",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
  "REFUSED",
] as const;

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [order, suppliers] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        client: { include: { user: true } },
        supplier: { include: { user: true } },
        items: true,
        delivery: true,
        dispute: true,
        payments: true,
      },
    }),
    db.supplier.findMany({
      where: { user: { status: "ACTIVE" } },
      orderBy: { farmName: "asc" },
      select: { id: true, farmName: true, location: true },
    }),
  ]);
  if (!order) notFound();

  const payment = order.payments[0];
  const logs = await db.activityLog.findMany({
    where: { entity: "Order", entityId: order.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-5">
      <Link href="/admin/commandes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container">
        <Icon name="arrow_back" className="text-lg" />
        Retour aux commandes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">#{order.reference}</h1>
            <StatusBadge status={order.status} />
            {order.paymentStatus === "PAID" ? (
              <span className="badge bg-green-50 text-green-700">Règlement reçu</span>
            ) : (
              <span className="badge bg-amber-50 text-amber-700">Règlement en attente</span>
            )}
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {order.client.establishment} → {order.supplier.farmName} · {formatDate(order.deliveryDate)} ·{" "}
            {order.deliverySlot}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/facture/${order.id}`} variant="outline" size="sm">
            <Icon name="description" className="text-base" />
            Facture
          </ButtonLink>
        </div>
      </div>

      {order.status === "SENT" && order.acceptDeadline < new Date() ? (
        <Alert tone="danger" title="Délai de réponse éleveur dépassé">
          Réassignez la commande à un autre éleveur ou confirmez-la manuellement.
        </Alert>
      ) : null}

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
          <Icon name="route" className="text-lg text-primary-container" />
          Traçabilité
        </h2>
        <OrderTimeline order={order} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
              <h2 className="font-display text-base font-semibold">Lots commandés</h2>
              <span className="badge bg-surface-container text-on-surface-variant">{order.items.length}</span>
            </div>
            <div className="overflow-x-auto">
            <table className="table-base min-w-[520px]">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="text-right">Qté</th>
                  <th className="text-right">Livré</th>
                  <th className="text-right">P.U. client</th>
                  <th className="text-right">P.U. éleveur</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-[11px] text-on-surface-variant">{PRODUCT_UNIT[item.unit]}</p>
                    </td>
                    <td className="text-right tabular-nums">{item.quantity}</td>
                    <td className="text-right tabular-nums">{item.quantityDelivered ?? "—"}</td>
                    <td className="text-right tabular-nums">{formatFCFA(item.unitPrice)}</td>
                    <td className="text-right tabular-nums">{formatFCFA(item.supplierUnitPrice)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatFCFA(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="grid gap-1 border-t border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs sm:grid-cols-2">
              <span className="text-on-surface-variant">Sous-total client</span>
              <span className="text-right">{formatFCFA(order.subtotal)}</span>
              <span className="text-on-surface-variant">Commission plateforme ({(order.commissionRate).toFixed(1)} %)</span>
              <span className="text-right">{formatFCFA(order.commissionAmount)}</span>
              <span className="text-on-surface-variant">Part éleveur</span>
              <span className="text-right">{formatFCFA(order.supplierTotal)}</span>
              <span className="text-on-surface-variant">Livraison</span>
              <span className="text-right">{order.deliveryFee === 0 ? "Offerte" : formatFCFA(order.deliveryFee)}</span>
              <span className="font-semibold text-on-surface">Total client</span>
              <span className="money text-right">{formatFCFA(order.total)}</span>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="edit_note" className="text-lg text-primary-container" />
              Actions administrateur
            </h2>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <form action={changeOrderStatusAction} className="space-y-2 rounded-lg border border-outline-variant/40 p-3">
                <input type="hidden" name="orderId" value={order.id} />
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Changer le statut
                </p>
                <select name="status" className="input" defaultValue={order.status}>
                  {MANUAL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS[status].label}
                    </option>
                  ))}
                </select>
                <PendingButton size="sm" className="w-full" pendingLabel="Application…">
                  <Icon name="sync_alt" className="text-base" />
                  Appliquer
                </PendingButton>
              </form>

              <form action={reassignOrderAction} className="space-y-2 rounded-lg border border-outline-variant/40 p-3">
                <input type="hidden" name="orderId" value={order.id} />
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Réassigner à un éleveur
                </p>
                <select name="supplierId" className="input" defaultValue={order.supplierId}>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.farmName} — {supplier.location}
                    </option>
                  ))}
                </select>
                <PendingButton variant="secondary" size="sm" className="w-full" pendingLabel="Réassignation…">
                  <Icon name="swap_horiz" className="text-base" />
                  Réassigner
                </PendingButton>
              </form>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="local_shipping" className="text-lg text-primary-container" />
              Livraison
              {order.delivery ? <DeliveryBadge status={order.delivery.status} /> : null}
            </h2>
            <form action={saveDeliveryAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className="field-label" htmlFor="courierName">
                  Livreur
                </label>
                <input
                  id="courierName"
                  name="courierName"
                  defaultValue={order.delivery?.courierName ?? ""}
                  placeholder="Moussa Diop / Yango"
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="courierPhone">
                  Téléphone livreur
                </label>
                <input
                  id="courierPhone"
                  name="courierPhone"
                  defaultValue={order.delivery?.courierPhone ?? ""}
                  placeholder="+221…"
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="cost">
                  Coût réel (FCFA)
                </label>
                <input
                  id="cost"
                  name="cost"
                  type="number"
                  min={0}
                  defaultValue={order.delivery?.cost ?? 0}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="status">
                  Statut livraison
                </label>
                <select id="status" name="status" className="input" defaultValue={order.delivery?.status ?? "PENDING"}>
                  <option value="PENDING">À enlever</option>
                  <option value="PICKED_UP">Enlevée</option>
                  <option value="DELIVERED">Livrée</option>
                  <option value="FAILED">Échouée</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <PendingButton size="sm" className="w-full" pendingLabel="Enregistrement…">
                  <Icon name="save" className="text-base" />
                  Enregistrer la livraison
                </PendingButton>
              </div>
            </form>
          </Card>

          {order.dispute ? (
            <Card className="border-l-[3px] border-l-[#a8421a] p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#862a01]">
                <Icon name="gavel" className="text-lg" />
                Litige · {order.dispute.reason}
              </h2>
              {order.dispute.description ? (
                <p className="mt-1 text-sm text-on-surface-variant">{order.dispute.description}</p>
              ) : null}
              {order.dispute.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.dispute.photoUrl}
                  alt="Preuve du litige"
                  className="mt-2 max-h-48 rounded-lg border border-outline-variant/40 object-cover"
                />
              ) : null}
              {order.dispute.status === "OPEN" ? (
                <form action={resolveDisputeAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="disputeId" value={order.dispute.id} />
                  <div>
                    <label className="field-label" htmlFor="decision">
                      Décision
                    </label>
                    <select id="decision" name="decision" className="input">
                      <option value="NO_ACTION">Aucune action (rejet)</option>
                      <option value="REPLACEMENT">Remplacement</option>
                      <option value="CREDIT_NOTE">Avoir sur prochaine commande</option>
                      <option value="PARTIAL_REFUND">Remboursement partiel</option>
                      <option value="FULL_REFUND">Remboursement total</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="adjustedAmount">
                      Déduction éleveur (FCFA)
                    </label>
                    <input id="adjustedAmount" name="adjustedAmount" type="number" min={0} defaultValue={0} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="adminNote">
                      Note interne
                    </label>
                    <input id="adminNote" name="adminNote" className="input" placeholder="Constat, accord des parties…" />
                  </div>
                  <div className="sm:col-span-2">
                    <PendingButton variant="danger" size="sm" className="w-full" pendingLabel="Clôture…">
                      <Icon name="gavel" className="text-base" />
                      Trancher et clôturer
                    </PendingButton>
                  </div>
                </form>
              ) : (
                <Alert tone="success">
                  Litige traité · décision {order.dispute.decision} · déduction{" "}
                  {formatFCFA(order.dispute.adjustedAmount)}
                </Alert>
              )}
            </Card>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5">
          <Card className="p-4">
            <h2 className="font-display text-base font-semibold">Client</h2>
            <p className="mt-1 text-sm font-semibold">{order.client.establishment}</p>
            <p className="text-xs text-on-surface-variant">
              {order.client.activityType ?? "Activité non précisée"} · {order.client.district ?? "Zone non précisée"}
            </p>
            <p className="text-xs text-on-surface-variant">{order.address}</p>
            <p className="mt-2 text-xs">{formatPhone(order.client.user.phone)}</p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Crédit : {formatFCFA(order.client.creditLimit)} · encours {formatFCFA(order.client.balanceDue)}
            </p>
            <Link href={`/admin/credit?client=${order.clientId}`} className="link mt-2 inline-block text-xs">
              Ajuster le crédit
            </Link>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-base font-semibold">Éleveur</h2>
            <p className="mt-1 text-sm font-semibold">{order.supplier.farmName}</p>
            <p className="text-xs text-on-surface-variant">{order.supplier.location}</p>
            <p className="mt-2 text-xs">{formatPhone(order.supplier.user.phone)}</p>
            <p className="text-[11px] text-on-surface-variant">
              Paiement : {order.supplier.paymentProvider ?? "—"} {order.supplier.paymentAccount ?? ""}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-base font-semibold">Paiement client</h2>
            <div className="mt-2 space-y-1 text-xs">
              <p>
                <span className="text-on-surface-variant">Moyen : </span>
                {PAYMENT_METHOD[order.paymentMethod].label}
              </p>
              <p>
                <span className="text-on-surface-variant">Statut : </span>
                {payment ? PAYMENT_STATUS[payment.status].label : "—"}
              </p>
              {order.creditDueDate ? (
                <p>
                  <span className="text-on-surface-variant">Échéance : </span>
                  {formatDate(order.creditDueDate)}
                </p>
              ) : null}
              {payment?.reference ? (
                <p>
                  <span className="text-on-surface-variant">Référence : </span>
                  {payment.reference}
                </p>
              ) : null}
              {payment?.declaredAt ? (
                <p>
                  <span className="text-on-surface-variant">Déclaré le : </span>
                  {formatDateTime(payment.declaredAt)}
                </p>
              ) : null}
            </div>

            {payment?.proofUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={payment.proofUrl}
                alt="Preuve de paiement"
                className="mt-2 max-h-48 w-full rounded-lg border border-outline-variant/40 object-cover"
              />
            ) : null}

            <form action={setOrderPaymentLinkAction} className="mt-3 space-y-2 border-t border-outline-variant/30 pt-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="field-label" htmlFor="paymentLink">
                Lien Wave de cette commande
              </label>
              <input
                id="paymentLink"
                name="paymentLink"
                type="url"
                defaultValue={order.paymentLink ?? ""}
                placeholder="https://pay.wave.com/…"
                className="input h-9 text-xs"
              />
              <PendingButton variant="outline" size="sm" className="w-full" pendingLabel="Enregistrement…">
                <Icon name="save" className="text-base" />
                Enregistrer le lien Wave
              </PendingButton>
              <p className="text-[10px] text-on-surface-variant">
                Crée le lien dans Wave Business pour le montant exact, puis colle-le ici. Le client
                verra un bouton « Payer avec Wave ».
              </p>
            </form>

            {payment && ["PENDING", "DECLARED"].includes(payment.status) ? (
              <form action={recordPaymentAction} className="mt-3 space-y-2 border-t border-outline-variant/30 pt-3">
                <input type="hidden" name="paymentId" value={payment.id} />
                <input
                  name="reference"
                  defaultValue={payment.reference ?? ""}
                  className="input h-9 text-xs"
                  placeholder="Réf. Wave / OM / reçu"
                />
                <PendingButton size="sm" className="w-full" pendingLabel="Confirmation…">
                  <Icon name="check_circle" className="text-base" />
                  Marquer comme payé
                </PendingButton>
              </form>
            ) : payment?.status === "PAID" ? (
              <Alert tone="success">Paiement confirmé.</Alert>
            ) : null}
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="history" className="text-lg text-primary-container" />
              Journal de la commande
            </h2>
            <ul className="mt-2 space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="text-[11px]">
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-on-surface-variant">{formatDateTime(log.createdAt)}</p>
                </li>
              ))}
              {logs.length === 0 ? <li className="text-[11px] text-on-surface-variant">Aucune entrée.</li> : null}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
