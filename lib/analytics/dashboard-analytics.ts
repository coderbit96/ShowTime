import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import {
  AuditLog,
  Booking,
  Event,
  Movie,
  Organizer,
  Payment,
  Refund,
  User,
} from "@/models";

type AnalyticsScope = { role: "ADMIN" | "ORGANIZER"; organizerId?: string };

type CacheEntry = { expiresAt: number; value: Record<string, unknown> };
const analyticsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

function scopeMatch(scope: AnalyticsScope) {
  return scope.organizerId
    ? { organizer: new Types.ObjectId(scope.organizerId) }
    : {};
}

function showLookup(scope: AnalyticsScope) {
  return [
    {
      $lookup: {
        from: "shows",
        localField: "show",
        foreignField: "_id",
        as: "showRecord",
      },
    },
    { $unwind: "$showRecord" },
    ...(scope.organizerId
      ? [
          {
            $match: {
              "showRecord.organizer": new Types.ObjectId(scope.organizerId),
            },
          },
        ]
      : []),
  ];
}

function bookingShowLookup(scope: AnalyticsScope) {
  return [
    {
      $lookup: {
        from: "bookings",
        localField: "booking",
        foreignField: "_id",
        as: "bookingRecord",
      },
    },
    { $unwind: "$bookingRecord" },
    {
      $lookup: {
        from: "shows",
        localField: "bookingRecord.show",
        foreignField: "_id",
        as: "showRecord",
      },
    },
    { $unwind: "$showRecord" },
    ...(scope.organizerId
      ? [
          {
            $match: {
              "showRecord.organizer": new Types.ObjectId(scope.organizerId),
            },
          },
        ]
      : []),
  ];
}

