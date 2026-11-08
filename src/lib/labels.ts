import type {
  DeliveryStatus,
  DisputeStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  ProductCategory,
  ProductUnit,
  Role,
} from "@prisma/client";

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; tone: string; dot: string; step?: number }
> = {
  SENT: { label: "Envoyée", tone: "bg-blue-50 text-blue-700", dot: "bg-blue-500", step: 1 },
  CONFIRMED: { label: "Confirmée", tone: "bg-teal-50 text-teal-700", dot: "bg-teal-500", step: 2 },
  PREPARING: { label: "En préparation", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500", step: 3 },
  READY: { label: "Prête à enlever", tone: "bg-lime-50 text-lime-700", dot: "bg-lime-500", step: 4 },
  IN_DELIVERY: { label: "En livraison", tone: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500", step: 5 },
  DELIVERED: { label: "Livrée", tone: "bg-green-50 text-green-700", dot: "bg-green-500", step: 6 },
  CLOSED: { label: "Clôturée", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-600", step: 7 },
  DISPUTED: { label: "En litige", tone: "bg-red-50 text-red-700", dot: "bg-red-500" },
  REFUSED: { label: "Refusée", tone: "bg-red-50 text-red-700", dot: "bg-red-500" },
  REASSIGNED: { label: "Réassignée", tone: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  CANCELLED: { label: "Annulée", tone: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, { label: string; short: string }> = {
  WAVE: { label: "Wave", short: "Wave" },
  ORANGE_MONEY: { label: "Orange Money", short: "OM" },
  CASH_ON_DELIVERY: { label: "Paiement à la livraison", short: "Comptant" },
  CREDIT: { label: "Crédit B2B", short: "Crédit" },
  BANK_TRANSFER: { label: "Virement bancaire", short: "Virement" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "bg-amber-50 text-amber-700" },
  PAID: { label: "Payé", tone: "bg-green-50 text-green-700" },
  FAILED: { label: "Échoué", tone: "bg-red-50 text-red-700" },
  REFUNDED: { label: "Remboursé", tone: "bg-slate-100 text-slate-600" },
};

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: string }> = {
  PENDING: { label: "À reverser", tone: "bg-amber-50 text-amber-700" },
  PROCESSING: { label: "En cours", tone: "bg-blue-50 text-blue-700" },
  PAID: { label: "Payé", tone: "bg-green-50 text-green-700" },
  BLOCKED: { label: "Bloqué", tone: "bg-red-50 text-red-700" },
};

export const DELIVERY_STATUS: Record<DeliveryStatus, { label: string; tone: string }> = {
  PENDING: { label: "À enlever", tone: "bg-amber-50 text-amber-700" },
  PICKED_UP: { label: "Enlevée", tone: "bg-indigo-50 text-indigo-700" },
  DELIVERED: { label: "Livrée", tone: "bg-green-50 text-green-700" },
  FAILED: { label: "Échouée", tone: "bg-red-50 text-red-700" },
};

export const DISPUTE_STATUS: Record<DisputeStatus, { label: string; tone: string }> = {
  OPEN: { label: "Ouvert", tone: "bg-red-50 text-red-700" },
  RESOLVED: { label: "Résolu", tone: "bg-green-50 text-green-700" },
  REJECTED: { label: "Rejeté", tone: "bg-slate-100 text-slate-600" },
};

export const PRODUCT_CATEGORY: Record<ProductCategory, string> = {
  POULET_CHAIR: "Poulet de chair",
  POULET_FERMIER: "Poulet fermier / local",
  OEUFS: "Œufs",
};

export const PRODUCT_UNIT: Record<ProductUnit, string> = {
  PIECE: "pièce",
  KG: "kg",
  PLATEAU: "plateau de 30",
};

export const ROLE: Record<Role, string> = {
  CLIENT: "Client pro",
  FOURNISSEUR: "Éleveur",
  ADMIN: "Administrateur",
};

export const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "SENT", label: "Envoyée" },
  { status: "CONFIRMED", label: "Confirmée" },
  { status: "PREPARING", label: "En préparation" },
  { status: "READY", label: "Prête" },
  { status: "IN_DELIVERY", label: "En livraison" },
  { status: "DELIVERED", label: "Livrée" },
  { status: "CLOSED", label: "Clôturée" },
];
