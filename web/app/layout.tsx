import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://brother.clvs.nl"),
  title: "Label Printer",
  description: "Label ontwerpen en afdrukken op Brother QL",
  applicationName: "Label Printer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Label Printer",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/app-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/app-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a5fb4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
