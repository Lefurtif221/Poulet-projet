"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { placeOrder } from "@/lib/orders";
import { ensurePayoutForOrder } from "@/lib/payments";
import { logActivity } from "@/lib/activity";
import { saveImage } from "@/lib/uploads";
import { notify } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

export type OrderActionState = { error?: string; success?: string };

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10000),
  preparation: z.enum(["STANDARD", "PLUCKED"]).default("STANDARD"),
});

const orderSchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de livraison invalide"),
  deliverySlot: z.string().min(1, "Choisissez un créneau"),
  deliveryMode: z.enum(["GROUPAGE", "INDIVIDUAL"]).default("INDIVIDUAL"),
  address: z.string().trim().min(5, "Adresse de livraison requise"),
  note: z.string().trim().optional(),
  paymentMethod: z.enum(["WAVE", "CASH_ON_DELIVERY", "CREDIT"]),
  remainderMethod: z.enum(["WAVE", "CASH_ON_DELIVERY"]).optional(),
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

  const isGroupage = parsed.data.deliveryMode === "GROUPAGE";
  const deliveryDate = isGroupage
    ? new Date()
    : new Date(`${parsed.data.deliveryDate}T08:00:00.000Z`);
  if (!isGroupage) {
    if (Number.isNaN(deliveryDate.getTime())) return { error: "Date de livraison invalide." };
    if (deliveryDate < earliestDeliveryDate()) {
      return { error: "La livraison doit être programmée au plus tôt demain (ou après-demain après 22h)." };
    }
  }

  const client = await db.client.findUnique({ where: { userId: user.sub }, select: { id: true } });
  if (!client) return { error: "Compte client introuvable." };

  const result = await placeOrder({
    clientId: client.id,
    userId: user.sub,
    deliveryDate,
    deliverySlot: parsed.data.deliverySlot,
    deliveryMode: parsed.data.deliveryMode as "GROUPAGE" | "INDIVIDUAL",
    address: parsed.data.address,
    note: parsed.data.note,
    paymentMethod: parsed.data.paymentMethod as PaymentMethod,
    remainderMethod: parsed.data.remainderMethod,
    items: items.data,
  }, { quote: true });

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
    if (order.creditAmount > 0) {
      await tx.client.update({
        where: { id: order.clientId },
        data: { balanceDue: { decrement: (order.creditAmount || order.total) } },
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

export async function declarePaymentAction(
  _prev: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();

  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
    include: { payments: true },
  });
  if (!order) return { error: "Commande introuvable." };
  if (["CANCELLED", "REFUSED", "CLOSED"].includes(order.status)) {
    return { error: "Cette commande ne peut plus recevoir de paiement." };
  }
  if (order.paymentStatus === "PAID") {
    return { error: "Cette commande est déjà réglée." };
  }
  const payment = order.payments.find(
    (item) => item.method === "WAVE" && ["PENDING", "DECLARED"].includes(item.status)
  );
  if (!payment) return { error: "Aucun paiement Wave en attente sur cette commande." };

  let proofUrl: string | null = null;
  try {
    proofUrl = await saveImage(formData.get("photo") as File | null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Capture invalide." };
  }

  if (!proofUrl && !reference) {
    return { error: "Ajoutez une capture ou une référence de paiement." };
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "DECLARED",
      reference: reference || payment.reference,
      proofUrl: proofUrl ?? payment.proofUrl,
      declaredAt: new Date(),
    },
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
      event: "PAYMENT_DECLARED",
      message: `Paiement Wave déclaré sur ${order.reference} (${payment.amount.toLocaleString("fr-FR")} FCFA)${reference ? ` — réf. ${reference}` : ""}. À vérifier dans Wave.`,
    });
  }

  await logActivity({
    userId: user.sub,
    action: "PAYMENT_DECLARED",
    entity: "Order",
    entityId: order.id,
    after: { reference, proofUrl: Boolean(proofUrl) },
  });

  revalidatePath(`/client/commande/${order.id}`);
  revalidatePath(`/admin/commandes/${order.id}`);
  revalidatePath("/admin/paiements");

  return { success: "Paiement déclaré. L'administrateur vérifie et confirme sous peu." };
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
    deliveryMode: order.deliveryMode,
    address: order.address,
    note: order.note ?? undefined,
    paymentMethod:
      order.paymentMethod === "CREDIT"
        ? "CREDIT"
        : order.paymentMethod === "WAVE"
          ? "WAVE"
          : "CASH_ON_DELIVERY",
    remainderMethod:
      order.remainderMethod === "WAVE" ? "WAVE" : "CASH_ON_DELIVERY",
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      preparation: item.preparation,
    })),
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


export async function acceptDeliveryQuoteAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
    include: { items: true, supplier: { include: { user: true } } },
  });
  if (!order || order.status !== "PENDING_QUOTE" || !order.quotedAt) {
    redirect(`/client/commande/${orderId}?erreur=${encodeURIComponent("Devis indisponible.")}`);
  }

  const [client, settings] = await Promise.all([
    db.client.findUnique({ where: { userId: user.sub } }),
    getSettings(),
  ]);
  if (!client) redirect(`/client/commande/${orderId}?erreur=${encodeURIComponent("Compte introuvable.")}`);

  const total = order.subtotal + order.deliveryFee;
  let creditAmount = 0;
  let remainderAmount = total;
  let remainderMethod: "WAVE" | "CASH_ON_DELIVERY" =
    order.paymentMethod === "WAVE" ? "WAVE" : "CASH_ON_DELIVERY";

  if (order.paymentMethod === "CREDIT") {
    if (client.creditLimit <= 0) {
      redirect(`/client/commande/${orderId}?erreur=${encodeURIComponent("Crédit non activé.")}`);
    }
    const overdue = await db.order.findFirst({
      where: {
        clientId: client.id,
        status: { notIn: ["CANCELLED", "REFUSED"] },
        creditDueDate: { lt: new Date() },
        payments: { some: { method: "CREDIT", status: { in: ["PENDING", "DECLARED"] } } },
      },
      select: { id: true },
    });
    if (overdue) {
      redirect(`/client/commande/${orderId}?erreur=${encodeURIComponent("Une facture à crédit est en retard.")}`);
    }
    const availableCredit = Math.max(0, client.creditLimit - client.balanceDue);
    if (availableCredit <= 0) {
      redirect(`/client/commande/${orderId}?erreur=${encodeURIComponent("Crédit épuisé. Payez comptant ou par Wave.")}`);
    }
    creditAmount = Math.min(total, availableCredit);
    remainderAmount = total - creditAmount;
    remainderMethod = order.remainderMethod === "WAVE" ? "WAVE" : "CASH_ON_DELIVERY";
  }

  const paymentRows: {
    amount: number;
    method: "CREDIT" | "WAVE" | "CASH_ON_DELIVERY";
    status: "PENDING";
    clientId: string;
  }[] = [];
  if (creditAmount > 0) {
    paymentRows.push({ amount: creditAmount, method: "CREDIT", status: "PENDING", clientId: client.id });
  }
  if (remainderAmount > 0) {
    paymentRows.push({
      amount: remainderAmount,
      method: remainderMethod,
      status: "PENDING",
      clientId: client.id,
    });
  }

  const creditDelay = client.creditDelayDays || settings.creditDelayDays;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "SENT",
        creditAmount,
        remainderAmount,
        remainderMethod,
        paymentStatus: "PENDING",
        creditDueDate:
          creditAmount > 0 ? new Date(Date.now() + creditDelay * 24 * 60 * 60 * 1000) : null,
        acceptDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
        payments: { create: paymentRows },
      },
    });
    if (creditAmount > 0) {
      await tx.client.update({
        where: { id: client.id },
        data: { balanceDue: { increment: creditAmount } },
      });
    }
  });

  await logActivity({
    userId: user.sub,
    action: "DELIVERY_QUOTE_ACCEPTED",
    entity: "Order",
    entityId: order.id,
    after: { deliveryFee: order.deliveryFee, creditAmount, remainderAmount, remainderMethod },
  });
  await notify({
    userId: order.supplier.userId,
    orderId: order.id,
    recipient: order.supplier.user.phone,
    event: "ORDER_NEW",
    message: `Nouvelle commande ${order.reference} de ${order.address} — ${total.toLocaleString("fr-FR")} FCFA. Acceptez sous 2 h.`,
  });
  revalidatePath(`/client/commande/${order.id}`);
  revalidatePath(`/admin/commandes/${order.id}`);
  redirect(`/client/commande/${order.id}?devis=1`);
}

export async function refuseDeliveryQuoteAction(formData: FormData): Promise<void> {
  const user = await requireUser("CLIENT");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, client: { userId: user.sub } },
    include: { items: true },
  });
  if (!order || order.status !== "PENDING_QUOTE") return;

  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelReason: "Devis livraison refusé par le client." },
    });
  });

  await logActivity({
    userId: user.sub,
    action: "DELIVERY_QUOTE_REFUSED",
    entity: "Order",
    entityId: order.id,
  });
  revalidatePath(`/client/commande/${order.id}`);
  revalidatePath(`/admin/commandes/${order.id}`);
  redirect(`/client/commande/${order.id}?devis_refuse=1`);
}
