import type { Metadata } from "next";
import { FoodOrderPanel } from "@/components/food/food-order-panel";

export const metadata: Metadata = {
  title: "Cinema food | Show Time",
  description: "Order food for confirmed cinema bookings.",
};

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; cinemaId?: string }>;
}) {
  const { bookingId, cinemaId } = await searchParams;
  if (!bookingId || !cinemaId)
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-foreground">
        <h1 className="text-2xl font-semibold">
          Choose a cinema booking first
        </h1>
      </main>
    );
  return <FoodOrderPanel bookingId={bookingId} cinemaId={cinemaId} />;
}
