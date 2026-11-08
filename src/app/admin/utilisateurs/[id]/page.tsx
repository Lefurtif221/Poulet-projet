import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatFCFA, formatPhone } from "@/lib/format";
import { ROLE } from "@/lib/labels";
import { Card, Icon } from "@/components/ui";
import { AdminUserEditForm } from "@/components/admin/user-edit-form";

export const metadata: Metadata = { title: "Modifier un utilisateur" };

type Params = Promise<{ id: string }>;

export default async function AdminUserDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: { client: true, supplier: true },
  });
  if (!user) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/utilisateurs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container">
        <Icon name="arrow_back" className="text-lg" />
        Retour aux utilisateurs
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {user.client?.establishment ?? user.supplier?.farmName ?? user.name}
        </h1>
        <p className="text-sm text-on-surface-variant">
          {ROLE[user.role]} · {formatPhone(user.phone)} · inscrit le {formatDate(user.createdAt)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Statut</p>
          <p className="mt-1 font-semibold">{user.status}</p>
        </Card>
        {user.client ? (
          <>
            <Card className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Crédit</p>
              <p className="money mt-1 text-sm">{formatFCFA(user.client.creditLimit)}</p>
              <p className="text-[11px] text-on-surface-variant">Encours {formatFCFA(user.client.balanceDue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Délai</p>
              <p className="mt-1 font-semibold">{user.client.creditDelayDays} jours</p>
            </Card>
          </>
        ) : user.supplier ? (
          <Card className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Paiement</p>
            <p className="mt-1 text-sm font-semibold">
              {user.supplier.paymentProvider ?? "—"} {user.supplier.paymentAccount ?? ""}
            </p>
          </Card>
        ) : null}
      </div>

      <Card className="p-4 md:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Corriger les informations</h2>
        <AdminUserEditForm user={user} />
      </Card>
    </div>
  );
}
