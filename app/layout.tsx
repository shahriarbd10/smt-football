import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import "./globals.css";

const headingFont = Bebas_Neue({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://smt-football.com"),
  title: "SMT Football Tournament | Live Pro Session",
  description: "Experience the intensity of SMT Football. Live scores, real-time tactics, and community galleries from every session.",
  keywords: ["football", "tournament", "futsal", "live scores", "tactical canvas", "SMT Football"],
  icons: {
    icon: [
      { url: "/football-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/football-logo.svg"],
    apple: [{ url: "/football-logo.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "SMT Football Tournament",
    description: "Live pro futsal tracking and real-time tactics.",
    url: "https://smt-football.com", // Placeholder URL
    siteName: "SMT Football",
    images: [
      {
        url: "/football-logo.svg",
        width: 1200,
        height: 630,
        alt: "SMT Football Tournament Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SMT Football Tournament",
    description: "Live pro futsal tracking and real-time tactics.",
    images: ["/football-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
