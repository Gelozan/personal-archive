import { create } from "zustand";
import type { Filters } from "@/components/layout/SearchFilters";
import { EMPTY_FILTERS } from "@/components/layout/SearchFilters";

export type ViewMode = "grid" | "list"

interface NavigationState {
  activeFolderId: number | null;
  activeFolderName?: string;
  activeCategoryId: number | null;
  viewMode: ViewMode;
  searchQuery: string;
  filters: Filters;
  setActiveFolder: (id: number | null, name?: string) => void;
  setActiveCategory: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  setFilters: (f: Filters) => void;
}
export const useNavigationStore = create<NavigationState>()((set) => ({
  activeFolderId: null,
  activeCategoryId: null,
  viewMode: "grid",
  searchQuery: "",
  filters: EMPTY_FILTERS,
  setActiveFolder: (id, name) => set({ activeFolderId: id, activeFolderName: name, activeCategoryId: null, searchQuery: "", filters: EMPTY_FILTERS }),
  setActiveCategory: (id) => set({ activeCategoryId: id, activeFolderId: null, searchQuery: "", filters: EMPTY_FILTERS }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilters: (f) => set({ filters: f }),
}));