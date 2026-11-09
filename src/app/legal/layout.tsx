import Link from "next/link";
import { Icon, Logo } from "@/components/ui";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/connexion" className="flex items-center gap-1.5 text-sm font-semibold text-primary-container">
            <Icon name="arrow_back" className="text-lg" />
            Connexion
          </Link>
        </div>
      </header>
      <main id="contenu" className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-outline-variant/30 px-4 py-4 text-center text-[11px] text-on-surface-variant">
        © {new Date().getFullYear()} SunuVolaille · Dakar, Sénégal
      </footer>
    </div>
  );
}
