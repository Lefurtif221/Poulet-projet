import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatFCFA } from "@/lib/format";
import { PAYMENT_METHOD } from "@/lib/labels";
import {
  Alert,
  ButtonLink,
  EmptyState,
  Icon,
  ProgressBar,
  StatCard,
  StatusBadge,
  buttonClass,
} from "@/components/ui";

export const metadata: Metadata = { title: "Crédit & factures" };

export default async function CreditPage() {
  const user = await requireUser("CLIENT");
  const [client, settings] = await Promise.all([
    db.client.findUnique({ where: { userId: user.sub } }),
    getSettings(),
  ]);
  if (!client) return null;

  const [creditOrders, payments] = await Promise.all([
    db.order.findMany({
      where: {
        clientId: client.id,
        paymentMethod: "CREDIT",
        status: { notIn: ["CANCELLED", "REFUSED"] },
      },
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.payment.findMany({
      where: { clientId: client.id, status: "PAID" },
      include: { order: true },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
  ]);

  const now = new Date();
  const outstanding = creditOrders.filter((order) => order.paymentStatus === "PENDING");
  const overdue = outstanding.filter((order) => order.creditDueDate && order.creditDueDate < now);
  const nextDue = outstanding
    .map((order) => order.creditDueDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const available = Math.max(0, client.creditLimit - client.balanceDue);
  const usage = client.creditLimit > 0 ? (client.balanceDue / client.creditLimit) * 100 : 0;
  const creditActive = client.creditLimit > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Crédit B2B &amp; factures</h1>
        <p className="text-sm text-on-surface-variant">
          Encours, échéances et historique de règlement de votre établissement.
        </p>
      </div>

      {!creditActive ? (
        <Alert tone="info" title="Crédit non activé">
          Le crédit est accordé manuellement après vérification de votre activité. Vous pouvez commander
          comptant (Wave, Orange Money ou à la livraison). Demandez l&apos;activation au{" "}
          {settings.supportPhone}.
        </Alert>
      ) : null}

      {overdue.length > 0 ? (
        <Alert tone="danger" title="Facture en retard">
          {overdue.length} facture(s) dépassent l&apos;échéance. Le crédit est bloqué jusqu&apos;au
          règlement. Contactez l&apos;administrateur pour un plan de paiement.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Plafond autorisé" value={formatFCFA(client.creditLimit)} icon="account_balance_wallet" />
        <StatCard label="Encours dû" value={formatFCFA(client.balanceDue)} icon="receipt_long" tone="warning" />
        <StatCard
          label="Crédit disponible"
          value={formatFCFA(available)}
          icon="check_circle"
          tone={available > 0 ? "success" : "danger"}
        />
        <StatCard
          label="Prochaine échéance"
          value={nextDue ? formatDate(nextDue) : "—"}
          hint={`Délai accordé : ${client.creditDelayDays || settings.creditDelayDays} jours`}
          icon="event"
          tone={overdue.length > 0 ? "danger" : "default"}
        />
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold">Utilisation du plafond</h2>
          <span className="text-xs font-semibold text-on-surface-variant">
            {Math.round(usage)} % utilisé
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar
            value={client.balanceDue}
            max={client.creditLimit || 1}
            tone={overdue.length > 0 ? "danger" : usage > 80 ? "warning" : "primary"}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-on-surface-variant">
          <span>Encours : {formatFCFA(client.balanceDue)}</span>
          <span>Plafond : {formatFCFA(client.creditLimit)}</span>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="pending_actions" className="text-xl text-primary-container" />
          Factures à crédit
        </h2>
        {outstanding.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="Aucune facture en attente"
            description="Vos factures à crédit et leurs échéances apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {outstanding.map((order) => {
              const late = order.creditDueDate ? order.creditDueDate < now : false;
              return (
                <article
                  key={order.id}
                  className={`card border-l-[3px] p-4 ${late ? "border-l-[#a8421a]" : "border-l-secondary-container"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/client/commande/${order.id}`}
                          className="font-display text-sm font-bold hover:underline"
                        >
                          #{order.reference}
                        </Link>
                        <StatusBadge status={order.status} />
                        {late ? (
                          <span className="badge bg-red-50 text-red-700">En retard</span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-700">À échéance</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {order.supplier.farmName} · livrée le {formatDate(order.deliveryDate)} ·{" "}
                        {PAYMENT_METHOD[order.paymentMethod].label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="money text-base">{formatFCFA(order.total)}</p>
                      <p className={`text-[11px] ${late ? "font-semibold text-red-700" : "text-on-surface-variant"}`}>
                        Échéance : {formatDate(order.creditDueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-outline-variant/30 pt-3">
                    <ButtonLink href={`/facture/${order.id}`} variant="outline" size="sm">
                      <Icon name="description" className="text-base" />
                      Facture
                    </ButtonLink>
                    <Link href="/aide-pin" className={buttonClass("outline", "sm")}>
                      <Icon name="support_agent" className="text-base" />
                      Déclarer un paiement
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="history" className="text-xl text-primary-container" />
          Paiements enregistrés
        </h2>
        {payments.length === 0 ? (
          <EmptyState icon="payments" title="Aucun paiement enregistré" description="Les règlements confirmés apparaîtront ici." />
        ) : (
          <div className="card divide-y divide-outline-variant/25">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{payment.order ? `#${payment.order.reference}` : "Paiement"}</p>
                  <p className="text-xs text-on-surface-variant">
                    {PAYMENT_METHOD[payment.method].label} · {formatDate(payment.paidAt)}
                    {payment.reference ? ` · réf. ${payment.reference}` : ""}
                  </p>
                </div>
                <span className="money">{formatFCFA(payment.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-display text-base font-semibold">Règles du crédit</h2>
        <ul className="mt-2 space-y-1.5 text-xs text-on-surface-variant">
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            Le crédit n&apos;est jamais automatique : il est activé par l&apos;administrateur après
            vérification.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            Échéance initiale de {client.creditDelayDays || settings.creditDelayDays} jours. Relance à
            J-2, le jour J, puis à J+3.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            Plus de 7 jours de retard : crédit et nouvelles commandes à crédit bloqués jusqu&apos;au
            règlement.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="text-base text-primary-container" />
            L&apos;éleveur est payé par la plateforme : votre retard ne le pénalise pas.
          </li>
        </ul>
      </section>
    </div>
  );
}
