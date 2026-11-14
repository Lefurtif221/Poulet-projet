import Link from "next/link";
import { Icon, Logo } from "@/components/ui";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fda12f 0, transparent 40%), radial-gradient(circle at 80% 70%, #8bc5a3 0, transparent 45%)",
          }}
        />
        <div className="relative">
          <Link href="/" className="inline-flex items-center">
            <Logo light full />
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="badge bg-secondary-container text-on-secondary-container">Canal pro direct éleveurs</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight">
            Le poulet et l&apos;œuf vont de l&apos;élevage à votre cuisine, sans intermédiaire.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-primary-fixed">
            Prix fermes, livraison matinale, paiement sécurisé et crédit B2B encadré pour les
            restaurants, fast-foods et traiteurs de Dakar.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              ["verified", "Éleveurs visités et validés par l'équipe"],
              ["ac_unit", "Chaîne du froid contrôlée à la livraison"],
              ["account_balance_wallet", "Wave ou crédit B2B 7 jours"],
              ["receipt_long", "Factures et historique centralisés"],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon name={icon} className="text-lg text-secondary-container" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-[11px] text-primary-fixed">
          <span>Dakar · Pikine · Guédiawaye · Rufisque</span>
          <span>Paiements en FCFA</span>
        </div>
      </aside>

      <main id="contenu" className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-4 lg:hidden">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Espace professionnel
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-1.5 text-sm text-on-surface-variant">{subtitle}</p>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-5 text-sm text-on-surface-variant">{footer}</div> : null}
          </div>
        </div>

        <div className="px-4 py-4 text-center text-[11px] text-on-surface-variant">
          © {new Date().getFullYear()} SunuVolaille · Dakar, Sénégal
        </div>
      </main>
    </div>
  );
}
