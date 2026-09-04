import { AccountPanel } from "@/components/account/account-panel";
import { CustomerAccountGate } from "@/components/auth/customer-account-gate";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Your account | Show Time",
  description: "Manage your Show Time account and bookings.",
  path: "/account",
  index: false,
});

export default function AccountPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8">
      <CustomerAccountGate>
        <AccountPanel />
      </CustomerAccountGate>
    </main>
  );
}
