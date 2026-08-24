import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Contact | Show Time",
  description: "Contact Show Time support and partnerships.",
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Talk to Show Time"
      description="Reach us for customer support, organizer onboarding, venue partnerships, and press requests."
      sections={[
        {
          title: "Customers",
          body: "For booking, refund, ticket, wallet, membership, or account questions, sign in and open your account area.",
        },
        {
          title: "Organizers",
          body: "Create an organizer account to begin verification and get access to event, venue, show, and finance tools.",
        },
      ]}
    />
  );
}
