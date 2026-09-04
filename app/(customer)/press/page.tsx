import { InfoPage } from "@/components/site/info-page";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Press | Show Time",
  description: "Press information for Show Time.",
  path: "/press",
});

export default function PressPage() {
  return (
    <InfoPage
      eyebrow="Press"
      title="Show Time press room"
      description="Find platform context, product focus, and media contact details for Show Time."
      sections={[
        {
          title: "What we cover",
          body: "Movies, concerts, comedy, theatre, sports, workshops, festivals, gaming, exhibitions, kids events, and special experiences.",
        },
        {
          title: "Media contact",
          body: "For interviews, launch updates, and partnership stories, reach the Show Time team from the contact page.",
        },
      ]}
    />
  );
}
