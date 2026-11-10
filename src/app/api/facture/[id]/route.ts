import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatFCFA } from "@/lib/format";
import { PAYMENT_METHOD, PRODUCT_UNIT } from "@/lib/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function clean(text: string): string {
  return text
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u00a0|\u202f/g, " ");
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { client: true, supplier: true, items: true, payments: true },
  });
  if (!order) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  if (user.role === "CLIENT" && order.client.userId !== user.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 404 });
  }
  if (user.role === "FOURNISSEUR") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.047, 0.231, 0.149);
  const gold = rgb(0.91, 0.64, 0.24);
  const dark = rgb(0.08, 0.12, 0.2);
  const gray = rgb(0.4, 0.44, 0.48);
  const light = rgb(0.95, 0.96, 0.98);

  page.drawRectangle({ x: 0, y: 751, width: 595.28, height: 90, color: green });
  page.drawText("SunuVolaille", { x: 40, y: 793, size: 24, font: bold, color: rgb(1, 1, 1) });
  page.drawText(clean("Filière avicole directe - Dakar & Niayes"), {
    x: 40, y: 776, size: 8, font, color: rgb(0.76, 0.88, 0.81),
  });
  page.drawText("FACTURE", { x: 455, y: 793, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText(clean(`#${order.reference}`), { x: 455, y: 777, size: 10, font, color: gold });

  page.drawText(clean(`Émise le ${formatDate(order.createdAt)}`), { x: 40, y: 720, size: 9, font, color: gray });
  page.drawText(clean(`Livraison le ${formatDate(order.deliveryDate)} - ${order.deliverySlot}`), {
    x: 40, y: 706, size: 9, font, color: gray,
  });

  page.drawRectangle({ x: 40, y: 590, width: 515, height: 92, color: light });
  page.drawText("CLIENT", { x: 52, y: 662, size: 8, font: bold, color: gray });
  page.drawText(clean(order.client.establishment), { x: 52, y: 647, size: 11, font: bold, color: dark });
  page.drawText(clean(order.address), { x: 52, y: 633, size: 8, font, color: gray });
  if (order.client.ninea) {
    page.drawText(clean(`NINEA : ${order.client.ninea}`), { x: 52, y: 620, size: 8, font, color: gray });
  }
  page.drawText("FOURNISSEUR", { x: 330, y: 662, size: 8, font: bold, color: gray });
  page.drawText(clean(order.supplier.farmName), { x: 330, y: 647, size: 11, font: bold, color: dark });
  page.drawText(clean(order.supplier.location), { x: 330, y: 633, size: 8, font, color: gray });
  page.drawText(clean(PAYMENT_METHOD[order.paymentMethod].label), { x: 330, y: 620, size: 8, font, color: gray });

  const tableTop = 550;
  page.drawRectangle({ x: 40, y: tableTop, width: 515, height: 22, color: green });
  page.drawText("Désignation", { x: 50, y: tableTop + 7, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Qté", { x: 350, y: tableTop + 7, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("P.U.", { x: 410, y: tableTop + 7, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Total", { x: 500, y: tableTop + 7, size: 8, font: bold, color: rgb(1, 1, 1) });

  let y = tableTop - 18;
  for (const item of order.items) {
    const label = clean(`${item.productName} (${PRODUCT_UNIT[item.unit]})`);
    page.drawText(label.length > 58 ? `${label.slice(0, 55)}...` : label, {
      x: 50, y, size: 9, font, color: dark,
    });
    page.drawText(String(item.quantity), { x: 356, y, size: 9, font, color: dark });
    page.drawText(clean(formatFCFA(item.unitPrice)), { x: 405, y, size: 9, font, color: dark });
    page.drawText(clean(formatFCFA(item.lineTotal)), { x: 500, y, size: 9, font, color: dark });
    y -= 20;
    page.drawLine({ start: { x: 40, y: y + 12 }, end: { x: 555, y: y + 12 }, thickness: 0.4, color: rgb(0.88, 0.9, 0.92) });
  }

  const totalsY = Math.max(y - 10, 260);
  const right = 555;
  const drawRight = (text: string, yPos: number, size: number, f = font, color = dark) => {
    const width = f.widthOfTextAtSize(clean(text), size);
    page.drawText(clean(text), { x: right - width, y: yPos, size, font: f, color });
  };

  drawRight(`Sous-total : ${formatFCFA(order.subtotal)}`, totalsY, 9, font, gray);
  drawRight(`Livraison : ${order.deliveryFee === 0 ? "Offerte" : formatFCFA(order.deliveryFee)}`, totalsY - 16, 9, font, gray);
  page.drawLine({ start: { x: 330, y: totalsY - 26 }, end: { x: 555, y: totalsY - 26 }, thickness: 0.6, color: rgb(0.8, 0.83, 0.86) });
  drawRight(`TOTAL : ${formatFCFA(order.total)}`, totalsY - 44, 13, bold, green);
  const payment = order.payments[0];
  drawRight(`Règlement : ${payment?.status === "PAID" ? "payé" : "en attente"}`, totalsY - 62, 8, font, gray);
  if (order.creditDueDate) {
    drawRight(`Échéance crédit : ${formatDate(order.creditDueDate)}`, totalsY - 76, 8, font, gray);
  }

  page.drawLine({ start: { x: 40, y: 90 }, end: { x: 555, y: 90 }, thickness: 0.5, color: rgb(0.85, 0.87, 0.89) });
  page.drawText(clean("Document généré par SunuVolaille - montants en francs CFA (XOF)."), {
    x: 40, y: 72, size: 8, font, color: gray,
  });
  page.drawText(clean("Réclamation qualité : 24 h après livraison, avec photo. Conditions générales B2B applicables."), {
    x: 40, y: 58, size: 8, font, color: gray,
  });

  const bytes = await doc.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${order.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
