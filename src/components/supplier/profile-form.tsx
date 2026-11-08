"use client";

import { useActionState } from "react";
import type { Supplier } from "@prisma/client";
import { updateSupplierProfileAction, type SupplierActionState } from "@/lib/actions/supplier";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: SupplierActionState = {};

export function SupplierProfileForm({ supplier }: { supplier: Supplier }) {
  const [state, action] = useActionState(updateSupplierProfileAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l'élevage" htmlFor="farmName">
          <input id="farmName" name="farmName" required defaultValue={supplier.farmName} className="input" />
        </Field>
        <Field label="Localisation" htmlFor="location">
          <input id="location" name="location" required defaultValue={supplier.location} className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Capacité (sujets/semaine)" htmlFor="capacity">
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={0}
            defaultValue={supplier.capacity}
            className="input"
          />
        </Field>
        <Field label="Type d'élevage" htmlFor="farmType">
          <select id="farmType" name="farmType" className="input" defaultValue={supplier.farmType ?? ""}>
            <option value="">Choisir…</option>
            <option value="Poulet de chair">Poulet de chair</option>
            <option value="Poulet fermier">Poulet fermier / local</option>
            <option value="Œufs">Œufs de consommation</option>
            <option value="Mixte">Mixte (poulets + œufs)</option>
          </select>
        </Field>
      </div>

      <Field label="Présentation de l'élevage" htmlFor="description">
        <textarea
          id="description"
          name="description"
          defaultValue={supplier.description ?? ""}
          className="textarea"
          placeholder="Bâtiments, alimentation, suivi vétérinaire, agréments…"
        />
      </Field>

      <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Coordonnées de paiement
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Moyen de paiement" htmlFor="paymentProvider">
            <select
              id="paymentProvider"
              name="paymentProvider"
              className="input"
              defaultValue={supplier.paymentProvider ?? ""}
            >
              <option value="">Choisir…</option>
              <option value="Wave">Wave</option>
              <option value="Orange Money">Orange Money</option>
            </select>
          </Field>
          <Field label="Numéro de paiement" htmlFor="paymentAccount">
            <input
              id="paymentAccount"
              name="paymentAccount"
              defaultValue={supplier.paymentAccount ?? ""}
              className="input"
              placeholder="+221 77 123 45 67"
            />
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Tout changement de numéro est vérifié par appel avant utilisation (lutte anti-fraude).
        </p>
      </div>

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer le profil</SubmitButton>
    </form>
  );
}
