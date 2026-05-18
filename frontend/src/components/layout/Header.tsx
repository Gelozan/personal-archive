import { useState } from "react";
import { useNavigationStore } from "@/store/navigationStore";
import { api } from "@/api/axios";
import SearchFilters from "@/components/layout/SearchFilters";

interface HeaderProps {
  onUpload: () => void;
}

export default function Header({ onUpload }: HeaderProps) {
  const [search, setSearch] = useState("");

  const {
    activeFolderId, activeFolderName,
    viewMode, setViewMode,
    setActiveFolder,
    searchQuery, setSearchQuery,
    filters, setFilters,
  } = useNavigationStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilters =
    filters.category_id !== "" ||
    filters.mime_type !== "" ||
    filters.date_from !== "" ||
    filters.date_to !== "" ||
    filters.size_min !== "" ||
    filters.size_max !== "" ||
    filters.sort_by !== "created_at" ||
    filters.sort_order !== "asc";


  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") setSearchQuery(search.trim());
    if (e.key === "Escape") { setSearch(""); setSearchQuery(""); }
  }

  function handleClearSearch() {
    setSearch("");
    setSearchQuery("");
  }

  const currentName = activeFolderName ?? "Все документы";
  const canGoBack = activeFolderId !== null;

  async function handleGoBack() {
    if (!activeFolderId) return;
    const { data: { parent_id: parentId } } = await api.get(`/api/v1/folders/${activeFolderId}`);
    if (parentId === null) {
      setActiveFolder(null, "Все документы");
    } else {
      const { data: { name } } = await api.get(`/api/v1/folders/${parentId}`);
      setActiveFolder(parentId, name);
    }
  }

  return (
    <div className="flex flex-col shrink-0">
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-6">

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

      {/* Название текущей папки*/}
      <h1 className="text-sm font-semibold text-slate-800 shrink-0">{currentName}</h1>

      {/* Бейдж активного поиска */}
      {searchQuery && (
        <span className="text-xs text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full shrink-0">
          Поиск: «{searchQuery}»
        </span>
      )}

      <div className="w-px h-4 bg-slate-200 shrink-0" />

      <div className="h-14 flex items-center gap-4 flex-1">

        {/* Поиск */}
        <div className="flex-1 max-w-md relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
          <input
            type="text"
            placeholder="Поиск документов... (Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border
              bg-slate-50 placeholder:text-slate-400 text-slate-800
              focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all
              ${searchQuery ? "border-sky-400" : "border-slate-200 focus:border-sky-400"}`}
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Фильтры */}
        <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                border transition-all
                ${filtersOpen || hasActiveFilters
                ? "border-sky-400 text-sky-600 bg-sky-50"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0
                    01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0
                    01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25
                    2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Фильтры
            {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Переключатель вида */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode("grid")} title="Сетка"
              className={`p-1.5 rounded-md transition-all
                ${viewMode === "grid" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button onClick={() => setViewMode("list")} title="Список"
              className={`p-1.5 rounded-md transition-all
                ${viewMode === "list" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
          </div>

          {/* Кнопка загрузки */}
          <button onClick={onUpload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500
              text-white text-sm font-medium hover:bg-sky-600 active:bg-sky-700
              transition-all shadow-sm shadow-sky-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Загрузить
          </button>
        </div>
      </div>
    </header>
    {filtersOpen && (
      <SearchFilters
        filters={filters}
        onChange={(f) => { 
            setFilters(f); 
            if (search.trim()) setSearchQuery(search.trim());
            setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
      />
    )}
    </div>
  );
}