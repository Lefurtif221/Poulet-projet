import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateLong, formatFCFA } from "@/lib/format";
import { PAYMENT_METHOD, PRODUCT_UNIT } from "@/lib/labels";
import {
  Alert,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  StatCard,
  StatusBadge,
  buttonClass,
} from "@/components/ui";
import { RefuseOrderForm } from "./refuse-order-form";
import { PendingButton } from "@/components/forms/pending-button";
import {
  acceptOrderAction,
  markReadyAction,
  quickStockAction,
  requestPayoutAction,
  startPreparingAction,
} from "@/lib/actions/supplier";

export const metadata: Metadata = { title: "Espace fournisseur" };

export default async function SupplierDashboard() {
  const user = await requireUser("FOURNISSEUR");
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  if (!supplier) return null;

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [todayOrders, pending, inProgress, recent, products, payouts, monthOrders, recentHistory] =
    await Promise.all([
      db.order.count({
        where: { supplierId: supplier.id, deliveryDate: { gte: startOfDay, lt: endOfDay }, status: { notIn: ["CANCELLED", "REFUSED"] } },
      }),
      db.order.findMany({
        where: { supplierId: supplier.id, status: "SENT" },
        include: { items: true, client: true },
        orderBy: { acceptDeadline: "asc" },
      }),
      db.order.findMany({
        where: { supplierId: supplier.id, status: { in: ["CONFIRMED", "PREPARING"] } },
        include: { items: true, client: true, delivery: true },
        orderBy: { deliveryDate: "asc" },
        take: 12,
      }),
      db.order.findMany({
        where: { supplierId: supplier.id, status: { in: ["READY", "IN_DELIVERY", "DELIVERED"] } },
        include: { items: true, client: true },
        orderBy: { readyAt: "desc" },
        take: 6,
      }),
      db.product.findMany({
        where: { supplierId: supplier.id, active: true },
        orderBy: { createdAt: "desc" },
      }),
      db.payout.findMany({
        where: { supplierId: supplier.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.order.aggregate({
        where: {
          supplierId: supplier.id,
          status: { in: ["CLOSED", "DELIVERED"] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { supplierTotal: true },
        _count: true,
      }),
      db.order.findMany({
        where: { supplierId: supplier.id, createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
        select: { status: true },
      }),
    ]);

  const pendingPayout = payouts
    .filter((payout) => payout.status === "PENDING" || payout.status === "PROCESSING")
    .reduce((total, payout) => total + payout.amount, 0);
  const totalHandled = recentHistory.length;
  const refused = recentHistory.filter((order) => order.status === "REFUSED").length;
  const acceptanceRate = totalHandled === 0 ? 100 : Math.round(((totalHandled - refused) / totalHandled) * 100);

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 badge ${supplier.isOpen ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"}`}>
              <span className={`h-2 w-2 rounded-full ${supplier.isOpen ? "bg-primary" : "bg-outline"}`} />
              {supplier.isOpen ? "Exploitation ouverte" : "Réception fermée"}
            </span>
            <span className="badge bg-surface-container text-on-surface-variant">
              <Icon name="verified" className="text-sm" />
              Compte vérifié
            </span>
            <span className="badge bg-amber-50 text-amber-800">
              <Icon name="schedule" className="text-sm" />
              Validation des commandes sous 2 h
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">{supplier.farmName}</h1>
            <p className="text-xs text-on-surface-variant">
              {supplier.location} · capacité {supplier.capacity} sujets/semaine
            </p>
          </div>
          <ButtonLink href="/fournisseur/profil" variant="outline" size="sm">
            <Icon name="settings" className="text-base" />
            Gérer l&apos;élevage
          </ButtonLink>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commandes du jour" value={todayOrders} hint="Livraisons programmées aujourd'hui" icon="today" />
        <StatCard
          label="À accepter"
          value={pending.length}
          hint={pending.length > 0 ? "Délai de réponse 2 h" : "Aucune demande en attente"}
          icon="notifications_active"
          tone={pending.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="CA du mois"
          value={formatFCFA(monthOrders._sum.supplierTotal ?? 0)}
          hint={`${monthOrders._count} commande(s) livrée(s)`}
          icon="payments"
          tone="success"
        />
        <StatCard
          label="Reversements à venir"
          value={formatFCFA(pendingPayout)}
          hint={`Taux d'acceptation ${acceptanceRate} %`}
          icon="account_balance"
          tone={pendingPayout > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name="notifications_active" className="text-xl text-primary-container" />
                Nouvelles attributions
              </h2>
              <span className="badge bg-secondary-fixed text-on-secondary-container">{pending.length}</span>
            </div>

            {pending.length === 0 ? (
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="check_circle" className="text-lg text-primary-container" />
                  Aucune commande en attente. Vous êtes à jour.
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {pending.map((order) => {
                  const minutesLeft = order.acceptDeadline
                    ? Math.max(0, Math.round((order.acceptDeadline.getTime() - Date.now()) / 60000))
                    : 0;
                  return (
                    <Card key={order.id} className="border-l-[3px] border-l-secondary-container p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-sm font-bold">#{order.reference}</p>
                            <StatusBadge status={order.status} />
                            <span className="badge bg-amber-50 text-amber-700">
                              Reste {minutesLeft} min
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold">{order.client.establishment}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            {formatDateLong(order.deliveryDate)} · {order.deliverySlot} · {order.items.length} lot(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Revenu garanti
                          </p>
                          <p className="money text-lg">{formatFCFA(order.supplierTotal)}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {PAYMENT_METHOD[order.paymentMethod].label}
                          </p>
                        </div>
                      </div>

                      <ul className="mt-2 grid gap-1 rounded-lg bg-surface-container-low p-2.5 text-xs sm:grid-cols-2">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-2">
                            <span className="text-on-surface-variant">
                              {item.quantity} × {item.productName}
                              {item.preparation === "PLUCKED" ? " · Déplumé" : ""}
                            </span>
                            <span className="money">{formatFCFA(item.supplierUnitPrice * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex flex-wrap items-start gap-2">
                        <form action={acceptOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <PendingButton pendingLabel="Acceptation…">
                            <Icon name="check" className="text-lg" />
                            Accepter la commande
                          </PendingButton>
                        </form>
                        <details className="w-full sm:w-auto">
                          <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-sm font-semibold text-[#a8421a]">
                            <Icon name="close" className="text-lg" />
                            Refuser
                          </summary>
                          <div className="mt-2">
                            <RefuseOrderForm orderId={order.id} />
                          </div>
                        </details>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Icon name="inventory" className="text-xl text-primary-container" />
              Commandes en préparation
            </h2>
            {inProgress.length === 0 ? (
              <EmptyState icon="inventory_2" title="Aucune commande à préparer" description="Les commandes acceptées apparaîtront ici." />
            ) : (
              <div className="space-y-3">
                {inProgress.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-sm font-bold">#{order.reference}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-1 text-xs font-semibold">{order.client.establishment}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {formatDateLong(order.deliveryDate)} · {order.deliverySlot}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">{order.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="money text-base">{formatFCFA(order.supplierTotal)}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {order.paymentMethod === "CREDIT" ? "Crédit B2B" : PAYMENT_METHOD[order.paymentMethod].label}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity} × {item.productName}
                          {item.preparation === "PLUCKED" ? " · Déplumé" : ""}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      {order.status === "CONFIRMED" ? (
                        <form action={startPreparingAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <PendingButton variant="outline" size="sm" pendingLabel="Préparation…">
                            <Icon name="pending_actions" className="text-base" />
                            Commencer la préparation
                          </PendingButton>
                        </form>
                      ) : null}
                      <form action={markReadyAction} className="flex flex-1 flex-wrap items-center gap-2">
                        <input type="hidden" name="orderId" value={order.id} />
                        <input
                          name="photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="input h-10 max-w-52 text-xs file:mr-2 file:rounded file:border-0 file:bg-surface-container file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                        />
                        <PendingButton size="sm" pendingLabel="Enregistrement…">
                          <Icon name="photo_camera" className="text-base" />
                          Marquer prêt à enlever
                        </PendingButton>
                      </form>
                    </div>
                    <p className="mt-1 text-[10px] text-on-surface-variant">
                      La photo et l&apos;heure de disponibilité sont transmises au livreur et à
                      l&apos;administrateur.
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Icon name="local_shipping" className="text-xl text-primary-container" />
              Enlèvements récents
            </h2>
            {recent.length === 0 ? (
              <EmptyState icon="local_shipping" title="Aucun enlèvement récent" />
            ) : (
              <Card className="divide-y divide-outline-variant/25">
                {recent.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold">#{order.reference}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {order.client.establishment} · {formatDate(order.deliveryDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      <span className="money text-xs">{formatFCFA(order.supplierTotal)}</span>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon name="inventory_2" className="text-lg text-primary-container" />
                Stocks disponibles
              </h2>
              <ButtonLink href="/fournisseur/produits" variant="ghost" size="sm">
                Gérer
              </ButtonLink>
            </div>
            {products.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-on-surface-variant">Aucun produit actif.</p>
                <ButtonLink href="/fournisseur/produits/nouveau" className={buttonClass("primary", "md", "mt-2 w-full")}>
                  <Icon name="add" className="text-lg" />
                  Publier un produit
                </ButtonLink>
              </Card>
            ) : (
              <Card className="divide-y divide-outline-variant/25">
                {products.map((product) => (
                  <div key={product.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold">{product.name}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {formatFCFA(product.price)} / {PRODUCT_UNIT[product.unit]}
                        </p>
                      </div>
                      <span className={`badge ${product.stock <= 0 ? "bg-red-50 text-red-700" : product.stock < 30 ? "bg-amber-50 text-amber-700" : "bg-primary-fixed text-primary"}`}>
                        {product.stock}
                      </span>
                    </div>
                    <form action={quickStockAction} className="mt-1.5 flex items-center gap-1.5">
                      <input type="hidden" name="productId" value={product.id} />
                      <input
                        name="stock"
                        type="number"
                        min={0}
                        defaultValue={product.stock}
                        className="input h-9 w-20 text-xs"
                        aria-label={`Stock de ${product.name}`}
                      />
                      <PendingButton variant="outline" size="sm" pendingLabel="Mise à jour…">
                        Mettre à jour
                      </PendingButton>
                    </form>
                  </div>
                ))}
              </Card>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-outline-variant/30 px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon name="account_balance" className="text-lg text-primary-container" />
                Reversements &amp; trésorerie
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-primary-container p-3 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-fixed">
                    Dispo à reverser
                  </p>
                  <p className="money mt-1 text-lg">{formatFCFA(pendingPayout)}</p>
                </div>
                <div className="rounded-lg bg-surface-container p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    En attente
                  </p>
                  <p className="money mt-1 text-lg">{formatFCFA(pendingPayout)}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-on-surface-variant">
                Paiement par Wave ou Orange Money vers le compte enregistré dans votre profil.
              </p>
              <form action={requestPayoutAction} className="mt-3">
                <PendingButton className="w-full" pendingLabel="Envoi…">
                  <Icon name="send" className="text-lg" />
                  Demander un reversement
                </PendingButton>
              </form>
              <ButtonLink href="/fournisseur/paiements" variant="ghost" size="sm" className="mt-1 w-full">
                Historique des reversements
              </ButtonLink>
            </div>
          </section>

          {!supplier.isOpen ? (
            <Alert tone="warning" title="Réception fermée">
              Vous ne recevez plus de nouvelles commandes. {supplier.pauseReason ?? ""}
            </Alert>
          ) : null}

          <Card className="p-4">
            <h2 className="font-display text-base font-semibold">Rappel qualité</h2>
            <ul className="mt-2 space-y-1.5 text-[11px] text-on-surface-variant">
              <li className="flex gap-1.5">
                <Icon name="check" className="text-sm text-primary-container" />
                Poids réel pesé et annoté avant l&apos;enlèvement.
              </li>
              <li className="flex gap-1.5">
                <Icon name="check" className="text-sm text-primary-container" />
                Emballage propre, étiquette avec date et nom de l&apos;élevage.
              </li>
              <li className="flex gap-1.5">
                <Icon name="check" className="text-sm text-primary-container" />
                Volaille abattue transportée au frais (+2 °C / +4 °C).
              </li>
              <li className="flex gap-1.5">
                <Icon name="check" className="text-sm text-primary-container" />
                Œufs : plateaux calés, casse tolérée 3 %.
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
