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
  title: "SMT Football Tournament | Live Pro Session",
  description: "Experience the intensity of SMT Football. Live scores, real-time tactics, and community galleries from every session.",
  keywords: ["football", "tournament", "futsal", "live scores", "tactical canvas", "SMT Football"],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "SMT Football Tournament",
    description: "Live pro futsal tracking and real-time tactics.",
    url: "https://smt-football.com", // Placeholder URL
    siteName: "SMT Football",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
