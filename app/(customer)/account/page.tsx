import { AccountPanel } from "@/components/account/account-panel";
import { AuthRequired } from "@/components/auth/auth-required";

export default function AccountPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8">
      <AuthRequired>
        <AccountPanel />
      </AuthRequired>
    </main>
  );
}
