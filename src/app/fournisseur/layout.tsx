import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopNavShell } from "@/components/layout/dashboard-shell";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("FOURNISSEUR");
  const supplier = await db.supplier.findUnique({ where: { userId: user.sub } });
  if (!supplier) redirect("/connexion");

  const nav = [
    { href: "/fournisseur", label: "Commandes", icon: "assignment" },
    { href: "/fournisseur/produits", label: "Mes produits", icon: "inventory_2" },
    { href: "/fournisseur/paiements", label: "Reversements", icon: "account_balance" },
    { href: "/fournisseur/profil", label: "Mon élevage", icon: "agriculture" },
  ];

  return (
    <TopNavShell
      nav={nav}
      roleLabel="Espace fournisseur"
      userName={user.name}
      userSubtitle={supplier.farmName}
      isOpen={supplier.isOpen}
    >
      {children}
    </TopNavShell>
  );
}
