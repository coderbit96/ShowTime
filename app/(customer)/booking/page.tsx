import type { Metadata } from "next";
import { AuthRequired } from "@/components/auth/auth-required";
import { SeatPicker } from "@/components/booking";

export const metadata: Metadata = {
  title: "Choose seats | Show Time",
  description: "Choose seats for your show.",
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ showId?: string; notice?: string; groupId?: string }>;
}) {
  const { showId, notice, groupId } = await searchParams;
  if (!showId)
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-foreground">
        <h1 className="text-2xl font-semibold">Choose a showtime first</h1>
        <p className="mt-2 text-sm text-muted">
          Select a movie or event showtime to open its seat map.
        </p>
      </main>
    );
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 text-foreground sm:px-6">
      <AuthRequired>
        <SeatPicker showId={showId} initialNotice={notice} groupId={groupId} />
      </AuthRequired>
    </main>
  );
}
