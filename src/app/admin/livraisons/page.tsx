import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatFCFA } from "@/lib/format";
import { DeliveryBadge, EmptyState, Icon, StatusBadge, buttonClass } from "@/components/ui";
import { saveDeliveryAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Livraisons" };

export default async function AdminDeliveriesPage() {
  const [active, recent] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["CONFIRMED", "PREPARING", "READY", "IN_DELIVERY"] } },
      include: { client: true, supplier: true, delivery: true },
      orderBy: { deliveryDate: "asc" },
      take: 40,
    }),
    db.order.findMany({
      where: { status: { in: ["DELIVERED", "CLOSED"] }, delivery: { isNot: null } },
      include: { client: true, supplier: true, delivery: true },
      orderBy: { deliveredAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Livraisons</h1>
        <p className="text-sm text-on-surface-variant">
          Saisie manuelle du livreur, de l&apos;heure et du coût réel. Au MVP, Yango Livraison ou un
          chauffeur indépendant.
        </p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="local_shipping" className="text-xl text-primary-container" />
          Tournées à organiser
          <span className="badge bg-secondary-fixed text-on-secondary-container">{active.length}</span>
        </h2>

        {active.length === 0 ? (
          <EmptyState icon="local_shipping" title="Aucune livraison en cours" description="Les commandes prêtes ou confirmées apparaîtront ici." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {active.map((order) => (
              <article key={order.id} className="card border-l-[3px] border-l-secondary-container p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/commandes/${order.id}`} className="font-display text-sm font-bold text-primary-container hover:underline">
                        #{order.reference}
                      </Link>
                      <StatusBadge status={order.status} />
                      {order.delivery ? <DeliveryBadge status={order.delivery.status} /> : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold">
                      {order.supplier.farmName} → {order.client.establishment}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {formatDate(order.deliveryDate)} · {order.deliverySlot} · {order.client.district ?? order.address}
                    </p>
                  </div>
                  <span className="money text-sm">{formatFCFA(order.total)}</span>
                </div>

                <form action={saveDeliveryAction} className="mt-3 grid grid-cols-2 gap-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    name="courierName"
                    defaultValue={order.delivery?.courierName ?? ""}
                    placeholder="Livreur / Yango"
                    className="input h-9 text-xs"
                    aria-label="Livreur"
                  />
                  <input
                    name="courierPhone"
                    defaultValue={order.delivery?.courierPhone ?? ""}
                    placeholder="Téléphone livreur"
                    className="input h-9 text-xs"
                    aria-label="Téléphone livreur"
                  />
                  <input
                    name="cost"
                    type="number"
                    min={0}
                    defaultValue={order.delivery?.cost ?? 0}
                    placeholder="Coût FCFA"
                    className="input h-9 text-xs"
                    aria-label="Coût de livraison"
                  />
                  <select
                    name="status"
                    defaultValue={order.delivery?.status ?? "PENDING"}
                    className="input h-9 text-xs"
                    aria-label="Statut livraison"
                  >
                    <option value="PENDING">À enlever</option>
                    <option value="PICKED_UP">Enlevée</option>
                    <option value="DELIVERED">Livrée</option>
                    <option value="FAILED">Échouée</option>
                  </select>
                  <div className="col-span-2">
                    <button type="submit" className={buttonClass("primary", "sm", "w-full")}>
                      <Icon name="save" className="text-base" />
                      Enregistrer
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="history" className="text-xl text-primary-container" />
          Dernières livraisons
        </h2>
        {recent.length === 0 ? (
          <EmptyState icon="history" title="Aucune livraison clôturée" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Livreur</th>
                  <th>Enlèvement</th>
                  <th>Livraison</th>
                  <th className="text-right">Coût</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/commandes/${order.id}`} className="font-semibold text-primary-container hover:underline">
                        #{order.reference}
                      </Link>
                    </td>
                    <td className="text-xs">{order.client.establishment}</td>
                    <td className="text-xs">
                      {order.delivery?.courierName ?? "—"}
                      <p className="text-[10px] text-on-surface-variant">{order.delivery?.courierPhone ?? ""}</p>
                    </td>
                    <td className="text-xs">{formatDateTime(order.delivery?.pickupAt)}</td>
                    <td className="text-xs">{formatDateTime(order.delivery?.deliveredAt)}</td>
                    <td className="text-right">
                      <span className="money text-xs">{formatFCFA(order.delivery?.cost ?? 0)}</span>
                    </td>
                    <td>{order.delivery ? <DeliveryBadge status={order.delivery.status} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-4 text-xs text-on-surface-variant">
        <p className="flex items-center gap-1.5 font-semibold text-on-surface">
          <Icon name="fact_check" className="text-base text-primary-container" />
          Procédure jour de livraison
        </p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>1. L&apos;éleveur marque « prête » avec photo.</li>
          <li>2. Le livreur enlève et confirme l&apos;enlèvement.</li>
          <li>3. Le client contrôle et confirme, ou signale un problème.</li>
          <li>4. Photo de livraison + heure, puis statut admin.</li>
        </ol>
      </section>
    </div>
  );
}
