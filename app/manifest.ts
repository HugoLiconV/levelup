import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LevelUp",
    short_name: "LevelUp",
    description: "Tu checkpoint personal de 92 días.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#34796f",
    lang: "es-MX",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
