import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type LogInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

export async function logActivity(input: LogInput): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      },
    });
  } catch {
    // A failed audit write must never break a business action.
  }
}

export async function generateOrderReference(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `DKR-${year}-${suffix}`;
    const exists = await db.order.findUnique({ where: { reference }, select: { id: true } });
    if (!exists) return reference;
  }
  return `DKR-${year}-${Date.now().toString().slice(-6)}`;
}
