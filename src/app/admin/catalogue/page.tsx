import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, clientUnitPrice } from "@/lib/settings";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_CATEGORY, PRODUCT_UNIT } from "@/lib/labels";
import { Icon, buttonClass } from "@/components/ui";
import { updateAdminProductAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Catalogue" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AdminCatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const q = first(query.q).trim();
  const [products, settings] = await Promise.all([
    db.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { supplier: { farmName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: { supplier: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getSettings(),
  ]);

  const rate = settings.commissionRate / 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Catalogue</h1>
          <p className="text-sm text-on-surface-variant">
            Corriger un prix, masquer un produit ou contrôler la disponibilité.
          </p>
        </div>
        <Link href="/admin/commissions" className={buttonClass("outline", "sm")}>
          <Icon name="percent" className="text-base" />
          Régler les commissions
        </Link>
      </div>

      <form className="card flex flex-wrap items-end gap-2 p-3">
        <div className="min-w-64 flex-1">
          <label className="field-label" htmlFor="q">
            Recherche
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Produit ou élevage…" className="input" />
        </div>
        <button type="submit" className={buttonClass("primary")}>
          <Icon name="search" className="text-lg" />
          Rechercher
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Éleveur</th>
              <th>Catégorie</th>
              <th className="text-right">Stock</th>
              <th className="text-right">Prix éleveur</th>
              <th className="text-right">Prix client</th>
              <th>État</th>
              <th className="text-right">Correction</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{PRODUCT_UNIT[product.unit]}</p>
                </td>
                <td className="text-xs">
                  {product.supplier.farmName}
                  <p className="text-[10px] text-on-surface-variant">{product.supplier.location}</p>
                </td>
                <td className="text-xs text-on-surface-variant">{PRODUCT_CATEGORY[product.category]}</td>
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
                <td className="text-right">
                  <span className="money text-xs">{formatFCFA(product.price)}</span>
                </td>
                <td className="text-right">
                  <span className="money text-xs">{formatFCFA(clientUnitPrice(product.price, rate))}</span>
                </td>
                <td>
                  <span className={`badge ${product.active ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                    {product.active ? "Visible" : "Masqué"}
                  </span>
                </td>
                <td>
                  <form action={updateAdminProductAction} className="flex items-center justify-end gap-1.5">
                    <input type="hidden" name="productId" value={product.id} />
                    <input
                      name="price"
                      type="number"
                      min={100}
                      defaultValue={product.price}
                      className="input h-9 w-24 text-xs"
                      aria-label={`Prix de ${product.name}`}
                    />
                    <label className="flex items-center gap-1 text-[10px] font-semibold">
                      <input type="checkbox" name="active" defaultChecked={product.active} className="h-3.5 w-3.5 accent-[#185338]" />
                      Actif
                    </label>
                    <button type="submit" className={buttonClass("primary", "sm")}>
                      OK
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 ? (
          <p className="p-6 text-center text-sm text-on-surface-variant">Aucun produit.</p>
        ) : null}
      </div>
    </div>
  );
}
