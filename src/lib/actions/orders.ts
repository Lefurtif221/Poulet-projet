"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { placeOrder } from "@/lib/orders";
import { ensurePayoutForOrder } from "@/lib/payments";
import { logActivity } from "@/lib/activity";
import { saveImage } from "@/lib/uploads";
import { notify } from "@/lib/notify";

export type OrderActionState = { error?: string; success?: string };

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10000),
});

const orderSchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de livraison invalide"),
  deliverySlot: z.string().min(1, "Choisissez un créneau"),
  address: z.string().trim().min(5, "Adresse de livraison requise"),
  note: z.string().trim().optional(),
  paymentMethod: z.enum(["WAVE", "ORANGE_MONEY", "CASH_ON_DELIVERY", "CREDIT", "BANK_TRANSFER"]),
  items: z.string(),
});

function parseItems(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return z.array(itemSchema).safeParse(parsed);
  } catch {
    return null;
  }
}

function earliestDeliveryDate(): Date {
  const now = new Date();
  const daysAhead = now.getUTCHours() >= 22 ? 2 : 1;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead));
}

export async function createOrderAction(
  _prev: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  const user = await requireUser("CLIENT");
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const items = parseItems(parsed.data.items);
  if (!items || !items.success || items.data.length === 0) {
    return { error: "Panier invalide. Ajoutez des produits puis réessayez." };
  }

  const deliveryDate = new Date(`${parsed.data.deliveryDate}T08:00:00.000Z`);
  if (Number.isNaN(deliveryDate.getTime())) return { error: "Date de livraison invalide." };
  if (deliveryDate < earliestDeliveryDate()) {
    return { error: "La livraison doit être programmée au plus tôt demain (ou après-demain après 22h)." };
  }

  const client = await db.client.findUnique({ where: { userId: user.sub }, select: { id: true } });
  if (!client) return { error: "Compte client introuvable." };

  const result = await placeOrder({
    clientId: client.id,
    userId: user.sub,
    deliveryDate,
    deliverySlot: parsed.data.deliverySlot,
    address: parsed.data.address,
    note: parsed.data.note,
    paymentMethod: parsed.data.paymentMethod as PaymentMethod,
    items: items.data,
  });

  if (!result.ok) return { error: result.error };
  redirect(`/client/commande/${result.orderId}?nouvelle=1`);
}

export async function confirmReceiptAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
    include: { items: true },
  });
  if (!order || order.status !== "DELIVERED") return;

  await db.order.update({
    where: { id: order.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  await ensurePayoutForOrder(order.id, user.sub);
  await logActivity({
    userId: user.sub,
    action: "ORDER_CLOSED",
    entity: "Order",
    entityId: order.id,
    after: { reference: order.reference },
  });
  redirect(`/client/commande/${order.id}?confirmee=1`);
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
    include: { items: true },
  });
  if (!order || order.status !== "SENT") return;

  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelReason: "Annulée par le client avant confirmation." },
    });
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    if (order.paymentMethod === "CREDIT") {
      await tx.client.update({
        where: { id: order.clientId },
        data: { balanceDue: { decrement: order.total } },
      });
    }
  });

  await logActivity({
    userId: user.sub,
    action: "ORDER_CANCELLED_CLIENT",
    entity: "Order",
    entityId: order.id,
  });
  redirect(`/client/commande/${order.id}?annulee=1`);
}

export async function disputeAction(
  _prev: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!reason) return { error: "Choisissez un motif de litige." };

  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
  });
  if (!order || order.status !== "DELIVERED") {
    return { error: "Un litige ne peut être ouvert qu'après une livraison non confirmée." };
  }
  if (order.deliveredAt && Date.now() - order.deliveredAt.getTime() > 24 * 60 * 60 * 1000) {
    return { error: "Le délai de signalement de 24 h est dépassé. Contactez l'administrateur." };
  }

  let photoUrl: string | null = null;
  try {
    photoUrl = await saveImage(formData.get("photo") as File | null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Photo invalide." };
  }

  await db.$transaction([
    db.dispute.create({
      data: { orderId: order.id, reason, description: description || null, photoUrl },
    }),
    db.order.update({ where: { id: order.id }, data: { status: "DISPUTED" } }),
  ]);

  await logActivity({
    userId: user.sub,
    action: "DISPUTE_OPENED",
    entity: "Order",
    entityId: order.id,
    after: { reason },
  });

  const adminUser = await db.user.findFirst({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true, phone: true },
  });
  if (adminUser) {
    await notify({
      userId: adminUser.id,
      orderId: order.id,
      recipient: adminUser.phone,
      event: "DISPUTE_OPENED",
      message: `Nouveau litige sur la commande ${order.reference} : ${reason}. Paiement éleveur suspendu, arbitrage sous 48 h.`,
    });
  }

  return { success: "Litige ouvert. L'administrateur vous contacte sous 48 h." };
}

export async function reorderAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
    include: { items: true, client: true },
  });
  if (!order) return;

  const now = new Date();
  const daysAhead = now.getUTCHours() >= 22 ? 2 : 1;
  const deliveryDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead)
  );

  const result = await placeOrder({
    clientId: order.clientId,
    userId: user.sub,
    deliveryDate,
    deliverySlot: order.deliverySlot,
    address: order.address,
    note: order.note ?? undefined,
    paymentMethod: order.paymentMethod === "CREDIT" ? "CREDIT" : order.paymentMethod,
    items: order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  });

  if (!result.ok) redirect(`/client/commande/${order.id}?erreur=${encodeURIComponent(result.error)}`);
  redirect(`/client/commande/${result.orderId}?nouvelle=1`);
}

export async function createRecurringAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const dayOfWeek = Number(formData.get("dayOfWeek") ?? 1);
  const deliverySlot = String(formData.get("deliverySlot") ?? "");
  if (dayOfWeek < 1 || dayOfWeek > 7 || !deliverySlot) return;

  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub }, status: { in: ["CLOSED", "DELIVERED"] } },
    include: { items: true },
  });
  if (!order) return;

  const recurring = await db.recurringOrder.create({
    data: {
      clientId: order.clientId,
      label: `Commande du ${order.reference}`,
      dayOfWeek,
      deliverySlot,
      address: order.address,
      note: order.note,
      paymentMethod: order.paymentMethod,
      items: {
        create: order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      },
    },
  });

  await logActivity({
    userId: user.sub,
    action: "RECURRING_CREATED",
    entity: "RecurringOrder",
    entityId: recurring.id,
    after: { sourceOrder: order.reference, dayOfWeek, deliverySlot },
  });

  redirect("/client/recurrentes");
}

export async function toggleRecurringAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const id = String(formData.get("id") ?? "");
  const recurring = await db.recurringOrder.findFirst({
    where: { id, client: { userId: user.sub } },
  });
  if (!recurring) return;
  await db.recurringOrder.update({ where: { id }, data: { active: !recurring.active } });
  redirect("/client/recurrentes");
}

export async function deleteRecurringAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const id = String(formData.get("id") ?? "");
  const recurring = await db.recurringOrder.findFirst({
    where: { id, client: { userId: user.sub } },
  });
  if (!recurring) return;
  await db.recurringOrder.delete({ where: { id } });
  await logActivity({ userId: user.sub, action: "RECURRING_DELETED", entity: "RecurringOrder", entityId: id });
  redirect("/client/recurrentes");
}

