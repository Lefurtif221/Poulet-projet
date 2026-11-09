import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDateLong, formatDateTime, formatFCFA, formatPhone } from "@/lib/format";
import { PAYMENT_METHOD, PRODUCT_UNIT } from "@/lib/labels";
import {
  Alert,
  ButtonLink,
  Icon,
  PaymentBadge,
  StatusBadge,
} from "@/components/ui";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { DisputeForm } from "@/components/orders/dispute-form";
import { cancelOrderAction, confirmReceiptAction, reorderAction } from "@/lib/actions/orders";
import { PendingButton } from "@/components/forms/pending-button";

export const metadata: Metadata = { title: "Suivi de commande" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireUser("CLIENT");
  const { id } = await params;
  const query = await searchParams;
  const [order, settings] = await Promise.all([
    db.order.findFirst({
      where: { id, client: { userId: user.sub } },
      include: { supplier: true, items: true, delivery: true, dispute: true, payments: true },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const payment = order.payments[0];
  const isCredit = order.paymentMethod === "CREDIT";
  const alertError = first(query.erreur);

  return (
    <div className="space-y-5">
      {query.nouvelle ? (
        <Alert tone="success" title="Commande envoyée à l'éleveur">
          Référence {order.reference}. Vous serez notifié dès qu&apos;elle est confirmée (délai 2 h).
        </Alert>
      ) : null}
      {query.confirmee ? (
        <Alert tone="success" title="Réception confirmée">
          Merci. Le paiement de l&apos;éleveur est lancé et la commande est clôturée.
        </Alert>
      ) : null}
      {query.annulee ? <Alert tone="warning">Commande annulée. Les stocks ont été remis à disposition.</Alert> : null}
      {alertError ? <Alert tone="danger">{alertError}</Alert> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">#{order.reference}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {order.supplier.farmName} · {order.supplier.location} · {formatDateLong(order.deliveryDate)} ·{" "}
            {order.deliverySlot}
          </p>
          <p className="text-xs text-on-surface-variant">{order.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "SENT" ? (
            <form action={cancelOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <PendingButton variant="outline" pendingLabel="Annulation…">
                <Icon name="close" className="text-lg" />
                Annuler
              </PendingButton>
            </form>
          ) : null}
          {["CLOSED", "DELIVERED", "CANCELLED"].includes(order.status) ? (
            <form action={reorderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <PendingButton variant="outline" pendingLabel="Création…">
                <Icon name="replay" className="text-lg" />
                Recommander
              </PendingButton>
            </form>
          ) : null}
          {["CLOSED", "DELIVERED", "DISPUTED"].includes(order.status) ? (
            <ButtonLink href={`/client/facture/${order.id}`} variant="outline">
              <Icon name="description" className="text-lg" />
              Facture
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Icon name="route" className="text-lg text-primary-container" />
            Chaîne de traçabilité
          </h2>
          <span className="text-[11px] text-on-surface-variant">
            Créneau souscrit : {order.deliverySlot}
          </span>
        </div>
        <OrderTimeline order={order} />
        {order.status === "DISPUTED" ? (
          <div className="mt-3">
            <Alert tone="danger" title="Litige en cours d'arbitrage">
              Le paiement de l&apos;éleveur est suspendu. L&apos;administrateur tranche sous 48 h.
            </Alert>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
              <h2 className="font-display text-base font-semibold">Détail des lots</h2>
              <span className="badge bg-surface-container text-on-surface-variant">
                {order.items.length} lot(s)
              </span>
            </div>
            <div className="divide-y divide-outline-variant/25">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{item.productName}</p>
                    <p className="text-xs text-on-surface-variant">
                      {item.quantity} × {PRODUCT_UNIT[item.unit]} · {formatFCFA(item.unitPrice)} l&apos;unité
                      {item.quantityDelivered != null && item.quantityDelivered !== item.quantity
                        ? ` · livré : ${item.quantityDelivered}`
                        : ""}
                    </p>
                  </div>
                  <span className="money text-sm">{formatFCFA(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Sous-total</span>
                <span>{formatFCFA(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Livraison</span>
                <span>{order.deliveryFee === 0 ? "Offerte" : formatFCFA(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="money text-lg">{formatFCFA(order.total)}</span>
              </div>
            </div>
          </section>

          {order.note ? (
            <section className="card p-4">
              <h2 className="font-display text-base font-semibold">Note transmise à l&apos;éleveur</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{order.note}</p>
            </section>
          ) : null}

          {order.delivery?.courierName ? (
            <section className="card p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon name="local_shipping" className="text-lg text-primary-container" />
                Livraison
              </h2>
              <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-on-surface-variant">Livreur : </span>
                  {order.delivery.courierName}
                </p>
                <p>
                  <span className="text-on-surface-variant">Enlèvement : </span>
                  {formatDateTime(order.delivery.pickupAt)}
                </p>
                <p>
                  <span className="text-on-surface-variant">Livraison : </span>
                  {formatDateTime(order.delivery.deliveredAt)}
                </p>
              </div>
            </section>
          ) : null}

          {order.status === "DELIVERED" ? (
            <section className="card p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon name="fact_check" className="text-lg text-primary-container" />
                Contrôle de réception
              </h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Vous avez 24 h pour signaler un problème. Sans signalement, la commande est clôturée
                automatiquement et l&apos;éleveur est payé.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <form action={confirmReceiptAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <PendingButton className="w-full" pendingLabel="Confirmation…">
                    <Icon name="check_circle" className="text-lg" />
                    Tout est conforme
                  </PendingButton>
                </form>
                <div className="rounded-lg border border-[#a8421a]/30 bg-[#a8421a]/5 px-3 py-2 text-xs text-[#862a01]">
                  <p className="font-semibold">Un problème ?</p>
                  <p>Ouvrez un litige ci-dessous avec photo.</p>
                </div>
              </div>
            </section>
          ) : null}

          {order.status === "DELIVERED" || (order.dispute && order.status === "DISPUTED") ? (
            <section className="card p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#862a01]">
                <Icon name="report" className="text-lg" />
                Signaler un problème
              </h2>
              {order.dispute ? (
                <div className="mt-2 space-y-2 text-sm">
                  <Alert tone="danger" title={`Litige ${order.dispute.status === "OPEN" ? "ouvert" : "traité"}`}>
                    Motif : {order.dispute.reason}
                    {order.dispute.decision ? ` · Décision : ${order.dispute.decision}` : ""}
                  </Alert>
                  {order.dispute.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.dispute.photoUrl}
                      alt="Preuve du litige"
                      className="max-h-56 rounded-lg border border-outline-variant/40 object-cover"
                    />
                  ) : null}
                </div>
              ) : (
                <div className="mt-2">
                  <DisputeForm orderId={order.id} />
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="card overflow-hidden">
            <div className="border-b border-outline-variant/30 px-4 py-3">
              <h2 className="font-display text-base font-semibold">Règlement</h2>
            </div>
            <div className="space-y-3 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Mode</span>
                <span className="font-semibold">{PAYMENT_METHOD[order.paymentMethod].label}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Statut</span>
                {payment ? <PaymentBadge status={payment.status} /> : <span>—</span>}
              </div>
              {isCredit ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-on-surface-variant">Échéance</span>
                    <span className="font-semibold">{formatDateTime(order.creditDueDate)}</span>
                  </div>
                  <Alert tone="warning">
                    Montant ajouté à votre encours : {formatFCFA(order.total)}. Réglez avant
                    l&apos;échéance pour conserver votre crédit.
                  </Alert>
                </>
              ) : null}
              {order.paymentMethod === "WAVE" && payment?.status === "PENDING" ? (
                <Alert tone="info">
                  Envoyez {formatFCFA(order.total)} au compte Wave marchand{" "}
                  <strong>{formatPhone(settings.waveNumber)}</strong> en indiquant la référence{" "}
                  {order.reference}.
                </Alert>
              ) : null}
              {order.paymentMethod === "ORANGE_MONEY" && payment?.status === "PENDING" ? (
                <Alert tone="info">
                  Envoyez {formatFCFA(order.total)} au compte Orange Money{" "}
                  <strong>{formatPhone(settings.orangeMoneyNumber)}</strong> en indiquant la référence{" "}
                  {order.reference}.
                </Alert>
              ) : null}
              {order.paymentMethod === "CASH_ON_DELIVERY" ? (
                <Alert tone="info">À régler au livreur à la réception : {formatFCFA(order.total)}.</Alert>
              ) : null}
              <ButtonLink href={`/client/facture/${order.id}`} variant="outline" className="w-full">
                <Icon name="download" className="text-lg" />
                Facture / bon de livraison
              </ButtonLink>
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-display text-base font-semibold">Éleveur</h2>
            <p className="mt-1 text-sm font-semibold">{order.supplier.farmName}</p>
            <p className="text-xs text-on-surface-variant">{order.supplier.location}</p>
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Les coordonnées directes de l&apos;éleveur ne sont pas communiquées avant la livraison.
              Toute la coordination passe par la plateforme.
            </p>
          </section>

          <section className="card p-4">
            <h2 className="font-display text-base font-semibold">Assistance</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Un retard de plus de 30 minutes ? Contactez-nous, la livraison peut être annulée sans frais.
            </p>
            <a
              href={`tel:${settings.supportPhone.replace(/\s/g, "")}`}
              className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary-container"
            >
              <Icon name="call" className="text-lg" />
              {formatPhone(settings.supportPhone)}
            </a>
            <Link href="/client/commandes" className="link mt-2 inline-block text-xs">
              Retour à mes commandes
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
