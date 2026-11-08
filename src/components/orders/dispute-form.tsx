"use client";

import { useActionState } from "react";
import { disputeAction, type OrderActionState } from "@/lib/actions/orders";
import { Alert, Field, Icon } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: OrderActionState = {};

export function DisputeForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(disputeAction, initial);

  if (state.success) {
    return (
      <Alert tone="success" title="Litige enregistré">
        {state.success}
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Motif" htmlFor={`reason-${orderId}`}>
        <select id={`reason-${orderId}`} name="reason" required className="input" defaultValue="">
          <option value="">Choisir un motif…</option>
          <option value="Quantité manquante">Quantité manquante</option>
          <option value="Poids inférieur à la tolérance">Poids inférieur à la tolérance</option>
          <option value="Qualité non conforme">Qualité non conforme</option>
          <option value="Œufs cassés au-delà du seuil">Œufs cassés au-delà du seuil</option>
          <option value="Marchandise abîmée au transport">Marchandise abîmée au transport</option>
          <option value="Retard de livraison">Retard de livraison</option>
          <option value="Autre">Autre</option>
        </select>
      </Field>

      <Field label="Description" htmlFor={`description-${orderId}`}>
        <textarea
          id={`description-${orderId}`}
          name="description"
          className="textarea"
          placeholder="Décrivez précisément le problème constaté à la réception."
        />
      </Field>

      <Field label="Photo justificative" htmlFor={`photo-${orderId}`} hint="JPEG, PNG ou WebP · 3 Mo maximum.">
        <input
          id={`photo-${orderId}`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="input file:mr-3 file:rounded-md file:border-0 file:bg-surface-container file:px-3 file:py-1.5 file:text-xs file:font-semibold"
        />
      </Field>

      <SubmitButton variant="danger" className="w-full" pendingLabel="Envoi du litige…">
        <Icon name="report" className="text-lg" />
        Signaler un problème
      </SubmitButton>
      <p className="text-[10px] text-on-surface-variant">
        Le paiement de l&apos;éleveur est suspendu pour cette commande jusqu&apos;à la décision de
        l&apos;administrateur, sous 48 h.
      </p>
    </form>
  );
}
