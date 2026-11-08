"use client";

import { useActionState } from "react";
import { signupSupplierAction, type AuthActionState } from "@/lib/actions/auth";
import { Alert, Field, Icon } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: AuthActionState = {};

export function SignupSupplierForm() {
  const [state, action] = useActionState(signupSupplierAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l'élevage" htmlFor="farmName">
          <input id="farmName" name="farmName" required placeholder="Élevage Keur Mbaye" className="input" />
        </Field>
        <Field label="Responsable" htmlFor="name">
          <input id="name" name="name" required placeholder="Nom et prénom" className="input" />
        </Field>
      </div>

      <Field label="Téléphone" htmlFor="phone" hint="Identifiant de connexion.">
        <input id="phone" name="phone" type="tel" inputMode="tel" required placeholder="77 123 45 67" className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Localisation" htmlFor="location">
          <input id="location" name="location" required placeholder="Sébikotane, Rufisque…" className="input" />
        </Field>
        <Field label="Capacité (sujets/semaine)" htmlFor="capacity">
          <input id="capacity" name="capacity" type="number" min={0} placeholder="300" className="input" />
        </Field>
      </div>

      <Field label="Type d'élevage" htmlFor="farmType">
        <select id="farmType" name="farmType" className="input" defaultValue="">
          <option value="">Choisir…</option>
          <option value="Poulet de chair">Poulet de chair</option>
          <option value="Poulet fermier">Poulet fermier / local</option>
          <option value="Œufs">Œufs de consommation</option>
          <option value="Mixte">Mixte (poulets + œufs)</option>
        </select>
      </Field>

      <Field label="Présentation de l'élevage" htmlFor="description">
        <textarea id="description" name="description" className="textarea" placeholder="Bâtiments, alimentation, suivi vétérinaire…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Moyen de paiement" htmlFor="paymentProvider">
          <select id="paymentProvider" name="paymentProvider" className="input" defaultValue="">
            <option value="">Choisir…</option>
            <option value="Wave">Wave</option>
            <option value="Orange Money">Orange Money</option>
          </select>
        </Field>
        <Field label="Numéro de paiement" htmlFor="paymentAccount">
          <input id="paymentAccount" name="paymentAccount" placeholder="+221 77 123 45 67" className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code PIN" htmlFor="pin" hint="4 à 6 chiffres.">
          <input id="pin" name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required className="input" />
        </Field>
        <Field label="Confirmer le PIN" htmlFor="pinConfirm">
          <input id="pinConfirm" name="pinConfirm" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required className="input" />
        </Field>
      </div>

      <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 text-xs text-on-surface-variant">
        <p className="flex items-center gap-1.5 font-semibold text-on-surface">
          <Icon name="fact_check" className="text-base text-primary-container" />
          Après l&apos;inscription
        </p>
        <p className="mt-1">
          Un agent vous contacte pour une visite ou une référence professionnelle. Le compte est activé
          après validation, puis vous pouvez publier vos produits.
        </p>
      </div>

      <SubmitButton className="w-full" pendingLabel="Envoi de la demande…">
        Devenir fournisseur
      </SubmitButton>
    </form>
  );
}
