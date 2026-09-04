import { InfoPage } from "@/components/site/info-page";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Help Center | Show Time",
  description: "Help and support for Show Time bookings.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Help Center"
      description="Quick guidance for booking, payments, tickets, refunds, food orders, wallet passes, and check-in."
      sections={[
        {
          title: "Bookings and tickets",
          body: "Confirmed tickets appear in your account after payment verification and include a QR code for venue entry.",
        },
        {
          title: "Payments and refunds",
          body: "Payment success is verified server-side. Refund requests follow the cancellation policy and admin approval workflow.",
        },
      ]}
    />
  );
}
