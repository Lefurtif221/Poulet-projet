import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SunuVolaille — Marché B2B avicole",
    short_name: "SunuVolaille",
    description:
      "Commandez poulets et œufs directement auprès des éleveurs de Dakar. Livraison fraîche, paiement sécurisé, crédit B2B.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f9ff",
    theme_color: "#003b24",
    lang: "fr",
    categories: ["business", "food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
