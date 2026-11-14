"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductUnit } from "@prisma/client";
import { Icon, buttonClass } from "@/components/ui";
import { addToCart, readDeliveryMode, writeDeliveryMode, type DeliveryMode, type Preparation } from "@/lib/cart";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_UNIT } from "@/lib/labels";
import { cn } from "@/lib/utils";

type ProductDetailProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    unit: ProductUnit;
    category: string;
    stock: number;
    supplierId: string;
    supplierName: string;
    supplierLocation: string;
  };
  basePrice: number;
  pluckingFee: number;
  groupageFee: number;
  individualFee: number;
  freeThreshold: number;
  groupageLeadDays: number;
  groupageSlot: string;
};

function dateFromNow(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

export function ProductDetail({
  product,
  basePrice,
  pluckingFee,
  groupageFee,
  individualFee,
  freeThreshold,
  groupageLeadDays,
  groupageSlot,
}: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [plucked, setPlucked] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("INDIVIDUAL");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setDeliveryMode(readDeliveryMode());
  }, []);

  const preparationFee = plucked ? pluckingFee : 0;
  const unitPrice = basePrice + preparationFee;
  const subtotal = unitPrice * quantity;
  const deliveryFee =
    subtotal >= freeThreshold ? 0 : deliveryMode === "GROUPAGE" ? groupageFee : individualFee;
  const groupageDate = dateFromNow(Math.max(1, groupageLeadDays));
  const earliest = dateFromNow(new Date().getUTCHours() >= 22 ? 2 : 1);
  const outOfStock = product.stock <= 0;

  function chooseMode(mode: DeliveryMode) {
    setDeliveryMode(mode);
    writeDeliveryMode(mode);
  }

  function add() {
    addToCart(
      {
        productId: product.id,
        name: product.name,
        price: unitPrice,
        unit: product.unit,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        imageUrl: product.imageUrl,
        maxStock: product.stock,
        preparation: (plucked ? "PLUCKED" : "STANDARD") as Preparation,
        preparationFee,
      },
      quantity
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Link href="/client/catalogue" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container">
        <Icon name="arrow_back" className="text-lg" />
        Retour au catalogue
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed">
              <Icon name="egg_alt" className="text-6xl text-primary-container/60" />
            </div>
          )}
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
              {product.supplierLocation}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {product.supplierName} · {PRODUCT_UNIT[product.unit]} · Stock : {product.stock}
            </p>
            {product.description ? (
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{product.description}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Prix pro
                </p>
                <p className="money text-2xl">{formatFCFA(basePrice)}</p>
                <p className="text-[11px] text-on-surface-variant">/ {PRODUCT_UNIT[product.unit]}</p>
              </div>
              <span className="badge bg-primary-fixed/60 text-primary">
                {outOfStock ? "Rupture" : "Disponible"}
              </span>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/50 p-3">
              <input
                type="checkbox"
                checked={plucked}
                onChange={(event) => setPlucked(event.target.checked)}
                disabled={outOfStock}
                className="mt-0.5 h-4 w-4 accent-[#185338]"
              />
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Déplumé</span>
                  <span className="text-xs font-semibold text-primary-container">
                    {pluckingFee > 0 ? `+ ${formatFCFA(pluckingFee)} / unité` : "Inclus"}
                  </span>
                </span>
                <span className="block text-[11px] text-on-surface-variant">
                  La volaille est préparée, plumée et nettoyée avant l&apos;enlèvement.
                </span>
              </span>
            </label>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-base font-semibold">Mode de livraison</h2>
            <div className="mt-2 space-y-2">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  deliveryMode === "GROUPAGE" ? "border-primary-container bg-primary-fixed/20" : "border-outline-variant/50"
                )}
              >
                <input
                  type="radio"
                  name="deliveryModeDetail"
                  checked={deliveryMode === "GROUPAGE"}
                  onChange={() => chooseMode("GROUPAGE")}
                  className="mt-1 h-4 w-4 accent-[#185338]"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Groupage</span>
                    <span className="text-xs font-semibold">
                      {groupageFee === 0 ? "Offerte" : formatFCFA(groupageFee)}
                    </span>
                  </span>
                  <span className="block text-[11px] text-on-surface-variant">
                    Moins cher, mais livraison groupée à partir du{" "}
                    {groupageDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} (
                    {groupageSlot}).
                  </span>
                </span>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  deliveryMode === "INDIVIDUAL" ? "border-primary-container bg-primary-fixed/20" : "border-outline-variant/50"
                )}
              >
                <input
                  type="radio"
                  name="deliveryModeDetail"
                  checked={deliveryMode === "INDIVIDUAL"}
                  onChange={() => chooseMode("INDIVIDUAL")}
                  className="mt-1 h-4 w-4 accent-[#185338]"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Individuelle</span>
                    <span className="text-xs font-semibold">
                      {individualFee === 0 ? "Offerte" : formatFCFA(individualFee)}
                    </span>
                  </span>
                  <span className="block text-[11px] text-on-surface-variant">
                    Plus rapide, créneau au choix dès le{" "}
                    {earliest.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.
                  </span>
                </span>
              </label>
            </div>
            <p className="mt-2 text-[10px] text-on-surface-variant">
              Livraison offerte à partir de {formatFCFA(freeThreshold)} de produits.
            </p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={outOfStock}
                  className="flex h-11 w-10 items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
                  aria-label="Diminuer"
                >
                  <Icon name="remove" className="text-lg" />
                </button>
                <span className="w-10 text-center text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                  disabled={outOfStock}
                  className="flex h-11 w-10 items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
                  aria-label="Augmenter"
                >
                  <Icon name="add" className="text-lg" />
                </button>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Total produits</p>
                <p className="money text-xl">{formatFCFA(subtotal)}</p>
                <p className="text-[10px] text-on-surface-variant">
                  + livraison {deliveryFee === 0 ? "offerte" : formatFCFA(deliveryFee)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={add}
              disabled={outOfStock}
              className={buttonClass(added ? "secondary" : "primary", "md", "mt-3 w-full")}
            >
              <Icon name={added ? "check" : "add_shopping_cart"} className="text-lg" />
              {added ? "Ajouté au panier" : "Ajouter au panier"}
            </button>
            {added ? (
              <Link href="/client/panier" className={buttonClass("outline", "md", "mt-2 w-full")}>
                Voir le panier
                <Icon name="arrow_forward" className="text-lg" />
              </Link>
            ) : null}
            {outOfStock ? (
              <p className="mt-2 text-center text-xs text-[#a8421a]">
                Produit en rupture. Revenez plus tard ou choisissez un autre produit.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
