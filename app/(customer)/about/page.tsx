import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "About | Show Time",
  description: "Learn how Show Time helps customers discover and book events.",
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Company"
      title="Built for nights worth planning"
      description="Show Time brings movies, live events, sports, workshops, and local experiences into one secure booking flow."
      sections={[
        {
          title: "Customer first",
          body: "Fast discovery, clear pricing, reliable ticketing, and account tools that make every booking easy to manage.",
        },
        {
          title: "Operationally serious",
          body: "Seat locks, payment verification, ticket validation, refunds, and audit logs are designed as backend-owned workflows.",
        },
      ]}
    />
  );
}
