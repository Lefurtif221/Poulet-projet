import type { NotificationChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

type NotifyInput = {
  userId?: string | null;
  orderId?: string | null;
  recipient: string;
  event: string;
  message: string;
  channel?: NotificationChannel;
};

export async function notify(input: NotifyInput): Promise<void> {
  if (!input.recipient) return;
  try {
    const notification = await db.notification.create({
      data: {
        userId: input.userId ?? null,
        orderId: input.orderId ?? null,
        recipient: input.recipient,
        channel: input.channel ?? "WHATSAPP",
        event: input.event,
        message: input.message,
        status: "QUEUED",
      },
    });
    await logActivity({
      userId: input.userId ?? null,
      action: "NOTIFICATION_QUEUED",
      entity: "Notification",
      entityId: notification.id,
      after: { event: input.event, recipient: input.recipient },
    });
  } catch (error) {
    console.error("[notify] échec de mise en file", error);
  }
}

export function orderMessage(reference: string, body: string): string {
  return `${body} Réf. ${reference}.`;
}
