import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatFCFA, formatPhone } from "@/lib/format";
import { ROLE } from "@/lib/labels";
import { Card, Icon, buttonClass } from "@/components/ui";
import { CreateAdminForm } from "@/components/admin/create-admin-form";
import { resetPinAction, toggleSuspendUserAction } from "@/lib/actions/admin";
import type { Role, UserStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Utilisateurs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const STATUS_LABEL: Record<UserStatus, { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "bg-amber-50 text-amber-700" },
  ACTIVE: { label: "Actif", tone: "bg-primary-fixed text-primary" },
  SUSPENDED: { label: "Suspendu", tone: "bg-red-50 text-red-700" },
  REFUSED: { label: "Refusé", tone: "bg-slate-100 text-slate-600" },
};

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const q = first(query.q).trim();
  const role = first(query.role) as Role | "";
  const status = first(query.status) as UserStatus | "";

  const users = await db.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { client: { establishment: { contains: q, mode: "insensitive" } } },
              { supplier: { farmName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    },
    include: { client: true, supplier: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-on-surface-variant">
          Suspendre, réactiver, corriger les informations et réinitialiser un PIN.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="font-display text-base font-semibold">Ajouter un administrateur</h2>
        <p className="mb-3 mt-1 text-xs text-on-surface-variant">
          Un second administrateur est nécessaire pour approuver les lots de reversement (double
          validation).
        </p>
        <CreateAdminForm />
      </Card>

      <form className="card grid gap-3 p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <div>
          <label className="field-label" htmlFor="q">
            Recherche
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Nom, téléphone, établissement…" className="input" />
        </div>
        <div>
          <label className="field-label" htmlFor="role">
            Rôle
          </label>
          <select id="role" name="role" defaultValue={role} className="input min-w-36">
            <option value="">Tous</option>
            <option value="CLIENT">Clients pro</option>
            <option value="FOURNISSEUR">Éleveurs</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="status">
            Statut
          </label>
          <select id="status" name="status" defaultValue={status} className="input min-w-36">
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="ACTIVE">Actifs</option>
            <option value="SUSPENDED">Suspendus</option>
            <option value="REFUSED">Refusés</option>
          </select>
        </div>
        <button type="submit" className={buttonClass("primary")}>
          <Icon name="search" className="text-lg" />
          Filtrer
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[860px]">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Rôle</th>
              <th>Téléphone</th>
              <th>Inscription</th>
              <th>Crédit / capacité</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <p className="font-semibold">
                    {user.role === "FOURNISSEUR"
                      ? (user.supplier?.farmName ?? user.name)
                      : (user.client?.establishment ?? user.name)}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{user.name}</p>
                </td>
                <td>
                  <span className="badge bg-surface-container text-on-surface-variant">{ROLE[user.role]}</span>
                </td>
                <td className="text-xs">{formatPhone(user.phone)}</td>
                <td className="text-xs">{formatDate(user.createdAt)}</td>
                <td className="text-xs">
                  {user.client
                    ? `${formatFCFA(user.client.creditLimit)} · ${user.client.creditDelayDays} j`
                    : user.supplier
                      ? `${user.supplier.capacity} sujets/sem.`
                      : "—"}
                </td>
                <td>
                  <span className={`badge ${STATUS_LABEL[user.status].tone}`}>
                    {STATUS_LABEL[user.status].label}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link href={`/admin/utilisateurs/${user.id}`} className={buttonClass("outline", "sm")}>
                      <Icon name="edit" className="text-base" />
                      Éditer
                    </Link>
                    {user.role !== "ADMIN" ? (
                      <form action={toggleSuspendUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className={buttonClass("outline", "sm")}>
                          <Icon name={user.status === "SUSPENDED" ? "play_arrow" : "block"} className="text-base" />
                          {user.status === "SUSPENDED" ? "Réactiver" : "Suspendre"}
                        </button>
                      </form>
                    ) : null}
                    <details>
                      <summary className={buttonClass("outline", "sm")}>
                        <Icon name="key" className="text-base" />
                        PIN
                      </summary>
                      <form action={resetPinAction} className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-outline-variant/50 bg-surface-container-low p-1.5">
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          name="pin"
                          inputMode="numeric"
                          pattern="\d{4,6}"
                          maxLength={6}
                          required
                          placeholder="Nouveau PIN"
                          className="input h-9 w-28 text-xs"
                        />
                        <button type="submit" className={buttonClass("primary", "sm")}>
                          OK
                        </button>
                      </form>
                    </details>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="p-6 text-center text-sm text-on-surface-variant">Aucun utilisateur trouvé.</p>
        ) : null}
      </div>

      <p className="text-[11px] text-on-surface-variant">
        {users.length} compte(s) affiché(s). Le PIN réinitialisé doit être communiqué au titulaire par
        un canal sûr et changé à la première connexion.
      </p>
    </div>
  );
}
