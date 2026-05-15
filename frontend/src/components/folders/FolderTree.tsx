import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import type { Folder } from "@/types";


export default function FolderTree() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeFolderId, setActiveFolder } = useNavigationStore();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/api/v1/folders/");
        setFolders(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
      {/* Корневая папка — всегда первая */}
      <FolderItem
        label="Все документы"
        depth={0}
        isActive={activeFolderId === null}
        onClick={() => setActiveFolder(null, "Все документы")}
        isRoot
      />

      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          depth={0}
          activeFolderId={activeFolderId}
          onSelect={(id, name) => setActiveFolder(id, name)}
        />
      ))}

      {/* Кнопка создания папки */}
      <button
        onClick={() => {/* откроем модалку позже */}}
        className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 rounded-lg
          text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Новая папка
      </button>
    </div>
  );
}

// Рекурсивный компонент — рисует папку и её вложенные папки
interface FolderNodeProps {
  folder: Folder;
  depth: number;
  activeFolderId: number | null;
  onSelect: (id: number, name: string) => void;
}

function FolderNode({ folder, depth, activeFolderId, onSelect }: FolderNodeProps) {
  // Раскрыта ли папка (показывать ли children)
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <FolderItem
        label={folder.name}
        depth={depth}
        isActive={activeFolderId === folder.id}
        hasChildren={hasChildren}
        expanded={expanded}
        onClick={() => onSelect(folder.id, folder.name)}
        onExpandToggle={() => setExpanded((prev) => !prev)}
      />

      {/* Вложенные папки — показываем только если expanded */}
      {expanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Визуальный компонент одной строки папки
interface FolderItemProps {
  label: string;
  depth: number;
  isActive: boolean;
  isRoot?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onClick: () => void;
  onExpandToggle?: () => void;
}

function FolderItem({
  label, depth, isActive, isRoot = false,
  hasChildren, expanded, onClick, onExpandToggle,
}: FolderItemProps) {
  return (
    <div
      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer
        text-sm transition-all select-none group
        ${isActive
          ? "bg-sky-50 text-sky-700 font-medium"
          : "text-slate-600 hover:bg-slate-100"
        }`}
      style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
      onClick={onClick}
    >
      {/* Стрелка раскрытия — только если есть дочерние папки */}
      <button
        className={`w-4 h-4 flex items-center justify-center shrink-0 rounded
          transition-transform ${expanded ? "rotate-90" : ""}
          ${hasChildren ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => {
          e.stopPropagation(); // не вызывать onClick родителя
          onExpandToggle?.();
        }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Иконка папки */}
      <svg
        className={`w-4 h-4 shrink-0 ${isActive ? "text-sky-500" : "text-slate-400"}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
      >
        {isRoot ? (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        )}
      </svg>

      {/* Название */}
      <span className="truncate text-xs">{label}</span>
    </div>
  );
}