"use client";

import { Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { ContentCard } from "@/lib/catalog";
import type { SearchResponse } from "@/lib/search";

type GlobalSearchProps = {
  initialQuery?: string;
  className?: string;
  showCity?: boolean;
};

export function GlobalSearch({
  initialQuery = "",
  className = "",
  showCity = false,
}: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ContentCard[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      return;
    }

    const currentRequest = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: normalized, limit: "6" });
        const response = await fetch(`/api/search?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search request failed");
        const data = (await response.json()) as SearchResponse;
        if (requestId.current === currentRequest) setResults(data.items);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const goToResults = () => {
    const normalized = query.trim();
    router.push(
      normalized ? `/search?q=${encodeURIComponent(normalized)}` : "/search",
    );
    setOpen(false);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToResults();
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={submitSearch} className="flex items-center gap-3">
        <Search className="size-5 shrink-0 text-secondary" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search movies, artists, events, venues..."
          className="global-search-input h-11 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted focus:outline-none focus-visible:outline-none"
          aria-label="Search movies, artists, events, and venues"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        {showCity ? (
          <span className="premium-chip hidden px-2.5 py-1 text-xs font-medium text-muted sm:inline-flex">
            Kolkata
          </span>
        ) : null}
      </form>

      {open && query.trim() ? (
        <div
          id="global-search-results"
          className="premium-panel absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 overflow-hidden rounded-md"
        >
          <div className="border-b border-border px-3 py-2 text-xs text-muted">
            {loading ? "Finding plans..." : "Search results"}
          </div>
          {!loading && results.length === 0 ? (
            <p className="px-3 py-5 text-sm text-muted">
              No matching plans yet.
            </p>
          ) : null}
          {results.map((item) => (
            <button
              type="button"
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery(item.title);
                router.push(`/search?q=${encodeURIComponent(item.title)}`);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-surface-muted"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-muted">
                  {item.category} - {item.venue}
                </span>
              </span>
              <Sparkles
                className="size-4 shrink-0 text-accent"
                aria-hidden="true"
              />
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={goToResults}
            className="flex w-full items-center justify-between border-t border-border px-3 py-3 text-sm font-semibold text-secondary hover:bg-surface-muted"
          >
            View all results
            <Search className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
