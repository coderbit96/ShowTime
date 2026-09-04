import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  cityId: string | null;
  setCityId: (cityId: string | null) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      cityId: "kolkata",
      setCityId: (cityId) => set({ cityId }),
    }),
    {
      name: "show-time-ui",
      partialize: (state) => ({ cityId: state.cityId }),
    },
  ),
);
