import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SidebarShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");

  const [pendingUsers, openDisputes, queuedNotifications] = await Promise.all([
    db.user.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.notification.count({ where: { status: "QUEUED" } }),
  ]);

  const nav = [
    { href: "/admin", label: "Tableau de bord", icon: "dashboard" },
    { href: "/admin/validation", label: "Validation comptes", icon: "how_to_reg", badge: pendingUsers },
    { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "group" },
    { href: "/admin/catalogue", label: "Catalogue", icon: "storefront" },
    { href: "/admin/commandes", label: "Commandes", icon: "receipt_long" },
    { href: "/admin/commissions", label: "Commissions", icon: "percent" },
    { href: "/admin/credit", label: "Crédit & risque", icon: "credit_card" },
    { href: "/admin/livraisons", label: "Livraisons", icon: "local_shipping" },
    { href: "/admin/paiements", label: "Paiements", icon: "payments" },
    { href: "/admin/caisse", label: "Caisse", icon: "savings" },
    { href: "/admin/litiges", label: "Litiges", icon: "gavel", badge: openDisputes },
    { href: "/admin/notifications", label: "Notifications", icon: "notifications", badge: queuedNotifications },
    { href: "/admin/journal", label: "Journal d'activité", icon: "history" },
    { href: "/admin/parametres", label: "Paramètres", icon: "settings" },
  ];

  return (
    <SidebarShell
      nav={nav}
      roleLabel="Administration"
      userName={user.name}
      userSubtitle={user.phone}
      title="SunuVolaille Admin"
    >
      {children}
    </SidebarShell>
  );
}
