import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Demande en attente" };

export default function PendingPage() {
  return (
    <AuthShell
      title="Votre demande est bien reçue"
      subtitle="L'équipe SunuVolaille vérifie vos informations avant d'activer votre compte."
      footer={
        <div className="flex flex-col gap-2 text-center">
          <Link href="/" className="link">
            Retour à l&apos;accueil
          </Link>
          <Link href="/connexion" className="link">
            Aller à la connexion
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5">
          <ol className="space-y-4">
            {[
              ["check_circle", "Demande reçue", "Vos informations sont enregistrées."],
              ["fact_check", "Vérification", "Appel, visite ou référence professionnelle sous 48 h."],
              ["verified", "Activation", "Vous recevez un message dès que le compte est actif."],
              ["storefront", "Première commande", "Catalogue, prix et créneaux deviennent accessibles."],
            ].map(([icon, title, description], index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <Icon name={icon} className="text-lg" filled />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {index + 1}. {title}
                  </span>
                  <span className="block text-xs text-on-surface-variant">{description}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Besoin d&apos;accélérer la validation ?</p>
          <p className="mt-0.5">Appelez le +221 77 000 00 00 en précisant votre numéro d&apos;inscription.</p>
        </div>
      </div>
    </AuthShell>
  );
}
