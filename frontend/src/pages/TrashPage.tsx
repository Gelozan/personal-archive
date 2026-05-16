import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import type { Document } from "@/types";
import { useNavigate } from "react-router-dom";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getMimeIcon(mime: string) {
  if (mime === "application/pdf") return (
    <span className="text-xs font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded">PDF</span>
  );
  if (mime.startsWith("image/")) return (
    <span className="text-xs font-bold text-violet-400 bg-violet-50 px-1.5 py-0.5 rounded">IMG</span>
  );
  return (
    <span className="text-xs font-bold text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">DOC</span>
  );
}

export default function TrashPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/trash/");
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }
  
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  }

  async function handleRestoreSelected() {
    if (!selected.size) return;
    setActionLoading(true);
    try {
      await Promise.all([...selected].map((id) => api.post(`/api/v1/trash/${id}/restore`)));
      setSelected(new Set());
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selected.size) return;
    setActionLoading(true);
    try {
      await Promise.all([...selected].map((id) => api.delete(`/api/v1/trash/${id}`)));
      setSelected(new Set());
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearAll() {
    setActionLoading(true);
    try {
      await Promise.all(documents.map((d) => api.delete(`/api/v1/trash/${d.id}`)));
      setDocuments([]);
      setSelected(new Set());
      setConfirmClearAll(false);
    } finally {
      setActionLoading(false);
    }
  }

  const hasSelection = selected.size > 0;
  const allSelected = documents.length > 0 && selected.size === documents.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Шапка */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <h1 className="text-sm font-semibold text-slate-800">Корзина</h1>
          {!loading && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          )}
        </div>

        {/* Действия с выделением */}
        <div className="ml-auto flex items-center gap-2">
          {hasSelection && (
            <>
              <span className="text-xs text-slate-500">
                Выбрано: {selected.size}
              </span>
              <button
                onClick={handleRestoreSelected}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                  bg-sky-500 text-white hover:bg-sky-600 transition-all disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                Восстановить
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                  text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Удалить навсегда
              </button>
            </>
          )}

          {!hasSelection && documents.length > 0 && (
            <button
              onClick={() => setConfirmClearAll(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                text-red-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40"
            >
              Очистить корзину
            </button>
          )}
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            <p className="text-sm text-slate-400">Корзина пуста</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {/* Шапка таблицы */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-sky-500 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-medium flex-1">Название</span>
              <span className="text-xs text-slate-400 font-medium w-24 hidden sm:block">Размер</span>
              <span className="text-xs text-slate-400 font-medium w-44 hidden md:block">Удалён</span>
              <span className="w-16" />
            </div>

            {/* Строки */}
            {documents.map((doc) => (
              <TrashRow
                key={doc.id}
                doc={doc}
                selected={selected.has(doc.id)}
                onToggle={() => toggleSelect(doc.id)}
                onRestore={async () => {
                  setActionLoading(true);
                  try {
                    await api.post(`/api/v1/trash/${doc.id}/restore`);
                    await load();
                  } finally {
                    setActionLoading(false);
                  }
                }}
                onDelete={async () => {
                  setActionLoading(true);
                  try {
                    await api.delete(`/api/v1/trash/${doc.id}`);
                    await load();
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              />
            ))}
          </div>
        )}
      </main>

      {/* Диалог очистки всей корзины */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Очистить корзину?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Все {documents.length} документов будут удалены безвозвратно.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClearAll(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm rounded-lg text-slate-600
                  hover:bg-slate-100 transition-all disabled:opacity-40"
              >
                Отмена
              </button>
              <button
                onClick={handleClearAll}
                disabled={actionLoading}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white
                  hover:bg-red-600 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {actionLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : null}
                Удалить всё
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TrashRowProps {
  doc: Document;
  selected: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onDelete: () => void;
  disabled: boolean;
}

function TrashRow({ doc, selected, onToggle, onRestore, onDelete, disabled }: TrashRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50
        last:border-0 transition-colors ${selected ? "bg-sky-50/50" : "hover:bg-slate-50"}`}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-slate-300 text-sky-500 cursor-pointer shrink-0"
        />

        {/* Иконка типа */}
        <div className="shrink-0">{getMimeIcon(doc.mime_type)}</div>

        {/* Название и оригинальное имя файла */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 font-medium truncate">{doc.title}</p>
          <p className="text-xs text-slate-400 truncate">{doc.original_filename}</p>
        </div>

        {/* Размер */}
        <span className="text-xs text-slate-400 w-24 shrink-0 hidden sm:block">
          {formatSize(doc.file_size)}
        </span>

        {/* Дата удаления */}
        <span className="text-xs text-slate-400 w-44 shrink-0 hidden md:block">
          {doc.deleted_at ? formatDate(doc.deleted_at) : "—"}
        </span>

        {/* Действия */}
        <div className="flex items-center gap-1 w-16 justify-end shrink-0">
          <button
            onClick={onRestore}
            disabled={disabled}
            title="Восстановить"
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-all disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={disabled}
            title="Удалить навсегда"
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Инлайн-подтверждение удаления */}
      {confirmDelete && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center
          justify-between gap-4">
          <p className="text-xs text-slate-700">
            Удалить «<span className="font-medium">{doc.title}</span>» безвозвратно?
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 text-xs rounded bg-white border border-slate-200
                text-slate-600 hover:bg-slate-50 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="px-3 py-1 text-xs rounded bg-red-500 text-white
                hover:bg-red-600 transition-all"
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </>
  );
}