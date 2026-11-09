import { db } from "@/lib/db";

export type AppSettings = {
  commissionRate: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderPro: number;
  minOrderParticulier: number;
  creditGlobalCap: number;
  creditDelayDays: number;
  particuliersEnabled: boolean;
  districts: string[];
  deliverySlots: string[];
  waveNumber: string;
  orangeMoneyNumber: string;
  platformName: string;
  supportPhone: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  commissionRate: 8,
  deliveryFee: 4000,
  freeDeliveryThreshold: 85000,
  minOrderPro: 20000,
  minOrderParticulier: 10000,
  creditGlobalCap: 500000,
  creditDelayDays: 7,
  particuliersEnabled: false,
  districts: ["Dakar Plateau", "Médina", "Almadies", "Pikine", "Guédiawaye", "Rufisque", "Sébikotane"],
  deliverySlots: ["05h30 – 07h00", "07h00 – 08h30", "09h00 – 10h30"],
  waveNumber: "+221 77 000 00 00",
  orangeMoneyNumber: "+221 77 000 00 00",
  platformName: "SunuVolaille",
  supportPhone: "+221 77 000 00 00",
};

type SettingKey = keyof AppSettings;

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.setting.findMany();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const result = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    if (stored[key] !== undefined) {
      try {
        (result as Record<string, unknown>)[key] = JSON.parse(stored[key]);
      } catch {
        // ignore malformed values, keep default
      }
    }
  }
  return result;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

export type CommissionRuleLite = {
  scope: "GLOBAL" | "SUPPLIER" | "PRODUCT" | "CLIENT";
  supplierId: string | null;
  productId: string | null;
  clientId: string | null;
  rate: number;
};

export function resolveCommissionRate(
  rules: CommissionRuleLite[],
  target: { productId: string; supplierId: string; clientId: string },
  defaultRatePercent: number
): number {
  const match = (rule: CommissionRuleLite) => {
    switch (rule.scope) {
      case "PRODUCT":
        return rule.productId === target.productId;
      case "CLIENT":
        return rule.clientId === target.clientId;
      case "SUPPLIER":
        return rule.supplierId === target.supplierId;
      default:
        return true;
    }
  };

  for (const scope of ["PRODUCT", "CLIENT", "SUPPLIER", "GLOBAL"] as const) {
    const rule = rules.find((item) => item.scope === scope && match(item));
    if (rule) return rule.rate / 100;
  }
  return defaultRatePercent / 100;
}

export function clientUnitPrice(basePrice: number, rate: number): number {
  if (rate <= 0 || rate >= 1) return Math.round(basePrice);
  return Math.round(basePrice / (1 - rate));
}

export async function computeCommissionRate(
  productId: string,
  supplierId: string,
  clientId: string
): Promise<number> {
  const rows = await db.commissionRule.findMany({
    where: {
      OR: [
        { scope: "PRODUCT", productId },
        { scope: "CLIENT", clientId },
        { scope: "SUPPLIER", supplierId },
        { scope: "GLOBAL" },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const priority = ["PRODUCT", "CLIENT", "SUPPLIER", "GLOBAL"] as const;
  for (const scope of priority) {
    const rule = rows.find((row) => row.scope === scope);
    if (rule) return rule.rate / 100;
  }

  const settings = await getSettings();
  return settings.commissionRate / 100;
}

export function commissionAmount(subtotal: number, rate: number): number {
  return Math.round(subtotal * rate);
}

export function deliveryFeeFor(subtotal: number, settings: AppSettings): number {
  if (subtotal >= settings.freeDeliveryThreshold) return 0;
  return settings.deliveryFee;
}

export function isCreditBlocked(client: {
  creditLimit: number;
  balanceDue: number;
}): boolean {
  return client.creditLimit <= 0 || client.balanceDue >= client.creditLimit;
}

export function availableCredit(client: { creditLimit: number; balanceDue: number }): number {
  return Math.max(0, client.creditLimit - client.balanceDue);
}
