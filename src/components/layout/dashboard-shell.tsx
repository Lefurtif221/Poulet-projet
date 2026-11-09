"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "@/components/ui";
import { MobileTabbar } from "@/components/layout/mobile-tabbar";
import { logoutAction } from "@/lib/actions/auth";
import { toggleSupplierOpenAction } from "@/lib/actions/supplier";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/fournisseur") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarShell({
  nav,
  roleLabel,
  userName,
  userSubtitle,
  title,
  children,
}: {
  nav: NavItem[];
  roleLabel: string;
  userName: string;
  userSubtitle: string;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant/30 bg-surface-container-lowest lg:flex lg:flex-col">
        <div className="border-b border-outline-variant/30 px-5 py-4">
          <Logo />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{roleLabel}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary-fixed/60 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                <Icon name={item.icon} className="text-lg" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-secondary-container px-1.5 py-0.5 text-[10px] font-bold text-on-secondary-container">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-outline-variant/30 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-semibold">{userName}</span>
              <span className="block truncate text-[10px] text-on-surface-variant">{userSubtitle}</span>
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#a8421a] hover:bg-red-50"
            >
              <Icon name="logout" className="text-base" />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface/95 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container-low"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" />
          </button>
          <span className="truncate font-display text-sm font-bold">{title}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              className="absolute inset-0 bg-on-surface/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-surface-container-lowest p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between px-2 py-1">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-container-low"
                  aria-label="Fermer"
                >
                  <Icon name="close" />
                </button>
              </div>
              <nav className="space-y-0.5">
                {nav.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold",
                        active ? "bg-primary-fixed/60 text-primary" : "text-on-surface-variant"
                      )}
                    >
                      <Icon name={item.icon} className="text-lg" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <form action={logoutAction} className="mt-3 border-t border-outline-variant/30 pt-3">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#a8421a]"
                >
                  <Icon name="logout" className="text-lg" />
                  Se déconnecter
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <main id="contenu" className="mx-auto max-w-[1440px] px-4 pb-24 pt-5 md:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileTabbar items={nav.slice(0, 4).map(({ href, label, icon }) => ({ href, label, icon }))} />
    </div>
  );
}

export function TopNavShell({
  nav,
  roleLabel,
  userName,
  userSubtitle,
  isOpen,
  children,
}: {
  nav: NavItem[];
  roleLabel: string;
  userName: string;
  userSubtitle: string;
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40">
        <div className="bg-primary px-4 py-1.5 text-on-primary">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[10px] font-semibold sm:text-[11px]">
            <span className="flex items-center gap-1.5">
              <Icon name="agriculture" className="text-sm text-secondary-container" />
              Espace éleveurs · {roleLabel}
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Icon name="verified" className="text-sm text-primary-fixed" />
              Compte vérifié par SunuVolaille
            </span>
          </div>
        </div>
        <div className="border-b border-outline-variant/30 bg-surface/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
            <Link href="/fournisseur">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
                      active ? "bg-primary-fixed/50 text-primary" : "text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    <Icon name={item.icon} className="text-lg" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              <form action={toggleSupplierOpenAction}>
                <button
                  type="submit"
                  className={cn(
                    "hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold sm:flex",
                    isOpen
                      ? "border-primary-fixed bg-primary-fixed text-primary"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", isOpen ? "bg-primary" : "bg-outline")} />
                  {isOpen ? "Réception ouverte" : "Réception fermée"}
                </button>
              </form>
              <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden leading-tight xl:block">
                  <span className="block max-w-36 truncate text-xs font-semibold">{userSubtitle}</span>
                  <span className="block text-[10px] text-on-surface-variant">{userName}</span>
                </span>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
                  aria-label="Se déconnecter"
                >
                  <Icon name="logout" className="text-lg" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-7xl px-4 pb-24 pt-5 md:px-6 lg:pb-10">
        {children}
      </main>

      <MobileTabbar items={nav.slice(0, 4).map(({ href, label, icon }) => ({ href, label, icon }))} />
    </div>
  );
}
