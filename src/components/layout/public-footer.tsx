import Link from "next/link";
import { Icon, Logo } from "@/components/ui";

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-outline-variant/30 bg-surface-container-low">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
        <div>
          <Logo full />
          <p className="mt-3 max-w-xs text-sm text-on-surface-variant">
            Approvisionnement direct des restaurants et traiteurs de Dakar auprès des éleveurs de la
            presqu&apos;île et des Niayes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge bg-primary-fixed text-primary">Traçabilité</span>
            <span className="badge bg-surface-container text-on-surface-variant">Chaîne du froid</span>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Filière</p>
          <ul className="space-y-1.5 text-sm">
            <li>Poulets de chair (1,2 – 1,8 kg)</li>
            <li>Poulets fermiers du terroir</li>
            <li>Œufs frais en plateaux de 30</li>
            <li>Découpes professionnelles</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Paiement &amp; crédit</p>
          <ul className="space-y-1.5 text-sm">
            <li>Wave Business</li>
            <li>Paiement à la livraison</li>
            <li>Crédit B2B après validation</li>
            <li>Factures conformes</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Assistance</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-1.5">
              <Icon name="call" className="text-base text-primary-container" />
              +221 77 000 00 00
            </li>
            <li>Sénégal · Paiements en FCFA</li>
            <li>
              <Link href="/legal/conditions" className="link text-sm">
                Conditions générales
              </Link>
            </li>
            <li>
              <Link href="/legal/confidentialite" className="link text-sm">
                Confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-outline-variant/30 px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
          <span>© {new Date().getFullYear()} SunuVolaille · Dakar, Sénégal</span>
          <span>Prix en FCFA · TVA selon réglementation en vigueur</span>
        </div>
      </div>
    </footer>
  );
}
