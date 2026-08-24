# Show Time Working Process

This file is the day-to-day operating guide for the Show Time project.

Important: live secrets stay in `.env.local`, which is ignored by Git. Do not paste private keys, MongoDB passwords, Razorpay secrets, or Cloudinary secrets into committed docs.

## Project Root

```powershell
cd "D:\ShowTime"
```

## Install And Run

```powershell
npm install
npm run dev
```

Open:

- Customer site: `http://localhost:3000`
- Login: `http://localhost:3000/auth/login`
- Register: `http://localhost:3000/auth/register`
- Customer account: `http://localhost:3000/account`
- Organizer dashboard: `http://localhost:3000/organizer/dashboard`
- Admin dashboard: `http://localhost:3000/admin/dashboard`

## Local Credentials Source

All service credentials are read from `.env.local`.

Required keys:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=""

FIREBASE_ADMIN_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""

MONGODB_URI=""
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
TICKET_QR_SECRET=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

Current connected service names:

- Firebase project: `show-time-812cd`
- MongoDB: `MONGODB_URI` in `.env.local`
- Razorpay: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env.local`
- Cloudinary: `CLOUDINARY_CLOUD_NAME` / API credentials in `.env.local`
- QR signing: `TICKET_QR_SECRET` in `.env.local`

## Role-Based Demo Logins

Create or refresh all three demo users:

```powershell
npm run seed:demo-roles
```

Default demo credentials:

| Role      | Email                      | Password         | Access                                                                                   |
| --------- | -------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| Customer  | `customer@showtime.local`  | `ShowTime@12345` | Customer site, booking flow, account, wallet, rewards, referrals, tickets                |
| Organizer | `organizer@showtime.local` | `ShowTime@12345` | Organizer dashboard, events, shows, bookings, check-in, finance, marketing               |
| Admin     | `admin@coderbit.in`        | `123456`         | Admin dashboard, approvals, users, events, movies, venues, finance, settings, audit logs |

You can override these before running the seed command by setting:

```dotenv
DEMO_CUSTOMER_EMAIL=""
DEMO_CUSTOMER_PASSWORD=""
DEMO_CUSTOMER_NAME=""
DEMO_ORGANIZER_EMAIL=""
DEMO_ORGANIZER_PASSWORD=""
DEMO_ORGANIZER_NAME=""
DEMO_ORGANIZER_ORGANIZATION=""
DEMO_ADMIN_EMAIL=""
DEMO_ADMIN_PASSWORD=""
DEMO_ADMIN_NAME=""
```

Organizer demo users are seeded as `VERIFIED` with `canCreateVenues=true` so organizer write flows can be tested immediately.

## Role Rules

- Customer: can browse, search, book, lock seats, pay, view tickets, cancel eligible bookings, request refunds, use wallet/rewards/referrals/memberships/food ordering.
- Organizer: can use organizer dashboard only after approval/verification; can create venues only when `canCreateVenues=true`; can scan QR tickets for check-in.
- Admin: can approve/reject organizers and events, manage platform data, process refunds, configure settings, view analytics, and audit operational actions.

## Main Customer Flow

1. Search or browse from homepage.
2. Open an event or movie details page.
3. Select show/date/time.
4. Select seats.
5. Lock seats.
6. Review booking summary.
7. Apply coupon if available.
8. Create pending booking.
9. Create Razorpay order.
10. Verify payment server-side.
11. Confirm booking.
12. Generate QR ticket.
13. Check in ticket from organizer dashboard.

## Important Routes

Customer:

- `/`
- `/search`
- `/events/[slug]`
- `/movies/[slug]`
- `/booking`
- `/booking/summary`
- `/tickets/[ticketId]`
- `/account`
- `/groups`
- `/food`

Organizer:

- `/organizer/dashboard`
- `/organizer/events`
- `/organizer/events/new`
- `/organizer/shows`
- `/organizer/bookings`
- `/organizer/check-in`
- `/organizer/finance`
- `/organizer/marketing`
- `/organizer/analytics`
- `/organizer/profile`
- `/organizer/settings`

Admin:

- `/admin/dashboard`
- `/admin/users`
- `/admin/events`
- `/admin/shows`
- `/admin/bookings`
- `/admin/refunds`
- `/admin/marketing`
- `/admin/management`
- `/admin/reviews`
- `/admin/reports`
- `/admin/settings`
- `/admin/audit-logs`

## Health Checks

Run before committing or deploying:

```powershell
npx tsc --noEmit
npm run lint
npm run format:check
npm run test:launch-suite
npm run build
```

Useful API checks:

- `/api/health`
- `/api/search?q=movie`
- `/api/promotions/flash-sale`
- Protected APIs should return `401` without login, not `500`.

## Security Notes

- Never commit `.env.local`.
- Never trust frontend payment or seat state.
- Seat, booking, payment, ticket, and refund writes must remain server-authoritative.
- Payment success requires Razorpay signature/webhook verification.
- Seat locks use MongoDB atomic operations and TTL expiry.
- Idempotency keys are required for payment, booking, refund, and split-payment flows.
- Ticket confirmation is in-app only; there is no Resend/email delivery integration.

## Git Rules For This Project

- Do not auto commit.
- Check status with:

```powershell
git status --short
```

- Commit only when explicitly requested.
