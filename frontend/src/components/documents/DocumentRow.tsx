import type { Document } from "@/types";

interface DocumentRowProps {
  document: Document;
  onClick: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMimeColor(mimeType: string): string {
  if (mimeType === "application/pdf") return "text-red-400";
  if (mimeType.startsWith("image/")) return "text-emerald-400";
  if (mimeType.includes("word") || mimeType.includes("document")) return "text-blue-400";
  return "text-slate-400";
}

export default function DocumentRow({ document, onClick }: DocumentRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 pl-3 pr-12 py-3.5 rounded-lg cursor-pointer
        hover:bg-slate-100 active:bg-slate-200 transition-all duration-100 group"
    >
      {/* Иконка */}
      <svg className={`w-5 h-5 shrink-0 ${getMimeColor(document.mime_type)}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>

      {/* Название */}
      <span className="flex-1 text-base text-slate-700 truncate">{document.title}</span>

      {/* Размер */}
      <span className="text-sm text-slate-400 w-20 text-right shrink-0">
        {formatSize(document.file_size)}
      </span>

      {/* Дата */}
      <span className="text-sm text-slate-400 w-28 text-right shrink-0">
        {formatDate(document.created_at)}
      </span>
    </div>
  );
}