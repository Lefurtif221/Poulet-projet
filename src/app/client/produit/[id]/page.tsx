import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, clientUnitPrice, resolveCommissionRate } from "@/lib/settings";
import { ProductDetail } from "@/components/catalogue/product-detail";

export const metadata: Metadata = { title: "Produit" };

type Params = Promise<{ id: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const user = await requireUser("CLIENT");
  const { id } = await params;

  const [product, settings, client, rules] = await Promise.all([
    db.product.findFirst({
      where: { id, active: true },
      include: { supplier: true },
    }),
    getSettings(),
    db.client.findUnique({ where: { userId: user.sub }, select: { id: true } }),
    db.commissionRule.findMany(),
  ]);

  if (!product) notFound();
  const clientId = client?.id ?? "";
  const rate = resolveCommissionRate(
    rules,
    { productId: product.id, supplierId: product.supplierId, clientId },
    settings.commissionRate
  );

  return (
    <ProductDetail
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        unit: product.unit,
        category: product.category,
        stock: product.stock,
        supplierId: product.supplierId,
        supplierName: product.supplier.farmName,
        supplierLocation: product.supplier.location,
      }}
      basePrice={clientUnitPrice(product.price, rate)}
      pluckingFee={settings.pluckingFee}
      groupageFee={settings.groupageDeliveryFee}
      individualFee={settings.deliveryFee}
      freeThreshold={settings.freeDeliveryThreshold}
      groupageLeadDays={settings.groupageLeadDays}
      groupageSlot={settings.groupageSlot}
    />
  );
}
