"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { saveImage } from "@/lib/uploads";
import { supplierOrderTotal } from "@/lib/payments";
import { notify } from "@/lib/notify";

export type SupplierActionState = { error?: string; success?: string };

async function currentSupplier() {
  const user = await requireUser("FOURNISSEUR");
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  return { user, supplier };
}

export async function toggleSupplierOpenAction(): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  await db.supplier.update({
    where: { id: supplier.id },
    data: { isOpen: !supplier.isOpen, isPaused: supplier.isOpen, pauseReason: supplier.isOpen ? "Pause manuelle" : null },
  });
  await logActivity({
    userId: user.sub,
    action: supplier.isOpen ? "SUPPLIER_PAUSED" : "SUPPLIER_OPENED",
    entity: "Supplier",
    entityId: supplier.id,
  });
  revalidatePath("/fournisseur");
}

export async function pauseSupplierAction(formData: FormData): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  const reason = String(formData.get("reason") ?? "Rupture / pause").trim();
  await db.supplier.update({
    where: { id: supplier.id },
    data: { isOpen: false, isPaused: true, pauseReason: reason },
  });
  await logActivity({
    userId: user.sub,
    action: "SUPPLIER_PAUSED",
    entity: "Supplier",
    entityId: supplier.id,
    after: { reason },
  });
  revalidatePath("/fournisseur");
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Nom du produit requis"),
  category: z.enum(["POULET_CHAIR", "POULET_FERMIER", "OEUFS"]),
  unit: z.enum(["PIECE", "KG", "PLATEAU"]),
  price: z.coerce.number().int().min(100, "Prix trop bas"),
  stock: z.coerce.number().int().min(0),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  availableFrom: z.string().optional(),
});

export async function createProductAction(
  _prev: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return { error: "Profil fournisseur introuvable." };
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  let imageUrl = parsed.data.imageUrl?.trim() || null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      imageUrl = await saveImage(photo);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Photo invalide." };
    }
  }

  const product = await db.product.create({
    data: {
      supplierId: supplier.id,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      price: parsed.data.price,
      stock: parsed.data.stock,
      description: parsed.data.description || null,
      imageUrl,
      availableFrom: parsed.data.availableFrom ? new Date(`${parsed.data.availableFrom}T08:00:00Z`) : null,
    },
  });
  await logActivity({
    userId: user.sub,
    action: "PRODUCT_CREATED",
    entity: "Product",
    entityId: product.id,
    after: { name: product.name, price: product.price },
  });
  redirect("/fournisseur/produits");
}

export async function updateProductAction(
  _prev: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return { error: "Profil fournisseur introuvable." };
  const productId = String(formData.get("productId") ?? "");

  const existing = await db.product.findFirst({
    where: { id: productId, supplierId: supplier.id },
  });
  if (!existing) return { error: "Produit introuvable." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  let imageUrl = parsed.data.imageUrl?.trim() || existing.imageUrl;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      imageUrl = await saveImage(photo);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Photo invalide." };
    }
  }

  await db.product.update({
    where: { id: productId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      price: parsed.data.price,
      stock: parsed.data.stock,
      description: parsed.data.description || null,
      imageUrl,
      availableFrom: parsed.data.availableFrom
        ? new Date(`${parsed.data.availableFrom}T08:00:00Z`)
        : null,
    },
  });
  await logActivity({
    userId: user.sub,
    action: "PRODUCT_UPDATED",
    entity: "Product",
    entityId: productId,
    before: { name: existing.name, price: existing.price, stock: existing.stock },
    after: { name: parsed.data.name, price: parsed.data.price, stock: parsed.data.stock },
  });
  redirect("/fournisseur/produits");
}

export async function toggleProductAction(formData: FormData): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  const productId = String(formData.get("productId") ?? "");
  const product = await db.product.findFirst({ where: { id: productId, supplierId: supplier.id } });
  if (!product) return;
  await db.product.update({ where: { id: product.id }, data: { active: !product.active } });
  await logActivity({
    userId: user.sub,
    action: product.active ? "PRODUCT_HIDDEN" : "PRODUCT_SHOWN",
    entity: "Product",
    entityId: product.id,
  });
  revalidatePath("/fournisseur/produits");
}

export async function quickStockAction(formData: FormData): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  const productId = String(formData.get("productId") ?? "");
  const stock = Number(formData.get("stock") ?? 0);
  if (!Number.isFinite(stock) || stock < 0) return;
  const product = await db.product.findFirst({ where: { id: productId, supplierId: supplier.id } });
  if (!product) return;
  await db.product.update({ where: { id: product.id }, data: { stock, available: stock > 0 } });
  await logActivity({
    userId: user.sub,
    action: "STOCK_UPDATED",
    entity: "Product",
    entityId: product.id,
    before: { stock: product.stock },
    after: { stock },
  });
  revalidatePath("/fournisseur");
}

