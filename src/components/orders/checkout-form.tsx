"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import type { PaymentMethod } from "@prisma/client";
import { createOrderAction, type OrderActionState } from "@/lib/actions/orders";
import {
  cartSubtotal,
  readCart,
  readDeliveryMode,
  updateQuantity,
  removeFromCart,
  writeDeliveryMode,
  type CartItem,
  type DeliveryMode,
} from "@/lib/cart";
import { formatFCFA } from "@/lib/format";
import { PRODUCT_UNIT } from "@/lib/labels";
import { Alert, Field, Icon, buttonClass, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";

const initial: OrderActionState = {};

function earliestDate(): string {
  const now = new Date();
  const daysAhead = now.getUTCHours() >= 22 ? 2 : 1;
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead));
  return date.toISOString().slice(0, 10);
}

const PAYMENTS: { value: PaymentMethod; label: string; hint: string; icon: string }[] = [
  {
    value: "WAVE",
    label: "Wave",
    hint: "Paie via le lien Wave de la commande, puis déclare ton paiement",
    icon: "bolt",
  },
  {
    value: "CASH_ON_DELIVERY",
    label: "Paiement à la livraison",
    hint: "Espèces ou mobile money à la réception",
    icon: "payments",
  },
  {
    value: "CREDIT",
    label: "Crédit B2B",
    hint: "Utilise ton crédit disponible, le complément est payé à la livraison ou par Wave",
    icon: "account_balance_wallet",
  },
];

