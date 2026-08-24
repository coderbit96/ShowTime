import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import {
  BrowseSection,
  ContentRail,
  EventCard,
  FlashSaleBanner,
  HomepageSearch,
  MovieCard,
  VenueCard,
} from "@/components/catalog";
import { ScrollReveal } from "@/components/motion";
import { NewsletterForm } from "@/components/site";
import { getHomepageCatalog, type ContentCard } from "@/lib/catalog";
import { getActiveFlashSale } from "@/lib/promotions/flash-sale";

function MixedCards({ items }: { items: ContentCard[] }) {
  return (
    <>
      {items.map((item) =>
        item.category === "Movie" ? (
          <MovieCard key={item.id} movie={item} />
        ) : (
          <EventCard key={item.id} event={item} />
        ),
      )}
    </>
  );
}

export default async function CustomerHomePage() {
  const [catalog, flashSale] = await Promise.all([
    getHomepageCatalog(),
    getActiveFlashSale(),
  ]);

  return (
    <main className="overflow-hidden bg-background text-foreground">
      <section className="relative isolate min-h-[620px] overflow-hidden bg-background text-primary-foreground">
        <Image
          src="/images/midnight-festival-hero.png"
          alt="Guests arriving at an open-air cultural festival in Mumbai"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,20,0.94),rgba(11,11,20,0.72)_44%,rgba(11,11,20,0.42))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(11,11,20,0.92))]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(124,58,237,0.28),transparent)]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col px-5 pb-24 pt-12 sm:px-6 sm:pt-16 lg:justify-center lg:pb-28">
          <div className="max-w-2xl">
            <div className="premium-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-foreground/88">
              <MapPin className="size-3.5 text-secondary" aria-hidden="true" />
              Around you in {catalog.city}
            </div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
              Trending now
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">
              Feel the Stage. Live the Moment.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/78 sm:text-lg">
              Discover movies, concerts, sports and experiences near you.
            </p>
            <div className="premium-panel mt-7 max-w-xl rounded-md p-4">
              <p className="text-lg font-semibold text-primary-foreground">
                {catalog.hero.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-primary-foreground/76">
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
              <Link
                href="#live-events"
                className="premium-button h-11 gap-2 px-5 text-sm font-semibold"
              >
                Book Now
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#trending"
                className="premium-button-secondary h-11 gap-2 px-5 text-sm font-semibold"
              >
                View all events
              </Link>
            </div>
          </div>

          <div className="premium-panel mt-auto hidden max-w-2xl rounded-md p-4 text-sm text-primary-foreground/78 lg:block">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-semibold text-secondary">12+</p>
                <p className="mt-1 text-xs text-muted">categories</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-accent">5 min</p>
                <p className="mt-1 text-xs text-muted">safe seat locks</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-warning">QR</p>
                <p className="mt-1 text-xs text-muted">verified tickets</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-7xl px-5 sm:px-6">
        <HomepageSearch />
      </div>

      <div className="mt-8">
        <FlashSaleBanner flashSale={flashSale} />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <ScrollReveal>
          <BrowseSection
            id="trending"
            title="Trending Near You"
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
            description="Feel the crowd, not just the score."
          >
            <ContentRail>
              <MixedCards items={catalog.sports} />
            </ContentRail>
          </BrowseSection>
        </ScrollReveal>
      </div>

      <section className="border-y border-white/10 bg-[linear-gradient(180deg,rgba(32,32,51,0.9),rgba(21,21,34,0.72))]">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <ScrollReveal>
            <BrowseSection
              id="weekend-experiences"
              title="Weekend Experiences"
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

      <section className="border-y border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.82),rgba(21,21,34,0.96)_52%,rgba(6,182,212,0.24))] text-primary-foreground">
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
              <p className="max-w-sm text-sm leading-6 text-primary-foreground/72">
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

      <section className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(21,21,34,0.72),rgba(11,11,20,0.96))]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-berry">
              <Compass className="size-4" aria-hidden="true" />A better city
              calendar
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight">
              Get the good plans before the group asks what&apos;s happening.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              One considered note a week. New shows, easy wins, and the odd
              excellent detour.
            </p>
          </div>
          <div className="premium-panel rounded-md p-5">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
