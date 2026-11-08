import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Guanar Life — Marché B2B avicole Dakar",
    template: "%s · Guanar Life",
  },
  description:
    "Plateforme B2B de mise en relation directe entre éleveurs avicoles et restaurants, fast-foods et traiteurs de Dakar. Poulets et œufs livrés frais.",
  applicationName: "Guanar Life",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Guanar Life" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#003b24",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${jakarta.variable} ${grotesk.variable}`}>
      <body>
        <a href="#contenu" className="sr-only focus:not-sr-only">
          Aller au contenu
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
