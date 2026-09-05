"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  BookOpen,
  Castle,
  Check,
  ChevronDown,
  Crown,
  Flower2,
  Gem,
  GraduationCap,
  Landmark,
  LocateFixed,
  MapPin,
  Mountain,
  Search,
  Ship,
  TramFront,
  Trees,
  Utensils,
  Waves,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

type City = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
};

type PopularCity = City & Required<Pick<City, "latitude" | "longitude">>;

const popularCities: PopularCity[] = [
  { id: "mumbai", name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  { id: "delhi-ncr", name: "Delhi NCR", latitude: 28.6139, longitude: 77.209 },
  { id: "bengaluru", name: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  { id: "hyderabad", name: "Hyderabad", latitude: 17.385, longitude: 78.4867 },
  {
    id: "chandigarh",
    name: "Chandigarh",
    latitude: 30.7333,
    longitude: 76.7794,
  },
  { id: "ahmedabad", name: "Ahmedabad", latitude: 23.0225, longitude: 72.5714 },
  { id: "pune", name: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { id: "chennai", name: "Chennai", latitude: 13.0827, longitude: 80.2707 },
  { id: "kolkata", name: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { id: "kochi", name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
  { id: "jaipur", name: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  { id: "lucknow", name: "Lucknow", latitude: 26.8467, longitude: 80.9462 },
  { id: "indore", name: "Indore", latitude: 22.7196, longitude: 75.8577 },
  { id: "surat", name: "Surat", latitude: 21.1702, longitude: 72.8311 },
  { id: "guwahati", name: "Guwahati", latitude: 26.1445, longitude: 91.7362 },
];

const otherCities: City[] = [
  { id: "agra", name: "Agra" },
  { id: "ajmer", name: "Ajmer" },
  { id: "aligarh", name: "Aligarh" },
  { id: "alipore", name: "Alipore" },
  { id: "amritsar", name: "Amritsar" },
  { id: "asansol", name: "Asansol" },
  { id: "bhopal", name: "Bhopal" },
  { id: "bhubaneswar", name: "Bhubaneswar" },
  { id: "coimbatore", name: "Coimbatore" },
  { id: "dehradun", name: "Dehradun" },
  { id: "durgapur", name: "Durgapur" },
  { id: "faridabad", name: "Faridabad" },
  { id: "gangtok", name: "Gangtok" },
  { id: "gurugram", name: "Gurugram" },
  { id: "howrah", name: "Howrah" },
  { id: "jamshedpur", name: "Jamshedpur" },
  { id: "kanpur", name: "Kanpur" },
  { id: "kharagpur", name: "Kharagpur" },
  { id: "ludhiana", name: "Ludhiana" },
  { id: "madurai", name: "Madurai" },
  { id: "mysuru", name: "Mysuru" },
  { id: "nagpur", name: "Nagpur" },
  { id: "new-town", name: "New Town" },
  { id: "noida", name: "Noida" },
  { id: "patna", name: "Patna" },
  { id: "raipur", name: "Raipur" },
  { id: "ranchi", name: "Ranchi" },
  { id: "siliguri", name: "Siliguri" },
  { id: "thane", name: "Thane" },
  { id: "udaipur", name: "Udaipur" },
  { id: "vadodara", name: "Vadodara" },
  { id: "varanasi", name: "Varanasi" },
  { id: "vijayawada", name: "Vijayawada" },
  { id: "visakhapatnam", name: "Visakhapatnam" },
];

const allCities = [...popularCities, ...otherCities];
const cityIcons: Record<string, LucideIcon> = {
  mumbai: Landmark,
  "delhi-ncr": Building2,
  bengaluru: Trees,
  hyderabad: Castle,
  chandigarh: Flower2,
  ahmedabad: Warehouse,
  pune: GraduationCap,
  chennai: Waves,
  kolkata: TramFront,
  kochi: Ship,
  jaipur: Crown,
  lucknow: BookOpen,
  indore: Utensils,
  surat: Gem,
  guwahati: Mountain,
};

function distanceInKm(latitude: number, longitude: number, city: PopularCity) {
  const latitudeDelta = (city.latitude - latitude) * 111;
  const longitudeDelta =
    (city.longitude - longitude) * 111 * Math.cos((latitude * Math.PI) / 180);
  return Math.hypot(latitudeDelta, longitudeDelta);
}

export function CitySelector() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { cityId, setCityId } = useUiStore();
  const selectedCity =
    allCities.find((city) => city.id === cityId) ?? popularCities[8];

  const matchingCities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-IN");
    return normalizedQuery
      ? allCities.filter((city) =>
          city.name.toLocaleLowerCase("en-IN").includes(normalizedQuery),
        )
      : [];
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        setLocationMessage(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(
      () => searchInputRef.current?.focus(),
      80,
    );
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!cityId || typeof document === "undefined") return;

    const storedCityId = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("show-time-city="))
      ?.split("=")[1];
    if (storedCityId === cityId) return;

    document.cookie = `show-time-city=${encodeURIComponent(cityId)}; path=/; max-age=31536000; samesite=lax`;
    if (pathname === "/") router.refresh();
  }, [cityId, pathname, router]);

  function closePicker() {
    setOpen(false);
    setQuery("");
    setLocationMessage(null);
  }

  function chooseCity(nextCityId: string) {
    if (typeof document !== "undefined") {
      document.cookie = `show-time-city=${encodeURIComponent(nextCityId)}; path=/; max-age=31536000; samesite=lax`;
    }
    setCityId(nextCityId);
    closePicker();
    if (pathname === "/") router.refresh();
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location services are unavailable in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearestCity = popularCities.reduce((closest, city) => {
          const currentDistance = distanceInKm(
            coords.latitude,
            coords.longitude,
            city,
          );
          const closestDistance = distanceInKm(
            coords.latitude,
            coords.longitude,
            closest,
          );
          return currentDistance < closestDistance ? city : closest;
        });
        const nearestDistance = distanceInKm(
          coords.latitude,
          coords.longitude,
          nearestCity,
        );

        setIsLocating(false);
        if (nearestDistance > 250) {
          setLocationMessage(
            "We could not match your location to a supported city. Please choose one below.",
          );
          return;
        }

        chooseCity(nearestCity.id);
      },
      () => {
        setIsLocating(false);
        setLocationMessage(
          "We could not access your location. You can choose your city manually.",
        );
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="premium-button-secondary h-10 max-w-44 gap-2 px-3 text-sm font-medium"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="city-picker-dialog"
      >
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        <span className="truncate">{selectedCity.name}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] grid place-items-center p-3 sm:p-6">
              <button
                type="button"
                className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-sm"
                aria-label="Close city selector"
                onClick={closePicker}
              />
              <section
                id="city-picker-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="city-picker-title"
                className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-section shadow-[0_28px_100px_rgba(15,23,42,0.2)] sm:max-h-[calc(100dvh-3rem)]"
              >
                <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                  <div>
                    <h2
                      id="city-picker-title"
                      className="text-base font-semibold text-foreground"
                    >
                      Choose your city
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      Find nearby movies, events, and experiences.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePicker}
                    className="grid size-10 place-items-center rounded-xl border border-border text-muted transition-colors hover:border-secondary/60 hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-label="Close city selector"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </header>

                <div
                  data-lenis-prevent=""
                  className="touch-pan-y overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6 sm:pb-7"
                >
                  <label className="relative block">
                    <span className="sr-only">Search for your city</span>
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search for your city"
                      className="h-12 w-full rounded-xl border border-border bg-background pl-12 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:outline-none sm:h-14 sm:text-base"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover disabled:cursor-wait disabled:opacity-65"
                  >
                    <LocateFixed className="size-4" aria-hidden="true" />
                    {isLocating
                      ? "Detecting your location…"
                      : "Detect my location"}
                  </button>
                  {locationMessage ? (
                    <p className="mt-1 text-sm text-warning" role="status">
                      {locationMessage}
                    </p>
                  ) : null}

                  {query.trim() ? (
                    <div className="mt-5">
                      <h3 className="text-center text-sm font-semibold text-foreground">
                        Matching cities
                      </h3>
                      {matchingCities.length ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {matchingCities.map((city) => (
                            <CityOption
                              key={city.id}
                              city={city}
                              selected={city.id === selectedCity.id}
                              onSelect={chooseCity}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl border border-border bg-background px-4 py-5 text-center text-sm text-muted">
                          No cities found. Try another spelling or choose from
                          the list.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 border-t border-border pt-5 sm:mt-4 sm:pt-6">
                        <h3 className="text-center text-base font-semibold text-foreground">
                          Popular cities
                        </h3>
                        <div className="mx-auto mt-3 grid w-full grid-cols-2 gap-1.5 sm:max-w-[30rem] sm:grid-cols-3 sm:gap-2 lg:max-w-none lg:w-fit lg:grid-cols-[repeat(5,9.5rem)]">
                          {popularCities.map((city) => {
                            const Icon = cityIcons[city.id] ?? MapPin;
                            const isSelected = city.id === selectedCity.id;
                            return (
                              <button
                                type="button"
                                key={city.id}
                                onClick={() => chooseCity(city.id)}
                                className={`group relative flex min-h-16 flex-col items-center justify-center rounded-lg border px-1.5 py-1.5 text-center transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-16 ${
                                  isSelected
                                    ? "border-primary/70 bg-primary/10 text-foreground shadow-[0_12px_26px_rgba(6,182,212,0.12)]"
                                    : "border-border bg-background/55 text-muted hover:-translate-y-0.5 hover:border-secondary/65 hover:bg-surface-muted hover:text-foreground"
                                }`}
                              >
                                <Icon
                                  className={`size-6 ${isSelected ? "text-primary" : "text-secondary group-hover:text-primary"}`}
                                  strokeWidth={1.55}
                                  aria-hidden="true"
                                />
                                <span className="mt-1 text-xs font-semibold">
                                  {city.name}
                                </span>
                                {isSelected ? (
                                  <Check
                                    className="absolute right-1.5 top-1.5 size-3.5 text-primary"
                                    aria-label="Selected"
                                  />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-7 border-t border-border pt-5 sm:mt-8 sm:pt-6">
                        <h3 className="text-center text-base font-semibold text-foreground">
                          Other cities
                        </h3>
                        <div className="mt-4 grid grid-cols-2 justify-items-center gap-x-3 gap-y-2 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
                          {otherCities.map((city) => (
                            <CityOption
                              key={city.id}
                              city={city}
                              selected={city.id === selectedCity.id}
                              onSelect={chooseCity}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function CityOption({
  city,
  selected,
  onSelect,
  compact = false,
}: {
  city: City;
  selected: boolean;
  onSelect: (cityId: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(city.id)}
      className={`relative flex min-h-10 items-center rounded-lg text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        compact
          ? "city-option-hover w-full justify-center px-3 text-muted hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(109,40,217,0.09),rgba(8,134,166,0.1))] hover:text-secondary hover:shadow-[0_10px_22px_rgba(8,134,166,0.12)]"
          : "w-full justify-center border border-border bg-background px-3 py-2.5 text-center font-medium text-foreground hover:-translate-y-0.5 hover:border-primary/70 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(6,182,212,0.20)]"
      } ${selected ? "bg-primary/10 text-primary" : ""}`}
    >
      <span className="truncate">{city.name}</span>
      {selected ? (
        <Check
          className={`size-4 shrink-0 ${compact ? "ml-2" : "absolute right-3"}`}
          aria-label="Selected"
        />
      ) : null}
    </button>
  );
}
