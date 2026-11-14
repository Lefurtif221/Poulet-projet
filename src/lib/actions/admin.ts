"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { DeliveryStatus, OrderStatus } from "@prisma/client";
import { requireUser, hashPin, isValidPin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatFCFA, normalizePhone } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { ensurePayoutForOrder } from "@/lib/payments";
import { setSetting, type AppSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";

async function adminUser() {
  return requireUser("ADMIN");
}

export async function approveUserAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await logActivity({
    userId: admin.sub,
    action: "USER_APPROVED",
    entity: "User",
    entityId: userId,
    before: { status: user.status },
    after: { status: "ACTIVE" },
  });
  await notify({
    userId: user.id,
    recipient: user.phone,
    event: "ACCOUNT_APPROVED",
    message:
      user.role === "FOURNISSEUR"
        ? "Votre compte éleveur est validé. Vous pouvez publier vos produits et recevoir des commandes."
        : "Votre compte client pro est validé. Vous pouvez commander dès maintenant.",
  });
  revalidatePath("/admin/validation");
  revalidatePath("/admin/utilisateurs");
}

export async function refuseUserAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { status: "REFUSED" } });
  await logActivity({
    userId: admin.sub,
    action: "USER_REFUSED",
    entity: "User",
    entityId: userId,
    before: { status: user.status },
    after: { status: "REFUSED" },
  });
  revalidatePath("/admin/validation");
}

export async function toggleSuspendUserAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "ADMIN") return;
  const status = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
  await db.user.update({ where: { id: userId }, data: { status } });
  await logActivity({
    userId: admin.sub,
    action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
    entity: "User",
    entityId: userId,
  });
  revalidatePath("/admin/utilisateurs");
}

export async function resetPinAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const userId = String(formData.get("userId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!isValidPin(pin)) return;
  await db.user.update({
    where: { id: userId },
    data: { pinHash: await hashPin(pin), failedAttempts: 0, lockedUntil: null },
  });
  await logActivity({ userId: admin.sub, action: "PIN_RESET", entity: "User", entityId: userId });
  revalidatePath("/admin/utilisateurs");
}

export type AdminActionState = { error?: string; success?: string };

export async function updateUserInfoAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await adminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { client: true, supplier: true },
  });
  if (!user) return { error: "Utilisateur introuvable." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!name || !phone) return { error: "Nom et téléphone requis." };

  const duplicate = await db.user.findFirst({
    where: { phone, NOT: { id: userId } },
    select: { id: true },
  });
  if (duplicate) return { error: "Ce numéro de téléphone est déjà utilisé." };

  await db.user.update({ where: { id: userId }, data: { name, phone } });

  if (user.client) {
    await db.client.update({
      where: { id: user.client.id },
      data: {
        establishment: String(formData.get("establishment") ?? user.client.establishment).trim(),
        address: String(formData.get("address") ?? user.client.address).trim(),
        district: String(formData.get("district") ?? "").trim() || null,
        activityType: String(formData.get("activityType") ?? "").trim() || null,
        ninea: String(formData.get("ninea") ?? "").trim() || null,
      },
    });
  }

  if (user.supplier) {
    const capacity = Number(formData.get("capacity") ?? user.supplier.capacity) || 0;
    await db.supplier.update({
      where: { id: user.supplier.id },
      data: {
        farmName: String(formData.get("farmName") ?? user.supplier.farmName).trim(),
        location: String(formData.get("location") ?? user.supplier.location).trim(),
        capacity,
      },
    });
  }

  await logActivity({
    userId: admin.sub,
    action: "USER_INFO_UPDATED",
    entity: "User",
    entityId: userId,
    before: { name: user.name, phone: user.phone },
    after: { name, phone },
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${userId}`);
  return { success: "Informations mises à jour." };
}

export async function changeOrderStatusAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const allowed: OrderStatus[] = [
    "CONFIRMED",
    "REFUSED",
    "PREPARING",
    "READY",
    "IN_DELIVERY",
    "DELIVERED",
    "CLOSED",
    "CANCELLED",
  ];
  if (!allowed.includes(status)) return;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status === status) return;

  const data: Record<string, unknown> = { status };
  const now = new Date();
  if (status === "CONFIRMED") data.confirmedAt = now;
  if (status === "READY") data.readyAt = now;
  if (status === "DELIVERED") data.deliveredAt = now;
  if (status === "CLOSED") data.closedAt = now;

  if (status === "CANCELLED" || status === "REFUSED") {
    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data });
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      if (order.paymentMethod === "CREDIT") {
        await tx.client.update({
          where: { id: order.clientId },
          data: { balanceDue: { decrement: (order.creditAmount || order.total) } },
        });
      }
    });
  } else {
    await db.order.update({ where: { id: order.id }, data });
    if (status === "CLOSED") await ensurePayoutForOrder(order.id, admin.sub);
    if (status === "IN_DELIVERY") {
      await db.delivery.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, status: "PICKED_UP", pickupAt: now },
        update: { status: "PICKED_UP", pickupAt: now },
      });
    }
    if (status === "DELIVERED") {
      await db.delivery.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, status: "DELIVERED", deliveredAt: now },
        update: { status: "DELIVERED", deliveredAt: now },
      });
    }
  }

  await logActivity({
    userId: admin.sub,
    action: "ORDER_STATUS_CHANGED",
    entity: "Order",
    entityId: order.id,
    before: { status: order.status },
    after: { status },
  });
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${order.id}`);
  revalidatePath("/admin");
}

