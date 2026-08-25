import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  BadgeInfo,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Star,
  Ticket,
} from "lucide-react";
import { CardHover, ScrollReveal } from "@/components/motion";
import { getEventDetail } from "@/lib/catalog";
import { absoluteUrl, breadcrumbJsonLd, eventJsonLd } from "@/lib/seo/site";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventDetail(slug);
  if (!event) return { title: "Event not found | Show Time" };

  return {
    title: `${event.title} | Show Time`,
    description: event.description.slice(0, 155),
    alternates: {
      canonical: absoluteUrl(`/events/${event.slug}`),
    },
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 155),
      url: absoluteUrl(`/events/${event.slug}`),
      type: "website",
      images: [{ url: event.banner, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.description.slice(0, 155),
      images: [event.banner],
    },
  };
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-secondary">{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventDetail(slug);
  if (!event) notFound();

  const mapQuery = encodeURIComponent(
    `${event.venue.name}, ${event.venue.address}`,
  );
  const bookingHref = event.showId
    ? `/booking?showId=${encodeURIComponent(event.showId)}`
    : null;
  const structuredData = [
    eventJsonLd(event),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteUrl("/") },
      { name: "Events", url: absoluteUrl("/search?category=events") },
      { name: event.title, url: absoluteUrl(`/events/${event.slug}`) },
    ]),
  ];

  return (
    <main className="bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative isolate overflow-hidden border-b border-border">
        <Image
          src={event.banner}
          alt={`${event.title} venue atmosphere`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-background/78" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-background via-background/55 to-transparent" />

        <div className="relative mx-auto grid min-h-[500px] max-w-7xl gap-7 px-5 pb-12 pt-12 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-end md:pt-28 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="relative hidden aspect-[2/3] overflow-hidden rounded-md border border-primary-foreground/15 bg-surface shadow-2xl shadow-black/40 md:block">
            <Image
              src={event.poster}
              alt={`${event.title} poster`}
              fill
              sizes="260px"
              className="object-cover"
            />
          </div>
          <div className="max-w-3xl md:pb-2">
            <p className="inline-flex rounded-sm border border-secondary/50 bg-background/60 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-secondary backdrop-blur">
              {event.category}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              {event.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays
                  className="size-4 text-secondary"
                  aria-hidden="true"
                />
                {event.dateLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4 text-secondary" aria-hidden="true" />
                {event.timeLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-secondary" aria-hidden="true" />
                {event.venue.name}
              </span>
              {event.rating ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star
                    className="size-4 fill-warning text-warning"
                    aria-hidden="true"
                  />
                  {event.rating}/5
                </span>
              ) : null}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {bookingHref ? (
                <Link
                  href={bookingHref}
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[0_0_28px_rgba(244,63,94,0.42)] transition-colors hover:bg-warning"
                >
                  <Ticket className="size-4" aria-hidden="true" />
                  Book Tickets
                </Link>
              ) : (
                <span className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-surface-muted px-5 text-sm font-semibold text-muted">
                  <Ticket className="size-4" aria-hidden="true" />
                  Showtimes coming soon
                </span>
              )}
              <p className="text-sm font-medium text-primary-foreground/82">
                Tickets from {"\u20b9"}
                {event.priceFrom}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-14">
        <div className="grid gap-10">
          <ScrollReveal>
            <section>
              <h2 className="text-2xl font-semibold">About the event</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted">
                {event.description}
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section>
              <h2 className="text-2xl font-semibold">Event details</h2>
              <div className="mt-5 grid gap-5 rounded-md border border-border bg-surface p-5 sm:grid-cols-2">
                <DetailItem
                  icon={<Clock3 className="size-5" aria-hidden="true" />}
                  label="Duration"
                  value={event.duration}
                />
                <DetailItem
                  icon={<BadgeInfo className="size-5" aria-hidden="true" />}
                  label="Language"
                  value={event.language.join(", ")}
                />
                <DetailItem
                  icon={<ShieldCheck className="size-5" aria-hidden="true" />}
                  label="Age restriction"
                  value={event.ageRestriction}
                />
                <DetailItem
                  icon={<Ticket className="size-5" aria-hidden="true" />}
                  label="Entry"
                  value={`From \u20b9${event.priceFrom}`}
                />
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section>
              <h2 className="text-2xl font-semibold">Artists and guests</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {event.artists.map((artist) => (
                  <CardHover key={`${artist.name}-${artist.role}`}>
                    <article className="flex min-h-24 items-center gap-3 rounded-md border border-border bg-surface p-3.5">
                      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground">
                        {artist.image ? (
                          <Image
                            src={artist.image}
                            alt={artist.name}
                            width={44}
                            height={44}
                            className="size-11 object-cover"
                          />
                        ) : (
                          artist.name.slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {artist.name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-muted">
                          {artist.role}
                        </p>
                      </div>
                    </article>
                  </CardHover>
                ))}
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section>
              <h2 className="text-2xl font-semibold">Venue</h2>
              <div className="mt-5 overflow-hidden rounded-md border border-border bg-surface">
                <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <h3 className="font-semibold">{event.venue.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {event.venue.address}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-secondary">
                    <MapPin className="size-4" aria-hidden="true" />
                    {event.venue.city}
                  </span>
                </div>
                <iframe
                  title={`Map for ${event.venue.name}`}
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                  className="block h-72 w-full border-0 bg-surface-muted"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </section>
          </ScrollReveal>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CardHover>
            <section className="rounded-md border border-border bg-surface p-5 shadow-xl shadow-black/15">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                Hosted by
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid size-12 place-items-center overflow-hidden rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  {event.organizer.logo ? (
                    <Image
                      src={event.organizer.logo}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 object-cover"
                    />
                  ) : (
                    event.organizer.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {event.organizer.name}
                  </h2>
                  <p className="text-xs text-muted">Verified organizer</p>
                </div>
              </div>
              {event.organizer.description ? (
                <p className="mt-4 text-sm leading-6 text-muted">
                  {event.organizer.description}
                </p>
              ) : null}
              <div className="mt-5 border-t border-border pt-5">
                {bookingHref ? (
                  <Link
                    href={bookingHref}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-warning"
                  >
                    <Ticket className="size-4" aria-hidden="true" />
                    Book Tickets
                  </Link>
                ) : (
                  <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-muted px-4 text-sm font-semibold text-muted">
                    <Ticket className="size-4" aria-hidden="true" />
                    Showtimes coming soon
                  </span>
                )}
              </div>
            </section>
          </CardHover>
        </aside>
      </div>

      {bookingHref ? (
        <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
          <Link
            href={bookingHref}
            className="mx-auto flex h-11 max-w-7xl items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            <Ticket className="size-4" aria-hidden="true" />
            Book Tickets from {"\u20b9"}
            {event.priceFrom}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
