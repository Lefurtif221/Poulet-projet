"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, buttonClass } from "@/components/ui";
import { addToCart } from "@/lib/cart";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_UNIT } from "@/lib/labels";
import type { ProductCategory, ProductUnit } from "@prisma/client";
import { cn } from "@/lib/utils";

export type CatalogueProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  price: number;
  stock: number;
  imageUrl: string | null;
  description: string | null;
  availableFrom: string | null;
  supplierId: string;
  supplierName: string;
  supplierLocation: string;
};

const CATEGORY_ICON: Record<ProductCategory, string> = {
  POULET_CHAIR: "set_meal",
  POULET_FERMIER: "pets",
  OEUFS: "egg",
};

function ProductImage({ product, compact }: { product: CatalogueProduct; compact?: boolean }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        className={cn("w-full object-cover", compact ? "h-20 w-20 rounded-lg" : "aspect-[16/10]")}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed",
        compact ? "h-20 w-20 rounded-lg" : "aspect-[16/10]"
      )}
    >
      <Icon name={CATEGORY_ICON[product.category]} className={compact ? "text-2xl" : "text-5xl text-primary-container/60"} />
    </div>
  );
}

export function ProductCard({ product }: { product: CatalogueProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  function add() {
    addToCart(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        imageUrl: product.imageUrl,
        maxStock: product.stock,
      },
      quantity
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="card card-hover flex flex-col overflow-hidden border-t-[3px] border-t-primary-container">
      <div className="relative">
        <ProductImage product={product} />
        <span className="absolute left-2 top-2 badge bg-white/90 text-on-surface shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {product.supplierName}
        </span>
        <span className="absolute right-2 top-2 badge bg-surface-container-lowest/95 text-on-surface-variant shadow-sm">
          Stock : {product.stock} {PRODUCT_UNIT[product.unit]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">
          {product.supplierLocation}
        </p>
        <h3 className="mt-0.5 font-display text-base font-semibold leading-tight">{product.name}</h3>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{product.description}</p>
        ) : null}

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Prix pro
            </p>
            <p className="money text-lg">
              {formatFCFA(product.price)}
              <span className="ml-1 font-sans text-[10px] font-medium text-on-surface-variant">
                / {PRODUCT_UNIT[product.unit]}
              </span>
            </p>
          </div>
          <span className="badge bg-primary-fixed/60 text-primary">
            {product.availableFrom ? `Dispo ${product.availableFrom}` : "Disponible"}
          </span>
        </div>

        {outOfStock ? (
          <div className="mt-3">
            <Link href={`/client/catalogue?supplier=${product.supplierId}`} className={buttonClass("outline", "md", "w-full")}>
              Voir les autres produits de l&apos;éleveur
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-outline-variant/60">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="flex h-11 w-10 items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
                aria-label="Diminuer"
              >
                <Icon name="remove" className="text-lg" />
              </button>
              <span className="w-9 text-center text-sm font-bold tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                className="flex h-11 w-10 items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
                aria-label="Augmenter"
              >
                <Icon name="add" className="text-lg" />
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              className={buttonClass(added ? "secondary" : "primary", "md", "flex-1")}
            >
              <Icon name={added ? "check" : "add_shopping_cart"} className="text-lg" />
              {added ? "Ajouté" : formatFCFA(product.price * quantity)}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
