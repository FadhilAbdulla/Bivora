import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bivora — Trade stocks, indices, commodities & metals",
    template: "%s · Bivora",
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: ["Bivora", "trading", "online trading", "stocks", "indices", "commodities", "metals", "gold trading", "CFD"],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: "Bivora — Trade global markets with precision",
    description: BRAND.description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bivora — Trade global markets with precision",
    description: BRAND.description,
  },
};

// No `colorScheme` here: a color-scheme meta tag makes browsers paint TradingView's
// iframes with an opaque white backdrop. globals.css sets the dark scheme instead.
export const viewport: Viewport = {
  themeColor: BRAND.background,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
