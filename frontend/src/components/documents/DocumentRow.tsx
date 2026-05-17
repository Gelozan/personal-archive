import { useState } from "react";
import type { Document } from "@/types";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/ContextMenu";

interface DocumentRowProps {
  document: Document;
  onClick: () => void;
  onShare?: () => void;
  onTrash?: () => void;
  onDownload?: () => void;
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

export default function DocumentRow({ document, onClick, onShare, onTrash, onDownload }: DocumentRowProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const menuItems: ContextMenuItem[] = [
    {
      label: "Скачать",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
      onClick: () => onDownload?.(),
    },
    {
      label: "Поделиться",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>,
      onClick: () => onShare?.(),
    },
    {
      label: "В корзину",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
      onClick: () => onTrash?.(),
      danger: true,
      dividerBefore: true,
    },
  ];

  return (
    <>
    <div
      onClick={onClick}
      onContextMenu={handleContextMenu}
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
        {formatDate(document.updated_at)}
      </span>
    </div>
    {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}