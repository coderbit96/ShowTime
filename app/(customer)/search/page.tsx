import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import {
  GlobalSearch,
  SearchFilters,
  SearchResultCard,
} from "@/components/search";
import {
  filtersToSearchParams,
  parseSearchParams,
  searchCatalog,
} from "@/lib/search";
import { pageMetadata } from "@/lib/seo/site";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const filters = parseSearchParams(toUrlSearchParams(await searchParams));
  const query = filters.query?.trim();
  return pageMetadata({
    title: query ? `Search results for ${query}` : "Movies and events",
    description: query
      ? `Search results for ${query} on Show Time.`
      : "Browse movies, events, and experiences in Kolkata on Show Time.",
    path: "/search",
    index: !query,
  });
}

function toUrlSearchParams(
  values: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value))
      value.forEach((entry) => params.append(key, entry));
    else if (value) params.set(key, value);
  });
  return params;
}

function pageHref(current: URLSearchParams, page: number) {
  const next = new URLSearchParams(current);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  return `/search${next.size ? `?${next}` : ""}`;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const filters = parseSearchParams(toUrlSearchParams(await searchParams));
  const response = await searchCatalog(filters);
  const currentParams = filtersToSearchParams(filters);
  const lastPage = Math.max(1, Math.ceil(response.total / response.limit));

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          <p className="text-sm font-semibold text-secondary">
            Find your next plan
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Search movies and events
          </h1>
          <div className="mt-6 max-w-3xl rounded-md border border-border bg-surface px-3 py-1 shadow-lg shadow-slate-900/10">
            <GlobalSearch
              key={filters.query ?? "empty"}
              initialQuery={filters.query}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <details className="mb-5 rounded-md border border-border bg-surface lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 text-sm font-semibold">
            Filters
          </summary>
          <div className="border-t border-border p-3">
            <SearchFilters />
          </div>
        </details>

        <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <SearchFilters />
          </div>
          <section aria-live="polite">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">
                  {filters.query
                    ? `Results for \"${filters.query}\"`
                    : "Browse all plans"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {response.total} {response.total === 1 ? "result" : "results"}
                </p>
              </div>
              {response.total ? (
                <p className="text-xs text-muted">
                  Page {response.page} of {lastPage}
                </p>
              ) : null}
            </div>

            {response.items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {response.items.map((item) => (
                  <SearchResultCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-border bg-surface p-6 text-center">
                <div>
                  <SearchX
                    className="mx-auto size-7 text-secondary"
                    aria-hidden="true"
                  />
                  <h2 className="mt-3 text-lg font-semibold">
                    No plans match these filters
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Try a broader date, venue, or category.
                  </p>
                  <Link
                    href="/search"
                    className="mt-4 inline-flex text-sm font-semibold text-secondary hover:text-foreground"
                  >
                    Clear filters
                  </Link>
                </div>
              </div>
            )}

            {lastPage > 1 ? (
              <nav
                className="mt-8 flex items-center justify-between border-t border-border pt-5"
                aria-label="Search result pages"
              >
                {response.page > 1 ? (
                  <Link
                    href={pageHref(currentParams, response.page - 1)}
                    className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
                  >
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                {response.page < lastPage ? (
                  <Link
                    href={pageHref(currentParams, response.page + 1)}
                    className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
                  >
                    Next
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
