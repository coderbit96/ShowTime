import { InfoPage } from "@/components/site/info-page";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Gift Cards | Show Time",
  description: "Gift card information for Show Time.",
  path: "/gift-cards",
});

export default function GiftCardsPage() {
  return (
    <InfoPage
      eyebrow="Gifts"
      title="Gift cards and passes"
      description="Wallet passes and membership benefits are available from the customer account area."
      sections={[
        {
          title: "Wallet passes",
          body: "Passes can carry perks, eligibility rules, and expiry dates tied to a customer account.",
        },
        {
          title: "Rewards",
          body: "Reward points and wallet credits are managed in the same account wallet experience.",
        },
      ]}
    />
  );
}
