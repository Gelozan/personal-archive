import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import type { Category } from "@/types";

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCategoryId, setActiveCategory } = useNavigationStore();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/api/v1/categories/");
        setCategories(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-3 space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-slate-400">Категорий пока нет</p>
        <button className="mt-2 text-xs text-sky-500 hover:underline">
          Создать первую
        </button>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-0.5">
      <button
        onClick={() => setActiveCategory(null)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg
          text-xs transition-all text-left
          ${activeCategoryId === null
            ? "bg-sky-50 text-sky-700 font-medium"
            : "text-slate-600 hover:bg-slate-100"
          }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
        Все категории
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg
            text-xs transition-all text-left
            ${activeCategoryId === category.id
              ? "bg-sky-50 text-sky-700 font-medium"
              : "text-slate-600 hover:bg-slate-100"
            }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          <span className="truncate">{category.name}</span>
        </button>
      ))}

      <button
        onClick={() => {}}
        className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 rounded-lg
          text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Новая категория
      </button>
    </div>
  );
}