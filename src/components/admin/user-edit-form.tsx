"use client";

import { useActionState } from "react";
import type { Client, Supplier, User } from "@prisma/client";
import { updateUserInfoAction, type AdminActionState } from "@/lib/actions/admin";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: AdminActionState = {};

export function AdminUserEditForm({
  user,
}: {
  user: User & { client: Client | null; supplier: Supplier | null };
}) {
  const [state, action] = useActionState(updateUserInfoAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={user.id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du responsable" htmlFor="name">
          <input id="name" name="name" required defaultValue={user.name} className="input" />
        </Field>
        <Field label="Téléphone" htmlFor="phone">
          <input id="phone" name="phone" required defaultValue={user.phone} className="input" />
        </Field>
      </div>

      {user.client ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Établissement" htmlFor="establishment">
              <input id="establishment" name="establishment" defaultValue={user.client.establishment} className="input" />
            </Field>
            <Field label="Type d'activité" htmlFor="activityType">
              <input id="activityType" name="activityType" defaultValue={user.client.activityType ?? ""} className="input" />
            </Field>
          </div>
          <Field label="Adresse de livraison" htmlFor="address">
            <input id="address" name="address" defaultValue={user.client.address} className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quartier / zone" htmlFor="district">
              <input id="district" name="district" defaultValue={user.client.district ?? ""} className="input" />
            </Field>
            <Field label="NINEA" htmlFor="ninea">
              <input id="ninea" name="ninea" defaultValue={user.client.ninea ?? ""} className="input" />
            </Field>
          </div>
        </>
      ) : null}

      {user.supplier ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'élevage" htmlFor="farmName">
              <input id="farmName" name="farmName" defaultValue={user.supplier.farmName} className="input" />
            </Field>
            <Field label="Localisation" htmlFor="location">
              <input id="location" name="location" defaultValue={user.supplier.location} className="input" />
            </Field>
          </div>
          <Field label="Capacité (sujets/semaine)" htmlFor="capacity">
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={0}
              defaultValue={user.supplier.capacity}
              className="input"
            />
          </Field>
        </>
      ) : null}

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer les corrections</SubmitButton>
    </form>
  );
}
