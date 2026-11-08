import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Icon } from "@/components/ui";
import { ProductForm } from "@/components/supplier/product-form";

export const metadata: Metadata = { title: "Modifier un produit" };

type Params = Promise<{ id: string }>;

export default async function EditProductPage({ params }: { params: Params }) {
  const user = await requireUser("FOURNISSEUR");
  const { id } = await params;
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  if (!supplier) return null;
  const product = await db.product.findFirst({ where: { id, supplierId: supplier.id } });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/fournisseur/produits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container">
        <Icon name="arrow_back" className="text-lg" />
        Retour aux produits
      </Link>
      <div className="card p-4 md:p-6">
        <h1 className="font-display text-xl font-bold tracking-tight">Modifier le produit</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Un prix modifié ne s&apos;applique qu&apos;aux nouvelles commandes.
        </p>
        <div className="mt-5">
          <ProductForm product={product} />
        </div>
      </div>
    </div>
  );
}
