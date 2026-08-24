import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  const { createGroupBooking, listGroupBookings } =
    await import("../lib/booking/group-booking");
  const { applyDynamicPricing } =
    await import("../lib/booking/dynamic-pricing");
  const { createFoodOrder } = await import("../lib/food/food-service");
  const { subscribeWithWallet } =
    await import("../lib/memberships/membership-service");
  const { getActiveFlashSale } = await import("../lib/promotions/flash-sale");
  const { getOrCreateReferralCode, redeemReferral } =
    await import("../lib/referrals/referral-service");
  const { absoluteUrl, breadcrumbJsonLd, getSitemapEntries, siteUrl } =
    await import("../lib/seo/site");
  const { creditWallet, listWalletActivity } =
    await import("../lib/wallet/wallet-service");
  const {
    Booking,
    Cinema,
    City,
    Coupon,
    DynamicPricingRule,
    FoodItem,
    FoodOrder,
    GroupBooking,
    MembershipPlan,
    MembershipSubscription,
    Movie,
    Payment,
    Referral,
    Screen,
    SeatLayout,
    Show,
    User,
    Wallet,
    WalletPass,
    WalletTransaction,
  } = await import("../models");
  const { connectToDatabase } = await import("../lib/mongodb/connect");
  const prefix = `__stage_f_${Date.now()}`;
  const ids: Record<string, string | undefined> = {};

  try {
    await connectToDatabase();
    const customer = await User.create({
      firebaseUid: `${prefix}_customer`,
      name: "Stage F customer",
      email: `${prefix}@example.test`,
      role: "CUSTOMER",
    });
    ids.customer = customer._id.toString();
    const friend = await User.create({
      firebaseUid: `${prefix}_friend`,
      name: "Stage F friend",
      email: `${prefix}-friend@example.test`,
      role: "CUSTOMER",
    });
    ids.friend = friend._id.toString();
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
      address: "Stage F test address",
      city: city._id,
      location: { type: "Point", coordinates: [0, 0] },
    });
    ids.cinema = cinema._id.toString();
    const layout = await SeatLayout.create({
      name: `${prefix}_layout`,
      categories: ["REGULAR"],
      totalSeats: 4,
      rows: [
        {
          label: "A",
          seats: ["A1", "A2", "A3", "A4"].map((seatId, index) => ({
            seatId,
            row: "A",
            number: index + 1,
            category: "REGULAR",
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
      capacity: 4,
      rowConfiguration: [{ label: "A", seatCount: 4, category: "REGULAR" }],
      seatCategories: ["REGULAR"],
    });
    ids.screen = screen._id.toString();
    const movie = await Movie.create({
      title: `${prefix}_movie`,
      slug: `${prefix}-movie`,
      poster: "https://example.com/poster.jpg",
      description: "Temporary Stage F movie.",
      language: ["English"],
      genre: ["Drama"],
      duration: 90,
      certificate: "U",
      releaseDate: new Date("2026-01-01"),
      rating: 7,
    });
    ids.movie = movie._id.toString();
    const show = await Show.create({
      contentType: "MOVIE",
      movie: movie._id,
      city: city._id,
      cinema: cinema._id,
      screen: screen._id,
      date: new Date("2035-08-24T00:00:00.000Z"),
      startTime: new Date("2035-08-24T12:00:00.000Z"),
      endTime: new Date("2035-08-24T14:00:00.000Z"),
      pricing: [{ category: "REGULAR", price: 250, currency: "INR" }],
      bookingLimits: { maxSeatsPerBooking: 4 },
      seatAvailability: ["A1", "A2", "A3", "A4"].map((seatId) => ({
        seatId,
        category: "REGULAR",
        status: "AVAILABLE",
      })),
    });
    ids.show = show._id.toString();

    const groupKey = `${prefix}_group`;
    const group = await createGroupBooking(customer._id.toString(), {
      name: "Stage F split plan",
      showId: show._id.toString(),
      paymentMode: "SPLIT",
      invitees: [friend.email],
      idempotencyKey: groupKey,
    });
    ids.group = group._id.toString();
    const replayedGroup = await createGroupBooking(customer._id.toString(), {
      name: "Stage F split plan",
      showId: show._id.toString(),
      paymentMode: "SPLIT",
      invitees: [friend.email],
      idempotencyKey: groupKey,
    });
    assert.equal(
      group._id.toString(),
      replayedGroup._id.toString(),
      "group booking creation must be idempotent",
    );
    const visibleToFriend = await listGroupBookings(friend._id.toString());
    assert(
      visibleToFriend.some((entry) => entry._id.toString() === ids.group),
      "invited members must see group bookings by their email",
    );

    const booking = await Booking.create({
      user: customer._id,
      show: show._id,
      groupBooking: group._id,
      seats: [{ seatId: "A1", category: "REGULAR", price: 250 }],
      pricing: {
        basePrice: 250,
        convenienceFee: 13,
        tax: 2,
        subtotal: 265,
        discount: 0,
        total: 265,
        organizerShare: 212,
        platformCommission: 53,
        platformRevenue: 53,
        currency: "INR",
      },
      status: "PENDING",
      idempotencyKey: `${prefix}_booking`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    ids.booking = booking._id.toString();
    const payment = await Payment.create({
      booking: booking._id,
      groupBooking: group._id,
      amount: 265,
      currency: "INR",
      gateway: "RAZORPAY",
      gatewayOrderId: `order_${prefix}`,
      status: "CREATED",
      idempotencyKey: `${prefix}_payment`,
    });
    assert.equal(
      payment.groupBooking?.toString(),
      group._id.toString(),
      "split-payment orders must retain their group booking reference",
    );

    const coupon = await Coupon.create({
      code: `${prefix}_FLASH`.toUpperCase(),
      discountType: "PERCENTAGE",
      discountValue: 20,
      minimumCartAmount: 0,
      maximumDiscount: 300,
      startDate: new Date(Date.now() - 60 * 1000),
      expiryDate: new Date(Date.now() + 60 * 60 * 1000),
      usageLimit: 100,
      perUserLimit: 1,
      active: true,
      flashSaleActive: true,
      flashSaleHeadline: "20% off launch test",
      flashSaleEndsAt: new Date(Date.now() + 20 * 60 * 1000),
    });
    ids.coupon = coupon._id.toString();
    const flashSale = await getActiveFlashSale();
    assert.equal(flashSale?.code, coupon.code);
    assert.equal(flashSale?.discountText, "20% OFF up to INR 300");

    await creditWallet({
      userId: friend._id.toString(),
      amount: 1000,
      points: 200,
      source: "ADMIN",
      idempotencyKey: `${prefix}_admin_wallet_credit`,
      note: "Stage F wallet fixture",
    });
    const walletState = await listWalletActivity(friend._id.toString());
    assert.equal(walletState.wallet.balance, 1000);
    assert.equal(walletState.wallet.rewardPoints, 200);

    const referral = await getOrCreateReferralCode(customer._id.toString());
    ids.referral = referral._id.toString();
    const redeemed = await redeemReferral(friend._id.toString(), {
      code: referral.code,
      idempotencyKey: `${prefix}_redeem_referral`,
    });
    assert.equal(
      (redeemed as { status: string }).status,
      "REWARDED",
      "referrals must reward through the wallet ledger",
    );
    const referrerWallet = await listWalletActivity(customer._id.toString());
    assert(
      referrerWallet.wallet.rewardPoints >= 250,
      "referrer wallet must receive reward points",
    );

    const plan = await MembershipPlan.create({
      name: `${prefix} Plus`,
      slug: `${prefix}-plus`,
      price: 100,
      durationDays: 30,
      benefits: {
        rewardMultiplier: 2,
        bookingDiscountPercent: 10,
        foodDiscountPercent: 15,
        priorityAccess: true,
      },
    });
    ids.plan = plan._id.toString();
    const subscription = await subscribeWithWallet(friend._id.toString(), {
      planId: plan._id.toString(),
      idempotencyKey: `${prefix}_membership`,
    });
    ids.subscription = (
      subscription as { _id: { toString(): string } }
    )._id.toString();
    const pass = await WalletPass.findOne({
      membership: ids.subscription,
      user: friend._id,
    }).lean();
    assert(pass, "membership subscription must issue a wallet pass");
    ids.pass = pass?._id.toString();

    const dynamicRule = await DynamicPricingRule.create({
      name: `${prefix} surge`,
      scope: "SHOW",
      show: show._id,
      seatCategory: "REGULAR",
      startsAt: new Date(Date.now() - 60 * 1000),
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
      multiplier: 1.5,
      flatAdjustment: 25,
      priority: 10,
    });
    ids.dynamicRule = dynamicRule._id.toString();
    const dynamicSeats = await applyDynamicPricing(
      [{ seatId: "A4", category: "REGULAR", price: 200 }],
      { showId: show._id },
    );
    assert.equal(dynamicSeats[0].price, 325);

    const foodItem = await FoodItem.create({
      cinema: cinema._id,
      name: `${prefix} popcorn`,
      category: "SNACK",
      price: 200,
      available: true,
    });
    ids.foodItem = foodItem._id.toString();
    const confirmedBooking = await Booking.create({
      user: friend._id,
      show: show._id,
      seats: [{ seatId: "A2", category: "REGULAR", price: 250 }],
      pricing: {
        basePrice: 250,
        convenienceFee: 13,
        tax: 2,
        subtotal: 265,
        discount: 0,
        total: 265,
        organizerShare: 212,
        platformCommission: 53,
        platformRevenue: 53,
        currency: "INR",
      },
      status: "CONFIRMED",
      idempotencyKey: `${prefix}_food_booking`,
      confirmedAt: new Date(),
    });
    ids.foodBooking = confirmedBooking._id.toString();
    const foodOrder = await createFoodOrder(friend._id.toString(), {
      bookingId: confirmedBooking._id.toString(),
      items: [{ itemId: foodItem._id.toString(), quantity: 2 }],
      deliveryMode: "COUNTER_PICKUP",
      idempotencyKey: `${prefix}_food_order`,
    });
    ids.foodOrder = (
      foodOrder as { _id: { toString(): string } }
    )._id.toString();
    assert.equal(
      (foodOrder as { total: number }).total,
      340,
      "membership food discount must apply to cinema food orders",
    );

    assert.equal(absoluteUrl("/search"), `${siteUrl}/search`);
    const breadcrumbs = breadcrumbJsonLd([
      { name: "Home", url: absoluteUrl("/") },
      { name: "Movies", url: absoluteUrl("/search?category=movies") },
    ]);
    assert.equal(breadcrumbs.itemListElement.length, 2);
    const sitemap = await getSitemapEntries();
    assert(
      sitemap.some((entry) => entry.url.endsWith(`/movies/${movie.slug}`)),
      "sitemap must include active movie detail routes",
    );

    console.log(
      "PASS: group booking, split-payment references, wallet, rewards, referrals, memberships, food ordering, dynamic pricing, wallet passes, flash sale, sitemap, and structured-data helpers succeeded.",
    );
  } finally {
    const cleanupUserIds = [ids.customer, ids.friend].filter(
      (id): id is string => Boolean(id),
    );
    if (ids.foodOrder) await FoodOrder.deleteOne({ _id: ids.foodOrder });
    if (ids.foodItem) await FoodItem.deleteOne({ _id: ids.foodItem });
    if (ids.foodBooking) await Booking.deleteOne({ _id: ids.foodBooking });
    if (ids.dynamicRule)
      await DynamicPricingRule.deleteOne({ _id: ids.dynamicRule });
    if (ids.pass) await WalletPass.deleteOne({ _id: ids.pass });
    if (ids.subscription)
      await MembershipSubscription.deleteOne({ _id: ids.subscription });
    if (ids.plan) await MembershipPlan.deleteOne({ _id: ids.plan });
    if (ids.referral) await Referral.deleteOne({ _id: ids.referral });
    await WalletTransaction.deleteMany({
      user: { $in: cleanupUserIds },
    });
    await Wallet.deleteMany({
      user: { $in: cleanupUserIds },
    });
    if (ids.booking) await Payment.deleteMany({ booking: ids.booking });
    if (ids.booking) await Booking.deleteOne({ _id: ids.booking });
    if (ids.group) await GroupBooking.deleteOne({ _id: ids.group });
    if (ids.coupon) await Coupon.deleteOne({ _id: ids.coupon });
    if (ids.show) await Show.deleteOne({ _id: ids.show });
    if (ids.screen) await Screen.deleteOne({ _id: ids.screen });
    if (ids.layout) await SeatLayout.deleteOne({ _id: ids.layout });
    if (ids.movie) await Movie.deleteOne({ _id: ids.movie });
    if (ids.cinema) await Cinema.deleteOne({ _id: ids.cinema });
    if (ids.city) await City.deleteOne({ _id: ids.city });
    await User.deleteMany({
      _id: { $in: cleanupUserIds },
    });
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
