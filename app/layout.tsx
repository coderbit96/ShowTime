import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { FirebaseAnalyticsProvider } from "@/components/providers/firebase-analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Show Time",
  description: "Modern entertainment and ticket booking platform.",
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
