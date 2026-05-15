import { useEffect, useRef, useState } from "react";
import { api } from "@/api/axios";
import type { Folder } from "@/types";

interface FolderTreeSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

export default function FolderTreeSelect({ value, onChange }: FolderTreeSelectProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("— Корень (без папки)");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/api/v1/folders/")
      .then((r) => {
        setFolders(r.data);
        // Восстанавливаем label если value уже выбран
        if (value !== null) {
          const found = findFolder(r.data, value);
          if (found) setSelectedLabel(found.name);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Закрытие по клику вне компонента
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(id: number | null, label: string) {
    onChange(id);
    setSelectedLabel(label);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {/* Триггер — выглядит как select */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm
          rounded-lg border transition-all bg-white text-left
          ${open
            ? "border-sky-400 ring-2 ring-sky-100"
            : "border-slate-200 hover:border-slate-300"
          }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
          <span className={`truncate text-sm ${value === null ? "text-slate-400" : "text-slate-800"}`}>
            {loading ? "Загрузка..." : selectedLabel}
          </span>
        </div>
        <svg
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Выпадающее дерево */}
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200
          rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            <FolderSelectItem
              label="— Корень (без папки)"
              depth={0}
              isActive={value === null}
              isRoot
              onClick={() => handleSelect(null, "— Корень (без папки)")}
            />
            {folders.map((folder) => (
              <FolderSelectNode
                key={folder.id}
                folder={folder}
                depth={0}
                selectedId={value}
                onSelect={(id, label) => handleSelect(id, label)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Рекурсивный поиск папки по id
function findFolder(folders: Folder[], id: number): Folder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    if (f.children) {
      const found = findFolder(f.children, id);
      if (found) return found;
    }
  }
  return null;
}

interface FolderSelectNodeProps {
  folder: Folder;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number, label: string) => void;
}

function FolderSelectNode({ folder, depth, selectedId, onSelect }: FolderSelectNodeProps) {
  const containsSelected = (f: Folder, id: number | null): boolean => {
    if (f.id === id) return true;
    return f.children?.some((c) => containsSelected(c, id)) ?? false;
  };

  const [expanded, setExpanded] = useState(() => containsSelected(folder, selectedId));
  const hasChildren = !!folder.children?.length;

  return (
    <div>
      <FolderSelectItem
        label={folder.name}
        depth={depth}
        isActive={selectedId === folder.id}
        hasChildren={hasChildren}
        expanded={expanded}
        onClick={() => onSelect(folder.id, folder.name)}
        onExpandToggle={() => setExpanded((p) => !p)}
      />
      {expanded && hasChildren && folder.children!.map((child) => (
        <FolderSelectNode
          key={child.id}
          folder={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface FolderSelectItemProps {
  label: string;
  depth: number;
  isActive: boolean;
  isRoot?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onClick: () => void;
  onExpandToggle?: () => void;
}

function FolderSelectItem({
  label, depth, isActive, isRoot = false,
  hasChildren, expanded, onClick, onExpandToggle,
}: FolderSelectItemProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer
        text-xs transition-all select-none
        ${isActive ? "bg-sky-50 text-sky-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
      style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
      onClick={onClick}
    >
      <button
        type="button"
        className={`w-4 h-4 flex items-center justify-center shrink-0 rounded transition-transform
          ${expanded ? "rotate-90" : ""}
          ${hasChildren ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => { e.stopPropagation(); onExpandToggle?.(); }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <svg className={`w-4 h-4 shrink-0 ${isActive ? "text-sky-500" : "text-slate-400"}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        {isRoot ? (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        )}
      </svg>

      <span className="truncate">{label}</span>
    </div>
  );
}