export async function getDashboardAnalytics(scope: AnalyticsScope) {
  const cacheKey = `${scope.role}:${scope.organizerId ?? "platform"}`;
  const cached = analyticsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  await connectToDatabase();
  const organizerFilter = scopeMatch(scope);
  const bookingStatusMatch = {
    status: { $in: ["CONFIRMED", "REFUND_PENDING"] },
  };
  const paymentSuccessMatch = { status: "SUCCESS" };
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    bookingKpi,
    paymentKpi,
    customerCount,
    organizerCount,
    pendingEventCount,
    refundKpi,
    dailyRevenue,
    monthlyRevenue,
    bookingTrends,
    popularEvents,
    popularMovies,
    popularCategories,
    popularCities,
    organizerPerformance,
    totalRegisteredUsers,
    totalOrganizers,
    totalEvents,
    totalMovies,
    activeEventCount,
    upcomingEventCount,
    completedEventCount,
    todayKpi,
    cancelledBookingCount,
    pendingOrganizerCount,
    pendingRefundCount,
    weeklyRevenue,
    topVenues,
    topCinemas,
    recentTransactions,
    recentAdminActivity,
  ] = await Promise.all([
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          ticketSales: { $sum: { $size: "$seats" } },
          totalRevenue: { $sum: "$pricing.total" },
          platformRevenue: { $sum: "$pricing.platformRevenue" },
          organizerRevenue: { $sum: "$pricing.organizerShare" },
        },
      },
    ]),
    Payment.aggregate([
      ...bookingShowLookup(scope),
      { $match: paymentSuccessMatch },
      {
        $group: {
          _id: null,
          successfulPayments: { $sum: 1 },
          grossRevenue: { $sum: "$amount" },
        },
      },
    ]),
    User.countDocuments({ role: "CUSTOMER", active: true }),
    scope.role === "ADMIN"
      ? Organizer.countDocuments({ active: true })
      : Promise.resolve(1),
    Event.countDocuments(
      scope.role === "ADMIN"
        ? { approvalStatus: "PENDING", active: true }
        : { ...organizerFilter, approvalStatus: "PENDING", active: true },
    ),
    Refund.aggregate([
      ...bookingShowLookup(scope),
      {
        $match: {
          status: { $in: ["SUCCESS", "REFUNDED", "PROCESSING"] },
        },
      },
      {
        $group: {
          _id: null,
          refundAmount: {
            $sum: { $ifNull: ["$approvedAmount", "$requestedAmount"] },
          },
          refundCount: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$pricing.total" },
          bookings: { $sum: 1 },
          tickets: { $sum: { $size: "$seats" } },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 31 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$pricing.total" },
          bookings: { $sum: 1 },
          tickets: { $sum: { $size: "$seats" } },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          confirmed: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", ["CONFIRMED", "REFUND_PENDING", "REFUNDED"]],
                },
                1,
                0,
              ],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $in: ["$status", ["CANCELLED", "EXPIRED"]] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 31 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $lookup: {
          from: "events",
          localField: "showRecord.event",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$event.title",
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $lookup: {
          from: "movies",
          localField: "showRecord.movie",
          foreignField: "_id",
          as: "movie",
        },
      },
      { $unwind: { path: "$movie", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$movie.title",
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $lookup: {
          from: "events",
          localField: "showRecord.event",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "categories",
          localField: "event.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category.name",
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $lookup: {
          from: "cities",
          localField: "showRecord.city",
          foreignField: "_id",
          as: "city",
        },
      },
      { $unwind: "$city" },
      {
        $group: {
          _id: "$city.name",
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
    ]),
    scope.role === "ADMIN"
      ? Organizer.aggregate([
          { $match: { active: true } },
          {
            $lookup: {
              from: "events",
              localField: "_id",
              foreignField: "organizer",
              as: "events",
            },
          },
          {
            $project: {
              _id: 1,
              name: "$organizationName",
              events: { $size: "$events" },
            },
          },
          { $sort: { events: -1 } },
          { $limit: 10 },
        ])
      : Promise.resolve([]),
    scope.role === "ADMIN" ? User.countDocuments({}) : Promise.resolve(null),
    scope.role === "ADMIN"
      ? Organizer.countDocuments({})
      : Promise.resolve(null),
    Event.countDocuments(scope.role === "ADMIN" ? {} : organizerFilter),
    scope.role === "ADMIN" ? Movie.countDocuments({}) : Promise.resolve(null),
    Event.countDocuments({
      ...(scope.role === "ORGANIZER" ? organizerFilter : {}),
      active: true,
      status: "PUBLISHED",
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    }),
    Event.countDocuments({
      ...(scope.role === "ORGANIZER" ? organizerFilter : {}),
      active: true,
      status: "PUBLISHED",
      startsAt: { $gt: now },
    }),
    Event.countDocuments({
      ...(scope.role === "ORGANIZER" ? organizerFilter : {}),
      $or: [{ status: "COMPLETED" }, { endsAt: { $lt: now } }],
    }),
    Booking.aggregate([
      ...showLookup(scope),
      {
        $match: {
          ...bookingStatusMatch,
          createdAt: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
    ]),
    Booking.countDocuments({ status: "CANCELLED" }),
    scope.role === "ADMIN"
      ? Organizer.countDocuments({ verificationStatus: "PENDING" })
      : Promise.resolve(null),
    scope.role === "ADMIN"
      ? Refund.countDocuments({ status: "REQUESTED" })
      : Promise.resolve(null),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-W%U", date: "$createdAt" },
          },
          revenue: { $sum: "$pricing.total" },
          bookings: { $sum: 1 },
          tickets: { $sum: { $size: "$seats" } },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $lookup: {
          from: "venues",
          localField: "showRecord.venue",
          foreignField: "_id",
          as: "venue",
        },
      },
      { $unwind: { path: "$venue", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$venue.name",
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { bookings: -1, revenue: -1 } },
      { $limit: 10 },
    ]),
    Booking.aggregate([
      ...showLookup(scope),
      { $match: bookingStatusMatch },
      {
        $lookup: {
          from: "cinemas",
          localField: "showRecord.cinema",
          foreignField: "_id",
          as: "cinema",
        },
      },
      { $unwind: { path: "$cinema", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$cinema.name",
          bookings: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { bookings: -1, revenue: -1 } },
      { $limit: 10 },
    ]),
    scope.role === "ADMIN"
      ? Payment.find({})
          .populate({
            path: "booking",
            select: "user status",
            populate: { path: "user", select: "name email" },
          })
          .sort({ createdAt: -1 })
          .limit(8)
          .lean()
      : Promise.resolve([]),
    scope.role === "ADMIN"
      ? AuditLog.find({})
          .populate("actor", "name email")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean()
      : Promise.resolve([]),
  ]);

  const bookings = bookingKpi[0] ?? {};
  const payments = paymentKpi[0] ?? {};
  const refunds = refundKpi[0] ?? {};
  const value = {
    generatedAt: new Date().toISOString(),
    scope: { role: scope.role, organizerId: scope.organizerId ?? null },
    kpis: {
      totalRevenue: bookings.totalRevenue ?? 0,
      platformRevenue: bookings.platformRevenue ?? 0,
      organizerRevenue: bookings.organizerRevenue ?? 0,
      successfulPayments: payments.successfulPayments ?? 0,
      totalBookings: bookings.totalBookings ?? 0,
      ticketSales: bookings.ticketSales ?? 0,
      totalCustomers: scope.role === "ADMIN" ? customerCount : null,
      totalOrganizers: scope.role === "ADMIN" ? organizerCount : null,
      totalRegisteredUsers,
      allOrganizers: totalOrganizers,
      totalEvents,
      totalMovies,
      activeEvents: activeEventCount,
      upcomingEvents: upcomingEventCount,
      completedEvents: completedEventCount,
      todayBookings: todayKpi[0]?.bookings ?? 0,
      todayRevenue: todayKpi[0]?.revenue ?? 0,
      cancelledBookings: cancelledBookingCount,
      pendingOrganizers: pendingOrganizerCount,
      pendingRefunds: pendingRefundCount,
      pendingEvents: pendingEventCount,
      refundAmount: refunds.refundAmount ?? 0,
      refundCount: refunds.refundCount ?? 0,
      cancellationRate:
        bookingTrends.reduce(
          (sum, item) => sum + Number(item.cancelled ?? 0),
          0,
        ) /
        Math.max(
          bookingTrends.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
          1,
        ),
      conversionRate: payments.successfulPayments
        ? bookings.totalBookings / payments.successfulPayments
        : 0,
    },
    charts: {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      bookingTrends,
      popularEvents,
      popularMovies,
      popularCategories,
      popularCities,
      organizerPerformance,
      topVenues,
      topCinemas,
      recentTransactions,
      recentAdminActivity,
    },
  } satisfies Record<string, unknown>;
  analyticsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}
