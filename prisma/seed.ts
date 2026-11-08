import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PIN = "1234";

async function upsertUser(input: {
  phone: string;
  name: string;
  role: "ADMIN" | "CLIENT" | "FOURNISSEUR";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REFUSED";
}) {
  const pinHash = await bcrypt.hash(PIN, 10);
  return db.user.upsert({
    where: { phone: input.phone },
    create: {
      phone: input.phone,
      name: input.name,
      role: input.role,
      status: input.status,
      pinHash,
    },
    update: { name: input.name, role: input.role, status: input.status },
  });
}

async function main() {
  await db.setting.upsert({
    where: { key: "commissionRate" },
    create: { key: "commissionRate", value: "8" },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "deliveryFee" },
    create: { key: "deliveryFee", value: "4000" },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "freeDeliveryThreshold" },
    create: { key: "freeDeliveryThreshold", value: "85000" },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "minOrderPro" },
    create: { key: "minOrderPro", value: "20000" },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "creditDelayDays" },
    create: { key: "creditDelayDays", value: "7" },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "particuliersEnabled" },
    create: { key: "particuliersEnabled", value: "false" },
    update: {},
  });

  const admin = await upsertUser({
    phone: "+221770000000",
    name: "Administrateur Guanar",
    role: "ADMIN",
    status: "ACTIVE",
  });

  const supplierUser = await upsertUser({
    phone: "+221771111111",
    name: "Keur Mbaye",
    role: "FOURNISSEUR",
    status: "ACTIVE",
  });
  const supplier = await db.supplier.upsert({
    where: { userId: supplierUser.id },
    create: {
      userId: supplierUser.id,
      farmName: "Élevage Keur Mbaye",
      location: "Sébikotane",
      capacity: 300,
      farmType: "Poulet de chair",
      description:
        "Exploitation familiale spécialisée en poulet de chair PAC. Bâtiments ventilés, suivi vétérinaire régulier, abattage à la commande.",
      paymentProvider: "Wave",
      paymentAccount: "+221771111111",
    },
    update: {},
  });

  const supplier2User = await upsertUser({
    phone: "+221773333333",
    name: "Awa Ndiaye",
    role: "FOURNISSEUR",
    status: "ACTIVE",
  });
  const supplier2 = await db.supplier.upsert({
    where: { userId: supplier2User.id },
    create: {
      userId: supplier2User.id,
      farmName: "Ferme Avicole des Niayes",
      location: "Sangalkam",
      capacity: 220,
      farmType: "Poulet fermier / Œufs",
      description: "Élevage plein air de poulets fermiers et production d'œufs frais du jour.",
      paymentProvider: "Orange Money",
      paymentAccount: "+221773333333",
    },
    update: {},
  });

  const clientUser = await upsertUser({
    phone: "+221772222222",
    name: "Chef Ousmane Diallo",
    role: "CLIENT",
    status: "ACTIVE",
  });
  const client = await db.client.upsert({
    where: { userId: clientUser.id },
    create: {
      userId: clientUser.id,
      type: "PRO",
      establishment: "Le Teranga Grill & Rôtisserie",
      address: "Rue Félix Faure x Avenue Lambert, Dakar Plateau",
      district: "Dakar Plateau",
      activityType: "Restaurant",
      ninea: "SN-2026-0451",
      creditLimit: 350000,
      creditDelayDays: 7,
    },
    update: {},
  });

  const pendingUser = await upsertUser({
    phone: "+221774444444",
    name: "Fatou Sarr",
    role: "CLIENT",
    status: "PENDING",
  });
  await db.client.upsert({
    where: { userId: pendingUser.id },
    create: {
      userId: pendingUser.id,
      type: "PRO",
      establishment: "Fast Food Almandies",
      address: "Route des Almadies, Dakar",
      district: "Almadies",
      activityType: "Fast-food",
    },
    update: {},
  });

  let products = await db.product.findMany({ where: { supplierId: supplier.id } });
  if (products.length === 0) {
    await db.product.createMany({
      data: [
        {
          supplierId: supplier.id,
          name: "Poulet de chair PAC 1,4 kg",
          category: "POULET_CHAIR",
          unit: "PIECE",
          price: 2400,
          stock: 240,
          description:
            "Poulet prêt à cuire, 1,3 – 1,45 kg. Éviscéré, abattu le matin, conditionné sous vide. Idéal rôtisserie et grill.",
        },
        {
          supplierId: supplier.id,
          name: "Poulet vivant calibré 1,8 kg",
          category: "POULET_CHAIR",
          unit: "PIECE",
          price: 2600,
          stock: 110,
          description: "Poids vif en poulailler, option abattage à la demande. 1,75 – 1,90 kg.",
        },
        {
          supplierId: supplier.id,
          name: "Plateau de 30 œufs frais gros calibre",
          category: "OEUFS",
          unit: "PLATEAU",
          price: 2300,
          stock: 140,
          description: "Œufs du jour, calibre 53 – 60 g. Remplacement immédiat des œufs cassés.",
        },
        {
          supplierId: supplier2.id,
          name: "Poulet fermier label local (1,6 kg)",
          category: "POULET_FERMIER",
          unit: "PIECE",
          price: 3800,
          stock: 85,
          description: "Élevé plein air minimum 70 jours, alimentation locale. Chair ferme et goûteuse.",
        },
        {
          supplierId: supplier2.id,
          name: "Plateau d'œufs moyens calibre M",
          category: "OEUFS",
          unit: "PLATEAU",
          price: 2050,
          stock: 180,
          description: "Calibre 53 – 60 g, idéal pâtisserie et buffets. Casse garantie sous 3 %.",
        },
      ],
    });
    products = await db.product.findMany({ where: { supplierId: supplier.id } });
  }

  const existingOrders = await db.order.count();
  if (existingOrders === 0 && products.length >= 1) {
    const poulet = products.find((product) => product.category === "POULET_CHAIR" && product.unit === "PIECE")!;
    const oeufs = products.find((product) => product.category === "OEUFS")!;
    const now = new Date();
    const delivery = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 8));

    const subtotal = 10 * 2609 + 5 * 2500;
    const supplierTotal = 10 * 2400 + 5 * 2300;
    const commission = subtotal - supplierTotal;
    await db.order.create({
      data: {
        reference: `DKR-${now.getFullYear()}-8910`,
        clientId: client.id,
        supplierId: supplier.id,
        deliveryDate: delivery,
        deliverySlot: "05h30 – 07h00",
        address: client.address,
        note: "Découpe en 8 morceaux pour rôtisserie.",
        status: "SENT",
        subtotal,
        supplierTotal,
        commissionRate: (commission / subtotal) * 100,
        commissionAmount: commission,
        deliveryFee: 0,
        total: subtotal,
        paymentMethod: "WAVE",
        paymentStatus: "PENDING",
        acceptDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
        items: {
          create: [
            {
              productId: poulet.id,
              productName: poulet.name,
              unit: poulet.unit,
              quantity: 10,
              unitPrice: 2609,
              supplierUnitPrice: poulet.price,
              lineTotal: 26090,
            },
            {
              productId: oeufs.id,
              productName: oeufs.name,
              unit: oeufs.unit,
              quantity: 5,
              unitPrice: 2500,
              supplierUnitPrice: oeufs.price,
              lineTotal: 12500,
            },
          ],
        },
        delivery: { create: { status: "PENDING" } },
        payments: {
          create: { amount: subtotal, method: "WAVE", status: "PENDING", clientId: client.id },
        },
      },
    });

    await db.order.create({
      data: {
        reference: `DKR-${now.getFullYear()}-8889`,
        clientId: client.id,
        supplierId: supplier.id,
        deliveryDate: new Date(delivery.getTime() - 24 * 60 * 60 * 1000),
        deliverySlot: "07h00 – 08h30",
        address: client.address,
        status: "DELIVERED",
        subtotal: 13045,
        supplierTotal: 12000,
        commissionRate: 8,
        commissionAmount: 1045,
        deliveryFee: 0,
        total: 13045,
        paymentMethod: "WAVE",
        paymentStatus: "PAID",
        acceptDeadline: new Date(now.getTime() - 26 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
        readyAt: new Date(now.getTime() - 24.5 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        items: {
          create: [
            {
              productId: poulet.id,
              productName: poulet.name,
              unit: poulet.unit,
              quantity: 5,
              unitPrice: 2609,
              quantityDelivered: 5,
              supplierUnitPrice: poulet.price,
              lineTotal: 13045,
            },
          ],
        },
        delivery: {
          create: {
            status: "DELIVERED",
            courierName: "Moussa Diop",
            courierPhone: "+221770000000",
            cost: 3500,
            pickupAt: new Date(now.getTime() - 24.5 * 60 * 60 * 1000),
            deliveredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
        payments: {
          create: {
            amount: 13045,
            method: "WAVE",
            status: "PAID",
            clientId: client.id,
            paidAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
            reference: "WAVE-SEED-8889",
            confirmedById: admin.id,
          },
        },
      },
    });
  }

  console.log("Seed terminé.");
  console.log("Admin     : +221770000000 / PIN 1234");
  console.log("Éleveur   : +221771111111 / PIN 1234 (Keur Mbaye)");
  console.log("Éleveur 2 : +221773333333 / PIN 1234 (Ferme des Niayes)");
  console.log("Client    : +221772222222 / PIN 1234 (Le Teranga Grill)");
  console.log("En attente: +221774444444 / PIN 1234 (Fast Food Almandies)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
