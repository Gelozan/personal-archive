import { useState } from "react";
import { useNavigationStore } from "@/store/navigationStore";
import { api } from "@/api/axios";

interface HeaderProps {
  onUpload: () => void;
}

export default function Header({ onUpload }: HeaderProps) {
  const [search, setSearch] = useState("");
  const { activeFolderId, activeFolderName, viewMode, setViewMode, setActiveFolder } = useNavigationStore();

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && search.trim()) {
      // поиск реализуем позже
    }
  }
  const currentName = activeFolderName ?? "Все документы";
  const canGoBack = activeFolderId !== null;

  async function handleGoBack() {
    if (!activeFolderId) return;
    const { data: { parent_id: parentId } } = await api.get(`/api/v1/folders/${activeFolderId}`);
    if (parentId === null) {
      setActiveFolder(null, "Все документы");
    } else {
      const { data: { name: name } } = await api.get(`/api/v1/folders/${parentId}`);
      setActiveFolder(parentId, name);
    }
  }
  
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-6 shrink-0">

      {canGoBack && (
        <button
          onClick={handleGoBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0"
          title="Назад"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      <h1 className="text-sm font-semibold text-slate-800 shrink-0">{currentName}</h1>
      <div className="w-px h-4 bg-slate-200 shrink-0" />
      
      {/* Верхняя строка — поиск и кнопка загрузки */}
      <div className="h-14 flex items-center gap-4 px-6 flex-1">

        {/* Поиск */}
        <div className="flex-1 max-w-md relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
          <input
            type="text"
            placeholder="Поиск документов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200
              bg-slate-50 placeholder:text-slate-400 text-slate-800
              focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Переключатель вида */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              title="Сетка"
              className={`p-1.5 rounded-md transition-all
                ${viewMode === "grid" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Список"
              className={`p-1.5 rounded-md transition-all
                ${viewMode === "list" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
          </div>

          {/* Кнопка загрузки */}
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500
              text-white text-sm font-medium hover:bg-sky-600 active:bg-sky-700
              transition-all shadow-sm shadow-sky-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Загрузить
          </button>
        </div>
      </div>
    </header>
  );
}