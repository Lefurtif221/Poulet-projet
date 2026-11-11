"use client";

import { useActionState } from "react";
import { createAdminAction, type AdminActionState } from "@/lib/actions/admin";
import { Alert, Field } from "@/components/ui";
import { PendingButton } from "@/components/forms/pending-button";

const initial: AdminActionState = {};

export function CreateAdminForm() {
  const [state, action] = useActionState(createAdminAction, initial);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
      {state.error ? (
        <div className="sm:col-span-4">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      ) : null}
      {state.success ? (
        <div className="sm:col-span-4">
          <Alert tone="success">{state.success}</Alert>
        </div>
      ) : null}
      <Field label="Nom" htmlFor="admin-name">
        <input id="admin-name" name="name" required className="input" placeholder="Comptable" />
      </Field>
      <Field label="Téléphone" htmlFor="admin-phone">
        <input id="admin-phone" name="phone" required className="input" placeholder="77 123 45 67" />
      </Field>
      <Field label="PIN" htmlFor="admin-pin">
        <input
          id="admin-pin"
          name="pin"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          required
          className="input"
          placeholder="4 à 6 chiffres"
        />
      </Field>
      <PendingButton pendingLabel="Création…">Créer</PendingButton>
    </form>
  );
}
