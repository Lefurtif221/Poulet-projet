import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatFCFA } from "@/lib/format";
import {
  Alert,
  ButtonLink,
  Card,
  Icon,
  ProgressBar,
  StatCard,
  StatusBadge,
  buttonClass,
} from "@/components/ui";

export const metadata: Metadata = { title: "Cockpit administrateur" };

export default async function AdminDashboard() {
  await requireUser("ADMIN");

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    todayGmv,
    monthGmv,
    monthOrders,
    lateAccept,
    pendingUsers,
    openDisputes,
    openDisputeList,
    overdueCredit,
    creditClients,
    activeOrders,
  ] = await Promise.all([
    db.order.aggregate({
      where: { createdAt: { gte: startOfDay }, status: { notIn: ["CANCELLED", "REFUSED"] } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: { notIn: ["CANCELLED", "REFUSED"] } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ["DELIVERED", "CLOSED", "DISPUTED"] },
      },
      include: { delivery: true },
    }),
    db.order.count({ where: { status: "SENT", acceptDeadline: { lt: now } } }),
    db.user.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.dispute.findMany({
      where: { status: "OPEN" },
      include: { order: { include: { client: true, supplier: true } } },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    db.order.aggregate({
      where: {
        creditDueDate: { lt: now },
        status: { notIn: ["CANCELLED", "REFUSED"] },
        payments: {
          some: { method: "CREDIT", status: { in: ["PENDING", "DECLARED"] } },
        },
      },
      _sum: { creditAmount: true },
      _count: true,
    }),
    db.client.findMany({
      where: { creditLimit: { gt: 0 } },
      orderBy: { balanceDue: "desc" },
      take: 5,
    }),
    db.order.findMany({
      where: { status: { in: ["SENT", "CONFIRMED", "PREPARING", "READY", "IN_DELIVERY", "DELIVERED", "DISPUTED"] } },
      include: { client: true, supplier: true, delivery: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const commission = monthOrders.reduce((total, order) => total + order.commissionAmount, 0);
  const deliveryCost = monthOrders.reduce((total, order) => total + (order.delivery?.cost ?? 0), 0);
  const paymentFees = monthOrders.reduce(
    (total, order) =>
      total + (["WAVE", "ORANGE_MONEY"].includes(order.paymentMethod) ? Math.round(order.total * 0.01) : 0),
    0
  );
  const netMargin = commission - deliveryCost - paymentFees;
  const marginRate = (monthGmv._sum.total ?? 0) > 0 ? (netMargin / (monthGmv._sum.total ?? 1)) * 100 : 0;

  const delivered = monthOrders.filter((order) => order.status === "DELIVERED" || order.status === "CLOSED");
  const onTime = delivered.filter(
    (order) => order.deliveredAt && order.deliveredAt.getTime() <= order.deliveryDate.getTime() + 24 * 60 * 60 * 1000
  ).length;
  const punctuality = delivered.length > 0 ? Math.round((onTime / delivered.length) * 100) : 100;

  const gmvMonth = monthGmv._sum.total ?? 0;
  const overdueAmount = overdueCredit._sum.creditAmount ?? 0;
  const overdueRate = gmvMonth > 0 ? (overdueAmount / gmvMonth) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="badge bg-primary-fixed text-primary">
            <Icon name="wifi_tethering" className="text-sm" />
            Supervision opérationnelle
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
            Cockpit de pilotage SunuVolaille
          </h1>
          <p className="text-sm text-on-surface-variant">
            GMV, marge, ponctualité, impayés et arbitrage des litiges en un seul écran.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/api/admin/export?type=orders" variant="outline" size="sm">
            <Icon name="download" className="text-base" />
            Export commandes (CSV)
          </ButtonLink>
          <ButtonLink href="/admin/validation" size="sm">
            <Icon name="how_to_reg" className="text-base" />
            Valider les comptes ({pendingUsers})
          </ButtonLink>
        </div>
      </div>

      {pendingUsers > 0 ? (
        <Alert tone="info" title={`${pendingUsers} demande(s) d'inscription en attente`}>
          Validez les clients pro et les éleveurs après vérification pour activer leur accès.{" "}
          <Link href="/admin/validation" className="font-semibold underline">
            Ouvrir la file de validation
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="GMV du jour"
          value={formatFCFA(todayGmv._sum.total ?? 0)}
          hint={`${todayGmv._count} commande(s)`}
          icon="trending_up"
        />
        <StatCard label="GMV du mois" value={formatFCFA(gmvMonth)} hint={`${monthGmv._count} commande(s)`} icon="bar_chart" />
        <StatCard
          label="Marge nette du mois"
          value={formatFCFA(netMargin)}
          hint={`${marginRate.toFixed(1)} % du GMV · seuil > 2 %`}
          icon="savings"
          tone={marginRate >= 2 ? "success" : "danger"}
        />
        <StatCard
          label="Ponctualité"
          value={`${punctuality} %`}
          hint={`${delivered.length} commande(s) contrôlée(s)`}
          icon="schedule"
          tone={punctuality >= 90 ? "success" : "warning"}
        />
        <StatCard
          label="Impayés à crédit"
          value={formatFCFA(overdueAmount)}
          hint={`${overdueCredit._count} facture(s) en retard`}
          icon="warning"
          tone={overdueAmount > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name="local_shipping" className="text-xl text-primary-container" />
                Commandes à piloter
              </h2>
              <div className="flex items-center gap-2">
                {lateAccept > 0 ? (
                  <span className="badge bg-red-50 text-red-700">{lateAccept} sans réponse</span>
                ) : null}
                <ButtonLink href="/admin/commandes" variant="ghost" size="sm">
                  Tout voir
                </ButtonLink>
              </div>
            </div>

            {activeOrders.length === 0 ? (
              <Card className="p-5 text-sm text-on-surface-variant">Aucune commande active.</Card>
            ) : (
              <Card className="overflow-x-auto">
                <table className="table-base min-w-[640px]">
                  <thead>
                    <tr>
                      <th>Commande</th>
                      <th>Client</th>
                      <th>Éleveur</th>
                      <th>Livraison</th>
                      <th className="text-right">Montant</th>
                      <th>Statut</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/admin/commandes/${order.id}`} className="font-semibold text-primary-container hover:underline">
                            #{order.reference}
                          </Link>
                          <p className="text-[10px] text-on-surface-variant">{formatDateTime(order.createdAt)}</p>
                        </td>
                        <td className="text-xs">{order.client.establishment}</td>
                        <td className="text-xs">{order.supplier.farmName}</td>
                        <td className="text-xs">
                          {formatDate(order.deliveryDate)}
                          <p className="text-[10px] text-on-surface-variant">{order.deliverySlot}</p>
                        </td>
                        <td className="text-right">
                          <span className="money text-xs">{formatFCFA(order.total)}</span>
                        </td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td>
                          <Link href={`/admin/commandes/${order.id}`} className={buttonClass("outline", "sm")}>
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name="credit_card" className="text-xl text-primary-container" />
                Surveillance du risque client
              </h2>
              <ButtonLink href="/admin/credit" variant="ghost" size="sm">
                Gérer
              </ButtonLink>
            </div>
            <Card className="divide-y divide-outline-variant/25">
              {creditClients.length === 0 ? (
                <p className="p-4 text-sm text-on-surface-variant">Aucun client avec crédit activé.</p>
              ) : (
                creditClients.map((client) => {
                  const ratio = client.creditLimit > 0 ? (client.balanceDue / client.creditLimit) * 100 : 0;
                  const blocked = client.balanceDue >= client.creditLimit;
                  return (
                    <div key={client.id} className="p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{client.establishment}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            Encours {formatFCFA(client.balanceDue)} / {formatFCFA(client.creditLimit)}
                          </p>
                        </div>
                        <span className={`badge ${blocked ? "bg-red-50 text-red-700" : ratio > 80 ? "bg-amber-50 text-amber-700" : "bg-primary-fixed text-primary"}`}>
                          {blocked ? "Crédit bloqué" : `${Math.round(ratio)} % utilisé`}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={client.balanceDue} max={client.creditLimit || 1} tone={blocked ? "danger" : ratio > 80 ? "warning" : "primary"} />
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name="gavel" className="text-xl text-[#862a01]" />
                Litiges à arbitrer
              </h2>
              <span className="badge bg-red-50 text-red-700">{openDisputes}</span>
            </div>
            {openDisputeList.length === 0 ? (
              <Card className="p-4">
                <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="verified" className="text-lg text-primary-container" />
                  Aucun litige ouvert.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {openDisputeList.map((dispute) => (
                  <Card key={dispute.id} className="border-l-[3px] border-l-[#a8421a] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xs font-bold">#{dispute.order.reference}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {dispute.order.client.establishment} · {dispute.order.supplier.farmName}
                        </p>
                      </div>
                      <StatusBadge status={dispute.order.status} />
                    </div>
                    <p className="mt-2 text-xs font-semibold">{dispute.reason}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      Ouvert le {formatDate(dispute.createdAt)}
                    </p>
                    <ButtonLink href={`/admin/litiges`} variant="outline" size="sm" className="mt-2 w-full">
                      Arbitrer
                    </ButtonLink>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="monitor_heart" className="text-lg text-primary-container" />
              Signaux d&apos;alerte
            </h2>
            <ul className="mt-2 space-y-2 text-xs">
              <li className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Commandes sans réponse éleveur</span>
                <span className={`font-bold ${lateAccept > 0 ? "text-red-700" : "text-primary-container"}`}>
                  {lateAccept}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Taux d&apos;impayés</span>
                <span className={`font-bold ${overdueRate > 2 ? "text-red-700" : "text-primary-container"}`}>
                  {overdueRate.toFixed(1)} %
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Marge nette</span>
                <span className={`font-bold ${marginRate < 2 ? "text-red-700" : "text-primary-container"}`}>
                  {marginRate.toFixed(1)} %
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Comptes à valider</span>
                <span className="font-bold">{pendingUsers}</span>
              </li>
            </ul>
            <ButtonLink href="/admin/parametres" variant="ghost" size="sm" className="mt-2 w-full">
              Régler commission &amp; seuils
            </ButtonLink>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-base font-semibold">Raccourcis</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { href: "/admin/commandes", label: "Commandes", icon: "receipt_long" },
                { href: "/admin/livraisons", label: "Livraisons", icon: "local_shipping" },
                { href: "/admin/paiements", label: "Paiements", icon: "payments" },
                { href: "/admin/journal", label: "Journal", icon: "history" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-3 text-center text-[11px] font-semibold hover:border-primary-container"
                >
                  <Icon name={item.icon} className="text-xl text-primary-container" />
                  {item.label}
                </Link>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