export async function reassignOrderAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const orderId = String(formData.get("orderId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
  if (!order || !supplier) return;

  await db.order.update({
    where: { id: order.id },
    data: {
      supplierId,
      status: "SENT",
      acceptDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
      confirmedAt: null,
      readyAt: null,
      refusalReason: null,
    },
  });
  await logActivity({
    userId: admin.sub,
    action: "ORDER_REASSIGNED",
    entity: "Order",
    entityId: order.id,
    before: { supplierId: order.supplierId, status: order.status },
    after: { supplierId, status: "SENT" },
  });
  redirect(`/admin/commandes/${order.id}`);
}

export async function recordPaymentAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const paymentId = String(formData.get("paymentId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "PAID") return;

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), reference: reference || null, confirmedById: admin.sub },
    });
    if (payment.orderId) {
      const remaining = await tx.payment.count({
        where: { orderId: payment.orderId, id: { not: payment.id }, status: { not: "PAID" } },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: remaining === 0 ? "PAID" : "PENDING" },
      });
    }
    if (payment.method === "CREDIT" && payment.clientId) {
      const client = await tx.client.findUnique({ where: { id: payment.clientId } });
      if (client) {
        await tx.client.update({
          where: { id: client.id },
          data: { balanceDue: Math.max(0, client.balanceDue - payment.amount) },
        });
      }
    }
  });

  await logActivity({
    userId: admin.sub,
    action: "PAYMENT_CONFIRMED",
    entity: "Payment",
    entityId: payment.id,
    after: { amount: payment.amount, reference },
  });
  if (payment.orderId) {
    const order = await db.order.findUnique({
      where: { id: payment.orderId },
      include: { client: { include: { user: true } } },
    });
    if (order) {
      await notify({
        userId: order.client.userId,
        orderId: order.id,
        recipient: order.client.user.phone,
        event: "PAYMENT_RECEIVED",
        message: `Paiement de ${formatFCFA(payment.amount)} reçu pour la commande ${order.reference}.`,
      });
    }
  }
  revalidatePath("/admin/paiements");
  revalidatePath("/admin/credit");
}

export async function markPayoutPaidAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const payoutId = String(formData.get("payoutId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    include: { supplier: { include: { user: true } } },
  });
  if (!payout || payout.status !== "PROCESSING" || !payout.approvedById) return;

  await db.payout.update({
    where: { id: payout.id },
    data: { status: "PAID", paidAt: new Date(), reference: reference || payout.reference },
  });
  await logActivity({
    userId: admin.sub,
    action: "PAYOUT_PAID",
    entity: "Payout",
    entityId: payout.id,
    after: { amount: payout.amount, reference },
  });
  await notify({
    userId: payout.supplier.userId,
    recipient: payout.supplier.user.phone,
    event: "PAYOUT_SENT",
    message: `Reversement de ${formatFCFA(payout.amount)} envoyé sur votre compte ${payout.supplier.paymentProvider ?? "Wave / Orange Money"}.`,
  });
  revalidatePath("/admin/paiements");
}

