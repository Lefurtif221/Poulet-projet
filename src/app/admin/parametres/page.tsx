import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Card, Icon, buttonClass } from "@/components/ui";
import { updateSettingsAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Paramètres" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Paramètres de la plateforme</h1>
        <p className="text-sm text-on-surface-variant">
          Commission, livraison, crédit, zones, particuliers et coordonnées de paiement.
        </p>
      </div>

      <form action={updateSettingsAction} className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="percent" className="text-lg text-primary-container" />
              Commission &amp; commande minimum
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="commissionRate">
                  Commission globale (%)
                </label>
                <input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  step="0.1"
                  min={0}
                  max={50}
                  defaultValue={settings.commissionRate}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="minOrderPro">
                  Commande min. pro (FCFA)
                </label>
                <input
                  id="minOrderPro"
                  name="minOrderPro"
                  type="number"
                  min={0}
                  defaultValue={settings.minOrderPro}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="minOrderParticulier">
                  Commande min. particulier (FCFA)
                </label>
                <input
                  id="minOrderParticulier"
                  name="minOrderParticulier"
                  type="number"
                  min={0}
                  defaultValue={settings.minOrderParticulier}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="deliveryFee">
                  Frais de livraison (FCFA)
                </label>
                <input
                  id="deliveryFee"
                  name="deliveryFee"
                  type="number"
                  min={0}
                  defaultValue={settings.deliveryFee}
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="freeDeliveryThreshold">
                  Livraison offerte au-dessus de (FCFA)
                </label>
                <input
                  id="freeDeliveryThreshold"
                  name="freeDeliveryThreshold"
                  type="number"
                  min={0}
                  defaultValue={settings.freeDeliveryThreshold}
                  className="input"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="credit_score" className="text-lg text-primary-container" />
              Crédit B2B
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="creditGlobalCap">
                  Plafond global exposé (FCFA)
                </label>
                <input
                  id="creditGlobalCap"
                  name="creditGlobalCap"
                  type="number"
                  min={0}
                  defaultValue={settings.creditGlobalCap}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="creditDelayDays">
                  Délai par défaut (jours)
                </label>
                <input
                  id="creditDelayDays"
                  name="creditDelayDays"
                  type="number"
                  min={0}
                  defaultValue={settings.creditDelayDays}
                  className="input"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Le crédit reste accordé client par client dans « Crédit &amp; risque ». Ce plafond est un
              garde-fou de trésorerie.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="location_on" className="text-lg text-primary-container" />
              Zones &amp; créneaux
            </h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="field-label" htmlFor="districts">
                  Quartiers / zones (séparés par des virgules)
                </label>
                <textarea
                  id="districts"
                  name="districts"
                  defaultValue={settings.districts.join(", ")}
                  className="textarea min-h-20"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="deliverySlots">
                  Créneaux de livraison (séparés par des virgules)
                </label>
                <textarea
                  id="deliverySlots"
                  name="deliverySlots"
                  defaultValue={settings.deliverySlots.join(", ")}
                  className="textarea min-h-20"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon name="payments" className="text-lg text-primary-container" />
              Comptes marchands &amp; support
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="waveNumber">
                  Numéro Wave marchand
                </label>
                <input id="waveNumber" name="waveNumber" defaultValue={settings.waveNumber} className="input" />
              </div>
              <div>
                <label className="field-label" htmlFor="orangeMoneyNumber">
                  Numéro Orange Money
                </label>
                <input
                  id="orangeMoneyNumber"
                  name="orangeMoneyNumber"
                  defaultValue={settings.orangeMoneyNumber}
                  className="input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="supportPhone">
                  Téléphone assistance
                </label>
                <input id="supportPhone" name="supportPhone" defaultValue={settings.supportPhone} className="input" />
              </div>
              <div>
                <label className="field-label" htmlFor="platformName">
                  Nom de la plateforme
                </label>
                <input id="platformName" name="platformName" defaultValue={settings.platformName} className="input" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-l-[3px] border-l-secondary-container p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon name="groups" className="text-lg text-primary-container" />
                Clients particuliers (option)
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-on-surface-variant">
                Désactivés au lancement. Lorsqu&apos;ils sont activés : paiement d&apos;avance
                uniquement, commande minimum, frais de livraison et tournées par quartier. Les clients
                pro restent prioritaires sur le stock.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-outline-variant/50 px-3 py-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="particuliersEnabled"
                defaultChecked={settings.particuliersEnabled}
                className="h-4 w-4 accent-[#185338]"
              />
              Activer les particuliers
            </label>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-on-surface-variant">
            Les modifications s&apos;appliquent aux nouvelles commandes. Un prix déjà confirmé ne change
            jamais.
          </p>
          <button type="submit" className={buttonClass("primary")}>
            <Icon name="save" className="text-lg" />
            Enregistrer les paramètres
          </button>
        </div>
      </form>

      <Card className="p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Icon name="download" className="text-lg text-primary-container" />
          Exports comptables
        </h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          Fichiers CSV compatibles Excel pour la comptabilité et le rapprochement.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/admin/export?type=orders" className={buttonClass("outline", "md")}>
            Commandes
          </a>
          <a href="/api/admin/export?type=payments" className={buttonClass("outline", "md")}>
            Paiements
          </a>
          <a href="/api/admin/export?type=clients" className={buttonClass("outline", "md")}>
            Clients
          </a>
          <a href="/api/admin/export?type=suppliers" className={buttonClass("outline", "md")}>
            Éleveurs
          </a>
        </div>
      </Card>
    </div>
  );
}
