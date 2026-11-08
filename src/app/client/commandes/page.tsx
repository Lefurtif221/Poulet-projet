import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatFCFA } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/labels";
import { ButtonLink, EmptyState, Icon, StatusBadge, buttonClass } from "@/components/ui";
import { reorderAction } from "@/lib/actions/orders";
import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes commandes" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "SENT", label: "Envoyées" },
  { value: "CONFIRMED", label: "Confirmées" },
  { value: "IN_DELIVERY", label: "En livraison" },
  { value: "DELIVERED", label: "À confirmer" },
  { value: "CLOSED", label: "Clôturées" },
  { value: "DISPUTED", label: "Litiges" },
];

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("CLIENT");
  const query = await searchParams;
  const status = (Array.isArray(query.status) ? query.status[0] : query.status) ?? "";

  const client = await db.client.findUnique({ where: { userId: user.sub } });
  if (!client) return null;

  const whereStatus = status
    ? status === "DELIVERED"
      ? { in: ["DELIVERED"] as OrderStatus[] }
      : { equals: status as OrderStatus }
    : undefined;

  const orders = await db.order.findMany({
    where: { clientId: client.id, ...(whereStatus ? { status: whereStatus } : {}) },
    include: { supplier: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Mes commandes</h1>
          <p className="text-sm text-on-surface-variant">
            Historique, suivi, factures et recommande en un clic.
          </p>
        </div>
        <ButtonLink href="/client/catalogue" variant="outline">
          <Icon name="add" className="text-lg" />
          Nouvelle commande
        </ButtonLink>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/client/commandes?status=${filter.value}` : "/client/commandes"}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold",
                active
                  ? "border-primary-container bg-primary-container text-white"
                  : "border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="Aucune commande dans cette vue"
          description="Vos commandes apparaîtront ici avec leur statut et leurs factures."
          action={
            <Link href="/client/catalogue" className={buttonClass("primary")}>
              Parcourir le catalogue
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="card card-hover border-l-[3px] p-4"
              style={{ borderLeftColor: "var(--color-primary-container)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/client/commande/${order.id}`}
                      className="font-display text-sm font-bold hover:underline"
                    >
                      #{order.reference}
                    </Link>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {order.supplier.farmName} · {formatDate(order.deliveryDate)} · {order.deliverySlot}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {order.items.length} lot(s) · {order.items.reduce((total, item) => total + item.quantity, 0)}{" "}
                    unité(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="money text-lg">{formatFCFA(order.total)}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {ORDER_STATUS[order.status].label}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-outline-variant/30 pt-3">
                <ButtonLink href={`/client/commande/${order.id}`} variant="outline" size="sm">
                  <Icon name="visibility" className="text-base" />
                  Suivi
                </ButtonLink>
                {["DELIVERED", "CLOSED", "DISPUTED"].includes(order.status) ? (
                  <ButtonLink href={`/facture/${order.id}`} variant="outline" size="sm">
                    <Icon name="description" className="text-base" />
                    Facture
                  </ButtonLink>
                ) : null}
                {["CLOSED", "DELIVERED", "CANCELLED"].includes(order.status) ? (
                  <form action={reorderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button type="submit" className={buttonClass("primary", "sm")}>
                      <Icon name="replay" className="text-base" />
                      Recommander
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
