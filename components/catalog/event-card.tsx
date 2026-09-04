import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Star } from "lucide-react";
import { CardHover } from "@/components/motion";
import type { ContentCard } from "@/lib/catalog";

type EventCardProps = {
  event: ContentCard;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <CardHover className="w-[276px] shrink-0 snap-start sm:w-[300px]">
      <Link
        href={`/events/${event.slug}`}
        className="premium-card group block overflow-hidden rounded-2xl"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
          <Image
            src={event.image}
            alt={event.title + " event"}
            fill
            sizes="(max-width: 640px) 276px, 300px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.045]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/8 to-transparent" />
          {event.badge ? (
            <span className="absolute left-3 top-3 rounded-full bg-gradient-accent px-2.5 py-1 text-[11px] font-bold text-cta-foreground shadow-[0_0_22px_rgba(168,85,247,0.34)]">
              {event.badge}
            </span>
          ) : null}
          <span className="premium-chip absolute bottom-3 right-3 px-2.5 py-1 text-[11px] font-medium text-foreground">
            {event.category}
          </span>
        </div>
        <div className="p-4">
          <h3 className="truncate text-base font-semibold group-hover:text-primary">
            {event.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {event.dateLabel} · {event.timeLabel}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {event.venue}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              from {"\u20b9"}
              {event.priceFrom}
            </span>
            {event.rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-secondary">
                <Star
                  className="size-3 fill-warning text-warning"
                  aria-hidden="true"
                />
                {event.rating}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </CardHover>
  );
}
