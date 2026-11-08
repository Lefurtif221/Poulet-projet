"use client";

import { useActionState } from "react";
import { signupClientAction, type AuthActionState } from "@/lib/actions/auth";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: AuthActionState = {};

export function SignupClientForm({ districts }: { districts: string[] }) {
  const [state, action] = useActionState(signupClientAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Établissement" htmlFor="establishment">
          <input id="establishment" name="establishment" required placeholder="Le Teranga Grill" className="input" />
        </Field>
        <Field label="Responsable" htmlFor="name">
          <input id="name" name="name" required placeholder="Nom et prénom" className="input" />
        </Field>
      </div>

      <Field label="Téléphone" htmlFor="phone" hint="Ce numéro servira de identifiant de connexion.">
        <input id="phone" name="phone" type="tel" inputMode="tel" required placeholder="77 123 45 67" className="input" />
      </Field>

      <Field label="Adresse de livraison" htmlFor="address">
        <input id="address" name="address" required placeholder="Rue, quartier, repère" className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Zone de livraison" htmlFor="district">
          <select id="district" name="district" className="input" defaultValue="">
            <option value="">Choisir…</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type d'activité" htmlFor="activityType">
          <select id="activityType" name="activityType" className="input" defaultValue="">
            <option value="">Choisir…</option>
            {["Restaurant", "Fast-food", "Rôtisserie", "Traiteur", "Hôtel", "Cantine"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="NINEA (si disponible)" htmlFor="ninea">
        <input id="ninea" name="ninea" placeholder="Numéro NINEA" className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code PIN" htmlFor="pin" hint="4 à 6 chiffres.">
          <input id="pin" name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required className="input" />
        </Field>
        <Field label="Confirmer le PIN" htmlFor="pinConfirm">
          <input id="pinConfirm" name="pinConfirm" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required className="input" />
        </Field>
      </div>

      <p className="text-xs text-on-surface-variant">
        Votre compte sera actif après vérification par l&apos;équipe Guanar Life. Vous recevrez une
        confirmation par WhatsApp ou SMS.
      </p>

      <SubmitButton className="w-full" pendingLabel="Envoi de la demande…">
        Créer mon compte pro
      </SubmitButton>
    </form>
  );
}
