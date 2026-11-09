"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "@/components/ui";
import { formatFCFA } from "@/lib/format";
import { CartCount } from "@/components/layout/cart-count";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type ClientHeaderProps = {
  name: string;
  establishment: string;
  creditLimit: number;
  balanceDue: number;
  partnerCount: number;
};

const NAV = [
  { href: "/client/catalogue", label: "Catalogue B2B", icon: "storefront" },
  { href: "/client/panier", label: "Panier", icon: "shopping_cart" },
  { href: "/client/commandes", label: "Commandes", icon: "local_shipping" },
  { href: "/client/credit", label: "Crédit", icon: "account_balance_wallet" },
];

export function ClientHeader({
  name,
  establishment,
  creditLimit,
  balanceDue,
  partnerCount,
}: ClientHeaderProps) {
  const pathname = usePathname();
  const available = Math.max(0, creditLimit - balanceDue);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-primary px-4 py-1.5 text-on-primary">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] font-semibold sm:text-[11px]">
          <span className="flex items-center gap-1.5">
            <Icon name="local_shipping" className="text-sm text-secondary-container" />
            Créneaux de livraison 05h00 – 09h00 · commandes avant 22h00
          </span>
          <span className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1">
              <Icon name="verified" className="text-sm text-primary-fixed" />
              {partnerCount} éleveurs vérifiés
            </span>
            <span className="text-primary-container">|</span>
            <span>Dakar &amp; Niayes</span>
          </span>
        </div>
      </div>

      <div className="border-b border-outline-variant/30 bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/client/catalogue" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary-fixed/50 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  )}
                >
                  <Icon name={item.icon} className="text-lg" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/client/credit"
              className="hidden items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-1.5 md:flex"
            >
              <Icon name="account_balance_wallet" className="text-lg text-primary-container" />
              <span className="leading-tight">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">
                  Crédit dispo
                </span>
                <span className="money block text-[13px]">{formatFCFA(available)}</span>
              </span>
            </Link>
            <Link
              href="/client/panier"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low"
              aria-label="Panier"
            >
              <CartCount />
            </Link>
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-container-low"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden leading-tight xl:block">
                  <span className="block max-w-32 truncate text-xs font-semibold">{establishment}</span>
                  <span className="block text-[10px] text-on-surface-variant">{name}</span>
                </span>
                <Icon name="expand_more" className="hidden text-base text-on-surface-variant xl:block" />
              </button>
              <div className="invisible absolute right-0 top-full z-50 w-52 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <Link
                  href="/client/credit"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-container-low"
                >
                  <Icon name="account_balance_wallet" className="text-lg" />
                  Crédit &amp; factures
                </Link>
                <Link
                  href="/client/recurrentes"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-container-low"
                >
                  <Icon name="event_repeat" className="text-lg" />
                  Commandes récurrentes
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#a8421a] hover:bg-red-50"
                  >
                    <Icon name="logout" className="text-lg" />
                    Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
