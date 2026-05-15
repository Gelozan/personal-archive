import { useEffect, useRef, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import FolderTreeSelect from "@/components/folders/FolderTreeSelect";

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Category {
  id: number;
  name: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];
const MAX_MB = 10; // должно совпадать с MAX_FILE_SIZE_MB в .env

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const { activeFolderId } = useNavigationStore();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [folderId, setFolderId] = useState<number | null>(activeFolderId ?? null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Загружаем категории и папки для селектов
  useEffect(() => {
    api.get("/api/v1/categories/").then((r) => setCategories(r.data));
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uploading, onClose]);

  function validateFile(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return `Тип файла не поддерживается. Допустимы: PDF, JPG, PNG, DOCX`;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `Файл слишком большой. Максимум ${MAX_MB} МБ`;
    }
    return null;
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f);
    setFileError(err);
    if (!err) {
      setFile(f);
      // Если title не заполнен — подставляем имя файла без расширения
      if (!title) {
        setTitle(f.name.replace(/\.[^.]+$/, ""));
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    if (note.trim()) formData.append("note", note.trim());
    if (categoryId !== "") formData.append("category_id", String(categoryId));
    if (folderId !== null) formData.append("folder_id", String(folderId));

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      await api.post("/api/v1/documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Ошибка при загрузке файла");
    } finally {
      setUploading(false);
    }
  }

  return (
    // Оверлей
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Загрузить документ</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
              hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Дроп-зона */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center
              justify-center gap-2 cursor-pointer transition-all
              ${dragging ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-sky-300 hover:bg-slate-50"}
              ${file ? "border-emerald-300 bg-emerald-50" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_EXT.join(",")}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />

            {file ? (
              <>
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-slate-700 text-center break-all">{file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setFileError(null); setTitle(""); }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Выбрать другой файл
                </button>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-sky-500">Выберите файл</span> или перетащите сюда
                </p>
                <p className="text-xs text-slate-400">PDF, JPG, PNG, DOCX · до {MAX_MB} МБ</p>
              </>
            )}
          </div>

          {/* Ошибка типа/размера файла */}
          {fileError && (
            <p className="text-xs text-red-500 -mt-2">{fileError}</p>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Название <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Паспорт, Договор аренды..."
              maxLength={255}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                bg-white placeholder:text-slate-400 text-slate-800
                focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>

          {/* Category + Folder — в одну строку */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Категория</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                  bg-white text-slate-800 focus:outline-none focus:border-sky-400
                  focus:ring-2 focus:ring-sky-100 transition-all"
              >
                <option value="">— Без категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Папка</label>
                <FolderTreeSelect value={folderId} onChange={setFolderId} />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Заметка</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Дополнительная информация о документе..."
              rows={2}
              maxLength={1000}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                bg-white placeholder:text-slate-400 text-slate-800 resize-none
                focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>

          {/* Прогресс-бар */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Загрузка...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ошибка сервера */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* Кнопки */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100
                transition-all disabled:opacity-40"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || !!fileError || uploading}
              className="px-4 py-2 text-sm rounded-lg bg-sky-500 text-white font-medium
                hover:bg-sky-600 active:bg-sky-700 transition-all shadow-sm shadow-sky-200
                disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Загрузка...
                </>
              ) : "Загрузить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}