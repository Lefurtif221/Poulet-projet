"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, buttonClass } from "@/components/ui";
import { cartSubtotal, readCart, removeFromCart, updateQuantity, type CartItem } from "@/lib/cart";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_UNIT } from "@/lib/labels";

export function CartPanel({
  minOrder,
  deliveryFee,
  freeDeliveryThreshold,
}: {
  minOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setItems(readCart());
      setReady(true);
    };
    sync();
    window.addEventListener("guanar-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("guanar-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const subtotal = cartSubtotal(items);
  const fee = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : deliveryFee;
  const missing = Math.max(0, minOrder - subtotal);
  const canOrder = items.length > 0 && missing === 0;

  return (
    <>
      <aside className="hidden lg:block">
        <div className="card sticky top-28 overflow-hidden">
          <div className="flex items-center justify-between bg-primary-container px-4 py-3 text-white">
            <p className="flex items-center gap-2 font-display text-sm font-semibold">
              <Icon name="shopping_basket" className="text-lg" />
              Mon panier B2B
            </p>
            <span className="badge bg-white/15 text-white">{items.length} ligne(s)</span>
          </div>

          {!ready ? null : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Icon name="shopping_basket" className="text-4xl text-outline-variant" />
              <p className="mt-2 text-sm font-semibold">Votre panier est vide</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Ajoutez des produits pour préparer une commande.
              </p>
            </div>
          ) : (
            <div className="max-h-[45vh] space-y-3 overflow-y-auto px-4 py-3">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-2.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container">
                    <Icon name="egg_alt" className="text-xl text-primary-container" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{item.name}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {item.supplierName} · {formatFCFA(item.price)}/{PRODUCT_UNIT[item.unit]}
                      {item.preparation === "PLUCKED" ? " · Déplumé" : ""}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded border border-outline-variant/60">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-on-surface-variant"
                          aria-label="Diminuer"
                        >
                          <Icon name="remove" className="text-sm" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-on-surface-variant"
                          aria-label="Augmenter"
                        >
                          <Icon name="add" className="text-sm" />
                        </button>
                      </div>
                      <span className="money text-xs">{formatFCFA(item.price * item.quantity)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="self-start text-on-surface-variant hover:text-[#a8421a]"
                    aria-label={`Retirer ${item.name}`}
                  >
                    <Icon name="close" className="text-base" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-outline-variant/30 px-4 py-3 text-sm">
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Sous-total</span>
              <span className="money text-on-surface">{formatFCFA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Livraison</span>
              <span className={fee === 0 ? "font-semibold text-primary-container" : "money"}>
                {fee === 0 ? "Offerte" : formatFCFA(fee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-outline-variant/30 pt-2">
              <span className="font-semibold">Total</span>
              <span className="money text-lg">{formatFCFA(subtotal + fee)}</span>
            </div>
            {missing > 0 ? (
              <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                Commande minimum : encore {formatFCFA(missing)}
              </p>
            ) : null}
            <Link
              href="/client/panier"
              aria-disabled={!canOrder}
              className={buttonClass("primary", "md", `w-full ${!canOrder ? "pointer-events-none opacity-50" : ""}`)}
            >
              Valider la commande
              <Icon name="arrow_forward" className="text-lg" />
            </Link>
          </div>
        </div>
      </aside>

      {ready && items.length > 0 ? (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 lg:hidden">
          <Link
            href="/client/panier"
            className="flex items-center justify-between rounded-xl bg-primary-container px-4 py-3 text-white shadow-xl"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="shopping_basket" className="text-lg" />
              {items.length} ligne(s)
            </span>
            <span className="flex items-center gap-2">
              <span className="money text-sm">{formatFCFA(subtotal + fee)}</span>
              <Icon name="arrow_forward" className="text-lg" />
            </span>
          </Link>
        </div>
      ) : null}
    </>
  );
}
