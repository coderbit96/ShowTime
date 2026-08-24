import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Cancellation Policy | Show Time",
  description: "Cancellation and refund policy for Show Time bookings.",
};

export default function CancellationPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Cancellation and refunds"
      description="Eligibility is calculated from the show time and the active platform policy configured by admins."
      sections={[
        {
          title: "Before the show",
          body: "Eligible bookings can be cancelled from the account area. Approved refunds are processed through the original payment route.",
        },
        {
          title: "After payment",
          body: "Refund requests are idempotent, tracked in the refund pipeline, and cannot create duplicate gateway refunds.",
        },
      ]}
    />
  );
}
