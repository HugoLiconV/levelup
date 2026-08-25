import type { MetadataRoute } from "next";
import { PERSONAL_MODE } from "./lib/feature-flags";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LevelUp",
    short_name: "LevelUp",
    description: PERSONAL_MODE
      ? "Tu checkpoint personal de 92 días."
      : "Hábitos y bienestar, un día a la vez.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#34796f",
    lang: "es-MX",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
