import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  Film,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";
import { CardHover, ScrollReveal } from "@/components/motion";
import { ShowtimePicker } from "@/components/movies";
import { getMovieDetail } from "@/lib/catalog";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  movieJsonLd,
  serializeJsonLd,
} from "@/lib/seo/site";

type MoviePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieDetail(slug);
  if (!movie) return { title: "Movie not found | Show Time" };

  return {
    title: `${movie.title} | Show Time`,
    description: movie.description.slice(0, 155),
    alternates: {
      canonical: absoluteUrl(`/movies/${movie.slug}`),
    },
    openGraph: {
      title: movie.title,
      description: movie.description.slice(0, 155),
      url: absoluteUrl(`/movies/${movie.slug}`),
      type: "video.movie",
      images: [{ url: movie.banner, alt: movie.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: movie.title,
      description: movie.description.slice(0, 155),
      images: [movie.banner],
    },
  };
}

function Credits({
  title,
  people,
}: {
  title: string;
  people: Array<{ name: string; role: string; image?: string }>;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {people.map((person) => (
          <CardHover key={`${person.name}-${person.role}`}>
            <article className="flex min-h-24 items-center gap-3 rounded-md border border-border bg-surface p-3.5">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground">
                {person.image ? (
                  <Image
                    src={person.image}
                    alt={person.name}
                    width={44}
                    height={44}
                    className="size-11 object-cover"
                  />
                ) : (
                  person.name.slice(0, 1)
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">
                  {person.name}
                </h3>
                <p className="mt-1 truncate text-xs text-muted">
                  {person.role}
                </p>
              </div>
            </article>
          </CardHover>
        ))}
      </div>
    </section>
  );
}

export default async function MovieDetailPage({ params }: MoviePageProps) {
  const { slug } = await params;
  const movie = await getMovieDetail(slug);
  if (!movie) notFound();
  const startingPrice = movie.showtimes.length
    ? Math.min(...movie.showtimes.map((show) => show.priceFrom))
    : 0;
  const structuredData = [
    movieJsonLd(movie),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteUrl("/") },
      { name: "Movies", url: absoluteUrl("/search?category=movies") },
      { name: movie.title, url: absoluteUrl(`/movies/${movie.slug}`) },
    ]),
  ];

  return (
    <main className="bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="relative isolate overflow-hidden border-b border-border">
        <Image
          src={movie.banner}
          alt={`${movie.title} movie scene`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-background via-background/62 to-transparent" />
        <div className="relative mx-auto grid min-h-[510px] max-w-7xl gap-7 px-5 pb-12 pt-12 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-end md:pt-28 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="relative hidden aspect-[2/3] overflow-hidden rounded-md border border-primary-foreground/15 bg-surface shadow-2xl shadow-black/40 md:block">
            <Image
              src={movie.poster}
              alt={`${movie.title} poster`}
              fill
              sizes="260px"
              className="object-cover"
            />
          </div>
          <div className="max-w-3xl md:pb-2">
            <p className="inline-flex rounded-sm border border-secondary/50 bg-background/60 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-secondary backdrop-blur">
              Now showing
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              {movie.title}
            </h1>
            <p className="mt-4 text-sm font-medium text-foreground/78">
              {movie.genre.join(" / ")}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/80">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4 text-secondary" aria-hidden="true" />
                {movie.duration}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Film className="size-4 text-secondary" aria-hidden="true" />
                {movie.language.join(", ")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="size-4 text-secondary"
                  aria-hidden="true"
                />
                {movie.certificate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star
                  className="size-4 fill-warning text-warning"
                  aria-hidden="true"
                />
                {movie.rating}/10
              </span>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="#showtimes"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-cta px-5 text-sm font-semibold text-cta-foreground shadow-[0_0_28px_rgba(124,58,237,0.42)] transition-colors hover:bg-cta-hover"
              >
                <Play className="size-4 fill-current" aria-hidden="true" />
                Select Showtime
              </Link>
              <p className="text-sm text-foreground/78">
                In cinemas from {"\u20b9"}
                {startingPrice}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-14">
        <div className="grid gap-10">
          <ScrollReveal>
            <section>
              <h2 className="text-2xl font-semibold">About the movie</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted">
                {movie.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {movie.genre.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </section>
          </ScrollReveal>
          <ScrollReveal>
            <section>
              <h2 className="text-2xl font-semibold">Movie details</h2>
              <div className="mt-5 grid gap-5 rounded-md border border-border bg-surface p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    Release date
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                    <CalendarDays
                      className="size-4 text-secondary"
                      aria-hidden="true"
                    />
                    {movie.releaseDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    Certificate
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {movie.certificate}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    Language
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {movie.language.join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    Duration
                  </p>
                  <p className="mt-1 text-sm font-medium">{movie.duration}</p>
                </div>
              </div>
            </section>
          </ScrollReveal>
          {movie.trailer ? (
            <ScrollReveal>
              <section>
                <h2 className="text-2xl font-semibold">Trailer</h2>
                <div className="mt-5 aspect-video overflow-hidden rounded-md border border-border bg-surface">
                  <iframe
                    title={`${movie.title} trailer`}
                    src={movie.trailer}
                    className="size-full border-0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            </ScrollReveal>
          ) : null}
          <ScrollReveal>
            <Credits title="Cast" people={movie.cast} />
          </ScrollReveal>
          <ScrollReveal>
            <Credits title="Crew" people={movie.crew} />
          </ScrollReveal>
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ShowtimePicker
            showtimes={movie.showtimes}
            cinemaChoices={movie.cinemaChoices}
          />
        </aside>
      </div>
    </main>
  );
}