export async function setPayoutStatusAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const payoutId = String(formData.get("payoutId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["PENDING", "PROCESSING", "PAID", "BLOCKED"].includes(status)) return;
  await db.payout.update({ where: { id: payoutId }, data: { status: status as "PENDING" } });
  await logActivity({
    userId: admin.sub,
    action: "PAYOUT_STATUS_CHANGED",
    entity: "Payout",
    entityId: payoutId,
    after: { status },
  });
  revalidatePath("/admin/paiements");
}

export async function saveDeliveryAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { client: { include: { user: true } } },
  });
  if (!order) return;

  const courierName = String(formData.get("courierName") ?? "").trim();
  const courierPhone = String(formData.get("courierPhone") ?? "").trim();
  const cost = Number(formData.get("cost") ?? 0) || 0;
  const status = String(formData.get("status") ?? "PENDING") as DeliveryStatus;
  const now = new Date();

  await db.delivery.upsert({
    where: { orderId },
    create: {
      orderId,
      courierName: courierName || null,
      courierPhone: courierPhone || null,
      cost,
      status,
      pickupAt: status === "PICKED_UP" || status === "DELIVERED" ? now : null,
      deliveredAt: status === "DELIVERED" ? now : null,
    },
    update: {
      courierName: courierName || null,
      courierPhone: courierPhone || null,
      cost,
      status,
      ...(status === "PICKED_UP" ? { pickupAt: now } : {}),
      ...(status === "DELIVERED" ? { deliveredAt: now, pickupAt: now } : {}),
    },
  });

  if (status === "PICKED_UP" && ["READY", "CONFIRMED", "PREPARING"].includes(order.status)) {
    await db.order.update({ where: { id: orderId }, data: { status: "IN_DELIVERY" } });
  }
  if (status === "DELIVERED" && order.status !== "CLOSED") {
    await db.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED", deliveredAt: now },
    });
    await notify({
      userId: order.client.userId,
      orderId,
      recipient: order.client.user.phone,
      event: "ORDER_DELIVERED",
      message: `Commande ${order.reference} livrée. Confirmez la réception ou signalez un problème sous 24 h.`,
    });
  }

  await logActivity({
    userId: admin.sub,
    action: "DELIVERY_UPDATED",
    entity: "Order",
    entityId: orderId,
    after: { courierName, cost, status },
  });
  revalidatePath("/admin/livraisons");
  revalidatePath("/admin/commandes");
}

export async function resolveDisputeAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const disputeId = String(formData.get("disputeId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const adjustedAmount = Math.max(0, Number(formData.get("adjustedAmount") ?? 0) || 0);
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  if (!["REPLACEMENT", "CREDIT_NOTE", "PARTIAL_REFUND", "FULL_REFUND", "NO_ACTION"].includes(decision)) return;

  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          client: { include: { user: true } },
          supplier: { include: { user: true } },
        },
      },
    },
  });
  if (!dispute) return;

  const rejected = decision === "NO_ACTION";
  await db.$transaction([
    db.dispute.update({
      where: { id: dispute.id },
      data: {
        status: rejected ? "REJECTED" : "RESOLVED",
        decision: decision as "REPLACEMENT",
        adjustedAmount: rejected ? 0 : adjustedAmount,
        adminNote: adminNote || null,
        resolvedAt: new Date(),
      },
    }),
    db.order.update({
      where: { id: dispute.orderId },
      data: { status: "CLOSED", closedAt: new Date() },
    }),
  ]);

  await ensurePayoutForOrder(dispute.orderId, admin.sub);
  await logActivity({
    userId: admin.sub,
    action: "DISPUTE_RESOLVED",
    entity: "Dispute",
    entityId: dispute.id,
    after: { decision, adjustedAmount, rejected },
  });
  const summary = `Litige ${dispute.order.reference} tranché : ${decision}${adjustedAmount > 0 ? `, déduction ${formatFCFA(adjustedAmount)}` : ""}.`;
  await notify({
    userId: dispute.order.client.userId,
    orderId: dispute.orderId,
    recipient: dispute.order.client.user.phone,
    event: "DISPUTE_RESOLVED",
    message: summary,
  });
  await notify({
    userId: dispute.order.supplier.userId,
    orderId: dispute.orderId,
    recipient: dispute.order.supplier.user.phone,
    event: "DISPUTE_RESOLVED",
    message: summary,
  });
  revalidatePath("/admin/litiges");
  revalidatePath("/admin");
}

