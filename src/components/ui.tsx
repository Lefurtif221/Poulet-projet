import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { OrderStatus, PaymentMethod, PaymentStatus, PayoutStatus, DeliveryStatus, DisputeStatus } from "@prisma/client";
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYOUT_STATUS,
  DELIVERY_STATUS,
  DISPUTE_STATUS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

export function Icon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span aria-hidden="true" className={cn("material-symbols-outlined", filled && "is-filled", className)}>
      {name}
    </span>
  );
}

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  danger: "btn-danger",
  ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-low",
} as const;

const SIZES = { md: "", sm: "btn-sm" } as const;

export function buttonClass(
  variant: keyof typeof VARIANTS = "primary",
  size: keyof typeof SIZES = "md",
  className?: string
) {
  return cn("btn", VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Badge({
  children,
  tone = "bg-surface-container text-on-surface-variant",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: string;
  dot?: string;
  className?: string;
}) {
  return (
    <span className={cn("badge", tone, className)}>
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = ORDER_STATUS[status];
  return (
    <Badge tone={meta.tone} dot={meta.dot} className={className}>
      {meta.label}
    </Badge>
  );
}

export function PayMethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <Badge tone="bg-surface-container text-on-surface-variant">
      {PAYMENT_METHOD[method].label}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS[status].tone}>{PAYMENT_STATUS[status].label}</Badge>;
}

export function PayoutBadge({ status }: { status: PayoutStatus }) {
  return <Badge tone={PAYOUT_STATUS[status].tone}>{PAYOUT_STATUS[status].label}</Badge>;
}

export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  return <Badge tone={DELIVERY_STATUS[status].tone}>{DELIVERY_STATUS[status].label}</Badge>;
}

export function DisputeBadge({ status }: { status: DisputeStatus }) {
  return <Badge tone={DISPUTE_STATUS[status].tone}>{DISPUTE_STATUS[status].label}</Badge>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "bg-surface-container-high text-primary-container",
    warning: "bg-secondary-fixed text-on-secondary-container",
    danger: "bg-error-container text-on-error-container",
    success: "bg-primary-fixed text-primary",
  } as const;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
        {icon ? (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones[tone])}>
            <Icon name={icon} className="text-lg" />
          </span>
        ) : null}
      </div>
      <div className="kpi-value mt-2">{value}</div>
      {hint ? <div className="mt-1 text-xs text-on-surface-variant">{hint}</div> : null}
    </Card>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-lowest/60 px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container">
        <Icon name={icon} className="text-2xl text-on-surface-variant" />
      </span>
      <p className="font-display text-base font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "primary",
}: {
  value: number;
  max: number;
  tone?: "primary" | "warning" | "danger";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tones = {
    primary: "bg-primary-container",
    warning: "bg-secondary-container",
    danger: "bg-[#a8421a]",
  } as const;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          {icon ? <Icon name={icon} className="text-xl text-primary-container" /> : null}
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-on-surface-variant">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-green-200 bg-green-50 text-green-900",
  } as const;
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 text-sm", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}

export function Logo({
  light = false,
  full = false,
}: {
  light?: boolean;
  full?: boolean;
}) {
  return (
    <span className="flex items-center gap-2 sm:gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0C3B26] ring-1 ring-[#E8A33D]/70 sm:h-10 sm:w-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.svg" alt="" className="h-7 w-7 sm:h-8 sm:w-8" />
      </span>
      <span className="min-w-0 leading-none">
        <span className="flex items-center gap-1.5">
          <span className="whitespace-nowrap font-sans text-[15px] font-extrabold tracking-[-0.03em] sm:text-[17px]">
            <span className={light ? "text-white" : "text-[#0E5A38]"}>Sunu</span>
            <span className={light ? "text-white" : "text-[#152033]"}>Volaille</span>
          </span>
          <span className="hidden rounded-md bg-[#E8A33D] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-[#0C3B26] min-[360px]:inline-block">
            PRO
          </span>
        </span>
        <span
          className={cn(
            "mt-1 hidden whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.16em] sm:block",
            light ? "text-primary-fixed" : "text-on-surface-variant"
          )}
        >
          {full ? "Filière avicole directe • Dakar & Niayes" : "Filière avicole directe"}
        </span>
      </span>
    </span>
  );
}
