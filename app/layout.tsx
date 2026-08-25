import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./bottom-nav-fix.css";
import { OfflineStatus } from "./components/OfflineStatus";
import { PERSONAL_MODE } from "./lib/feature-flags";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: PERSONAL_MODE
    ? "LevelUp · Tu checkpoint de 92 días"
    : "LevelUp · Hábitos, un día a la vez",
  description: PERSONAL_MODE
    ? "Un acompañante personal para construir hábitos antes de tu próximo checkpoint."
    : "Convierte tus objetivos de bienestar en pequeñas acciones diarias.",
  applicationName: "LevelUp",
  appleWebApp: {
    capable: true,
    title: "LevelUp",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#34796f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><OfflineStatus />{children}</body>
    </html>
  );
}