export async function updateCreditAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const clientId = String(formData.get("clientId") ?? "");
  const creditLimit = Math.max(0, Number(formData.get("creditLimit") ?? 0) || 0);
  const creditDelayDays = Math.max(0, Number(formData.get("creditDelayDays") ?? 0) || 0);
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return;
  await db.client.update({ where: { id: clientId }, data: { creditLimit, creditDelayDays } });
  await logActivity({
    userId: admin.sub,
    action: "CREDIT_UPDATED",
    entity: "Client",
    entityId: clientId,
    before: { creditLimit: client.creditLimit, creditDelayDays: client.creditDelayDays },
    after: { creditLimit, creditDelayDays },
  });
  revalidatePath("/admin/credit");
}

export async function setCommissionAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const scope = String(formData.get("scope") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const rate = Number(formData.get("rate") ?? 0);
  if (!Number.isFinite(rate) || rate < 0 || rate > 50) return;

  if (scope === "GLOBAL") {
    await setSetting("commissionRate", rate);
  } else if (["SUPPLIER", "PRODUCT", "CLIENT"].includes(scope) && targetId) {
    await db.commissionRule.deleteMany({
      where:
        scope === "SUPPLIER"
          ? { scope: "SUPPLIER", supplierId: targetId }
          : scope === "PRODUCT"
            ? { scope: "PRODUCT", productId: targetId }
            : { scope: "CLIENT", clientId: targetId },
    });
    await db.commissionRule.create({
      data: {
        scope: scope as "SUPPLIER",
        rate,
        supplierId: scope === "SUPPLIER" ? targetId : null,
        productId: scope === "PRODUCT" ? targetId : null,
        clientId: scope === "CLIENT" ? targetId : null,
      },
    });
  }

  await logActivity({
    userId: admin.sub,
    action: "COMMISSION_UPDATED",
    entity: "CommissionRule",
    entityId: targetId || "GLOBAL",
    after: { scope, rate },
  });
  revalidatePath("/admin/commissions");
}

export async function deleteCommissionAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  await db.commissionRule.delete({ where: { id: ruleId } }).catch(() => undefined);
  await logActivity({ userId: admin.sub, action: "COMMISSION_DELETED", entity: "CommissionRule", entityId: ruleId });
  revalidatePath("/admin/commissions");
}

export async function updateAdminProductAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const productId = String(formData.get("productId") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const active = formData.get("active") === "on";
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;
  await db.product.update({
    where: { id: productId },
    data: { price: Number.isFinite(price) && price > 0 ? price : product.price, active },
  });
  await logActivity({
    userId: admin.sub,
    action: "PRODUCT_ADMIN_UPDATED",
    entity: "Product",
    entityId: productId,
    before: { price: product.price, active: product.active },
    after: { price, active },
  });
  revalidatePath("/admin/catalogue");
}

const NUMBER_SETTINGS = [
  "commissionRate",
  "deliveryFee",
  "groupageDeliveryFee",
  "groupageLeadDays",
  "pluckingFee",
  "freeDeliveryThreshold",
  "minOrderPro",
  "minOrderParticulier",
  "creditGlobalCap",
  "creditDelayDays",
] as const;

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  for (const key of NUMBER_SETTINGS) {
    const raw = formData.get(key);
    if (raw !== null) {
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) {
        await setSetting(key as keyof AppSettings, value as never);
      }
    }
  }

  const districts = String(formData.get("districts") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (districts.length > 0) await setSetting("districts", districts);

  const slots = String(formData.get("deliverySlots") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (slots.length > 0) await setSetting("deliverySlots", slots);

  for (const key of ["waveNumber", "orangeMoneyNumber", "wavePaymentLink", "groupageSlot", "supportPhone", "platformName"] as const) {
    const raw = formData.get(key);
    if (raw !== null && String(raw).trim()) await setSetting(key, String(raw).trim());
  }

  await setSetting("particuliersEnabled", formData.get("particuliersEnabled") === "on");

  await logActivity({ userId: admin.sub, action: "SETTINGS_UPDATED", entity: "Setting", entityId: "global" });
  revalidatePath("/admin/parametres");
}

export async function markNotificationSentAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const notificationId = String(formData.get("notificationId") ?? "");
  const notification = await db.notification.findUnique({ where: { id: notificationId } });
  if (!notification) return;
  await db.notification.update({
    where: { id: notificationId },
    data: { status: "SENT", sentAt: new Date() },
  });
  await logActivity({
    userId: admin.sub,
    action: "NOTIFICATION_SENT",
    entity: "Notification",
    entityId: notificationId,
  });
  revalidatePath("/admin/notifications");
}

