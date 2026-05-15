import { type SidebarView } from "./AppLayout";
import FolderTree from "@/components/folders/FolderTree";
import CategoryList from "@/components/categories/CategoryList";

interface SidebarPanelProps {
  view: SidebarView;
}

const titles: Record<NonNullable<SidebarView>, string> = {
  folders: "Папки",
  categories: "Категории",
};

export default function SidebarPanel({ view }: SidebarPanelProps) {
  if (!view) return null;

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">

      {/* Заголовок панели */}
      <div className="px-4 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">{titles[view]}</h2>
      </div>

      {/* Содержимое */}
      <div className="flex-1 overflow-y-auto py-2">
        {view === "folders" && <FolderTree />}
        {view === "categories" && <CategoryList />}
      </div>

    </div>
  );
}