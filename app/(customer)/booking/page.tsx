import { AuthRequired } from "@/components/auth/auth-required";
import { SeatPicker } from "@/components/booking";
import { resolveLegacyMovieShowId } from "@/lib/catalog/legacy-showtime";
import { pageMetadata } from "@/lib/seo/site";
import { redirect } from "next/navigation";

export const metadata = pageMetadata({
  title: "Choose seats | Show Time",
  description: "Choose seats for your show.",
  path: "/booking",
  index: false,
});

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
  if (!/^[a-f\d]{24}$/i.test(showId)) {
    const persistedShowId = await resolveLegacyMovieShowId(showId);
    if (persistedShowId) {
      const query = new URLSearchParams({ showId: persistedShowId });
      if (notice) query.set("notice", notice);
      if (groupId) query.set("groupId", groupId);
      redirect(`/booking?${query.toString()}`);
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 text-foreground sm:px-6">
      <AuthRequired>
        <SeatPicker showId={showId} initialNotice={notice} groupId={groupId} />
      </AuthRequired>
    </main>
  );
}
