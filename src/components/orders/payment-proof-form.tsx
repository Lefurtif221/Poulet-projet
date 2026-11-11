"use client";

import { useActionState } from "react";
import { declarePaymentAction, type OrderActionState } from "@/lib/actions/orders";
import { Alert, Field, Icon } from "@/components/ui";
import { PendingButton } from "@/components/forms/pending-button";

const initial: OrderActionState = {};

export function PaymentProofForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(declarePaymentAction, initial);

  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="orderId" value={orderId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Référence / ID de transaction" htmlFor={`pay-ref-${orderId}`}>
        <input
          id={`pay-ref-${orderId}`}
          name="reference"
          className="input h-10 text-sm"
          placeholder="Ex. TCN4Y4ZC3FM ou numéro Wave"
        />
      </Field>

      <Field
        label="Capture du paiement"
        htmlFor={`pay-proof-${orderId}`}
        hint="JPEG, PNG ou WebP · 3 Mo max. Optionnel si tu saisis une référence."
      >
        <input
          id={`pay-proof-${orderId}`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="input h-10 text-xs file:mr-2 file:rounded file:border-0 file:bg-surface-container file:px-2 file:py-1 file:text-[10px] file:font-semibold"
        />
      </Field>

      <PendingButton className="w-full" pendingLabel="Envoi…">
        <Icon name="check_circle" className="text-lg" />
        J&apos;ai payé
      </PendingButton>
      <p className="text-[10px] text-on-surface-variant">
        L&apos;administrateur vérifie le paiement dans Wave / Orange Money avant de le confirmer.
      </p>
    </form>
  );
}
