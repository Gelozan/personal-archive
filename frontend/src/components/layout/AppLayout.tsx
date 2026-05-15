import { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarPanel from "./SidebarPanel";

// Какая панель открыта в sidebar
export type SidebarView = "folders" | "categories" | null;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [activeView, setActiveView] = useState<SidebarView>("folders");

  function toggleView(view: SidebarView) {
    // Если кликнули на уже открытую панель — закрываем
    setActiveView((prev) => (prev === view ? null : view));
  }

  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden">

      {/* Узкий sidebar с иконками */}
      <Sidebar activeView={activeView} onToggle={toggleView} />

      {/* Раскрывающаяся панель (папки или категории) */}
      {activeView && (
        <SidebarPanel view={activeView} />
      )}

      {/* Основной контент */}
      <div className="flex flex-col flex-1 min-w-0">
        {children}
      </div>

    </div>
  );
}