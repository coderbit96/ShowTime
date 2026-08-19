# Mongoose Model Inventory

Collections: users, organizers, events, movies, venues, cinemas, screens, shows, seatLayouts, seatLocks, bookings, payments, tickets, coupons, favorites, reviews, notifications, refunds, payouts, categories, cities, banners, auditLogs, settings.

Critical concurrency indexes:

- `seatLocks`: TTL `{ expiresAt: 1 }` with `expireAfterSeconds: 0`.
- `seatLocks`: unique active seat lock `{ show: 1, seatIds: 1 }` with `partialFilterExpression: { status: "ACTIVE" }`.
- `bookings`: unique active booking seat claim `{ show: 1, "seats.seatId": 1 }` with active statuses `PENDING`, `CONFIRMED`, `REFUND_PENDING`.
- `bookings`, `payments`, `seatLocks`, `refunds`: unique `idempotencyKey` indexes.

Search and dashboard indexes:

- City/category/date/status: `events`, `shows`, `banners`.
- Organizer/status/date: `events`, `shows`, `payouts`.
- User history: `bookings`, `favorites`, `notifications`, `reviews`.
- Payment/refund operations: `payments`, `refunds`.
- Location lookup: `cities`, `venues`, `cinemas` use `2dsphere` indexes.
