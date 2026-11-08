import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEFAULTS: Record<string, unknown> = {
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
  supportPhone: "+221 77 000 00 00",
  platformName: "Guanar Life",
};

async function main() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db.setting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: {},
    });
  }

  const phone = (process.env.ADMIN_PHONE ?? "+221770000000").replace(/\s/g, "");
  const pin = process.env.ADMIN_PIN ?? "";
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("Définissez ADMIN_PIN (4 à 6 chiffres) avant le seed de production.");
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const admin = await db.user.upsert({
    where: { phone },
    create: {
      phone,
      name: process.env.ADMIN_NAME ?? "Administrateur Guanar",
      role: "ADMIN",
      status: "ACTIVE",
      pinHash,
    },
    update: { status: "ACTIVE", pinHash },
  });

  console.log(`Admin prêt : ${admin.phone}`);
  console.log("Paramètres par défaut installés. Aucune donnée de démonstration créée.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
