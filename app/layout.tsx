import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sikuya | Open Format DJ",
  description:
    "Sikuya is an open format DJ for private celebrations, venue nights, weddings and events. Start your booking enquiry through the guided form.",
  metadataBase: new URL("https://djsikuya.com"),
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
  },
  keywords: [
    "Sikuya",
    "Australia DJ",
    "open format DJ",
    "event DJ Australia",
    "private party DJ",
    "R&B DJ",
    "Afrobeats DJ",
    "wedding DJ Australia",
  ],
  openGraph: {
    title: "Sikuya | The room remembers how it felt",
    description:
      "Open format DJ for private celebrations, venue nights, weddings and events.",
    url: "https://djsikuya.com",
    siteName: "Sikuya",
    type: "website",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        alt: "Sikuya. The room remembers how it felt.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sikuya | The room remembers how it felt",
    description:
      "Open format DJ for private celebrations, venue nights, weddings and events.",
    images: ["/og.webp"],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#0c0b0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${bodoni.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
