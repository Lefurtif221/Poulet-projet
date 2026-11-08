import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Icon } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "PIN oublié" };
export const dynamic = "force-dynamic";

export default async function ForgotPinPage() {
  const settings = await getSettings();

  return (
    <AuthShell
      title="Réinitialiser votre code PIN"
      subtitle="Pour votre sécurité, seul l'administrateur peut réinitialiser un PIN oublié."
      footer={
        <p className="text-center">
          <Link href="/connexion" className="link">
            Retour à la connexion
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="support_agent" className="text-xl text-primary-container" />
            Contacter l&apos;équipe
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Appelez ou écrivez sur WhatsApp en indiquant le numéro de téléphone du compte et le nom de
            l&apos;établissement ou de l&apos;élevage.
          </p>
          <a
            href={`tel:${settings.supportPhone.replace(/\s/g, "")}`}
            className="mt-3 flex items-center gap-2 rounded-lg bg-primary-fixed px-3 py-2.5 font-display text-lg font-bold text-primary"
          >
            <Icon name="call" />
            {formatPhone(settings.supportPhone)}
          </a>
        </div>

        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 text-xs text-on-surface-variant">
          <p className="font-semibold text-on-surface">Après vérification</p>
          <p className="mt-1">
            L&apos;administrateur vous communique un PIN temporaire. Changez-le dès votre première
            connexion depuis votre espace.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
