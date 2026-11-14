"use client";

import { useActionState } from "react";
import { createCashClosingAction, type AdminActionState } from "@/lib/actions/admin";
import { Alert, Field } from "@/components/ui";
import { PendingButton } from "@/components/forms/pending-button";

const initial: AdminActionState = {};

export function CashClosingForm({
  date,
  cash,
  wave,

  credit,
}: {
  date: string;
  cash: number;
  wave: number;

  credit: number;
}) {
  const [state, action] = useActionState(createCashClosingAction, initial);

  return (
    <form action={action} className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date" htmlFor="close-date">
          <input id="close-date" name="date" type="date" defaultValue={date} required className="input" />
        </Field>
        <Field label="Espèces (FCFA)" htmlFor="close-cash">
          <input id="close-cash" name="cash" type="number" min={0} defaultValue={cash} className="input" />
        </Field>
        <Field label="Wave (FCFA)" htmlFor="close-wave">
          <input id="close-wave" name="wave" type="number" min={0} defaultValue={wave} className="input" />
        </Field>
        <Field label="Crédit accordé (FCFA)" htmlFor="close-credit">
          <input id="close-credit" name="credit" type="number" min={0} defaultValue={credit} className="input" />
        </Field>
      </div>

      <Field label="Note de caisse" htmlFor="close-note">
        <input id="close-note" name="note" className="input" placeholder="Écart, remarque, dépôt…" />
      </Field>

      <PendingButton pendingLabel="Enregistrement…">Enregistrer la clôture</PendingButton>
    </form>
  );
}
