import { create } from "zustand";

export type ViewMode = "grid" | "list"

interface NavigationState {
  activeFolderId: number | null;
  activeFolderName?: string;
  activeCategoryId: number | null;
  viewMode: ViewMode;
  searchQuery: string;
  setActiveFolder: (id: number | null, name?: string) => void;
  setActiveCategory: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => void;
}
export const useNavigationStore = create<NavigationState>()((set) => ({
  activeFolderId: null,
  activeCategoryId: null,
  viewMode: "grid",
  searchQuery: "",
  setActiveFolder: (id, name) => set({ activeFolderId: id, activeFolderName: name, activeCategoryId: null }),
  setActiveCategory: (id) => set({ activeCategoryId: id, activeFolderId: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));