export async function acceptOrderAction(formData: FormData): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, supplierId: supplier.id },
    include: { client: { include: { user: true } } },
  });
  if (!order || order.status !== "SENT") return;
  await db.order.update({
    where: { id: order.id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  await logActivity({ userId: user.sub, action: "ORDER_CONFIRMED", entity: "Order", entityId: order.id });
  await notify({
    userId: order.client.userId,
    orderId: order.id,
    recipient: order.client.user.phone,
    event: "ORDER_CONFIRMED",
    message: `Commande ${order.reference} confirmée par l'éleveur. Livraison prévue le ${order.deliveryDate.toLocaleDateString("fr-FR")} (${order.deliverySlot}).`,
  });
  redirect("/fournisseur");
}

export async function refuseOrderAction(
  _prev: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return { error: "Profil fournisseur introuvable." };
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Indiquez un motif de refus." };

  const order = await db.order.findFirst({
    where: { id: orderId, supplierId: supplier.id },
    include: { items: true, client: { include: { user: true } } },
  });
  if (!order || order.status !== "SENT") return { error: "Cette commande ne peut plus être refusée." };

  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "REFUSED", refusedAt: new Date(), refusalReason: reason },
    });
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

  await logActivity({
    userId: user.sub,
    action: "ORDER_REFUSED",
    entity: "Order",
    entityId: order.id,
    after: { reason },
  });
  await notify({
    userId: order.client.userId,
    orderId: order.id,
    recipient: order.client.user.phone,
    event: "ORDER_REFUSED",
    message: `Commande ${order.reference} refusée par l'éleveur (${reason}). L'administrateur vous propose une solution.`,
  });
  redirect("/fournisseur");
}

export async function startPreparingAction(formData: FormData): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({ where: { id: orderId, supplierId: supplier.id } });
  if (!order || !["CONFIRMED", "SENT"].includes(order.status)) return;
  await db.order.update({ where: { id: order.id }, data: { status: "PREPARING" } });
  await logActivity({ userId: user.sub, action: "ORDER_PREPARING", entity: "Order", entityId: order.id });
  redirect("/fournisseur");
}

export async function markReadyAction(formData: FormData): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, supplierId: supplier.id },
    include: { client: { include: { user: true } } },
  });
  if (!order || !["CONFIRMED", "PREPARING"].includes(order.status)) return;

  let photoUrl: string | null = null;
  try {
    photoUrl = await saveImage(formData.get("photo") as File | null);
  } catch {
    photoUrl = null;
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "READY",
      readyAt: new Date(),
      delivery: { update: { photoUrl } },
    },
  });
  await logActivity({ userId: user.sub, action: "ORDER_READY", entity: "Order", entityId: order.id });
  await notify({
    userId: order.client.userId,
    orderId: order.id,
    recipient: order.client.user.phone,
    event: "ORDER_READY",
    message: `Commande ${order.reference} prête à enlever. Le livreur est en route pour la livraison ${order.deliverySlot}.`,
  });
  redirect("/fournisseur");
}

const profileSchema = z.object({
  farmName: z.string().trim().min(2, "Nom de l'élevage requis"),
  location: z.string().trim().min(2, "Localisation requise"),
  capacity: z.coerce.number().int().min(0),
  farmType: z.string().trim().optional(),
  description: z.string().trim().optional(),
  paymentProvider: z.string().trim().optional(),
  paymentAccount: z.string().trim().optional(),
});

export async function updateSupplierProfileAction(
  _prev: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return { error: "Profil fournisseur introuvable." };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const accountChanged = parsed.data.paymentAccount && parsed.data.paymentAccount !== supplier.paymentAccount;
  await db.supplier.update({
    where: { id: supplier.id },
    data: {
      farmName: parsed.data.farmName,
      location: parsed.data.location,
      capacity: parsed.data.capacity,
      farmType: parsed.data.farmType || null,
      description: parsed.data.description || null,
      paymentProvider: parsed.data.paymentProvider || null,
      paymentAccount: parsed.data.paymentAccount || null,
    },
  });

  await logActivity({
    userId: user.sub,
    action: "SUPPLIER_PROFILE_UPDATED",
    entity: "Supplier",
    entityId: supplier.id,
    before: { paymentAccount: supplier.paymentAccount },
    after: { paymentAccount: parsed.data.paymentAccount, accountChanged: Boolean(accountChanged) },
  });

  return {
    success: accountChanged
      ? "Profil mis à jour. Le nouveau numéro de paiement sera confirmé par appel avant utilisation."
      : "Profil mis à jour.",
  };
}

export async function requestPayoutAction(): Promise<void> {
  const { user, supplier } = await currentSupplier();
  if (!supplier) return;

  const orders = await db.order.findMany({
    where: { supplierId: supplier.id, status: "CLOSED", payoutItems: { none: {} } },
    include: { items: true, dispute: true },
  });

  const eligible = orders.filter((order) => !order.dispute || order.dispute.status === "RESOLVED");
  if (eligible.length === 0) {
    revalidatePath("/fournisseur/paiements");
    return;
  }

  const rows = eligible.map((order) => {
    const adjustment = order.dispute?.adjustedAmount ?? 0;
    return {
      orderId: order.id,
      amount: Math.max(0, supplierOrderTotal(order.items) - adjustment),
    };
  });
  const amount = rows.reduce((total, row) => total + row.amount, 0);
  if (amount <= 0) return;

  await db.payout.create({
    data: {
      supplierId: supplier.id,
      amount,
      status: "PENDING",
      note: `Demande de reversement (${rows.length} commande(s))`,
      items: { create: rows },
    },
  });
  await logActivity({
    userId: user.sub,
    action: "PAYOUT_REQUESTED",
    entity: "Supplier",
    entityId: supplier.id,
    after: { amount, orders: rows.length },
  });
  revalidatePath("/fournisseur/paiements");
}
