import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { SignupSupplierForm } from "@/components/forms/signup-supplier-form";

export const metadata: Metadata = { title: "Inscription éleveur" };

export default function SignupSupplierPage() {
  return (
    <AuthShell
      title="Devenir fournisseur"
      subtitle="Éleveurs de poulets de chair, poulets fermiers et œufs à Dakar et dans les Niayes."
      footer={
        <p className="text-center">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="link">
            Se connecter
          </Link>
        </p>
      }
    >
      <SignupSupplierForm />
    </AuthShell>
  );
}
