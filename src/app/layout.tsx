import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { teshUrl } from "@/lib/links";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.CF_PAGES_URL;

export const metadata: Metadata = {
  metadataBase: new URL(site || "http://127.0.0.1:4317"),
  title: "Omarchy Theme Builder for Home Assistant · Top End Smart Homes",
  description:
    "Preview Omarchy palettes on a Home Assistant dashboard, try frosted glass, tiling, terminal, and other card styles, then download a theme. A free tool by Top End Smart Homes.",
  applicationName: "Omarchy Theme Builder",
  authors: [{ name: "Top End Smart Homes", url: teshUrl("/", "metadata") }],
  keywords: [
    "Home Assistant theme",
    "Omarchy",
    "card-mod",
    "Top End Smart Homes",
    "dashboard theme",
  ],
  openGraph: {
    title: "Omarchy Theme Builder for Home Assistant",
    description:
      "Build a Home Assistant theme from an Omarchy palette. Preview card styles live, then download YAML and a wallpaper. By Top End Smart Homes.",
    siteName: "Top End Smart Homes",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Omarchy Theme Builder preview of a Home Assistant dashboard, by Top End Smart Homes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Omarchy Theme Builder for Home Assistant",
    description:
      "Preview Omarchy themes on a Home Assistant dashboard and export a theme. By Top End Smart Homes.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
