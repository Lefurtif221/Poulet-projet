"use client";

import { useActionState } from "react";
import { refuseOrderAction, type SupplierActionState } from "@/lib/actions/supplier";
import { Alert, Icon } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: SupplierActionState = {};

export function RefuseOrderForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(refuseOrderAction, initial);

  return (
    <form action={action} className="w-full space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <select name="reason" required className="input h-10 text-xs" defaultValue="">
        <option value="">Motif de refus…</option>
        <option value="Stock insuffisant">Stock insuffisant</option>
        <option value="Commande trop tardive">Commande trop tardive</option>
        <option value="Poids / calibre indisponible">Poids / calibre indisponible</option>
        <option value="Problème sanitaire">Problème sanitaire</option>
        <option value="Autre">Autre</option>
      </select>
      <SubmitButton variant="outline" className="w-full text-[#a8421a]" pendingLabel="Refus…">
        <Icon name="close" className="text-base" />
        Confirmer le refus
      </SubmitButton>
    </form>
  );
}
