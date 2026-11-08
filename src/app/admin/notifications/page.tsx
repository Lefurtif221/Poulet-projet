import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatPhone } from "@/lib/format";
import { Card, EmptyState, Icon, buttonClass } from "@/components/ui";
import { markNotificationSentAction } from "@/lib/actions/admin";
import type { NotificationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const STATUS: Record<NotificationStatus, { label: string; tone: string }> = {
  QUEUED: { label: "À envoyer", tone: "bg-amber-50 text-amber-700" },
  SENT: { label: "Envoyée", tone: "bg-green-50 text-green-700" },
  FAILED: { label: "Échec", tone: "bg-red-50 text-red-700" },
};

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const status = first(query.status) as NotificationStatus | "";

  const notifications = await db.notification.findMany({
    where: status ? { status } : undefined,
    include: { user: true, order: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const queued = notifications.filter((notification) => notification.status === "QUEUED").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-on-surface-variant">
          File d&apos;attente WhatsApp / SMS. En attendant l&apos;API WhatsApp Business, envoyez le
          message via le lien puis marquez-le comme envoyé.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "Toutes" },
          { value: "QUEUED", label: `À envoyer (${queued})` },
          { value: "SENT", label: "Envoyées" },
          { value: "FAILED", label: "Échecs" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/notifications?status=${tab.value}` : "/admin/notifications"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              status === tab.value
                ? "border-primary-container bg-primary-container text-white"
                : "border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon="notifications" title="Aucune notification" description="Les messages générés par les commandes apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const digits = notification.recipient.replace(/\D/g, "");
            const whatsapp = `https://wa.me/${digits}?text=${encodeURIComponent(notification.message)}`;
            return (
              <Card key={notification.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("badge", STATUS[notification.status].tone)}>
                        {STATUS[notification.status].label}
                      </span>
                      <span className="badge bg-surface-container text-on-surface-variant">
                        {notification.event}
                      </span>
                      {notification.order ? (
                        <Link href={`/admin/commandes/${notification.orderId}`} className="text-xs font-semibold text-primary-container hover:underline">
                          #{notification.order.reference}
                        </Link>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      {notification.user?.name ?? "Destinataire"} · {formatPhone(notification.recipient)} ·{" "}
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonClass("outline", "sm")}>
                      <Icon name="chat" className="text-base" />
                      WhatsApp
                    </a>
                    {notification.status === "QUEUED" ? (
                      <form action={markNotificationSentAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button type="submit" className={buttonClass("primary", "sm")}>
                          <Icon name="check" className="text-base" />
                          Marquer envoyée
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
