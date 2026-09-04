import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { FirebaseAnalyticsProvider } from "@/components/providers/firebase-analytics";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Show Time | Kolkata movies and events",
  description:
    "Discover and securely book movies, events, and experiences across Kolkata.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "Show Time | Kolkata movies and events",
    description:
      "Discover and securely book movies, events, and experiences across Kolkata.",
    url: absoluteUrl("/"),
    siteName: "Show Time",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Show Time | Kolkata movies and events",
    description:
      "Discover and securely book movies, events, and experiences across Kolkata.",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <FirebaseAnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
