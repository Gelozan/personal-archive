import { useEffect, useRef, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import type { Category } from "@/types";

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCategoryId, setActiveCategory } = useNavigationStore();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const createInputRef = useRef<HTMLInputElement>(null);

  async function loadCategories() {
    try {
      const { data } = await api.get("/api/v1/categories/");
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (creating) createInputRef.current?.focus(); }, [creating]);

  const submittedRef = useRef(false);

  async function handleCreate() {
    if (submittedRef.current) return;
    if (!newName.trim()) { setCreating(false); return; }
    setCreateLoading(true);
    try {
      await api.post("/api/v1/categories/", { name: newName.trim() });
      setNewName("");
      setCreating(false);
      await loadCategories();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || status === 400) {
        alert(`Категория «${newName.trim()}» уже существует`);
      }
    } finally {
      setCreateLoading(false);
      setCreating(false);
      submittedRef.current = false;
    }
  }

  async function handleDelete(category: Category) {
    const url = category.owner_id === null
      ? `/api/v1/categories/system/${category.id}`   // системная — скрыть
      : `/api/v1/categories/${category.id}`;          // пользовательская — удалить
    await api.delete(url);
    if (activeCategoryId === category.id) setActiveCategory(null);
    await loadCategories();
  }

  if (loading) {
    return (
      <div className="px-3 space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded-lg bg-slate-100 animate-pulse" />
        ))}
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
            : "text-slate-600 hover:bg-slate-100"}`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
        Все категории
      </button>

      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          isActive={activeCategoryId === category.id}
          onSelect={() => setActiveCategory(category.id)}
          onDelete={() => handleDelete(category)}
        />
      ))}

      {/* Инлайн-создание */}
      {creating ? (
        <div className="flex items-center gap-1 px-2 py-1 mt-1">
          <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          </svg>
          <input
            ref={createInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            onBlur={handleCreate}
            disabled={createLoading}
            maxLength={100}
            placeholder="Название категории"
            className="flex-1 text-xs bg-white border border-sky-400 rounded px-1.5 py-0.5
              outline-none focus:ring-2 focus:ring-sky-100 min-w-0"
          />
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg
            text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Новая категория
        </button>
      )}
    </div>
  );
}

interface CategoryItemProps {
  category: Category;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function CategoryItem({ category, isActive, onSelect, onDelete }: CategoryItemProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div>
      <div
        onClick={onSelect}
        className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg
          text-xs transition-all cursor-pointer select-none group
          ${isActive ? "bg-sky-50 text-sky-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        </svg>
        <span className="truncate flex-1">{category.name}</span>

        {/* Кнопка «…» */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-all
              text-slate-400 hover:text-slate-600 hover:bg-slate-200
              ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200
              rounded-lg shadow-lg py-1 w-36 text-xs">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setDeleteConfirm(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-red-500
                  hover:bg-red-50 transition-all text-left"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Удалить / скрыть
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Инлайн-подтверждение удаления */}
      {deleteConfirm && (
        <div className="mx-2 my-1 p-2.5 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-slate-700 mb-2">
            Удалить категорию <span className="font-medium">«{category.name}»</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="flex-1 py-1 text-xs rounded bg-white border border-slate-200
                text-slate-600 hover:bg-slate-50 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={() => { setDeleteConfirm(false); onDelete(); }}
              className="flex-1 py-1 text-xs rounded bg-red-500 text-white
                hover:bg-red-600 transition-all"
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}