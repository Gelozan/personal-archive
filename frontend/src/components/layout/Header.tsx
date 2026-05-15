import { useState } from "react";
import { useNavigationStore } from "@/store/navigationStore";

interface HeaderProps {
  onUpload: () => void;
}

export default function Header({ onUpload }: HeaderProps) {
  const [search, setSearch] = useState("");
  const { activeFolderId } = useNavigationStore();

  const title = activeFolderId === null ? "Все документы" : "Папка";

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && search.trim()) {
      // поиск позже
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-6 shrink-0">

      {/* Заголовок текущего раздела */}
      <h1 className="text-sm font-semibold text-slate-800 shrink-0">{title}</h1>

      {/* Разделитель */}
      <div className="w-px h-4 bg-slate-200" />

      {/* Поиск */}
      <div className="flex-1 max-w-md relative">
        <svg
          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
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
            focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100
            transition-all"
        />
        {/* Очистка*/}
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Кнопка загрузки */}
      <div className="ml-auto flex items-center gap-2">
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

    </header>
  );
}