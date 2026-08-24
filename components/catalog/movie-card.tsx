import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { CardHover } from "@/components/motion";
import type { ContentCard } from "@/lib/catalog";

type MovieCardProps = {
  movie: ContentCard;
};

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <CardHover className="w-[168px] shrink-0 snap-start sm:w-[190px]">
      <Link
        href={`/movies/${movie.slug}`}
        className="premium-card group block overflow-hidden rounded-md"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-surface-muted">
          <Image
            src={movie.image}
            alt={movie.title + " poster"}
            fill
            sizes="(max-width: 640px) 168px, 190px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.045]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/72 via-transparent to-transparent opacity-75" />
          {movie.badge ? (
            <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              {movie.badge}
            </span>
          ) : null}
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold group-hover:text-secondary">
            {movie.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted">
            {movie.genre ?? movie.category}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            {movie.rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-secondary">
                <Star
                  className="size-3 fill-warning text-warning"
                  aria-hidden="true"
                />
                {movie.rating}
              </span>
            ) : null}
            <span className="truncate text-muted">
              from {"\u20b9"}
              {movie.priceFrom}
            </span>
          </div>
        </div>
      </Link>
    </CardHover>
  );
}
