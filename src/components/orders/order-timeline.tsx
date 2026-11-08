import type { Order } from "@prisma/client";
import { STATUS_STEPS, ORDER_STATUS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export function OrderTimeline({ order }: { order: Order }) {
  const current = ORDER_STATUS[order.status].step ?? (order.status === "DISPUTED" ? 6 : 0);
  const times: Record<string, Date | null> = {
    SENT: order.createdAt,
    CONFIRMED: order.confirmedAt,
    PREPARING: order.confirmedAt,
    READY: order.readyAt,
    IN_DELIVERY: order.readyAt,
    DELIVERED: order.deliveredAt,
    CLOSED: order.closedAt,
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {STATUS_STEPS.map((step, index) => {
        const number = index + 1;
        const done = current > number;
        const active = current === number;
        return (
          <div
            key={step.status}
            className={cn(
              "relative rounded-lg border px-2.5 py-2",
              done && "border-primary-fixed bg-primary-fixed/20",
              active && "border-primary-container bg-primary-container text-white",
              !done && !active && "border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  done && "bg-primary-container text-white",
                  active && "bg-white text-primary",
                  !done && !active && "bg-surface-container text-on-surface-variant"
                )}
              >
                {done ? <Icon name="check" className="text-xs" /> : number}
              </span>
              <span className="text-[11px] font-bold leading-tight">{step.label}</span>
            </div>
            <p className={cn("mt-1 text-[10px]", active ? "text-primary-fixed" : "text-on-surface-variant")}>
              {times[step.status] ? formatDateTime(times[step.status]) : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
