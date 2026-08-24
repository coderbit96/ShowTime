import assert from "node:assert/strict";
import crypto from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  const { createScheduledShow, ShowScheduleConflictError } =
    await import("../lib/booking/schedule-show");
  const { createSeatLock, SeatUnavailableError } =
    await import("../lib/booking/seat-locks");
  const { createPendingBooking } =
    await import("../lib/booking/pending-booking");
  const { calculateBookingPricing } = await import("../lib/booking/pricing");
  const { CouponValidationError, validateCouponForBooking } =
    await import("../lib/booking/coupon-engine");
  const { checkInTicket } = await import("../lib/tickets/check-in");
  const { approveRefund, requestRefund } =
    await import("../lib/refunds/refund-service");
  const {
    Booking,
    Cinema,
    City,
    Coupon,
    Movie,
    Notification,
    Payment,
    Refund,
    Screen,
    SeatLayout,
    SeatLock,
    Show,
    Ticket,
    User,
  } = await import("../models");
  const { connectToDatabase } = await import("../lib/mongodb/connect");
  const prefix = `__schedule_concurrency_${Date.now()}`;
  const ids: Record<string, string | undefined> = {};
  const userIds: string[] = [];

  try {
    await connectToDatabase();
    const city = await City.create({
      name: `${prefix}_city`,
      slug: `${prefix}-city`,
      state: "Test",
      country: "India",
      location: { type: "Point", coordinates: [0, 0] },
    });
    ids.city = city._id.toString();
    const cinema = await Cinema.create({
      name: `${prefix}_cinema`,
      slug: `${prefix}-cinema`,
      address: "Temporary integration test address",
      city: city._id,
      location: { type: "Point", coordinates: [0, 0] },
    });
    ids.cinema = cinema._id.toString();
    const layout = await SeatLayout.create({
      name: `${prefix}_layout`,
      categories: ["REGULAR", "PREMIUM"],
      totalSeats: 8,
      rows: [
        {
          label: "A",
          seats: Array.from({ length: 4 }, (_, index) => ({
            seatId: `A${index + 1}`,
            row: "A",
            number: index + 1,
            category: "REGULAR",
            active: true,
          })),
        },
        {
          label: "B",
          seats: Array.from({ length: 4 }, (_, index) => ({
            seatId: `B${index + 1}`,
            row: "B",
            number: index + 1,
            category: "PREMIUM",
            active: true,
          })),
        },
      ],
    });
    ids.layout = layout._id.toString();
    const screen = await Screen.create({
      name: `${prefix}_screen`,
      cinema: cinema._id,
      seatLayout: layout._id,
      capacity: 8,
      rowConfiguration: [
        { label: "A", seatCount: 4, category: "REGULAR" },
        { label: "B", seatCount: 4, category: "PREMIUM" },
      ],
      seatCategories: ["REGULAR", "PREMIUM"],
    });
    ids.screen = screen._id.toString();
    const movie = await Movie.create({
      title: `${prefix}_movie`,
      slug: `${prefix}-movie`,
      poster: "https://example.com/poster.jpg",
      description: "Temporary concurrency test movie.",
      language: ["English"],
      genre: ["Drama"],
      duration: 90,
      certificate: "U",
      releaseDate: new Date("2026-01-01"),
      rating: 7,
    });
    ids.movie = movie._id.toString();

    const workedExample = calculateBookingPricing({
      seats: [
        { seatId: "P1", category: "PREMIUM", price: 400 },
        { seatId: "P2", category: "PREMIUM", price: 400 },
      ],
      coupon: { code: "SAVE100", discountType: "FIXED", discountValue: 100 },
    });
    assert.deepEqual(
      {
        basePrice: workedExample.basePrice,
        convenienceFee: workedExample.convenienceFee,
        tax: workedExample.tax,
        subtotal: workedExample.subtotal,
        discount: workedExample.discount,
        total: workedExample.total,
      },
      {
        basePrice: 800,
        convenienceFee: 40,
        tax: 7,
        subtotal: 847,
        discount: 100,
        total: 747,
      },
      "the pricing engine must match the required worked example",
    );

    const actor = {
      id: "test-admin",
      firebaseUid: "test-admin",
      role: "ADMIN" as const,
      canCreateVenues: true,
    };
    const basePayload = {
      contentType: "MOVIE" as const,
      movie: movie._id.toString(),
      cinema: cinema._id.toString(),
      screen: screen._id.toString(),
      pricing: [
        { category: "REGULAR" as const, price: 200, currency: "INR" as const },
        { category: "PREMIUM" as const, price: 350, currency: "INR" as const },
      ],
      bookingLimits: { maxSeatsPerBooking: 6 },
    };
    const results = await Promise.allSettled([
      createScheduledShow(actor, {
        ...basePayload,
        startTime: new Date("2034-05-20T18:00:00.000Z"),
        endTime: new Date("2034-05-20T20:00:00.000Z"),
      }),
      createScheduledShow(actor, {
        ...basePayload,
        startTime: new Date("2034-05-20T19:00:00.000Z"),
        endTime: new Date("2034-05-20T21:00:00.000Z"),
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(
      fulfilled.length,
      1,
      "exactly one overlapping schedule request must succeed",
    );
    assert.equal(
      rejected.length,
      1,
      "exactly one overlapping schedule request must be rejected",
    );
    assert(
      rejected[0].status === "rejected" &&
        rejected[0].reason instanceof ShowScheduleConflictError,
      "the rejected request must report a scheduling conflict",
    );

    const shows = await Show.find({ screen: screen._id }).lean();
    ids.show = shows[0]?._id.toString();
    assert.equal(
      shows.length,
      1,
      "only one show record may be created for overlapping requests",
    );
    assert.equal(
      shows[0].seatAvailability.length,
      8,
      "the seat availability snapshot must include every layout seat",
    );
    assert(
      shows[0].seatAvailability.every((seat) => seat.status === "AVAILABLE"),
      "all generated seats must start AVAILABLE",
    );
    const customer = await User.create({
      firebaseUid: `${prefix}_customer`,
      name: "Seat map test customer",
      email: `${prefix}@example.test`,
      role: "CUSTOMER",
    });
    userIds.push(customer._id.toString());
    await SeatLock.create({
      show: shows[0]._id,
      user: customer._id,
      seatIds: ["A2"],
      status: "ACTIVE",
      idempotencyKey: `${prefix}_lock`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await Booking.create({
      user: customer._id,
      show: shows[0]._id,
      seats: [{ seatId: "B1", category: "PREMIUM", price: 350 }],
      pricing: {
        basePrice: 350,
        convenienceFee: 0,
        tax: 0,
        discount: 0,
        total: 350,
        currency: "INR",
      },
      status: "CONFIRMED",
      idempotencyKey: `${prefix}_booking`,
    });
    await Show.updateOne(
      { _id: shows[0]._id, "seatAvailability.seatId": "A4" },
      { $set: { "seatAvailability.$.status": "BLOCKED" } },
    );

    const competingCustomer = await User.create({
      firebaseUid: `${prefix}_competing_customer`,
      name: "Competing seat lock customer",
      email: `${prefix}-competing@example.test`,
      role: "CUSTOMER",
    });
    userIds.push(competingCustomer._id.toString());
    const lockResults = await Promise.allSettled([
      createSeatLock(customer._id.toString(), {
        showId: shows[0]._id.toString(),
        seatIds: ["A1"],
        idempotencyKey: `${prefix}_race_one`,
      }),
      createSeatLock(competingCustomer._id.toString(), {
        showId: shows[0]._id.toString(),
        seatIds: ["A1"],
        idempotencyKey: `${prefix}_race_two`,
      }),
    ]);
    const successfulLocks = lockResults.filter(
      (result) => result.status === "fulfilled",
    );
    const rejectedLocks = lockResults.filter(
      (result) => result.status === "rejected",
    );
    assert.equal(
      successfulLocks.length,
      1,
      "exactly one concurrent request may lock the same seat",
    );
    assert.equal(
      rejectedLocks.length,
      1,
      "one concurrent request must be rejected for the contested seat",
    );
    assert(
      rejectedLocks[0].status === "rejected" &&
        rejectedLocks[0].reason instanceof SeatUnavailableError,
      "the losing lock request must receive a clear availability error",
    );
    const lockIndexes = await SeatLock.collection.indexes();
    assert(
      lockIndexes.some(
        (index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0,
      ),
      "seat locks must have a zero-offset TTL expiry index",
    );

    const checkoutCustomer = await User.create({
      firebaseUid: `${prefix}_checkout_customer`,
      name: "Pending booking test customer",
      email: `${prefix}-checkout@example.test`,
      role: "CUSTOMER",
    });
    userIds.push(checkoutCustomer._id.toString());
    const checkoutLock = await createSeatLock(checkoutCustomer._id.toString(), {
      showId: shows[0]._id.toString(),
      seatIds: ["B2"],
      idempotencyKey: `${prefix}_checkout_lock`,
    });
    const coupon = await Coupon.create({
      code: `${prefix}_SAVE50`.toUpperCase(),
      discountType: "FIXED",
      discountValue: 50,
      minimumCartAmount: 100,
      startDate: new Date("2020-01-01"),
      expiryDate: new Date("2035-01-01"),
      usageLimit: 10,
      perUserLimit: 1,
    });
    ids.coupon = coupon._id.toString();
    const bookingKey = `${prefix}_pending_booking`;
    const pendingBooking = await createPendingBooking(
      checkoutCustomer._id.toString(),
      {
        showId: shows[0]._id.toString(),
        lockId: checkoutLock.id,
        idempotencyKey: bookingKey,
        couponCode: coupon.code,
      },
    );
    const retriedBooking = await createPendingBooking(
      checkoutCustomer._id.toString(),
      {
        showId: shows[0]._id.toString(),
        lockId: checkoutLock.id,
        idempotencyKey: bookingKey,
        couponCode: coupon.code,
      },
    );
    assert.equal(
      pendingBooking.bookingId,
      retriedBooking.bookingId,
      "a retried pending booking must return the original booking",
    );
    assert.equal(pendingBooking.status, "PENDING");
    ids.booking = pendingBooking.bookingId;
    assert.equal(pendingBooking.coupon?.code, coupon.code);
    assert.equal(pendingBooking.pricing.discount, 50);
    assert.equal(pendingBooking.pricing.total, 324);
    await assert.rejects(
      () =>
        validateCouponForBooking({
          code: coupon.code,
          userId: checkoutCustomer._id.toString(),
          seats: [{ seatId: "B3", category: "PREMIUM", price: 350 }],
        }),
      (error: unknown) =>
        error instanceof CouponValidationError &&
        error.message === "You have reached the usage limit for this coupon.",
      "coupon validation must enforce the per-user usage limit",
    );
    const consumedLock = await SeatLock.findById(checkoutLock.id).lean();
    assert.equal(
      consumedLock?.status,
      "CANCELLED",
      "the pending booking must consume its seat lock",
    );

    process.env.RAZORPAY_WEBHOOK_SECRET = `${prefix}_webhook_secret`;
    process.env.TICKET_QR_SECRET = `${prefix}_ticket_qr_secret`;
    const gatewayOrderId = `order_${prefix}`;
    await Payment.create({
      booking: pendingBooking.bookingId,
      amount: pendingBooking.pricing.total,
      currency: "INR",
      gateway: "RAZORPAY",
      gatewayOrderId,
      status: "CREATED",
      idempotencyKey: `${prefix}_payment`,
    });
    const webhookBody = JSON.stringify({
      payload: {
        payment: {
          entity: {
            id: `pay_${prefix}`,
            order_id: gatewayOrderId,
            amount: pendingBooking.pricing.total * 100,
            currency: "INR",
          },
        },
      },
    });
    const webhookSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest("hex");
    const { POST: processWebhook } =
      await import("../app/api/payment/webhook/route");
    const { NextRequest } = await import("next/server");
    const webhookRequest = () =>
      new NextRequest("http://localhost/api/payment/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": webhookSignature,
          "x-razorpay-event": "payment.captured",
          "x-razorpay-event-id": `${prefix}_captured`,
        },
        body: webhookBody,
      });
    const firstWebhook = await processWebhook(webhookRequest());
    const replayedWebhook = await processWebhook(webhookRequest());
    assert.equal(
      firstWebhook.status,
      200,
      "a signed payment webhook must succeed",
    );
    assert.equal(
      replayedWebhook.status,
      200,
      "a replayed webhook must be a safe no-op",
    );
    const [confirmedBooking, successfulPayment, tickets, redeemedCoupon] =
      await Promise.all([
        Booking.findById(pendingBooking.bookingId).lean(),
        Payment.findOne({ gatewayOrderId }).lean(),
        Ticket.find({ booking: pendingBooking.bookingId }).lean(),
        Coupon.findById(coupon._id).lean(),
      ]);
    assert.equal(confirmedBooking?.status, "CONFIRMED");
    assert.equal(successfulPayment?.status, "SUCCESS");
    assert.equal(
      tickets.length,
      1,
      "a replayed webhook must not create another ticket",
    );
    assert.equal(redeemedCoupon?.usedCount, 1);

    const refundableBooking = await Booking.create({
      user: checkoutCustomer._id,
      show: shows[0]._id,
      seats: [{ seatId: "B3", category: "PREMIUM", price: 350 }],
      pricing: {
        basePrice: 350,
        convenienceFee: 20,
        tax: 4,
        subtotal: 374,
        discount: 0,
        total: 374,
        organizerShare: 299,
        platformCommission: 75,
        platformRevenue: 75,
        currency: "INR",
      },
      status: "CONFIRMED",
      idempotencyKey: `${prefix}_refundable_booking`,
    });
    ids.refundableBooking = refundableBooking._id.toString();
    await Payment.create({
      booking: refundableBooking._id,
      amount: 374,
      currency: "INR",
      gateway: "RAZORPAY",
      gatewayOrderId: `order_refund_${prefix}`,
      gatewayPaymentId: `pay_refund_${prefix}`,
      status: "SUCCESS",
      idempotencyKey: `${prefix}_refundable_payment`,
    });
    await Show.updateOne(
      { _id: shows[0]._id, "seatAvailability.seatId": "B3" },
      { $set: { "seatAvailability.$.status": "BOOKED" } },
    );
    const refundRequestKey = `${prefix}_refund_request`;
    const refundRequest = await requestRefund(checkoutCustomer._id.toString(), {
      bookingId: refundableBooking._id.toString(),
      idempotencyKey: refundRequestKey,
    });
    const replayedRefundRequest = await requestRefund(
      checkoutCustomer._id.toString(),
      {
        bookingId: refundableBooking._id.toString(),
        idempotencyKey: refundRequestKey,
      },
    );
    assert.equal(refundRequest.replayed, false);
    assert.equal(replayedRefundRequest.replayed, true);
    const refundCompletion = await approveRefund(
      checkoutCustomer._id.toString(),
      refundRequest.refund._id.toString(),
      undefined,
      async () => ({ id: `rfnd_${prefix}` }),
    );
    assert.equal(refundCompletion.replayed, false);
    const [
      refundedBooking,
      refundedPayment,
      completedRefund,
      refundShow,
      refundNotice,
    ] = await Promise.all([
      Booking.findById(refundableBooking._id).lean(),
      Payment.findOne({ booking: refundableBooking._id }).lean(),
      Refund.findOne({ booking: refundableBooking._id }).lean(),
      Show.findById(shows[0]._id).lean(),
      Notification.findOne({
        eventKey: `refund-processed:${refundRequest.refund._id}`,
      }).lean(),
    ]);
    assert.equal(refundedBooking?.status, "REFUNDED");
    assert.equal(refundedPayment?.status, "REFUNDED");
    assert.equal(completedRefund?.status, "SUCCESS");
    assert.equal(
      refundShow?.seatAvailability.find((seat) => seat.seatId === "B3")?.status,
      "AVAILABLE",
      "a successful refund must atomically release its booked seats",
    );
    assert(
      refundNotice,
      "a processed refund must create one in-app notification",
    );
    const scannerActor = {
      id: "test-admin",
      firebaseUid: "test-admin",
      role: "ADMIN" as const,
      canCreateVenues: true,
    };
    const approvedCheckIn = await checkInTicket({
      actor: scannerActor,
      qrPayload: tickets[0].qrPayload,
      showId: shows[0]._id.toString(),
    });
    assert.equal(approvedCheckIn.outcome, "APPROVED");
    const repeatedCheckIn = await checkInTicket({
      actor: scannerActor,
      qrPayload: tickets[0].qrPayload,
      showId: shows[0]._id.toString(),
    });
    assert.equal(repeatedCheckIn.outcome, "ALREADY_USED");
    const invalidCheckIn = await checkInTicket({
      actor: scannerActor,
      qrPayload: `${tickets[0].qrPayload}tampered`,
      showId: shows[0]._id.toString(),
    });
    assert.equal(invalidCheckIn.outcome, "INVALID");

    const { GET } = await import("../app/api/shows/[id]/seats/route");
    const response = await GET(
      new NextRequest(`http://localhost/api/shows/${shows[0]._id}/seats`),
      { params: Promise.resolve({ id: shows[0]._id.toString() }) },
    );
    assert.equal(response.status, 200, "the seat map endpoint must resolve");
    const seatMap = (await response.json()) as {
      layout: { rows: Array<{ seats: Array<{ id: string; status: string }> }> };
    };
    const states = new Map(
      seatMap.layout.rows.flatMap((row) =>
        row.seats.map((seat) => [seat.id, seat.status]),
      ),
    );
    assert.equal(states.get("A1"), "LOCKED");
    assert.equal(states.get("A2"), "LOCKED");
    assert.equal(states.get("A3"), "AVAILABLE");
    assert.equal(states.get("A4"), "BLOCKED");
    assert.equal(states.get("B1"), "BOOKED");
    assert.equal(states.get("B2"), "BOOKED");
    assert.equal(states.get("B3"), "AVAILABLE");
    console.log(
      "PASS: scheduling, concurrent locking, pricing, coupons, payment webhooks, refunds, notifications, pending booking, TTL index, and seat-state API checks succeeded.",
    );
  } finally {
    const testBookingIds = ids.show
      ? await Booking.find({ show: ids.show }).distinct("_id")
      : [];
    if (ids.show) await SeatLock.deleteMany({ show: ids.show });
    if (testBookingIds.length)
      await Refund.deleteMany({ booking: { $in: testBookingIds } });
    if (userIds.length)
      await Notification.deleteMany({ user: { $in: userIds } });
    if (testBookingIds.length)
      await Payment.deleteMany({ booking: { $in: testBookingIds } });
    if (testBookingIds.length)
      await Ticket.deleteMany({ booking: { $in: testBookingIds } });
    if (ids.show) await Booking.deleteMany({ show: ids.show });
    if (ids.screen) await Show.deleteMany({ screen: ids.screen });
    if (ids.screen) await Screen.deleteOne({ _id: ids.screen });
    if (ids.layout) await SeatLayout.deleteOne({ _id: ids.layout });
    if (ids.movie) await Movie.deleteOne({ _id: ids.movie });
    if (ids.coupon) await Coupon.deleteOne({ _id: ids.coupon });
    if (ids.cinema) await Cinema.deleteOne({ _id: ids.cinema });
    if (ids.city) await City.deleteOne({ _id: ids.city });
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
