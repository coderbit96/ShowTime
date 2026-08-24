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
  title: "Show Time",
  description: "Modern entertainment and ticket booking platform.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "Show Time",
    description: "Modern entertainment and ticket booking platform.",
    url: absoluteUrl("/"),
    siteName: "Show Time",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Show Time",
    description: "Modern entertainment and ticket booking platform.",
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
