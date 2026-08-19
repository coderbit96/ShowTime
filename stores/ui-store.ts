import { create } from "zustand";

type UiState = {
  cityId: string | null;
  setCityId: (cityId: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  cityId: null,
  setCityId: (cityId) => set({ cityId }),
}));
