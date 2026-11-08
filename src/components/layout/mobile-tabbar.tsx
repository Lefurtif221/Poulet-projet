"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; icon: string };

export function MobileTabbar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant/40 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-semibold",
                active ? "text-primary-container" : "text-on-surface-variant"
              )}
            >
              <Icon name={item.icon} className={cn("text-[22px]", active && "is-filled")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
