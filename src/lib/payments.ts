import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export function supplierOrderTotal(
  items: { supplierUnitPrice: number; quantity: number; quantityDelivered: number | null }[]
): number {
  return items.reduce((total, item) => {
    const quantity = item.quantityDelivered ?? item.quantity;
    return total + item.supplierUnitPrice * quantity;
  }, 0);
}

export async function ensurePayoutForOrder(orderId: string, userId?: string): Promise<void> {
  const existing = await db.payoutItem.findFirst({ where: { orderId } });
  if (existing) return;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, dispute: true },
  });
  if (!order || order.status !== "CLOSED") return;
  if (order.dispute && order.dispute.status !== "RESOLVED") return;

  const base = supplierOrderTotal(order.items);
  const adjustment = order.dispute?.adjustedAmount ?? 0;
  const amount = Math.max(0, base - adjustment);
  if (amount <= 0) return;

  const payout = await db.payout.create({
    data: {
      supplierId: order.supplierId,
      amount,
      status: "PENDING",
      note: `Reversement commande ${order.reference}`,
      items: { create: [{ orderId: order.id, amount }] },
    },
  });

  await logActivity({
    userId,
    action: "PAYOUT_CREATED",
    entity: "Payout",
    entityId: payout.id,
    after: { orderId: order.id, amount },
  });
}
