import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { placeOrder } from "@/lib/orders";
import { logActivity } from "@/lib/activity";
import { ensurePayoutForOrder } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!secret || (provided !== secret && bearer !== secret)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const jsDay = now.getUTCDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const deliveryDate = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const recurrings = await db.recurringOrder.findMany({
    where: {
      active: true,
      dayOfWeek,
      OR: [{ lastRunAt: null }, { lastRunAt: { lt: startOfDay } }],
    },
    include: { client: { include: { user: true } }, items: true },
    take: 200,
  });

  const stale = await db.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
    take: 200,
  });

  for (const order of stale) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "CLOSED", closedAt: now },
    });
    await ensurePayoutForOrder(order.id);
    await logActivity({
      action: "ORDER_AUTO_CLOSED",
      entity: "Order",
      entityId: order.id,
      after: { reason: "24h sans signalement client" },
    });
  }

  const results: { recurringId: string; ok: boolean; orderId?: string; error?: string }[] = [];

  for (const recurring of recurrings) {
    const result = await placeOrder({
      clientId: recurring.clientId,
      userId: recurring.client.userId,
      deliveryDate,
      deliverySlot: recurring.deliverySlot,
      address: recurring.address ?? recurring.client.address,
      note: recurring.note ?? undefined,
      paymentMethod: recurring.paymentMethod,
      items: recurring.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });

    if (result.ok) {
      await db.recurringOrder.update({
        where: { id: recurring.id },
        data: { lastRunAt: now },
      });
      await logActivity({
        userId: recurring.client.userId,
        action: "RECURRING_GENERATED",
        entity: "RecurringOrder",
        entityId: recurring.id,
        after: { orderId: result.orderId, reference: result.reference },
      });
      results.push({ recurringId: recurring.id, ok: true, orderId: result.orderId });
    } else {
      results.push({ recurringId: recurring.id, ok: false, error: result.error });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    dayOfWeek,
    autoClosed: stale.length,
    count: results.length,
    results,
  });
}
