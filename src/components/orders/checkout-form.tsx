"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import type { PaymentMethod } from "@prisma/client";
import { createOrderAction, type OrderActionState } from "@/lib/actions/orders";
import { cartSubtotal, readCart, updateQuantity, removeFromCart, type CartItem } from "@/lib/cart";
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
  { value: "WAVE", label: "Wave", hint: "Paiement immédiat — numéro communiqué après validation", icon: "bolt" },
  { value: "ORANGE_MONEY", label: "Orange Money", hint: "Paiement immédiat — numéro communiqué après validation", icon: "phone_iphone" },
  { value: "CASH_ON_DELIVERY", label: "Paiement à la livraison", hint: "Espèces ou mobile money à la réception", icon: "payments" },
  { value: "CREDIT", label: "Crédit B2B", hint: "Facture à échéance, si votre compte est autorisé", icon: "account_balance_wallet" },
];

export function CheckoutForm({
  address,
  creditLimit,
  balanceDue,
  creditDelayDays,
  minOrder,
  deliveryFee,
  freeDeliveryThreshold,
  deliverySlots,
}: {
  address: string;
  creditLimit: number;
  balanceDue: number;
  creditDelayDays: number;
  minOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliverySlots: string[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("WAVE");
  const [state, action] = useActionState(createOrderAction, initial);

  useEffect(() => {
    const sync = () => {
      setItems(readCart());
      setReady(true);
    };
    sync();
    window.addEventListener("guanar-cart", sync);
    return () => window.removeEventListener("guanar-cart", sync);
  }, []);

  const subtotal = cartSubtotal(items);
  const fee = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : deliveryFee;
  const total = subtotal + fee;
  const missing = Math.max(0, minOrder - subtotal);
  const creditAvailable = Math.max(0, creditLimit - balanceDue);
  const creditAllowed = creditLimit > 0 && creditAvailable >= total;

  const payload = useMemo(
    () => JSON.stringify(items.map((item) => ({ productId: item.productId, quantity: item.quantity }))),
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
                  <span className="pointer-events-none flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-primary-container">
                    <Icon name={option.icon} className="text-lg" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-[11px] text-on-surface-variant">
                      {option.value === "CREDIT"
                        ? creditLimit > 0
                          ? `Disponible : ${formatFCFA(creditAvailable)} · échéance ${creditDelayDays} jours`
                          : "Non activé sur votre compte"
                        : option.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {method === "CREDIT" ? (
            <Alert tone="info">
              Le montant sera ajouté à votre encours. Échéance à {creditDelayDays} jours. Tout retard
              bloque le crédit et les nouvelles commandes à crédit.
            </Alert>
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
              <span>Livraison</span>
              <span className={fee === 0 ? "font-semibold text-primary-container" : "money"}>
                {fee === 0 ? "Offerte" : formatFCFA(fee)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-2">
              <span className="font-semibold">Total à régler</span>
              <span className="money text-xl">{formatFCFA(total)}</span>
            </div>

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
