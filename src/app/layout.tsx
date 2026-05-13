import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://djsikuya.com"),
  title: {
    default: "DJ Sikuya - Perth R&B, Afro and UKG DJ",
    template: "%s | DJ Sikuya",
  },
  description:
    "DJ Sikuya is a Filipino-Australian DJ in Perth blending R&B, Afrobeats and UKG for social-dance rooms.",
  openGraph: {
    title: "DJ Sikuya",
    description:
      "R&B, Afrobeats and UKG for rooms that stay warm, social and alive.",
    url: "https://djsikuya.com",
    siteName: "DJ Sikuya",
    images: ["/og-image.png"],
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
