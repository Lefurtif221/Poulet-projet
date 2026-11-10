"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Product } from "@prisma/client";
import {
  createProductAction,
  updateProductAction,
  type SupplierActionState,
} from "@/lib/actions/supplier";
import { Alert, Field, buttonClass } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { PRODUCT_CATEGORY, PRODUCT_UNIT } from "@/lib/labels";

const initial: SupplierActionState = {};

export function ProductForm({ product }: { product?: Product }) {
  const mode = product ? "edit" : "create";
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Nom du produit" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={product?.name}
          placeholder="Poulet de chair PAC 1,4 kg"
          className="input"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="category">
          <select id="category" name="category" className="input" defaultValue={product?.category ?? "POULET_CHAIR"}>
            {Object.entries(PRODUCT_CATEGORY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unité de vente" htmlFor="unit">
          <select id="unit" name="unit" className="input" defaultValue={product?.unit ?? "PIECE"}>
            {Object.entries(PRODUCT_UNIT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Votre prix (FCFA)" htmlFor="price" hint="La commission plateforme est ajoutée au prix client.">
          <input
            id="price"
            name="price"
            type="number"
            min={100}
            required
            defaultValue={product?.price}
            placeholder="2400"
            className="input"
          />
        </Field>
        <Field label="Stock disponible" htmlFor="stock">
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            required
            defaultValue={product?.stock ?? 0}
            className="input"
          />
        </Field>
      </div>

      <Field label="Date de disponibilité (facultatif)" htmlFor="availableFrom">
        <input
          id="availableFrom"
          name="availableFrom"
          type="date"
          defaultValue={product?.availableFrom ? product.availableFrom.toISOString().slice(0, 10) : ""}
          className="input"
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <textarea
          id="description"
          name="description"
          defaultValue={product?.description ?? ""}
          className="textarea"
          placeholder="Calibre, poids, découpe, alimentation, conditions de transport…"
        />
      </Field>

      <Field
        label="Photo du produit"
        htmlFor="photo"
        hint="JPEG, PNG ou WebP · 3 Mo maximum. Si tu ajoutes une photo, elle remplace l'URL ci-dessous."
      >
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="input file:mr-3 file:rounded-md file:border-0 file:bg-surface-container file:px-3 file:py-1.5 file:text-xs file:font-semibold"
        />
      </Field>

      <Field label="Ou URL d'image (optionnel)" htmlFor="imageUrl">
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={product?.imageUrl && !product.imageUrl.startsWith("/images/") ? product.imageUrl : ""}
          placeholder="https://…"
          className="input"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel={mode === "edit" ? "Enregistrement…" : "Publication…"}>
          {mode === "edit" ? "Enregistrer les modifications" : "Publier le produit"}
        </SubmitButton>
        <Link href="/fournisseur/produits" className={buttonClass("outline")}>
          Annuler
        </Link>
      </div>
    </form>
  );
}
