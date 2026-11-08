import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { ProductForm } from "@/components/supplier/product-form";

export const metadata: Metadata = { title: "Nouveau produit" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/fournisseur/produits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container">
        <Icon name="arrow_back" className="text-lg" />
        Retour aux produits
      </Link>
      <div className="card p-4 md:p-6">
        <h1 className="font-display text-xl font-bold tracking-tight">Publier un produit</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Renseignez votre prix éleveur. Le client verra le prix final commission incluse.
        </p>
        <div className="mt-5">
          <ProductForm />
        </div>
      </div>
    </div>
  );
}
