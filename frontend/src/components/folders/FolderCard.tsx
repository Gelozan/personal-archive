import { useState } from "react";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/ContextMenu";

interface FolderCardProps {
  name: string;
  isDragOver?: boolean;
  onClick: () => void;
  onRename?: () => void;
  onCreateChild?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  longPressHandlers?: {
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onTouchMove: () => void;
  };
}

export default function FolderCard({ name, isDragOver, onClick, onRename, onCreateChild, onDelete, 
    draggable, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, longPressHandlers,}: FolderCardProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const menuItems: ContextMenuItem[] = [
    {
      label: "Переименовать",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>,
      onClick: () => onRename?.(),
    },
    {
      label: "Создать вложенную",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
      onClick: () => onCreateChild?.(),
    },
    {
      label: "Удалить",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
      onClick: () => onDelete?.(),
      danger: true,
      dividerBefore: true,
    },
  ];
  
  return (
    <>
    <div
      onClick={onClick}
      onContextMenu={handleContextMenu}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      {...(longPressHandlers ?? {})}
      className={`group flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-150 select-none
      ${isDragOver
        ? "bg-sky-100 border-2 border-sky-400 border-dashed scale-105"
        : "hover:bg-slate-100 active:bg-slate-200"
      }`}
    >
      {/* Иконка папки */}
      <div className="w-16 h-16 flex items-center justify-center">
        <svg className="w-14 h-14 text-sky-400 group-hover:text-sky-500 transition-colors"
          viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15z" />
          <path d="M3.75 9.75A.75.75 0 013 9V6a3 3 0 013-3h2.25a3 3 0 012.4 1.2l.6.8h5.55a3 3 0 013 3v.75a.75.75 0 01-.75.75H3.75z"
            opacity="0.6" />
        </svg>
      </div>

      {/* Название */}
      <p className="text-sm text-slate-700 text-center leading-tight max-w-full
        line-clamp-2 break-all">
        {name}
      </p>
    </div>
    {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
