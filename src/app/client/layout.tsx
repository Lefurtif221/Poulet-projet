import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClientHeader } from "@/components/layout/client-header";
import { MobileTabbar } from "@/components/layout/mobile-tabbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("CLIENT");
  const client = await db.client.findUnique({ where: { userId: user.sub } });
  if (!client) redirect("/connexion");

  const partnerCount = await db.supplier.count({
    where: { user: { status: "ACTIVE" }, isOpen: true },
  });

  return (
    <div className="min-h-screen bg-surface">
      <ClientHeader
        name={client.establishment}
        establishment={client.establishment}
        creditLimit={client.creditLimit}
        balanceDue={client.balanceDue}
        partnerCount={partnerCount}
      />
      <main id="contenu" className="mx-auto max-w-7xl px-4 pb-24 pt-5 md:px-6 lg:pb-8">
        {children}
      </main>
      <PublicFooter />
      <MobileTabbar
        items={[
          { href: "/client/catalogue", label: "Catalogue", icon: "storefront" },
          { href: "/client/panier", label: "Panier", icon: "shopping_cart" },
          { href: "/client/commandes", label: "Commandes", icon: "local_shipping" },
          { href: "/client/credit", label: "Crédit", icon: "account_balance_wallet" },
        ]}
      />
    </div>
  );
}
