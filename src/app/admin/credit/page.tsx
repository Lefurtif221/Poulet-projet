import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatFCFA } from "@/lib/format";
import { Alert, Card, Icon, ProgressBar, buttonClass } from "@/components/ui";
import { updateCreditAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Crédit & risque" };

export default async function AdminCreditPage() {
  const settings = await getSettings();
  const clients = await db.client.findMany({
    include: {
      user: true,
      orders: {
        where: { paymentMethod: "CREDIT", status: { notIn: ["CANCELLED", "REFUSED"] } },
        orderBy: { creditDueDate: "asc" },
        take: 10,
      },
    },
    orderBy: { balanceDue: "desc" },
  });

  const totalOutstanding = clients.reduce((total, client) => total + client.balanceDue, 0);
  const overdueClients = clients.filter((client) =>
    client.orders.some(
      (order) => order.paymentStatus === "PENDING" && order.creditDueDate && order.creditDueDate < new Date()
    )
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Crédit &amp; risque client</h1>
        <p className="text-sm text-on-surface-variant">
          Plafonds, délais et blocage automatique. Le crédit est accordé manuellement, jamais par défaut.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Encours total</p>
          <p className="kpi-value mt-1">{formatFCFA(totalOutstanding)}</p>
          <p className="text-[11px] text-on-surface-variant">
            Plafond global de référence : {formatFCFA(settings.creditGlobalCap)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Clients en retard</p>
          <p className={`kpi-value mt-1 ${overdueClients.length > 0 ? "text-[#a8421a]" : ""}`}>
            {overdueClients.length}
          </p>
          <p className="text-[11px] text-on-surface-variant">Blocage automatique au-delà de 7 jours</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Délai par défaut</p>
          <p className="kpi-value mt-1">{settings.creditDelayDays} jours</p>
          <p className="text-[11px] text-on-surface-variant">Modifiable par client ci-dessous</p>
        </Card>
      </div>

      {overdueClients.length > 0 ? (
        <Alert tone="danger" title="Relances à effectuer">
          {overdueClients.length} client(s) ont au moins une facture échue. Relance J+3 puis blocage
          jusqu&apos;au règlement.
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {clients.map((client) => {
          const overdue = client.orders.filter(
            (order) => order.paymentStatus === "PENDING" && order.creditDueDate && order.creditDueDate < new Date()
          );
          const pending = client.orders.filter((order) => order.paymentStatus === "PENDING");
          const ratio = client.creditLimit > 0 ? (client.balanceDue / client.creditLimit) * 100 : 0;
          return (
            <Card key={client.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold">{client.establishment}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {client.activityType ?? "Activité non précisée"} · {client.district ?? "Zone non précisée"}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{client.user.phone}</p>
                </div>
                <span
                  className={`badge ${
                    overdue.length > 0
                      ? "bg-red-50 text-red-700"
                      : client.creditLimit === 0
                        ? "bg-surface-container text-on-surface-variant"
                        : "bg-primary-fixed text-primary"
                  }`}
                >
                  {overdue.length > 0 ? "Crédit bloqué" : client.creditLimit === 0 ? "Sans crédit" : "Solvable"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-container-low p-2">
                  <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Encours</p>
                  <p className="money text-sm">{formatFCFA(client.balanceDue)}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-2">
                  <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Disponible</p>
                  <p className="money text-sm">{formatFCFA(Math.max(0, client.creditLimit - client.balanceDue))}</p>
                </div>
              </div>

              <div className="mt-2">
                <ProgressBar
                  value={client.balanceDue}
                  max={client.creditLimit || 1}
                  tone={overdue.length > 0 ? "danger" : ratio > 80 ? "warning" : "primary"}
                />
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  {Math.round(ratio)} % du plafond · échéance {client.creditDelayDays || settings.creditDelayDays} j
                </p>
              </div>

              {pending.length > 0 ? (
                <div className="mt-3 rounded-lg border border-outline-variant/40">
                  <p className="border-b border-outline-variant/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Factures à crédit
                  </p>
                  <ul className="divide-y divide-outline-variant/25">
                    {pending.slice(0, 5).map((order) => {
                      const late = order.creditDueDate && order.creditDueDate < new Date();
                      return (
                        <li key={order.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]">
                          <span className="font-semibold">#{order.reference}</span>
                          <span className="text-on-surface-variant">{formatDate(order.creditDueDate)}</span>
                          <span className={late ? "font-bold text-red-700" : "text-on-surface-variant"}>
                            {formatFCFA(order.total)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <form action={updateCreditAction} className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <div>
                  <label className="field-label" htmlFor={`limit-${client.id}`}>
                    Plafond
                  </label>
                  <input
                    id={`limit-${client.id}`}
                    name="creditLimit"
                    type="number"
                    min={0}
                    defaultValue={client.creditLimit}
                    className="input h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`delay-${client.id}`}>
                    Délai (j)
                  </label>
                  <input
                    id={`delay-${client.id}`}
                    name="creditDelayDays"
                    type="number"
                    min={0}
                    defaultValue={client.creditDelayDays || settings.creditDelayDays}
                    className="input h-9 text-xs"
                  />
                </div>
                <button type="submit" className={buttonClass("primary", "sm")}>
                  <Icon name="save" className="text-base" />
                  OK
                </button>
              </form>
              {overdue.length > 0 ? (
                <p className="mt-1 text-[10px] font-semibold text-red-700">
                  {overdue.length} facture(s) échue(s) : relance puis suspension.
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
