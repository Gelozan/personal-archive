import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import type { Document } from "@/types";
import FolderTreeSelect from "@/components/folders/FolderTreeSelect";

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onUpdate: (updated: Document) => void;
  onTrash: (id: number) => void;
}

interface Category {
  id: number;
  name: string;
}

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

function getMimeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime.includes("word")) return "DOCX";
  return mime;
}

export default function DocumentViewer({ document, onClose, onUpdate, onTrash }: DocumentViewerProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [note, setNote] = useState(document.note ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(document.category_id ?? "");
  const [folderId, setFolderId] = useState<number | null>(document.folder_id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  const [trashConfirm, setTrashConfirm] = useState(false);
  const [trashing, setTrashing] = useState(false);

  const isImage = document.mime_type.startsWith("image/");
  const isPdf = document.mime_type === "application/pdf";
  const isDocx = document.mime_type.includes("word");

  // Загружаем presigned URL и категории
  useEffect(() => {
    api.get(`/api/v1/documents/${document.id}/download`)
      .then((r) => setPresignedUrl(r.data.url))
      .finally(() => setLoadingUrl(false));

    api.get("/api/v1/categories/").then((r) => setCategories(r.data));
  }, [document.id]);

  // Закрытие по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (trashConfirm) { setTrashConfirm(false); return; }
        if (editing) { cancelEdit(); return; }
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, trashConfirm, onClose]);

  function cancelEdit() {
    setTitle(document.title);
    setNote(document.note ?? "");
    setCategoryId(document.category_id ?? "");
    setFolderId(document.folder_id);
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await api.patch(`/api/v1/documents/${document.id}`, {
        title: title.trim(),
        note: note.trim() || null,
        category_id: categoryId === "" ? null : categoryId,
        folder_id: folderId,
      });
      onUpdate(data);
      setEditing(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSaveError(typeof detail === "string" ? detail : "Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  }

  async function handleTrash() {
    setTrashing(true);
    try {
      await api.delete(`/api/v1/documents/${document.id}`);
      onTrash(document.id);
      onClose();
    } catch {
      setTrashing(false);
      setTrashConfirm(false);
    }
  }

  function handleDownload() {
    if (presignedUrl) window.open(presignedUrl, "_blank");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}>

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {getMimeLabel(document.mime_type)}
            </span>
            {!editing ? (
              <h2 className="text-sm font-semibold text-slate-800 truncate">{title}</h2>
            ) : (
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                className="text-sm font-semibold text-slate-800 border-b border-sky-400
                  outline-none bg-transparent min-w-0 w-48"
              />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Кнопка редактировать / сохранить */}
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                  text-slate-600 hover:bg-slate-100 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Редактировать
              </button>
            ) : (
              <>
                <button onClick={cancelEdit} disabled={saving}
                  className="px-3 py-1.5 text-xs rounded-lg text-slate-500
                    hover:bg-slate-100 transition-all disabled:opacity-40">
                  Отмена
                </button>
                <button onClick={handleSave} disabled={saving || !title.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                    bg-sky-500 text-white hover:bg-sky-600 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </>
            )}

            {/* Скачать */}
            <button onClick={handleDownload} disabled={!presignedUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
              title="Скачать">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Скачать
            </button>

            {/* В корзину */}
            <button onClick={() => setTrashConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
              title="В корзину">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              В корзину
            </button>

            {/* Закрыть */}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all ml-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Тело — превью + метаданные */}
        <div className="flex flex-1 min-h-0">

          {/* Левая часть — превью */}
          <div className="flex-1 bg-slate-50 flex items-center justify-center min-h-0 overflow-hidden">
            {loadingUrl ? (
              <div className="w-12 h-12 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
            ) : isImage && presignedUrl ? (
              <img
                src={presignedUrl}
                alt={document.title}
                className="max-w-full max-h-full object-contain p-4"
              />
            ) : isPdf && presignedUrl ? (
              <iframe
                src={presignedUrl}
                className="w-full h-full border-0"
                title={document.title}
              />
            ) : isDocx ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <svg className="w-16 h-16 text-blue-200" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm">Предпросмотр DOCX недоступен</p>
                <button onClick={handleDownload} disabled={!presignedUrl}
                  className="px-4 py-2 text-sm rounded-lg bg-sky-500 text-white
                    hover:bg-sky-600 transition-all disabled:opacity-40">
                  Скачать файл
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Предпросмотр недоступен</p>
            )}
          </div>

          {/* Правая часть — метаданные */}
          <div className="w-64 shrink-0 border-l border-slate-100 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Информация о файле */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">О файле</p>
                <div className="space-y-1.5">
                  <MetaRow label="Файл" value={document.original_filename} />
                  <MetaRow label="Размер" value={formatSize(document.file_size)} />
                  <MetaRow label="Тип" value={getMimeLabel(document.mime_type)} />
                  <MetaRow label="Загружен" value={formatDate(document.created_at)} />
                  {document.updated_at !== document.created_at && (
                    <MetaRow label="Изменён" value={formatDate(document.updated_at)} />
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Редактируемые поля */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Свойства</p>

                {/* Категория */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Категория</label>
                  {editing ? (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200
                        bg-white text-slate-800 focus:outline-none focus:border-sky-400
                        focus:ring-2 focus:ring-sky-100 transition-all"
                    >
                      <option value="">— Без категории</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-700">
                      {categories.find((c) => c.id === document.category_id)?.name ?? "—"}
                    </p>
                  )}
                </div>

                {/* Папка */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Папка</label>
                  {editing ? (
                    <FolderTreeSelect value={folderId} onChange={setFolderId} />
                  ) : (
                    <p className="text-xs text-slate-700">
                      {document.folder_id ? `ID ${document.folder_id}` : "— Корень"}
                    </p>
                  )}
                </div>

                {/* Заметка */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Заметка</label>
                  {editing ? (
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Добавить заметку..."
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200
                        bg-white placeholder:text-slate-300 text-slate-800 resize-none
                        focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {document.note || <span className="text-slate-300">Нет заметки</span>}
                    </p>
                  )}
                </div>

                {saveError && (
                  <p className="text-xs text-red-500">{saveError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Диалог подтверждения удаления */}
      {trashConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Отправить в корзину?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Документ «{document.title}» будет перемещён в корзину.
              Вы сможете восстановить его позже.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTrashConfirm(false)} disabled={trashing}
                className="px-4 py-2 text-sm rounded-lg text-slate-600
                  hover:bg-slate-100 transition-all disabled:opacity-40">
                Отмена
              </button>
              <button onClick={handleTrash} disabled={trashing}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white
                  hover:bg-red-600 transition-all disabled:opacity-40 flex items-center gap-2">
                {trashing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Удаление...
                  </>
                ) : "В корзину"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-slate-700 text-right break-all">{value}</span>
    </div>
  );
}