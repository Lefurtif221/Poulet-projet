import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_UNIT } from "@/lib/labels";
import { Card, Icon, buttonClass } from "@/components/ui";
import { deleteCommissionAction, setCommissionAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Commissions" };

export default async function AdminCommissionsPage() {
  const [settings, rules, suppliers, products, clients] = await Promise.all([
    getSettings(),
    db.commissionRule.findMany({
      include: { supplier: true, product: true, client: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.supplier.findMany({ where: { user: { status: "ACTIVE" } }, orderBy: { farmName: "asc" } }),
    db.product.findMany({ include: { supplier: true }, orderBy: { name: "asc" }, take: 200 }),
    db.client.findMany({ orderBy: { establishment: "asc" } }),
  ]);

  const scopeLabel = (scope: string) =>
    scope === "SUPPLIER" ? "Éleveur" : scope === "PRODUCT" ? "Produit" : scope === "CLIENT" ? "Client" : "Global";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Commissions</h1>
        <p className="text-sm text-on-surface-variant">
          Taux global, puis exceptions par éleveur, produit ou client. Le client voit toujours un prix
          final unique.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Icon name="percent" className="text-lg text-primary-container" />
            Taux global
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Appliqué par défaut à toutes les commandes sans exception. Exemple : un poulet à 2 400 FCFA
            éleveur devient {formatFCFA(Math.round(2400 / (1 - settings.commissionRate / 100)))} client à{" "}
            {settings.commissionRate} %.
          </p>
          <form action={setCommissionAction} className="mt-3 flex items-end gap-2">
            <input type="hidden" name="scope" value="GLOBAL" />
            <div className="flex-1">
              <label className="field-label" htmlFor="globalRate">
                Taux (%)
              </label>
              <input
                id="globalRate"
                name="rate"
                type="number"
                step="0.1"
                min={0}
                max={50}
                defaultValue={settings.commissionRate}
                className="input"
              />
            </div>
            <button type="submit" className={buttonClass("primary")}>
              Mettre à jour
            </button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="font-display text-base font-semibold">Nouvelle exception</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <form action={setCommissionAction} className="space-y-1.5">
              <input type="hidden" name="scope" value="SUPPLIER" />
              <label className="field-label" htmlFor="supplierTarget">
                Éleveur
              </label>
              <select id="supplierTarget" name="targetId" className="input text-xs" required>
                <option value="">Choisir…</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.farmName}
                  </option>
                ))}
              </select>
              <input name="rate" type="number" step="0.1" min={0} max={50} placeholder="Taux %" required className="input text-xs" />
              <button type="submit" className={buttonClass("outline", "sm", "w-full")}>
                Ajouter
              </button>
            </form>

            <form action={setCommissionAction} className="space-y-1.5">
              <input type="hidden" name="scope" value="PRODUCT" />
              <label className="field-label" htmlFor="productTarget">
                Produit
              </label>
              <select id="productTarget" name="targetId" className="input text-xs" required>
                <option value="">Choisir…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.supplier.farmName}
                  </option>
                ))}
              </select>
              <input name="rate" type="number" step="0.1" min={0} max={50} placeholder="Taux %" required className="input text-xs" />
              <button type="submit" className={buttonClass("outline", "sm", "w-full")}>
                Ajouter
              </button>
            </form>

            <form action={setCommissionAction} className="space-y-1.5">
              <input type="hidden" name="scope" value="CLIENT" />
              <label className="field-label" htmlFor="clientTarget">
                Client
              </label>
              <select id="clientTarget" name="targetId" className="input text-xs" required>
                <option value="">Choisir…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.establishment}
                  </option>
                ))}
              </select>
              <input name="rate" type="number" step="0.1" min={0} max={50} placeholder="Taux %" required className="input text-xs" />
              <button type="submit" className={buttonClass("outline", "sm", "w-full")}>
                Ajouter
              </button>
            </form>
          </div>
          <p className="mt-3 text-[11px] text-on-surface-variant">
            Priorité d&apos;application : produit &gt; client &gt; éleveur &gt; global.
          </p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="table-base min-w-[720px]">
          <thead>
            <tr>
              <th>Portée</th>
              <th>Cible</th>
              <th className="text-right">Taux</th>
              <th>Dernière modification</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <span className="badge bg-surface-container text-on-surface-variant">{scopeLabel(rule.scope)}</span>
                </td>
                <td className="text-xs">
                  {rule.scope === "SUPPLIER"
                    ? rule.supplier?.farmName
                    : rule.scope === "PRODUCT"
                      ? `${rule.product?.name} (${PRODUCT_UNIT[rule.product?.unit ?? "PIECE"]})`
                      : rule.client?.establishment}
                </td>
                <td className="text-right">
                  <span className="money text-xs">{rule.rate} %</span>
                </td>
                <td className="text-xs text-on-surface-variant">
                  {rule.updatedAt.toLocaleDateString("fr-FR")}
                </td>
                <td className="text-right">
                  <form action={deleteCommissionAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className={buttonClass("outline", "sm", "text-[#a8421a]")}>
                      <Icon name="delete" className="text-base" />
                      Supprimer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 ? (
          <p className="p-6 text-center text-sm text-on-surface-variant">
            Aucune exception : le taux global s&apos;applique partout.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
