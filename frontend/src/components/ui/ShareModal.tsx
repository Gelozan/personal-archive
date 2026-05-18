// frontend/src/components/ui/ShareModal.tsx
import { useEffect, useRef, useState } from "react";
import { api } from "@/api/axios";
import type { Document } from "@/types";

interface ShareModalProps {
  document: Document;
  onClose: () => void;
}

interface ShareLink {
  token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "Бессрочно";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ShareModal({ document, onClose }: ShareModalProps) {
  const [link, setLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryMode, setExpiryMode] = useState<"none" | "date">("none");
  const [expiryDate, setExpiryDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Проверяем, есть ли уже активная ссылка
  // Бэкенд не отдаёт GET для активной ссылки, поэтому храним в состоянии после создания.
  // При открытии — сразу показываем форму создания.
  useEffect(() => {
    api.get(`/api/v1/documents/${document.id}/share`)
      .then(({ data }) => setLink(data))
      .catch(() => { /* 404 = ссылки нет, показываем форму */ })
      .finally(() => setLoading(false));
  }, [document.id]);

  // Закрытие по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shareUrl = link
    ? `${window.location.origin}/share/${link.token}`
    : null;

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const payload: { expires_at?: string } = {};
      if (expiryMode === "date" && expiryDate) {
        payload.expires_at = new Date(expiryDate).toISOString();
      }
      const { data } = await api.post(`/api/v1/documents/${document.id}/share`, payload);
      setLink(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при создании ссылки");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Отозвать ссылку? Все кто перейдёт по ней — увидят ошибку.")) return;
    setRevoking(true);
    try {
      await api.delete(`/api/v1/documents/${document.id}/share`);
      setLink(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при отзыве ссылки");
    } finally {
      setRevoking(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
    }
  }

  // Минимальная дата для datepicker — сегодня + 1 час (через 1 час)
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col overflow-hidden">

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            <h2 className="text-base font-semibold text-slate-900">Поделиться документом</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Название документа */}
          {loading && (
            <div className="flex justify-center py-6">
              <svg className="animate-spin w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}
         <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <svg className="w-8 h-8 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{document.title}</p>
              <p className="text-xs text-slate-400 truncate">{document.original_filename}</p>
            </div>
          </div>

          {!loading && !link && (
            <>
              {/* Срок действия */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-700">Срок действия ссылки</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpiryMode("none")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      expiryMode === "none"
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                    }`}
                  >
                    Бессрочно
                  </button>
                  <button
                    onClick={() => setExpiryMode("date")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      expiryMode === "date"
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                    }`}
                  >
                    До даты
                  </button>
                </div>

                {expiryMode === "date" && (
                  <input
                    type="datetime-local"
                    min={minDateTime}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-3 focus:ring-sky-100 transition-all"
                  />
                )}
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={creating || (expiryMode === "date" && !expiryDate)}
                className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {creating && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                Создать ссылку
              </button>
            </>
          )}

          {link && shareUrl && (
            <>
              {/* Ссылка создана */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-700">Ссылка для доступа</p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    readOnly
                    value={shareUrl}
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-slate-50 outline-none select-all"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      copied
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600"
                    }`}
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Срок действия: <span className="text-slate-600">{formatExpiry(link.expires_at)}</span>
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="w-full py-2.5 rounded-xl bg-white text-red-500 text-sm font-medium border border-red-200 hover:bg-red-50 active:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {revoking && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                Отозвать ссылку
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}