import type { ContentCard } from "@/lib/catalog";

export type DateScope = "today" | "tomorrow" | "weekend" | "custom";
export type PriceBucket =
  "under-299" | "under-499" | "300-599" | "600-999" | "1000-plus";
export type AvailabilityFilter = "available" | "sold-out";

export type SearchFilters = {
  query?: string;
  city: string[];
  category: string[];
  eventType: string[];
  dateScope?: DateScope;
  startDate?: string;
  endDate?: string;
  language: string[];
  genre: string[];
  price: PriceBucket[];
  venue: string[];
  rating?: number;
  availability?: AvailabilityFilter;
  page: number;
  limit: number;
};

export type SearchResponse = {
  items: ContentCard[];
  total: number;
  page: number;
  limit: number;
  source: "database" | "mock";
};

export const emptySearchFilters = (): SearchFilters => ({
  city: [],
  category: [],
  eventType: [],
  language: [],
  genre: [],
  price: [],
  venue: [],
  page: 1,
  limit: 24,
});
