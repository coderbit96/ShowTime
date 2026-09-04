import Image from "next/image";
import { MapPin } from "lucide-react";
import { CardHover } from "@/components/motion";
import type { VenueCard as VenueCardType } from "@/lib/catalog";

type VenueCardProps = {
  venue: VenueCardType;
};

export function VenueCard({ venue }: VenueCardProps) {
  return (
    <CardHover className="w-[252px] shrink-0 snap-start sm:w-[276px]">
      <article className="premium-card group overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted">
          <Image
            src={venue.image}
            alt={venue.name + ", " + venue.city}
            fill
            sizes="(max-width: 640px) 252px, 276px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.045]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/68 via-transparent to-transparent" />
        </div>
        <div className="p-3.5">
          <h3 className="truncate text-base font-semibold group-hover:text-primary">
            {venue.name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {venue.neighborhood}, {venue.city}
          </p>
          <p className="mt-3 text-xs font-semibold text-secondary">
            {venue.eventCount} upcoming events
          </p>
        </div>
      </article>
    </CardHover>
  );
}
