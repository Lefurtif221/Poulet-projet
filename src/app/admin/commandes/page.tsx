import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatFCFA } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHOD } from "@/lib/labels";
import { Icon, StatusBadge, buttonClass } from "@/components/ui";
import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Commandes" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const TABS = [
  { value: "", label: "Toutes" },
  { value: "SENT", label: "Envoyées" },
  { value: "CONFIRMED", label: "Confirmées" },
  { value: "PREPARING", label: "Préparation" },
  { value: "READY", label: "Prêtes" },
  { value: "IN_DELIVERY", label: "En livraison" },
  { value: "DELIVERED", label: "Livrées" },
  { value: "CLOSED", label: "Clôturées" },
  { value: "DISPUTED", label: "Litiges" },
  { value: "REFUSED", label: "Refusées" },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const status = first(query.status) as OrderStatus | "";
  const q = first(query.q).trim();

  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              { client: { establishment: { contains: q, mode: "insensitive" } } },
              { supplier: { farmName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { client: true, supplier: true, delivery: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Commandes</h1>
          <p className="text-sm text-on-surface-variant">
            Suivi, changement de statut manuel et réassignation à un autre éleveur.
          </p>
        </div>
        <Link href="/api/admin/export?type=orders" className={buttonClass("outline", "sm")}>
          <Icon name="download" className="text-base" />
          Export CSV
        </Link>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/commandes?status=${tab.value}` : "/admin/commandes"}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold",
                active
                  ? "border-primary-container bg-primary-container text-white"
                  : "border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form className="card flex flex-wrap items-end gap-2 p-3">
        <div className="min-w-64 flex-1">
          <label className="field-label" htmlFor="q">
            Recherche
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Référence, client, éleveur…" className="input" />
        </div>
        <input type="hidden" name="status" value={status} />
        <button type="submit" className={buttonClass("primary")}>
          <Icon name="search" className="text-lg" />
          Rechercher
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[960px]">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Éleveur</th>
              <th>Livraison</th>
              <th className="text-right">Montant</th>
              <th className="text-right">Commission</th>
              <th>Règlement</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
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
                <td className="text-right">
                  <span className="money text-xs">{formatFCFA(order.commissionAmount)}</span>
                </td>
                <td className="text-xs">
                  {PAYMENT_METHOD[order.paymentMethod].short}
                  <p className="text-[10px] text-on-surface-variant">{order.paymentStatus === "PAID" ? "Payé" : "En attente"}</p>
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
        {orders.length === 0 ? (
          <p className="p-6 text-center text-sm text-on-surface-variant">Aucune commande.</p>
        ) : null}
      </div>

      <p className="text-[11px] text-on-surface-variant">
        {orders.length} commande(s) · {ORDER_STATUS.DELIVERED.label} et clôture déclenchent le
        reversement éleveur.
      </p>
    </div>
  );
}
