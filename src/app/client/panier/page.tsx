import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/orders/checkout-form";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Panier & validation" };

export default async function CartPage() {
  const user = await requireUser("CLIENT");
  const [client, settings] = await Promise.all([
    db.client.findUnique({ where: { userId: user.sub } }),
    getSettings(),
  ]);
  if (!client) redirect("/connexion");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
            <Icon name="receipt_long" className="text-2xl text-primary-container" />
            Validation de la commande
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Vérifiez les quantités, le créneau et le mode de règlement avant envoi à l&apos;éleveur.
          </p>
        </div>
        <span className="badge bg-primary-fixed/60 text-primary">Commande directe éleveur</span>
      </div>

      <CheckoutForm
        address={`${client.address}${client.district ? `, ${client.district}` : ""}`}
        creditLimit={client.creditLimit}
        balanceDue={client.balanceDue}
        creditDelayDays={client.creditDelayDays || settings.creditDelayDays}
        minOrder={settings.minOrderPro}
        deliveryFee={settings.deliveryFee}
        freeDeliveryThreshold={settings.freeDeliveryThreshold}
        deliverySlots={settings.deliverySlots}
      />
    </div>
  );
}
