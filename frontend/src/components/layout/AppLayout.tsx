import { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarPanel from "./SidebarPanel";

export type SidebarView = "folders" | "categories" | "favourites" | "recent" | null;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [activeView, setActiveView] = useState<SidebarView>("folders");

  function toggleView(view: SidebarView) {
    setActiveView((prev) => (prev === view ? null : view));
  }

  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden">

      {/* Боковой sidebar — скрыт на мобайле */}
      <div className="hidden md:flex">
        <Sidebar activeView={activeView} onToggle={toggleView} />
      </div>

      {/* SidebarPanel десктоп — статичная панель */}
      <div className="hidden md:flex">
        {activeView && <SidebarPanel view={activeView} />}
      </div>

      {/* SidebarPanel мобайл — overlay снизу */}
      {activeView && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Затемнение */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setActiveView(null)}
          />
          {/* Панель */}
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col">
            {/* Ручка */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="overflow-y-auto">
              <SidebarPanel view={activeView} />
            </div>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className="flex flex-col flex-1 min-w-0">
        {children}
      </div>

      {/* Bottom bar — только мобайл */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200">
        <Sidebar activeView={activeView} onToggle={toggleView} mobileBar />
      </div>

    </div>
  );
}