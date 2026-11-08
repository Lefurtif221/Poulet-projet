import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatFCFA } from "@/lib/format";
import { Alert, EmptyState, Icon, buttonClass } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createRecurringAction,
  deleteRecurringAction,
  toggleRecurringAction,
} from "@/lib/actions/orders";

export const metadata: Metadata = { title: "Commandes récurrentes" };

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default async function RecurringPage() {
  const user = await requireUser("CLIENT");
  const [settings, client] = await Promise.all([
    getSettings(),
    db.client.findUnique({ where: { userId: user.sub } }),
  ]);
  if (!client) return null;

  const [recurrings, pastOrders] = await Promise.all([
    db.recurringOrder.findMany({
      where: { clientId: client.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: { clientId: client.id, status: { in: ["CLOSED", "DELIVERED"] } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Commandes récurrentes</h1>
        <p className="text-sm text-on-surface-variant">
          Programmez la même commande chaque semaine. Vous gardez la main : pause possible à tout moment.
        </p>
      </div>

      <Alert tone="info">
        Une commande récurrente est préparée automatiquement le jour choisi, sous réserve du stock. Un
        rappel est envoyé la veille et vous pouvez annuler avant la confirmation de l&apos;éleveur.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="event_repeat" className="text-xl text-primary-container" />
            Programmes actifs
          </h2>

          {recurrings.length === 0 ? (
            <EmptyState
              icon="event_repeat"
              title="Aucune commande récurrente"
              description="Choisissez une commande passée dans le formulaire pour la reproduire chaque semaine."
            />
          ) : (
            <div className="space-y-3">
              {recurrings.map((recurring) => (
                <article
                  key={recurring.id}
                  className={`card border-l-[3px] p-4 ${
                    recurring.active ? "border-l-primary-container" : "border-l-outline-variant"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-bold">
                        {recurring.label ?? "Commande hebdomadaire"}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Chaque {DAYS[recurring.dayOfWeek - 1]} · {recurring.deliverySlot} ·{" "}
                        {recurring.items.reduce((total, item) => total + item.quantity, 0)} unité(s)
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Créée le {formatDate(recurring.createdAt)}
                        {recurring.lastRunAt ? ` · dernière exécution ${formatDate(recurring.lastRunAt)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        recurring.active ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {recurring.active ? "Active" : "En pause"}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-1 border-t border-outline-variant/30 pt-2 text-xs">
                    {recurring.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span className="text-on-surface-variant">
                          {item.quantity} × {item.product.name}
                        </span>
                        <span className="money">
                          {formatFCFA(item.product.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={toggleRecurringAction}>
                      <input type="hidden" name="id" value={recurring.id} />
                      <button type="submit" className={buttonClass("outline", "sm")}>
                        <Icon name={recurring.active ? "pause" : "play_arrow"} className="text-base" />
                        {recurring.active ? "Mettre en pause" : "Réactiver"}
                      </button>
                    </form>
                    <form action={deleteRecurringAction}>
                      <input type="hidden" name="id" value={recurring.id} />
                      <button type="submit" className={buttonClass("outline", "sm", "text-[#a8421a]")}>
                        <Icon name="delete" className="text-base" />
                        Supprimer
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside>
          <div className="card sticky top-24 p-4">
            <h2 className="font-display text-base font-semibold">Programmer une commande</h2>
            {pastOrders.length === 0 ? (
              <div className="mt-3 text-sm text-on-surface-variant">
                <p>Vous devez d&apos;abord avoir une commande livrée ou clôturée.</p>
                <Link href="/client/catalogue" className={buttonClass("primary", "md", "mt-3 w-full")}>
                  Commander maintenant
                </Link>
              </div>
            ) : (
              <form action={createRecurringAction} className="mt-3 space-y-3">
                <div>
                  <label className="field-label" htmlFor="orderId">
                    Commande modèle
                  </label>
                  <select id="orderId" name="orderId" required className="input" defaultValue={pastOrders[0]?.id}>
                    {pastOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        #{order.reference} · {formatFCFA(order.total)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="dayOfWeek">
                    Jour de livraison
                  </label>
                  <select id="dayOfWeek" name="dayOfWeek" className="input" defaultValue="1">
                    {DAYS.map((day, index) => (
                      <option key={day} value={index + 1}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="deliverySlot">
                    Créneau
                  </label>
                  <select id="deliverySlot" name="deliverySlot" className="input" defaultValue={settings.deliverySlots[0]}>
                    {settings.deliverySlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <SubmitButton className="w-full" pendingLabel="Création…">
                  <Icon name="event_repeat" className="text-lg" />
                  Programmer chaque semaine
                </SubmitButton>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
