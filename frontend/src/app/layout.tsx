import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Relay: AI support & incident intelligence", template: "%s · Relay" },
  description: "AI triage, a knowledge-base assistant and incident detection for support teams.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F2E7" },
    { media: "(prefers-color-scheme: dark)", color: "#08140F" },
  ],
};

/**
 * Applies the saved theme before first paint so dark-mode users never see a
 * white flash. The same logic lives in use-theme.ts for later changes.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("relay-theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
