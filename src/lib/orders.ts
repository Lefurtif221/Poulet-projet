import type { DeliveryMode, PaymentMethod, Preparation } from "@prisma/client";
import { db } from "@/lib/db";
import { logActivity, generateOrderReference } from "@/lib/activity";
import { clientUnitPrice, getSettings, resolveCommissionRate } from "@/lib/settings";
import { notify } from "@/lib/notify";

export type PlaceOrderInput = {
  clientId: string;
  userId: string;
  deliveryDate: Date;
  deliverySlot: string;
  deliveryMode: DeliveryMode;
  address: string;
  note?: string;
  paymentMethod: PaymentMethod;
  items: { productId: string; quantity: number; preparation: Preparation }[];
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; reference: string }
  | { ok: false; error: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (input.items.length === 0) return { ok: false, error: "Votre panier est vide." };

  const [client, settings, rules] = await Promise.all([
    db.client.findUnique({ where: { id: input.clientId } }),
    getSettings(),
    db.commissionRule.findMany(),
  ]);
  if (!client) return { ok: false, error: "Compte client introuvable." };

  const products = await db.product.findMany({
    where: { id: { in: input.items.map((item) => item.productId) } },
    include: { supplier: { include: { user: true } } },
  });
  if (products.length !== input.items.length) {
    return { ok: false, error: "Un produit n'est plus disponible. Actualisez votre panier." };
  }

  let subtotal = 0;
  let supplierTotal = 0;
  const lines: {
    productId: string;
    productName: string;
    unit: (typeof products)[number]["unit"];
    quantity: number;
    preparation: Preparation;
    preparationFee: number;
    unitPrice: number;
    supplierUnitPrice: number;
    lineTotal: number;
    supplierId: string;
  }[] = [];

  for (const item of input.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return { ok: false, error: "Produit introuvable." };
    if (!product.active || !product.available) {
      return { ok: false, error: `${product.name} n'est plus disponible.` };
    }
    if (!product.supplier.isOpen || product.supplier.isPaused) {
      return { ok: false, error: `L'éleveur de ${product.name} ne prend pas de commandes actuellement.` };
    }
    if (product.stock < item.quantity) {
      return {
        ok: false,
        error: `Stock insuffisant pour ${product.name} (${product.stock} restant).`,
      };
    }

    const rate = resolveCommissionRate(
      rules,
      { productId: product.id, supplierId: product.supplierId, clientId: client.id },
      settings.commissionRate
    );
    const preparation = item.preparation === "PLUCKED" ? "PLUCKED" : "STANDARD";
    const preparationFee = preparation === "PLUCKED" ? settings.pluckingFee : 0;
    const unitPrice = clientUnitPrice(product.price, rate) + preparationFee;
    subtotal += unitPrice * item.quantity;
    supplierTotal += (product.price + preparationFee) * item.quantity;
    lines.push({
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      quantity: item.quantity,
      preparation,
      preparationFee,
      unitPrice,
      supplierUnitPrice: product.price + preparationFee,
      lineTotal: unitPrice * item.quantity,
      supplierId: product.supplierId,
    });
  }

  const supplierIds = [...new Set(lines.map((line) => line.supplierId))];
  if (supplierIds.length > 1) {
    return {
      ok: false,
      error: "Une commande ne peut concerner qu'un seul éleveur. Séparez vos paniers.",
    };
  }

  if (subtotal < settings.minOrderPro) {
    return {
      ok: false,
      error: `Commande minimum : ${settings.minOrderPro.toLocaleString("fr-FR")} FCFA.`,
    };
  }

  const isGroupage = input.deliveryMode === "GROUPAGE";
  let deliveryDate = input.deliveryDate;
  let deliverySlot = input.deliverySlot;

  if (isGroupage) {
    const now = new Date();
    const lead = Math.max(1, settings.groupageLeadDays);
    deliveryDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + lead, 8)
    );
    deliverySlot = settings.groupageSlot;
  } else if (!settings.deliverySlots.includes(input.deliverySlot)) {
    return { ok: false, error: "Créneau de livraison invalide." };
  }

  const deliveryFee =
    subtotal >= settings.freeDeliveryThreshold
      ? 0
      : isGroupage
        ? settings.groupageDeliveryFee
        : settings.deliveryFee;
  const total = subtotal + deliveryFee;
  const commissionAmount = subtotal - supplierTotal;
  const supplierId = supplierIds[0];

  if (input.paymentMethod === "CREDIT") {
    if (client.creditLimit <= 0) {
      return { ok: false, error: "Le paiement à crédit n'est pas activé sur votre compte." };
    }
    if (client.balanceDue + total > client.creditLimit) {
      return { ok: false, error: "Plafond de crédit insuffisant pour cette commande." };
    }
    const overdue = await db.order.findFirst({
      where: {
        clientId: client.id,
        paymentMethod: "CREDIT",
        paymentStatus: "PENDING",
        creditDueDate: { lt: new Date() },
        status: { notIn: ["CANCELLED", "REFUSED"] },
      },
      select: { id: true },
    });
    if (overdue) {
      return { ok: false, error: "Une facture à crédit est en retard. Réglez-la ou payez comptant." };
    }
  }

  const reference = await generateOrderReference();
  const acceptDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const creditDelay = client.creditDelayDays || settings.creditDelayDays;

  try {
    const order = await db.$transaction(async (tx) => {
      for (const item of input.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity }, active: true, available: true },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error("STOCK_CONFLICT");
        }
      }

      const created = await tx.order.create({
        data: {
          reference,
          clientId: client.id,
          supplierId,
          deliveryDate,
          deliverySlot,
          deliveryMode: input.deliveryMode,
          address: input.address,
          note: input.note || null,
          status: "SENT",
          subtotal,
          supplierTotal,
          commissionRate:
            subtotal > 0 ? (commissionAmount / subtotal) * 100 : settings.commissionRate,
          commissionAmount,
          deliveryFee,
          total,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
          creditDueDate:
            input.paymentMethod === "CREDIT"
              ? new Date(Date.now() + creditDelay * 24 * 60 * 60 * 1000)
              : null,
          acceptDeadline,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              unit: line.unit,
              quantity: line.quantity,
              preparation: line.preparation,
              preparationFee: line.preparationFee,
              unitPrice: line.unitPrice,
              supplierUnitPrice: line.supplierUnitPrice,
              lineTotal: line.lineTotal,
            })),
          },
          delivery: { create: { status: "PENDING" } },
          payments: {
            create: {
              amount: total,
              method: input.paymentMethod,
              status: "PENDING",
              clientId: client.id,
            },
          },
        },
      });

      if (input.paymentMethod === "CREDIT") {
        await tx.client.update({
          where: { id: client.id },
          data: { balanceDue: { increment: total } },
        });
      }

      return created;
    });

    await logActivity({
      userId: input.userId,
      action: "ORDER_CREATED",
      entity: "Order",
      entityId: order.id,
      after: { reference: order.reference, total: order.total, paymentMethod: order.paymentMethod },
    });

    const supplierUser = products[0]?.supplier.user;
    if (supplierUser) {
      await notify({
        userId: supplierUser.id,
        orderId: order.id,
        recipient: supplierUser.phone,
        event: "ORDER_NEW",
        message: `Nouvelle commande ${order.reference} de ${client.establishment} — ${total} FCFA. Acceptez sous 2 h.`,
      });
    }

    return { ok: true, orderId: order.id, reference: order.reference };
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_CONFLICT") {
      return { ok: false, error: "Un produit a été épuisé entre-temps. Actualisez votre panier." };
    }
    return { ok: false, error: "Impossible de créer la commande. Réessayez." };
  }
}
