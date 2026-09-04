import { InfoPage } from "@/components/site/info-page";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Safety | Show Time",
  description: "Safety and trust at Show Time.",
  path: "/safety",
});

export default function SafetyPage() {
  return (
    <InfoPage
      eyebrow="Trust"
      title="Safer booking, safer entry"
      description="Show Time uses verified payments, signed QR tickets, organizer check-in tools, and admin audit logs."
      sections={[
        {
          title: "Ticket integrity",
          body: "QR payloads are signed and checked against server-side booking, payment, and ticket state before entry approval.",
        },
        {
          title: "Platform controls",
          body: "Role-based access, organizer approval, event review, and audit logs keep sensitive operations controlled.",
        },
      ]}
    />
  );
}
