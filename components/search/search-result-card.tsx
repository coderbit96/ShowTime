import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Star } from "lucide-react";
import type { ContentCard } from "@/lib/catalog";

export function SearchResultCard({ item }: { item: ContentCard }) {
  return (
    <Link
      href={
        item.category === "Movie"
          ? `/movies/${item.slug}`
          : `/events/${item.slug}`
      }
      className="premium-card group overflow-hidden rounded-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.045]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/72 via-transparent to-transparent" />
        <span className="premium-chip absolute bottom-3 left-3 px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
          {item.category}
        </span>
      </div>
      <div className="p-4">
        <h2 className="truncate text-base font-semibold text-foreground group-hover:text-secondary">
          {item.title}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          {item.dateLabel} - {item.timeLabel}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {item.venue}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-foreground">
            from {"\u20b9"}
            {item.priceFrom}
          </span>
          {item.rating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-secondary">
              <Star
                className="size-3.5 fill-warning text-warning"
                aria-hidden="true"
              />
              {item.rating}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
