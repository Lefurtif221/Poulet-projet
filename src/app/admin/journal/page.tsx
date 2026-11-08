import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime, formatPhone } from "@/lib/format";
import { Card, EmptyState, Icon, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Journal d'activité" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AdminJournalPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const q = first(query.q).trim();

  const logs = await db.activityLog.findMany({
    where: q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { entity: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Journal d&apos;activité</h1>
          <p className="text-sm text-on-surface-variant">
            Qui a fait quoi, quand, avec l&apos;état avant et après. Utile pour retrouver une erreur.
          </p>
        </div>
        <span className="badge bg-surface-container text-on-surface-variant">{logs.length} entrées</span>
      </div>

      <form className="card flex flex-wrap items-end gap-2 p-3">
        <div className="min-w-64 flex-1">
          <label className="field-label" htmlFor="q">
            Recherche
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Action, entité ou utilisateur…" className="input" />
        </div>
        <button type="submit" className={buttonClass("primary")}>
          <Icon name="search" className="text-lg" />
          Filtrer
        </button>
      </form>

      {logs.length === 0 ? (
        <EmptyState icon="history" title="Aucune entrée" description="Les actions sensibles apparaîtront ici." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-base min-w-[900px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Avant / après</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-on-surface-variant">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="text-xs">
                    {log.user ? (
                      <>
                        <p className="font-semibold">{log.user.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{formatPhone(log.user.phone)}</p>
                      </>
                    ) : (
                      <span className="text-on-surface-variant">Système</span>
                    )}
                  </td>
                  <td>
                    <span className="badge bg-surface-container text-on-surface-variant">{log.action}</span>
                  </td>
                  <td className="text-xs">
                    {log.entity}
                    {log.entityId ? (
                      <p className="font-mono text-[10px] text-on-surface-variant">{log.entityId.slice(0, 12)}…</p>
                    ) : null}
                  </td>
                  <td className="max-w-md">
                    <div className="space-y-1 text-[10px]">
                      {log.before ? (
                        <pre className="overflow-x-auto rounded bg-red-50 p-1 text-red-900">
                          {JSON.stringify(log.before)}
                        </pre>
                      ) : null}
                      {log.after ? (
                        <pre className="overflow-x-auto rounded bg-green-50 p-1 text-green-900">
                          {JSON.stringify(log.after)}
                        </pre>
                      ) : null}
                      {!log.before && !log.after ? <span className="text-on-surface-variant">—</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
