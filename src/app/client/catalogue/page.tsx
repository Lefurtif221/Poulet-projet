import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clientUnitPrice, getSettings, resolveCommissionRate } from "@/lib/settings";
import { formatDateLong } from "@/lib/format";
import { productWhereInput } from "@/lib/queries";
import { CartPanel } from "@/components/catalogue/cart-panel";
import { ProductCard, type CatalogueProduct } from "@/components/catalogue/product-card";
import { Icon, buttonClass, EmptyState, Alert } from "@/components/ui";
import { PRODUCT_CATEGORY } from "@/lib/labels";
import type { ProductCategory } from "@prisma/client";

export const metadata: Metadata = { title: "Catalogue B2B" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("CLIENT");
  const params = await searchParams;
  const settings = await getSettings();

  const q = first(params.q).trim();
  const category = first(params.category) as ProductCategory | "";
  const supplierId = first(params.supplier);
  const maxPrice = Number(first(params.maxPrice)) || 0;
  const sort = first(params.sort);

  const [products, suppliers, client, rules] = await Promise.all([
    db.product.findMany({
      where: productWhereInput({ q, category, supplierId, maxPrice }),
      include: { supplier: true },
      orderBy:
        sort === "price_asc"
          ? { price: "asc" }
          : sort === "price_desc"
            ? { price: "desc" }
            : { createdAt: "desc" },
      take: 60,
    }),
    db.supplier.findMany({
      where: { user: { status: "ACTIVE" }, isOpen: true },
      orderBy: { farmName: "asc" },
      select: { id: true, farmName: true, location: true },
    }),
    db.client.findUnique({
      where: { userId: user.sub },
      select: { id: true, creditLimit: true, balanceDue: true },
    }),
    db.commissionRule.findMany(),
  ]);

  const clientId = client?.id ?? "";
  const items: CatalogueProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: clientUnitPrice(
      product.price,
      resolveCommissionRate(
        rules,
        { productId: product.id, supplierId: product.supplierId, clientId },
        settings.commissionRate
      )
    ),
    stock: product.stock,
    imageUrl: product.imageUrl,
    description: product.description,
    availableFrom: product.availableFrom
      ? product.availableFrom.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
      : null,
    supplierId: product.supplierId,
    supplierName: product.supplier.farmName,
    supplierLocation: product.supplier.location,
  }));

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const creditAvailable = Math.max(0, (client?.creditLimit ?? 0) - (client?.balanceDue ?? 0));

  function categoryHref(value: string): string {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (value) next.set("category", value);
    if (supplierId) next.set("supplier", supplierId);
    if (maxPrice) next.set("maxPrice", String(maxPrice));
    if (sort) next.set("sort", sort);
    const query = next.toString();
    return query ? `/client/catalogue?${query}` : "/client/catalogue";
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-primary text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #fda12f 0, transparent 35%), radial-gradient(circle at 85% 80%, #8bc5a3 0, transparent 40%)",
          }}
        />
        <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:p-7">
          <div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
              <span className="badge bg-secondary-container text-on-secondary-container">
                <Icon name="bolt" className="text-sm" />
                Canal pro direct éleveurs
              </span>
              <span className="badge bg-white/10 text-white">
                <Icon name="block" className="text-sm text-primary-fixed" />
                Zéro intermédiaire
              </span>
            </div>
            <h1 className="mt-3 max-w-2xl font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              Approvisionnement direct fermes de la presqu&apos;île de Dakar &amp; Niayes
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-primary-fixed sm:text-sm">
              Volailles abattues à la commande et œufs extra-frais du jour. Livraisons frigorifiques
              assurées avant 09h30 pour les cuisines professionnelles.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-primary-fixed">
              <span className="flex items-center gap-1.5">
                <Icon name="shopping_bag" className="text-base text-secondary-container" />
                Minimum de commande : {settings.minOrderPro.toLocaleString("fr-FR")} FCFA
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="schedule" className="text-base text-secondary-container" />
                Clôture des commandes : 22h00
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="ac_unit" className="text-base text-secondary-container" />
                Chaîne du froid +2 °C / +4 °C
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary-fixed">
              <span className="h-2 w-2 rounded-full bg-secondary-container" />
              Prochaine tournée matinale
            </p>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight">05h00 – 09h30</p>
            <p className="mt-1 text-xs text-primary-fixed">
              {formatDateLong(tomorrow)} · commandes avant 22h00
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-[11px]">
              <span className="text-primary-fixed">Votre crédit disponible</span>
              <span className="money text-secondary-fixed">
                {creditAvailable.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: `Tous les produits (${items.length})` },
          ...(Object.keys(PRODUCT_CATEGORY) as ProductCategory[]).map((value) => ({
            value,
            label: PRODUCT_CATEGORY[value],
          })),
        ].map((tab) => {
          const active = category === tab.value;
          return (
            <Link
              key={tab.value}
              href={categoryHref(tab.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary-container bg-primary-container text-white"
                  : "border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:border-primary-container"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form className="card grid gap-3 p-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
        <div>
          <label className="field-label" htmlFor="q">
            Recherche produit
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <Icon name="search" className="text-lg" />
            </span>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Poulet, œufs, découpe…"
              className="input pl-10"
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="supplier">
            Éleveur
          </label>
          <select id="supplier" name="supplier" defaultValue={supplierId} className="input min-w-44">
            <option value="">Tous les éleveurs</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.farmName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="maxPrice">
            Prix max (FCFA)
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={maxPrice || ""}
            placeholder="Ex. 3000"
            className="input w-32"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="sort">
            Trier
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="input min-w-40">
            <option value="">Plus récents</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
        <input type="hidden" name="category" value={category} />
        <button type="submit" className={buttonClass("primary")}>
          <Icon name="filter_alt" className="text-lg" />
          Filtrer
        </button>
      </form>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">
              Offres d&apos;approvisionnement en direct
            </h2>
            <span className="badge bg-primary-fixed/60 text-primary">{items.length} produits disponibles</span>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="Aucun produit ne correspond à votre recherche"
              description="Élargissez les filtres ou revenez au catalogue complet."
              action={
                <Link href="/client/catalogue" className={buttonClass("outline")}>
                  Voir tout le catalogue
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <CartPanel
          minOrder={settings.minOrderPro}
          deliveryFee={settings.deliveryFee}
          freeDeliveryThreshold={settings.freeDeliveryThreshold}
        />
      </div>

      <Alert tone="info">
        <span className="flex flex-wrap items-center gap-2">
          <Icon name="ac_unit" className="text-lg text-primary-container" />
          <strong>Engagement chaîne du froid :</strong> températures relevées au départ et contrôlées à
          la réception, tolérance poids ±5 %, œufs cassés remplacés au-delà de 3 %.
        </span>
      </Alert>
    </div>
  );
}
