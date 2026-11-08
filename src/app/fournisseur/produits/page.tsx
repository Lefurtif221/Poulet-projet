import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { clientUnitPrice } from "@/lib/settings";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_CATEGORY, PRODUCT_UNIT } from "@/lib/labels";
import { ButtonLink, EmptyState, Icon, buttonClass } from "@/components/ui";
import { toggleProductAction } from "@/lib/actions/supplier";

export const metadata: Metadata = { title: "Mes produits" };

export default async function SupplierProductsPage() {
  const user = await requireUser("FOURNISSEUR");
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  if (!supplier) return null;
  const [products, settings] = await Promise.all([
    db.product.findMany({ where: { supplierId: supplier.id }, orderBy: { createdAt: "desc" } }),
    getSettings(),
  ]);

  const rate = settings.commissionRate / 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Mes produits</h1>
          <p className="text-sm text-on-surface-variant">
            Prix éleveur, stock et disponibilité. La commission plateforme est ajoutée côté client.
          </p>
        </div>
        <ButtonLink href="/fournisseur/produits/nouveau">
          <Icon name="add" className="text-lg" />
          Nouveau produit
        </ButtonLink>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="Aucun produit publié"
          description="Publiez vos poulets et plateaux d'œufs pour recevoir des commandes."
          action={
            <ButtonLink href="/fournisseur/produits/nouveau">
              <Icon name="add" className="text-lg" />
              Publier mon premier produit
            </ButtonLink>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th className="text-right">Prix éleveur</th>
                <th className="text-right">Prix client</th>
                <th className="text-right">Stock</th>
                <th>Disponibilité</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className={!product.active ? "opacity-50" : undefined}>
                  <td>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {PRODUCT_UNIT[product.unit]}
                      {product.description ? ` · ${product.description.slice(0, 48)}` : ""}
                    </p>
                  </td>
                  <td className="text-xs text-on-surface-variant">{PRODUCT_CATEGORY[product.category]}</td>
                  <td className="text-right">
                    <span className="money text-xs">{formatFCFA(product.price)}</span>
                  </td>
                  <td className="text-right">
                    <span className="money text-xs">{formatFCFA(clientUnitPrice(product.price, rate))}</span>
                  </td>
                  <td className="text-right">
                    <span
                      className={`badge ${
                        product.stock <= 0
                          ? "bg-red-50 text-red-700"
                          : product.stock < 30
                            ? "bg-amber-50 text-amber-700"
                            : "bg-primary-fixed text-primary"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${product.active && product.stock > 0 ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                      {product.active ? (product.stock > 0 ? "En vente" : "Rupture") : "Masqué"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <ButtonLink href={`/fournisseur/produits/${product.id}`} variant="outline" size="sm">
                        <Icon name="edit" className="text-base" />
                        Modifier
                      </ButtonLink>
                      <form action={toggleProductAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" className={buttonClass("outline", "sm")}>
                          <Icon name={product.active ? "visibility_off" : "visibility"} className="text-base" />
                          {product.active ? "Masquer" : "Afficher"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
