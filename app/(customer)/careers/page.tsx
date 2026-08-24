import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Careers | Show Time",
  description: "Join the Show Time team.",
};

export default function CareersPage() {
  return (
    <InfoPage
      eyebrow="Careers"
      title="Help shape modern ticketing"
      description="We are building a practical, polished platform for customers, organizers, and operations teams."
      sections={[
        {
          title: "Product roles",
          body: "We value people who care about the whole booking journey, from discovery to venue check-in.",
        },
        {
          title: "Engineering roles",
          body: "The core work is reliability: concurrency-safe seats, payments, tickets, dashboards, and finance workflows.",
        },
      ]}
    />
  );
}
