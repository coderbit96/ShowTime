import type { Metadata } from "next";
import { AuthRequired } from "@/components/auth/auth-required";
import { BookingSummary } from "@/components/booking/booking-summary";

export const metadata: Metadata = {
  title: "Booking summary | Show Time",
  description: "Review your selected seats before payment.",
};

export default async function BookingSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ showId?: string; lockId?: string; groupId?: string }>;
}) {
  const { showId, lockId, groupId } = await searchParams;
  if (!showId || !lockId)
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-foreground">
        <h1 className="text-2xl font-semibold">Choose seats first</h1>
      </main>
    );
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 text-foreground sm:px-6">
      <AuthRequired>
        <BookingSummary showId={showId} lockId={lockId} groupId={groupId} />
      </AuthRequired>
    </main>
  );
}
