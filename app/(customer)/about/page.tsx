import { InfoPage } from "@/components/site/info-page";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "About | Show Time",
  description: "Learn how Show Time helps customers discover and book events.",
  path: "/about",
});

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
