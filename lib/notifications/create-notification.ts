import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Notification } from "@/models";

export type LifecycleNotification = {
  userId: string;
  eventKey: string;
  title: string;
  body: string;
  type: "BOOKING" | "PAYMENT" | "REFUND" | "EVENT" | "SYSTEM";
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

/** Writes lifecycle notifications once, even when a gateway retries a webhook. */
export async function createLifecycleNotification(
  notification: LifecycleNotification,
) {
  await connectToDatabase();
  await Notification.updateOne(
    { eventKey: notification.eventKey },
    {
      $setOnInsert: {
        user: notification.userId,
        eventKey: notification.eventKey,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        metadata: notification.metadata,
      },
    },
    { upsert: true },
  );
}

export async function publishPaymentLifecycleNotifications({
  bookingId,
  ticketId,
  status,
}: {
  bookingId?: string;
  ticketId?: string;
  status?: string;
}) {
  if (!bookingId) return;
  await connectToDatabase();
  const booking = await Booking.findById(bookingId).select("user").lean();
  if (!booking) return;
  const userId = booking.user.toString();
  if (status === "CONFIRMED") {
    await Promise.all([
      createLifecycleNotification({
        userId,
        eventKey: `booking-confirmed:${bookingId}`,
        type: "BOOKING",
        title: "Booking confirmed",
        body: "Your booking is confirmed and your seats are reserved.",
        metadata: { bookingId },
      }),
      createLifecycleNotification({
        userId,
        eventKey: `payment-success:${bookingId}`,
        type: "PAYMENT",
        title: "Payment successful",
        body: "Your payment was verified successfully.",
        metadata: { bookingId },
      }),
      ...(ticketId
        ? [
            createLifecycleNotification({
              userId,
              eventKey: `ticket-generated:${ticketId}`,
              type: "BOOKING",
              title: "Your ticket is ready",
              body: "Your digital ticket is ready to view and scan.",
              metadata: { bookingId, ticketId },
            }),
          ]
        : []),
    ]);
  }
  if (status === "CANCELLED") {
    await createLifecycleNotification({
      userId,
      eventKey: `payment-failed:${bookingId}`,
      type: "PAYMENT",
      title: "Payment failed",
      body: "Your payment was not completed. Your seats have been released.",
      metadata: { bookingId },
    });
  }
}
