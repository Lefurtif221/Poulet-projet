import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/components/forms/login-form";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <AuthShell
      title="Connexion professionnelle"
      subtitle="Accédez à votre espace commande, crédit et factures."
      footer={
        <div className="space-y-2 text-center">
          <p>
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="link">
              Inscription client pro
            </Link>
          </p>
          <p>
            Vous êtes éleveur ?{" "}
            <Link href="/inscription/eleveur" className="link">
              Inscription fournisseur
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
