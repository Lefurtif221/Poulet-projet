"use client";

import type { ProductUnit } from "@prisma/client";

export type Preparation = "STANDARD" | "PLUCKED";
export type DeliveryMode = "GROUPAGE" | "INDIVIDUAL";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  unit: ProductUnit;
  supplierId: string;
  supplierName: string;
  imageUrl?: string | null;
  quantity: number;
  maxStock: number;
  preparation: Preparation;
  preparationFee: number;
};

const KEY = "guanar_cart_v2";
const DELIVERY_KEY = "guanar_delivery_mode";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.productId && item.quantity > 0)
      .map((item) => ({
        ...item,
        preparation: item.preparation === "PLUCKED" ? "PLUCKED" : "STANDARD",
        preparationFee: item.preparation === "PLUCKED" ? Math.max(0, item.preparationFee ?? 0) : 0,
      }));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("guanar-cart"));
}

export function addToCart(item: Omit<CartItem, "quantity">, quantity: number): void {
  const cart = readCart();
  const existing = cart.find((line) => line.productId === item.productId);
  if (existing) {
    existing.quantity = Math.min(item.maxStock, existing.quantity + quantity);
    existing.price = item.price;
    existing.maxStock = item.maxStock;
    existing.preparation = item.preparation;
    existing.preparationFee = item.preparationFee;
  } else {
    cart.push({ ...item, quantity: Math.min(item.maxStock, Math.max(1, quantity)) });
  }
  writeCart(cart);
}

export function updateQuantity(productId: string, quantity: number): void {
  const cart = readCart()
    .map((line) =>
      line.productId === productId
        ? { ...line, quantity: Math.max(0, Math.min(line.maxStock, quantity)) }
        : line
    )
    .filter((line) => line.quantity > 0);
  writeCart(cart);
}

export function removeFromCart(productId: string): void {
  writeCart(readCart().filter((line) => line.productId !== productId));
}

export function clearCart(): void {
  writeCart([]);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function readDeliveryMode(): DeliveryMode {
  if (typeof window === "undefined") return "INDIVIDUAL";
  return window.localStorage.getItem(DELIVERY_KEY) === "GROUPAGE" ? "GROUPAGE" : "INDIVIDUAL";
}

export function writeDeliveryMode(mode: DeliveryMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DELIVERY_KEY, mode);
  window.dispatchEvent(new Event("guanar-delivery-mode"));
}
