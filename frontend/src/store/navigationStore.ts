import { create } from "zustand";

export type ViewMode = "grid" | "list"

interface NavigationState {
  activeFolderId: number | null;
  activeFolderName?: string;
  activeCategoryId: number | null;
  viewMode: ViewMode;
  setActiveFolder: (id: number | null, name?: string) => void;
  setActiveCategory: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
}
export const useNavigationStore = create<NavigationState>()((set) => ({
  activeFolderId: null,
  activeCategoryId: null,
  viewMode: "grid",
  setActiveFolder: (id, name) => set({ activeFolderId: id, activeFolderName: name, activeCategoryId: null }),
  setActiveCategory: (id) => set({ activeCategoryId: id, activeFolderId: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));