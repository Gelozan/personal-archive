// frontend/src/pages/SharePage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// Публичный эндпоинт — без авторизации, используем чистый fetch/axios без Bearer
import axios from "axios";

interface ShareInfo {
  title: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  download_url: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getMimeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime.includes("word")) return "DOCX";
  return mime;
}

function FileIcon({ mimeType, size = "lg" }: { mimeType: string; size?: "lg" | "sm" }) {
  const cls = size === "lg" ? "w-16 h-16" : "w-8 h-8";
  if (mimeType === "application/pdf")
    return <svg className={`${cls} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
  if (mimeType.startsWith("image/"))
    return <svg className={`${cls} text-emerald-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
  return <svg className={`${cls} text-blue-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}

type ErrorType = "not_found" | "expired" | "revoked" | "unknown";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) { setErrorType("not_found"); setLoading(false); return; }

    const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    axios.get(`${baseURL}/api/v1/share/${token}`)
      .then(({ data }) => setInfo(data))
      .catch((err) => {
        const detail: string = err?.response?.data?.detail ?? "";
        if (detail.includes("expired")) setErrorType("expired");
        else if (detail.includes("revoked")) setErrorType("revoked");
        else setErrorType("not_found");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownload() {
    if (!info) return;
    setDownloading(true);
    try {
      const response = await fetch(info.download_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = info.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(info.download_url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  const errorMessages: Record<ErrorType, { title: string; desc: string }> = {
    not_found: { title: "Ссылка не найдена", desc: "Возможно, она была удалена или никогда не существовала." },
    expired:   { title: "Ссылка истекла", desc: "Срок действия этой ссылки истёк." },
    revoked:   { title: "Ссылка отозвана", desc: "Владелец отозвал доступ к этому документу." },
    unknown:   { title: "Что-то пошло не так", desc: "Попробуйте обновить страницу." },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">

      {/* Лого */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-md shadow-sky-200">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <span className="text-base font-semibold text-slate-700 tracking-tight">Личный архив</span>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Загрузка...</p>
        </div>
      )}

      {!loading && errorType && (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">{errorMessages[errorType].title}</h1>
          <p className="text-sm text-slate-500">{errorMessages[errorType].desc}</p>
        </div>
      )}

      {!loading && info && (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 w-full max-w-sm flex flex-col items-center gap-5">
          {/* Иконка */}
          <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center">
            <FileIcon mimeType={info.mime_type} />
          </div>

          {/* Мета */}
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900 break-words">{info.title}</h1>
            <p className="text-sm text-slate-400 mt-1 break-all">{info.original_filename}</p>
          </div>

          {/* Бейджи */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
              {getMimeLabel(info.mime_type)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
              {formatSize(info.file_size)}
            </span>
          </div>

          {/* Кнопка скачать */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm shadow-sky-200"
          >
            {downloading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            Скачать документ
          </button>
        </div>
      )}
    </div>
  );
}