"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
import { Alert, Field, Icon } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: AuthActionState = {};

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Numéro de téléphone" htmlFor="phone">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Icon name="call" className="text-lg" />
          </span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="77 123 45 67"
            className="input pl-10"
          />
        </div>
      </Field>

      <Field label="Code PIN" htmlFor="pin" hint="4 à 6 chiffres. Blocage après 5 essais ratés.">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Icon name="lock" className="text-lg" />
          </span>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            pattern="\d{4,6}"
            maxLength={6}
            placeholder="••••"
            className="input pl-10 tracking-[0.3em]"
          />
        </div>
      </Field>

      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Se connecter
        <Icon name="arrow_forward" className="text-lg" />
      </SubmitButton>

      <p className="text-center text-xs text-on-surface-variant">
        PIN oublié ?{" "}
        <Link href="/aide-pin" className="link">
          Contactez l&apos;administrateur
        </Link>
      </p>
    </form>
  );
}
