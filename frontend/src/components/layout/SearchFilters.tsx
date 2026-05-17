import { useState } from "react";

export interface Filters {
  mime_type: string;
  date_from: string;
  date_to: string;
  size_min: string;
  size_max: string;
  sort_by: string;
  sort_order: string;
}

export const EMPTY_FILTERS: Filters = {
  mime_type: "",
  date_from: "",
  date_to: "",
  size_min: "",
  size_max: "",
  sort_by: "created_at",
  sort_order: "asc",
};

interface SearchFiltersProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
}

export default function SearchFilters({ filters, onChange, onClose }: SearchFiltersProps) {
  const [local, setLocal] = useState<Filters>(filters);

  function set(key: keyof Filters, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    onChange(local);
    onClose();
  }

  function handleReset() {
    setLocal(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
    onClose();
  }

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap gap-4 items-end">

      {/* Тип файла */}
      <div className="flex flex-col gap-1 min-w-32">
        <label className="text-xs font-medium text-slate-500">Тип файла</label>
        <select
          value={local.mime_type}
          onChange={(e) => set("mime_type", e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200
            bg-white focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
        >
          <option value="">Все</option>
          <option value="application/pdf">PDF</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX</option>
        </select>
      </div>

      {/* Дата от */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Дата от</label>
        <input
          type="date"
          value={local.date_from}
          onChange={(e) => set("date_from", e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200
            focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
        />
      </div>

      {/* Дата до */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Дата до</label>
        <input
          type="date"
          value={local.date_to}
          onChange={(e) => set("date_to", e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200
            focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
        />
      </div>

      {/* Размер от/до */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Размер (КБ)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="от"
            value={local.size_min}
            onChange={(e) => set("size_min", e.target.value)}
            className="w-20 px-3 py-1.5 text-sm rounded-lg border border-slate-200
              focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="number"
            min={0}
            placeholder="до"
            value={local.size_max}
            onChange={(e) => set("size_max", e.target.value)}
            className="w-20 px-3 py-1.5 text-sm rounded-lg border border-slate-200
              focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
          />
        </div>
      </div>

      {/* Сортировка */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Сортировка</label>
        <div className="flex items-center gap-2">
          <select
            value={local.sort_by}
            onChange={(e) => set("sort_by", e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200
              bg-white focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
          >
            <option value="created_at">Дата</option>
            <option value="title">Название</option>
            <option value="file_size">Размер</option>
          </select>
          <button
            onClick={() => set("sort_order", local.sort_order === "desc" ? "asc" : "desc")}
            title={local.sort_order === "desc" ? "По убыванию" : "По возрастанию"}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200
              text-slate-500 hover:bg-slate-50 transition-all"
          >
            {local.sort_order === "desc" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 4.5 15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleReset}
            className="px-3 py-1.5 text-sm rounded-lg text-slate-500
            hover:bg-slate-100 transition-all">
            Сбросить
        </button>
        <button onClick={handleApply}
          className="px-4 py-1.5 text-sm rounded-lg bg-sky-500 text-white
            hover:bg-sky-600 transition-all">
          Применить
        </button>
      </div>
    </div>
  );
}