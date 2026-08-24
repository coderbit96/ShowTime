import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Event, Organizer, Payment, Refund, User } from "@/models";

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

  const [
    bookingKpi,
    paymentKpi,
    customerCount,
    organizerCount,
    eventCount,
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
        ? { active: true }
        : { ...organizerFilter, active: true },
    ),
    Event.countDocuments(
      scope.role === "ADMIN"
        ? { approvalStatus: "PENDING", active: true }
        : { ...organizerFilter, approvalStatus: "PENDING", active: true },
    ),
    Refund.aggregate([
      ...bookingShowLookup(scope),
      { $match: { status: { $in: ["SUCCESS", "PROCESSING"] } } },
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
      activeEvents: eventCount,
      totalCustomers: scope.role === "ADMIN" ? customerCount : null,
      totalOrganizers: scope.role === "ADMIN" ? organizerCount : null,
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
      monthlyRevenue,
      bookingTrends,
      popularEvents,
      popularMovies,
      popularCategories,
      popularCities,
      organizerPerformance,
    },
  } satisfies Record<string, unknown>;
  analyticsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}