export async function setOrderPaymentLinkAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const orderId = String(formData.get("orderId") ?? "");
  const raw = String(formData.get("paymentLink") ?? "").trim();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  let paymentLink: string | null = null;
  if (raw) {
    try {
      const url = new URL(raw);
      const validHost = url.hostname === "wave.com" || url.hostname.endsWith(".wave.com");
      if (url.protocol !== "https:" || !validHost) return;
      paymentLink = url.toString();
    } catch {
      return;
    }
  }

  await db.order.update({ where: { id: orderId }, data: { paymentLink } });
  await logActivity({
    userId: admin.sub,
    action: "ORDER_PAYMENT_LINK_SET",
    entity: "Order",
    entityId: orderId,
    after: { paymentLink },
  });
  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath(`/client/commande/${orderId}`);
}

export async function createPayoutBatchAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const supplierId = String(formData.get("supplierId") ?? "");
  if (!supplierId) return;

  const orders = await db.order.findMany({
    where: { supplierId, status: "CLOSED", payoutItems: { none: {} } },
    include: { dispute: true },
  });
  const rows = orders
    .map((order) => ({
      orderId: order.id,
      amount: Math.max(0, order.supplierTotal - (order.dispute?.adjustedAmount ?? 0)),
    }))
    .filter((row) => row.amount > 0);
  if (rows.length === 0) return;

  const amount = rows.reduce((total, row) => total + row.amount, 0);
  const payout = await db.payout.create({
    data: {
      supplierId,
      amount,
      status: "PENDING",
      note: `Lot de ${rows.length} commande(s)`,
      createdById: admin.sub,
      items: { create: rows },
    },
  });
  await logActivity({
    userId: admin.sub,
    action: "PAYOUT_BATCH_CREATED",
    entity: "Payout",
    entityId: payout.id,
    after: { supplierId, amount, orders: rows.length },
  });
  revalidatePath("/admin/paiements");
}

export async function approvePayoutAction(formData: FormData): Promise<void> {
  const admin = await adminUser();
  const payoutId = String(formData.get("payoutId") ?? "");
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout || payout.status !== "PENDING") return;
  if (payout.createdById && payout.createdById === admin.sub) return;

  await db.payout.update({
    where: { id: payout.id },
    data: { status: "PROCESSING", approvedById: admin.sub, approvedAt: new Date() },
  });
  await logActivity({
    userId: admin.sub,
    action: "PAYOUT_APPROVED",
    entity: "Payout",
    entityId: payout.id,
    after: { amount: payout.amount },
  });
  revalidatePath("/admin/paiements");
}

export async function createAdminAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await adminUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  if (!name || !phone) return { error: "Nom et téléphone requis." };
  if (!isValidPin(pin)) return { error: "Le PIN doit contenir 4 à 6 chiffres." };

  const existing = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) return { error: "Ce numéro est déjà utilisé." };

  const user = await db.user.create({
    data: {
      name,
      phone,
      pinHash: await hashPin(pin),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  await logActivity({
    userId: admin.sub,
    action: "ADMIN_CREATED",
    entity: "User",
    entityId: user.id,
    after: { name, phone },
  });
  revalidatePath("/admin/utilisateurs");
  return { success: "Administrateur créé. Il peut approuver les reversements." };
}

export async function createCashClosingAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await adminUser();
  const dateRaw = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Date invalide." };
  const date = new Date(`${dateRaw}T00:00:00.000Z`);

  const number = (key: string) => {
    const value = Number(formData.get(key) ?? 0);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
  };
  const cash = number("cash");
  const wave = number("wave");
  const orangeMoney = number("orangeMoney");
  const credit = number("credit");
  const note = String(formData.get("note") ?? "").trim();

  const closing = await db.cashClosing.upsert({
    where: { date },
    create: { date, cash, wave, orangeMoney, credit, note: note || null, closedById: admin.sub },
    update: { cash, wave, orangeMoney, credit, note: note || null, closedById: admin.sub },
  });
  await logActivity({
    userId: admin.sub,
    action: "CASH_CLOSING_SAVED",
    entity: "CashClosing",
    entityId: closing.id,
    after: { date: dateRaw, cash, wave, orangeMoney, credit },
  });
  revalidatePath("/admin/caisse");
  revalidatePath("/admin");
  return { success: "Clôture de caisse enregistrée." };
}
