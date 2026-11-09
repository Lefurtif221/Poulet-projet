import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatFCFA, formatPhone } from "@/lib/format";
import { PAYMENT_METHOD, PRODUCT_UNIT } from "@/lib/labels";
import { Icon, Logo } from "@/components/ui";
import { PrintButton } from "@/components/orders/print-button";

export const metadata: Metadata = { title: "Facture" };

type Params = Promise<{ id: string }>;

export default async function InvoicePage({ params }: { params: Params }) {
  const user = await requireUser();
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { client: { userId: user.sub } }),
      },
      include: { client: true, supplier: true, items: true, payments: true },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const payment = order.payments[0];
  const backHref = user.role === "ADMIN" ? `/admin/commandes/${order.id}` : `/client/commande/${order.id}`;

  return (
    <div className="min-h-screen bg-[#eef1f5] px-3 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex max-w-3xl items-center justify-between print:hidden">
        <Link href={backHref} className="flex items-center gap-1.5 text-sm font-semibold text-primary-container">
          <Icon name="arrow_back" className="text-lg" />
          Retour au suivi
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:max-w-none print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/40 pb-5">
          <div>
            <Logo />
            <p className="mt-2 text-xs text-on-surface-variant">Dakar, Sénégal · {formatPhone(settings.supportPhone)}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold">FACTURE</p>
            <p className="text-sm font-semibold">#{order.reference}</p>
            <p className="text-xs text-on-surface-variant">Émise le {formatDate(order.createdAt)}</p>
            <p className="text-xs text-on-surface-variant">Livraison le {formatDate(order.deliveryDate)}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Facturé à</p>
            <p className="mt-1 text-sm font-semibold">{order.client.establishment}</p>
            <p className="text-xs text-on-surface-variant">{order.address}</p>
            {order.client.district ? (
              <p className="text-xs text-on-surface-variant">{order.client.district}</p>
            ) : null}
            {order.client.ninea ? (
              <p className="text-xs text-on-surface-variant">NINEA : {order.client.ninea}</p>
            ) : null}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Fournisseur</p>
            <p className="mt-1 text-sm font-semibold">{order.supplier.farmName}</p>
            <p className="text-xs text-on-surface-variant">{order.supplier.location}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Règlement</p>
            <p className="text-sm">{PAYMENT_METHOD[order.paymentMethod].label}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/50 text-left text-[10px] uppercase tracking-wide text-on-surface-variant">
              <th className="py-2">Désignation</th>
              <th className="py-2 text-right">Qté</th>
              <th className="py-2 text-right">P.U.</th>
              <th className="py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-outline-variant/25">
                <td className="py-2">
                  <span className="font-semibold">{item.productName}</span>
                  <span className="ml-1 text-xs text-on-surface-variant">({PRODUCT_UNIT[item.unit]})</span>
                </td>
                <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatFCFA(item.unitPrice)}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{formatFCFA(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Sous-total</span>
            <span>{formatFCFA(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Livraison</span>
            <span>{order.deliveryFee === 0 ? "Offerte" : formatFCFA(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-outline-variant/40 pt-2 font-semibold">
            <span>Total</span>
            <span className="money text-lg">{formatFCFA(order.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Statut du règlement</span>
            <span>{payment?.status === "PAID" ? "Payé" : "En attente"}</span>
          </div>
          {order.creditDueDate ? (
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Échéance crédit</span>
              <span>{formatDate(order.creditDueDate)}</span>
            </div>
          ) : null}
        </div>

        <footer className="mt-8 border-t border-outline-variant/40 pt-3 text-[10px] text-on-surface-variant">
          <p>
            Document généré par {settings.platformName}. Les montants sont exprimés en francs CFA
            (XOF). TVA applicable selon la réglementation en vigueur.
          </p>
          <p className="mt-1">
            Commande soumise aux conditions générales B2B. Réclamation qualité : 24 h après livraison,
            avec photo.
          </p>
        </footer>
      </article>
    </div>
  );
}
