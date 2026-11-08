import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function csv(rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${rows.map((row) => row.map(escape).join(";")).join("\r\n")}`;
}

function download(name: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

const DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Africa/Dakar",
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type") ?? "orders";
  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "orders") {
    const orders = await db.order.findMany({
      include: { client: true, supplier: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const rows: (string | number | null)[][] = [
      [
        "Reference",
        "Date creation",
        "Client",
        "Eleveur",
        "Date livraison",
        "Creneau",
        "Statut",
        "Sous-total",
        "Commission",
        "Part eleveur",
        "Livraison",
        "Total",
        "Paiement",
        "Statut paiement",
        "Echeance credit",
      ],
      ...orders.map((order) => [
        order.reference,
        DAY.format(order.createdAt),
        order.client.establishment,
        order.supplier.farmName,
        DAY.format(order.deliveryDate),
        order.deliverySlot,
        order.status,
        order.subtotal,
        order.commissionAmount,
        order.supplierTotal,
        order.deliveryFee,
        order.total,
        order.paymentMethod,
        order.paymentStatus,
        order.creditDueDate ? DAY.format(order.creditDueDate) : "",
      ]),
    ];
    return download(`guanar-commandes-${stamp}.csv`, csv(rows));
  }

  if (type === "payments") {
    const payments = await db.payment.findMany({
      include: { order: { include: { client: true } }, client: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const rows: (string | number | null)[][] = [
      ["Date", "Commande", "Client", "Moyen", "Montant", "Statut", "Reference", "Paye le"],
      ...payments.map((payment) => [
        DAY.format(payment.createdAt),
        payment.order?.reference ?? "",
        payment.order?.client.establishment ?? payment.client?.establishment ?? "",
        payment.method,
        payment.amount,
        payment.status,
        payment.reference ?? "",
        payment.paidAt ? DAY.format(payment.paidAt) : "",
      ]),
    ];
    return download(`guanar-paiements-${stamp}.csv`, csv(rows));
  }

  if (type === "clients") {
    const clients = await db.client.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
    const rows: (string | number | null)[][] = [
      ["Etablissement", "Type", "Responsable", "Telephone", "Adresse", "Quartier", "Activite", "NINEA", "Plafond credit", "Encours", "Delai", "Statut"],
      ...clients.map((client) => [
        client.establishment,
        client.type,
        client.user.name,
        client.user.phone,
        client.address,
        client.district ?? "",
        client.activityType ?? "",
        client.ninea ?? "",
        client.creditLimit,
        client.balanceDue,
        client.creditDelayDays,
        client.user.status,
      ]),
    ];
    return download(`guanar-clients-${stamp}.csv`, csv(rows));
  }

  if (type === "suppliers") {
    const suppliers = await db.supplier.findMany({ include: { user: true }, orderBy: { farmName: "asc" } });
    const rows: (string | number | null)[][] = [
      ["Elevage", "Responsable", "Telephone", "Localisation", "Capacite", "Type", "Paiement", "Compte", "Ouvert", "Statut"],
      ...suppliers.map((supplier) => [
        supplier.farmName,
        supplier.user.name,
        supplier.user.phone,
        supplier.location,
        supplier.capacity,
        supplier.farmType ?? "",
        supplier.paymentProvider ?? "",
        supplier.paymentAccount ?? "",
        supplier.isOpen ? "OUI" : "NON",
        supplier.user.status,
      ]),
    ];
    return download(`guanar-eleveurs-${stamp}.csv`, csv(rows));
  }

  return NextResponse.json({ error: "Type inconnu" }, { status: 400 });
}
