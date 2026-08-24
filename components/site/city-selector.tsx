"use client";

import { useState } from "react";
import { Check, ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

const cities = [
  { id: "mumbai", name: "Mumbai" },
  { id: "delhi-ncr", name: "Delhi NCR" },
  { id: "bengaluru", name: "Bengaluru" },
  { id: "hyderabad", name: "Hyderabad" },
  { id: "kolkata", name: "Kolkata" },
];

export function CitySelector() {
  const [open, setOpen] = useState(false);
  const { cityId, setCityId } = useUiStore();
  const selectedCity = cities.find((city) => city.id === cityId) ?? cities[0];

  function chooseCity(nextCityId: string) {
    setCityId(nextCityId);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="premium-button-secondary h-10 max-w-44 gap-2 px-3 text-sm font-medium"
        aria-expanded={open}
      >
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        <span className="truncate">{selectedCity.name}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </button>

      {open ? (
        <div className="premium-panel absolute left-0 top-12 z-40 w-72 rounded-md p-2">
          <button
            type="button"
            onClick={() => chooseCity("mumbai")}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-white/[0.07]"
          >
            <LocateFixed className="size-4 text-berry" aria-hidden="true" />
            Detect my location
          </button>

          <div className="my-2 h-px bg-border" />

          {cities.map((city) => (
            <button
              type="button"
              key={city.id}
              onClick={() => chooseCity(city.id)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-white/[0.07]"
            >
              <span>{city.name}</span>
              {city.id === selectedCity.id ? (
                <Check className="size-4 text-primary" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
