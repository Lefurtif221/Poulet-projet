import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatFCFA } from "@/lib/format";
import { Card, EmptyState, Icon, StatCard } from "@/components/ui";
import { CashClosingForm } from "@/components/admin/cash-closing-form";

export const metadata: Metadata = { title: "Clôture de caisse" };

export default async function AdminCashPage() {
  await requireUser("ADMIN");

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const today = startOfDay.toISOString().slice(0, 10);

  const [payments, creditOrders, closings] = await Promise.all([
    db.payment.findMany({
      where: { status: "PAID", paidAt: { gte: startOfDay, lt: endOfDay } },
      select: { method: true, amount: true },
    }),
    db.order.findMany({
      where: {
        paymentMethod: "CREDIT",
        createdAt: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ["CANCELLED", "REFUSED"] },
      },
      select: { creditAmount: true },
    }),
    db.cashClosing.findMany({
      include: { closedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const sum = (method: string) =>
    payments.filter((payment) => payment.method === method).reduce((total, payment) => total + payment.amount, 0);
  const cash = sum("CASH_ON_DELIVERY");
  const wave = sum("WAVE");
  const credit = creditOrders.reduce((total, order) => total + order.creditAmount, 0);
  const total = cash + wave;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Clôture de caisse</h1>
        <p className="text-sm text-on-surface-variant">
          Rapprochement quotidien entre l&apos;application, Wave et les espèces.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Espèces aujourd'hui" value={formatFCFA(cash)} icon="payments" />
        <StatCard label="Wave aujourd'hui" value={formatFCFA(wave)} icon="bolt" tone="success" />
        <StatCard label="Crédit accordé aujourd'hui" value={formatFCFA(credit)} icon="credit_card" tone="warning" />
      </div>

      <Card className="p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Icon name="savings" className="text-lg text-primary-container" />
          Enregistrer la clôture du jour
        </h2>
        <p className="mb-3 mt-1 text-xs text-on-surface-variant">
          Total encaissé aujourd&apos;hui : {formatFCFA(total)}. Ajuste les montants réels constatés
          avant d&apos;enregistrer.
        </p>
        <CashClosingForm date={today} cash={cash} wave={wave} credit={credit} />
      </Card>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="history" className="text-xl text-primary-container" />
          Historique des clôtures
        </h2>
        {closings.length === 0 ? (
          <EmptyState icon="savings" title="Aucune clôture enregistrée" description="La première clôture apparaîtra ici." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Espèces</th>
                  <th className="text-right">Wave</th>
                  <th className="text-right">Crédit</th>
                  <th className="text-right">Total encaissé</th>
                  <th>Clôturé par</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((closing) => (
                  <tr key={closing.id}>
                    <td className="text-xs font-semibold">{formatDate(closing.date)}</td>
                    <td className="text-right text-xs">{formatFCFA(closing.cash)}</td>
                    <td className="text-right text-xs">{formatFCFA(closing.wave)}</td>
                    <td className="text-right text-xs">{formatFCFA(closing.credit)}</td>
                    <td className="text-right">
                      <span className="money text-xs">
                        {formatFCFA(closing.cash + closing.wave)}
                      </span>
                    </td>
                    <td className="text-xs">{closing.closedBy?.name ?? "—"}</td>
                    <td className="text-xs text-on-surface-variant">{closing.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
