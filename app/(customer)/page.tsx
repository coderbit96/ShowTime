import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import {
  BrowseSection,
  CategoryExplorer,
  ContentRail,
  EventCard,
  FlashSaleBanner,
  MovieCard,
  VenueCard,
} from "@/components/catalog";
import { Magnetic, ScrollReveal } from "@/components/motion";
import { NewsletterForm } from "@/components/site";
import { getHomepageCatalog, type ContentCard } from "@/lib/catalog";
import { getActiveFlashSale } from "@/lib/promotions/flash-sale";

function MixedCards({ items }: { items: ContentCard[] }) {
  return (
    <>
      {items.map((item) =>
        item.category === "Movie" ? (
          <MovieCard key={item.id} movie={item} variant="landscape" />
        ) : (
          <EventCard key={item.id} event={item} />
        ),
      )}
    </>
  );
}

function citySearchHref(city: string, filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ city, ...filters });
  return `/search?${params.toString()}`;
}

export default async function CustomerHomePage() {
  const cityId = (await cookies()).get("show-time-city")?.value;
  const [catalog, flashSale] = await Promise.all([
    getHomepageCatalog({ cityId }),
    getActiveFlashSale(),
  ]);

  return (
    <main className="overflow-hidden bg-background text-foreground">
      <section className="relative isolate min-h-[560px] overflow-hidden bg-background text-foreground">
        <Image
          src={catalog.hero.image}
          alt={`Entertainment plans in ${catalog.city}`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,249,252,0.97),rgba(247,249,252,0.88)_46%,rgba(247,249,252,0.4))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(247,249,252,0.9))]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(124,58,237,0.14),transparent)]" />

        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col px-5 py-12 sm:px-6 sm:py-16 lg:justify-center">
          <div className="max-w-2xl">
            <div className="premium-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/88">
              <MapPin className="size-3.5 text-secondary" aria-hidden="true" />
              Around you in {catalog.city}
            </div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {catalog.city} is happening
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl min-[900px]:max-w-none min-[900px]:whitespace-nowrap min-[900px]:text-[clamp(2.75rem,4.6vw,4rem)]">
              Make tonight worth talking about.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-foreground/78 sm:text-lg">
              Discover movies, concerts, sports and experiences near you.
            </p>
            <div className="premium-panel mt-7 max-w-xl rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                  Up next
                </p>
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
                  Live soon
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {catalog.hero.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-foreground/76">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays
                    className="size-4 text-secondary"
                    aria-hidden="true"
                  />
                  {catalog.hero.dateLabel} {"\u00b7"} {catalog.hero.timeLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin
                    className="size-4 text-secondary"
                    aria-hidden="true"
                  />
                  {catalog.hero.venue}
                </span>
                {catalog.hero.rating ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Star
                      className="size-4 fill-warning text-warning"
                      aria-hidden="true"
                    />
                    {catalog.hero.rating}/5
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  href="#live-events"
                  className="premium-button h-11 gap-2 px-5 text-sm font-semibold"
                >
                  Book Now
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Magnetic>
              <Magnetic strength={0.09}>
                <Link
                  href="#trending"
                  className="premium-button-secondary h-11 gap-2 px-5 text-sm font-semibold"
                >
                  View all events
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>

      <CategoryExplorer />

      <div className="mt-10">
        <FlashSaleBanner flashSale={flashSale} />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <ScrollReveal>
          <BrowseSection
            id="trending"
            title="Trending Near You"
            href={citySearchHref(catalog.city)}
            description={
              "Plans people in " + catalog.city + " are saving right now."
            }
          >
            <ContentRail>
              <MixedCards items={catalog.trending} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>

        <ScrollReveal>
          <BrowseSection
            id="recommended-movies"
            title="Recommended Movies"
            href={citySearchHref(catalog.city, { eventType: "MOVIE" })}
            description="Big-screen stories, thoughtfully picked."
          >
            <ContentRail>
              {catalog.recommendedMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>

        <ScrollReveal>
          <BrowseSection
            id="live-events"
            title="Live Events"
            href={citySearchHref(catalog.city, { category: "Live Event" })}
            description="Workshops, city drops, and things to do this week."
          >
            <ContentRail>
              <MixedCards items={catalog.liveEvents} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>

        <ScrollReveal>
          <BrowseSection
            id="concerts"
            title="Concerts"
            href={citySearchHref(catalog.city, { eventType: "CONCERT" })}
            description="Volume up, phone down."
          >
            <ContentRail>
              <MixedCards items={catalog.concerts} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>

        <ScrollReveal>
          <BrowseSection
            id="comedy"
            title="Comedy Shows"
            href={citySearchHref(catalog.city, { eventType: "COMEDY" })}
            description="A very good reason to leave the group chat."
          >
            <ContentRail>
              <MixedCards items={catalog.comedy} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>

        <ScrollReveal>
          <BrowseSection
            id="sports"
            title="Sports"
            href={citySearchHref(catalog.city, { eventType: "SPORT" })}
            description="Feel the crowd, not just the score."
          >
            <ContentRail>
              <MixedCards items={catalog.sports} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>
      </div>

      <section className="border-y border-border bg-[linear-gradient(180deg,rgba(238,243,248,0.96),rgba(255,255,255,0.9))]">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <ScrollReveal>
            <BrowseSection
              id="weekend-experiences"
              title="Weekend Experiences"
              href={citySearchHref(catalog.city, { date: "weekend" })}
              description="Trade another scroll for a story you can actually tell."
            >
              <ContentRail>
                <MixedCards items={catalog.weekendExperiences} />
              </ContentRail>
            </BrowseSection>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <ScrollReveal>
          <BrowseSection
            id="under-499"
            title={"Events Under " + "\u20b9" + "499"}
            href={citySearchHref(catalog.city, { price: "under-499" })}
            description="Low lift, high return."
          >
            <ContentRail>
              <MixedCards items={catalog.under499} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>

        <ScrollReveal>
          <BrowseSection
            id="popular-venues"
            title="Popular Venues"
            href={citySearchHref(catalog.city)}
            description="A few places worth knowing."
          >
            <ContentRail>
              {catalog.popularVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>
      </div>

      <section className="border-y border-border bg-[linear-gradient(135deg,rgba(237,233,254,0.9),rgba(255,255,255,0.98)_52%,rgba(207,250,254,0.7))] text-foreground">
        <div className="mx-auto max-w-7xl px-5 py-11 sm:px-6 sm:py-14">
          <ScrollReveal>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Picked for you
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Personalized Recommendations
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-foreground/72">
                A practical mix of the things you usually browse and the ones
                that might surprise you.
              </p>
            </div>
            <ContentRail>
              <MixedCards items={catalog.personalized} />
            </ContentRail>
          </ScrollReveal>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-border bg-[radial-gradient(circle_at_12%_10%,rgba(124,58,237,0.16),transparent_32%),radial-gradient(circle_at_88%_88%,rgba(6,182,212,0.13),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,243,248,0.98))]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/80 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-9 px-5 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.82fr)] lg:items-center lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-secondary/35 bg-secondary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-secondary">
              <Compass className="size-3.5" aria-hidden="true" />
              Your city, better planned
            </p>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Get the good plans before the group chat starts asking.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              A thoughtful weekly guide to new releases, local favourites, and
              the kind of plans worth saving.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-foreground/85 sm:grid-cols-2">
              {[
                "Weekly picks matched to your city",
                "Early access to standout events",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2">
                  <CheckCircle2
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-surface/90 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.12),0_0_34px_rgba(124,58,237,0.1)] backdrop-blur-md sm:p-6">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
