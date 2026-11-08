import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { SignupClientForm } from "@/components/forms/signup-client-form";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Inscription client pro" };
export const dynamic = "force-dynamic";

export default async function SignupClientPage() {
  const settings = await getSettings();

  return (
    <AuthShell
      title="Créer un compte client pro"
      subtitle="Restaurants, fast-foods, rôtisseries, traiteurs, hôtels et cantines."
      footer={
        <p className="text-center">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="link">
            Se connecter
          </Link>
        </p>
      }
    >
      <SignupClientForm districts={settings.districts} />
    </AuthShell>
  );
}
