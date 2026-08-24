Stage A — Foundation
Set the architecture once, correctly, before any feature work begins.
STAGE A · PROMPT 0
Master Project Brief (paste first, save as AGENTS.md)

We are building a modern entertainment and ticket booking platform (a Next.js competitor to BookMyShow) with its own visual identity. Treat this as the permanent project brief — remember it for every task I give you afterwards, and save it verbatim as AGENTS.md at the project root.

Product scope
•  The platform sells tickets/entries for: movies, concerts, stand-up comedy, theatre, sports events, workshops, festivals, gaming events, exhibitions, kids events, local events, college events, adventure activities, and special experiences.
•  There are exactly three roles: Customer, Organizer, Admin. Design the data model and auth system around these three roles from day one.

Fixed technology stack — do not substitute any of these
•  Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion for animation + React Hook Form + Zod for form validation.
•  State management: Zustand for client-side/global UI state.
•  Auth: Firebase Authentication — email/password and Google login.
•  Backend: Next.js Route Handlers for APIs, Next.js Server Actions where appropriate, REST-style API routes for complex transactional flows (booking, payment, seat locking).
•  Database: MongoDB Atlas via Mongoose.
•  Payments: Razorpay.
•  Media/image storage: Cloudinary.
•  Deployment target: Vercel (app) + MongoDB Atlas (data) + Firebase (auth).

Non-negotiable engineering principles
•  The backend is always the source of truth for seat state, payment state, and booking state. Never trust a frontend claim that a payment succeeded.
•  Every write that touches seat availability, payment status, or booking status must be safe under concurrent requests (atomic Mongo operations / unique indexes / transactions) — this system must never allow the same seat to be double-booked.
•  Use idempotency keys for anything that creates a payment, a booking, or a refund, so retried requests can't create duplicates.

What I want from you right now
1\. Propose a Next.js project folder structure (App Router) that cleanly separates: public customer site, organizer dashboard, admin dashboard, shared API route handlers, Mongoose models, and shared UI/lib code.
2\. Set up the base tooling: Next.js + TypeScript + Tailwind + ESLint + Prettier, Zustand, React Hook Form + Zod, Framer Motion — install and configure but don't build features yet.
3\. Create the AGENTS.md file capturing everything above so it persists across our future sessions.
4\. Confirm the app boots with \`npm run dev\` before we continue.

STAGE A · PROMPT 1
Database Schema — Mongoose Models
Codifies every collection from the plan as a typed Mongoose schema, with the relationships and constraints the booking engine depends on.
Using the stack and principles from AGENTS.md, define Mongoose schemas + TypeScript types for these collections. Put each in its own file under models/, and export a compiled model plus a TS interface for each.

Collections to create
•  users, organizers, events, movies, venues, cinemas, screens, shows, seatLayouts, seatLocks, bookings, payments, tickets, coupons, favorites, reviews, notifications, refunds, payouts, categories, cities, banners, auditLogs, settings

Key relationships and required fields
•  events reference: category, city, venue, organizer, and (for movies specifically) reuse the movie module below.
•  movies fields: title, poster, banner, description, language, genre, cast, crew, trailer, duration, certificate, releaseDate, rating.
•  Booking hierarchy: Movie/Event → Cinema/Venue → Screen → Show → Seat → Booking. Model shows so each show references a movie/event ID, a venue/cinema ID, a screen ID, start time, end time, date, pricing, seat availability, and booking status.
•  seatLayouts: rows, seat categories (Regular, Premium, Recliner, VIP), per-seat identifiers (e.g. A1, A2).
•  seatLocks: seat id(s), show id, user id, lock expiry timestamp (5 minute TTL) — MUST use a MongoDB TTL index so expired locks self-clean.
•  bookings: user, show, seats, seat categories, pricing breakdown (base price, convenience fee, tax, discount, coupon, total), status enum PENDING/CONFIRMED/CANCELLED/EXPIRED/REFUND\_PENDING/REFUNDED, idempotency key (unique, indexed).
•  payments: booking reference, gateway order id, gateway payment id, signature, status enum CREATED/PENDING/SUCCESS/FAILED/REFUNDED, idempotency key (unique, indexed).
•  tickets: booking id, ticket id, customer name, event/movie name, venue, date, time, seat numbers, ticket category, total payment, booking status, QR payload, checked-in flag/timestamp.
•  coupons: code, discount type (fixed/percentage), minimum cart amount, maximum discount, start/expiry date, usage limit, per-user limit, applicable events/categories, active flag.
•  refunds: booking reference, requested amount, approved amount, status, cancellation policy applied, admin approver.

MUST
•  Add a compound unique index preventing two active (non-expired, non-cancelled) locks or bookings on the same seat + show.
•  Add indexes needed for the search/filter and dashboard queries you'll build in later prompts (city, category, date, organizer, status).

Show me the full model list and the indexes you created before moving on.
