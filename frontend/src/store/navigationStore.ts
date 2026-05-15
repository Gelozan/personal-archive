import { create } from "zustand";

interface NavigationState {
  activeFolderId: number | null;
  activeCategoryId: number | null;
  setActiveFolder: (id: number | null) => void;
  setActiveCategory: (id: number | null) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  activeFolderId: null,
  activeCategoryId: null,
  setActiveFolder: (id) => set({ activeFolderId: id, activeCategoryId: null }),
  setActiveCategory: (id) => set({ activeCategoryId: id, activeFolderId: null }),
}));