"use client";

import type { ProductUnit } from "@prisma/client";

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
};

const KEY = "guanar_cart_v1";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.productId && item.quantity > 0) : [];
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
