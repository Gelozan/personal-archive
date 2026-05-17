import { useEffect, useRef, useState } from "react";

interface FolderActionModalProps {
  mode: "rename" | "create-child";
  initialName?: string;
  parentName?: string;
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}

export default function FolderActionModal({
  mode, initialName = "", parentName, onConfirm, onClose,
}: FolderActionModalProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm(name.trim());
      onClose();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || status === 400) {
        setError(`Папка с именем «${name.trim()}» уже существует`);
      } else {
        setError("Произошла ошибка. Попробуйте ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "rename" ? "Переименовать папку" : "Создать вложенную папку";
  const placeholder = mode === "rename" ? "Новое название" : "Название папки";
  const submitLabel = mode === "rename" ? "Переименовать" : "Создать";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">{title}</h2>
        {mode === "create-child" && parentName && (
          <p className="text-xs text-slate-400 mb-4">Внутри папки «{parentName}»</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder={placeholder}
            className={`w-full px-3 py-2 text-sm rounded-lg border
              focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all
              ${error ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-sky-400"}`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200
                text-slate-600 hover:bg-slate-50 transition-all">
              Отмена
            </button>
            <button type="submit" disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-sky-500 text-white
                font-medium hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {loading ? "..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}