export function CheckoutForm({
  address,
  creditLimit,
  balanceDue,
  creditDelayDays,
  minOrder,
  deliveryFee,
  groupageFee,
  groupageLeadDays,
  groupageSlot,
  freeDeliveryThreshold,
  deliverySlots,
}: {
  address: string;
  creditLimit: number;
  balanceDue: number;
  creditDelayDays: number;
  minOrder: number;
  deliveryFee: number;
  groupageFee: number;
  groupageLeadDays: number;
  groupageSlot: string;
  freeDeliveryThreshold: number;
  deliverySlots: string[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("WAVE");
  const [remainderMethod, setRemainderMethod] = useState<"WAVE" | "CASH_ON_DELIVERY">("WAVE");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("INDIVIDUAL");
  const [state, action] = useActionState(createOrderAction, initial);

  useEffect(() => {
    const sync = () => {
      setItems(readCart());
      setDeliveryMode(readDeliveryMode());
      setReady(true);
    };
    sync();
    window.addEventListener("guanar-cart", sync);
    window.addEventListener("guanar-delivery-mode", sync);
    return () => {
      window.removeEventListener("guanar-cart", sync);
      window.removeEventListener("guanar-delivery-mode", sync);
    };
  }, []);

  function chooseMode(mode: DeliveryMode) {
    setDeliveryMode(mode);
    writeDeliveryMode(mode);
  }

  const subtotal = cartSubtotal(items);
  const isGroupage = deliveryMode === "GROUPAGE";
  const baseFee = isGroupage ? groupageFee : deliveryFee;
  const fee = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : baseFee;
  const total = subtotal + fee;
  const missing = Math.max(0, minOrder - subtotal);
  const creditAvailable = Math.max(0, creditLimit - balanceDue);
  const creditAllowed = creditLimit > 0 && creditAvailable > 0;
  const creditUsed = method === "CREDIT" ? Math.min(total, creditAvailable) : 0;
  const remainderDue = total - creditUsed;
  const groupageDate = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + Math.max(1, groupageLeadDays)
    )
  )
    .toISOString()
    .slice(0, 10);

  const payload = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          preparation: item.preparation,
        }))
      ),
    [items]
  );

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-container" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="shopping_basket"
        title="Votre panier est vide"
        description="Ajoutez des poulets ou des plateaux d'œufs depuis le catalogue pour passer commande."
        action={
          <Link href="/client/catalogue" className={buttonClass("primary")}>
            Voir le catalogue
          </Link>
        }
      />
    );
  }

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <input type="hidden" name="items" value={payload} />

      <div className="space-y-5">
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

        <section className="card p-4 md:p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="local_shipping" className="text-xl text-primary-container" />
            Livraison professionnelle
          </h2>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                isGroupage ? "border-primary-container bg-primary-fixed/20" : "border-outline-variant/50"
              )}
            >
              <input
                type="radio"
                checked={isGroupage}
                onChange={() => chooseMode("GROUPAGE")}
                className="mt-1 h-4 w-4 accent-[#185338]"
              />
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Livraison groupée</span>
                  <span className="text-xs font-semibold">
                    {groupageFee === 0 ? "Offerte" : formatFCFA(groupageFee)}
                  </span>
                </span>
                <span className="block text-[11px] text-on-surface-variant">
                  Moins chère, à partir du{" "}
                  {new Date(`${groupageDate}T08:00:00Z`).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  ({groupageSlot}).
                </span>
              </span>
            </label>

            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                !isGroupage ? "border-primary-container bg-primary-fixed/20" : "border-outline-variant/50"
              )}
            >
              <input
                type="radio"
                checked={!isGroupage}
                onChange={() => chooseMode("INDIVIDUAL")}
                className="mt-1 h-4 w-4 accent-[#185338]"
              />
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Livraison individuelle</span>
                  <span className="text-xs font-semibold">
                    {deliveryFee === 0 ? "Offerte" : formatFCFA(deliveryFee)}
                  </span>
                </span>
                <span className="block text-[11px] text-on-surface-variant">
                  Plus rapide, créneau au choix dès demain.
                </span>
              </span>
            </label>
          </div>

          <input type="hidden" name="deliveryMode" value={deliveryMode} />

          {isGroupage ? (
            <div className="mt-4 rounded-lg border border-primary-container/30 bg-primary-fixed/20 p-3 text-sm">
              <p className="font-semibold text-primary">Tournée groupée</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Livraison prévue le{" "}
                {new Date(`${groupageDate}T08:00:00Z`).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                sur le créneau {groupageSlot}. Vous pouvez annuler sans frais avant la confirmation
                de l&apos;éleveur.
              </p>
              <input type="hidden" name="deliveryDate" value={groupageDate} />
              <input type="hidden" name="deliverySlot" value={groupageSlot} />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Date de livraison" htmlFor="deliveryDate">
                <input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  required
                  min={earliestDate()}
                  defaultValue={earliestDate()}
                  className="input"
                />
              </Field>
              <Field label="Créneau" htmlFor="deliverySlot">
                <select id="deliverySlot" name="deliverySlot" required className="input" defaultValue={deliverySlots[0]}>
                  {deliverySlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <Field label="Adresse de livraison" htmlFor="address" className="mt-4">
            <input id="address" name="address" required defaultValue={address} className="input" />
          </Field>

          <Field label="Note pour l'éleveur (facultatif)" htmlFor="note" className="mt-4">
            <textarea
              id="note"
              name="note"
              className="textarea"
              placeholder="Découpe, calibre, heure d'ouverture, repère d'accès…"
            />
          </Field>
        </section>

        <section className="card p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Icon name="payments" className="text-xl text-primary-container" />
              Mode de règlement
            </h2>
            <span className="badge bg-surface-container text-on-surface-variant">FCFA</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {PAYMENTS.map((option) => {
              const disabled = option.value === "CREDIT" && !creditAllowed;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    method === option.value
                      ? "border-primary-container bg-primary-fixed/20"
                      : "border-outline-variant/50 hover:bg-surface-container-low",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={method === option.value}
                    onChange={() => setMethod(option.value)}
                    disabled={disabled}
                    className="h-4 w-4 accent-[#185338]"
                  />
                  {option.value === "WAVE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/brand/wave-icon.svg"
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="pointer-events-none flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-primary-container">
                      <Icon name={option.icon} className="text-lg" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-[11px] text-on-surface-variant">
                      {option.value === "CREDIT"
                        ? creditLimit > 0
                          ? `Disponible : ${formatFCFA(creditAvailable)} · utilisé : ${formatFCFA(creditUsed)} · complément : ${formatFCFA(remainderDue)}`
                          : "Non activé sur votre compte"
                        : option.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {method === "CREDIT" ? (
            <div className="space-y-2">
              <Alert tone="info">
                Crédit utilisé : {formatFCFA(creditUsed)} (échéance {creditDelayDays} jours).
                Complément : {formatFCFA(remainderDue)}. Le crédit est ajouté à votre encours et
                doit être réglé avant vos prochaines commandes à crédit.
              </Alert>

              {remainderDue > 0 ? (
                <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
                  <p className="text-xs font-semibold">Comment payer le complément ?</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-outline-variant/50 bg-white px-2.5 py-2 text-xs">
                      <input
                        type="radio"
                        name="remainderMethodChoice"
                        checked={remainderMethod === "WAVE"}
                        onChange={() => setRemainderMethod("WAVE")}
                        className="h-3.5 w-3.5 accent-[#185338]"
                      />
                      Par Wave
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-outline-variant/50 bg-white px-2.5 py-2 text-xs">
                      <input
                        type="radio"
                        name="remainderMethodChoice"
                        checked={remainderMethod === "CASH_ON_DELIVERY"}
                        onChange={() => setRemainderMethod("CASH_ON_DELIVERY")}
                        className="h-3.5 w-3.5 accent-[#185338]"
                      />
                      À la livraison
                    </label>
                  </div>
                </div>
              ) : null}

              <input type="hidden" name="remainderMethod" value={remainderMethod} />
            </div>
          ) : null}
        </section>
      </div>

      <aside>
        <div className="card sticky top-24 overflow-hidden">
          <div className="border-b border-outline-variant/30 px-4 py-3">
            <h2 className="font-display text-base font-semibold">Récapitulatif</h2>
            <p className="text-xs text-on-surface-variant">{items.length} ligne(s) de commande</p>
          </div>

          <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container">
                  <Icon name="egg_alt" className="text-lg text-primary-container" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{item.name}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {item.supplierName} · {formatFCFA(item.price)}/{PRODUCT_UNIT[item.unit]}
                    {item.preparation === "PLUCKED" ? " · Déplumé" : ""}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center rounded border border-outline-variant/60">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center"
                        aria-label="Diminuer"
                      >
                        <Icon name="remove" className="text-sm" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center"
                        aria-label="Augmenter"
                      >
                        <Icon name="add" className="text-sm" />
                      </button>
                    </div>
                    <span className="money text-xs">{formatFCFA(item.price * item.quantity)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="self-start text-on-surface-variant"
                  aria-label="Retirer"
                >
                  <Icon name="close" className="text-base" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-outline-variant/30 px-4 py-3">
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Sous-total</span>
              <span className="money text-on-surface">{formatFCFA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Livraison {isGroupage ? "groupée" : "individuelle"}</span>
              <span className={fee === 0 ? "font-semibold text-primary-container" : "money"}>
                {fee === 0 ? "Offerte" : formatFCFA(fee)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-2">
              <span className="font-semibold">Total à régler</span>
              <span className="money text-xl">{formatFCFA(total)}</span>
            </div>

            {method === "CREDIT" ? (
              <div className="space-y-1 rounded-lg bg-surface-container-low p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Dont crédit</span>
                  <span className="font-semibold">{formatFCFA(creditUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Complément {remainderMethod === "WAVE" ? "Wave" : "à la livraison"}
                  </span>
                  <span className="font-semibold">{formatFCFA(remainderDue)}</span>
                </div>
              </div>
            ) : null}

            {missing > 0 ? (
              <Alert tone="warning">Commande minimum : encore {formatFCFA(missing)}.</Alert>
            ) : null}

            <SubmitButton className="w-full" pendingLabel="Envoi de la commande…">
              <Icon name="send" className="text-lg" />
              Confirmer la commande
            </SubmitButton>
            <p className="text-center text-[10px] text-on-surface-variant">
              L&apos;éleveur a 2 heures pour accepter. Vous pouvez annuler sans frais avant sa confirmation.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
