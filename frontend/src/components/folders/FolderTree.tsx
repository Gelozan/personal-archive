import { useEffect, useRef, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import type { Folder } from "@/types";

export default function FolderTree() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeFolderId, setActiveFolder } = useNavigationStore();

  // Инлайн-создание папки в корне
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const createInputRef = useRef<HTMLInputElement>(null);

  async function loadFolders() {
    try {
      const { data } = await api.get("/api/v1/folders/");
      setFolders(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFolders(); }, []);

  useEffect(() => {
    if (creatingRoot) createInputRef.current?.focus();
  }, [creatingRoot]);

  const submittedRef = useRef(false);

  async function handleCreateRoot() {
    if (submittedRef.current) return;
    if (!newFolderName.trim()) { setCreatingRoot(false); return; }
    submittedRef.current = true;
    setCreating(true);
    try {
      await api.post("/api/v1/folders/", { name: newFolderName.trim(), parent_id: null });
      setNewFolderName("");
      setCreatingRoot(false);
      await loadFolders();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || status === 400) {
        alert(`Папка с именем «${newFolderName.trim()}» уже существует`);
      }
    } finally {
      setCreating(false);
      submittedRef.current = false;
    }
  }

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
          onRefresh={loadFolders}
          onActiveFolderDeleted={() => setActiveFolder(null, "Все документы")}
          currentActiveFolderId={activeFolderId}
        />
      ))}

      {/* Инлайн-форма создания папки */}
      {creatingRoot ? (
        <div className="flex items-center gap-1 px-2 py-1">
          <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
          <input
            ref={createInputRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateRoot();
              if (e.key === "Escape") { setCreatingRoot(false); setNewFolderName(""); }
            }}
            onBlur={handleCreateRoot}
            disabled={creating}
            maxLength={255}
            placeholder="Название папки"
            className="flex-1 text-xs bg-white border border-sky-400 rounded px-1.5 py-0.5
              outline-none focus:ring-2 focus:ring-sky-100 min-w-0"
          />
        </div>
      ) : (
        <button
          onClick={() => setCreatingRoot(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg
            text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Новая папка
        </button>
      )}
    </div>
  );
}

interface FolderNodeProps {
  folder: Folder;
  depth: number;
  activeFolderId: number | null;
  currentActiveFolderId: number | null;
  onSelect: (id: number, name: string) => void;
  onRefresh: () => Promise<void>;
  onActiveFolderDeleted: () => void;
}

function FolderNode({
  folder, depth, activeFolderId, currentActiveFolderId,
  onSelect, onRefresh, onActiveFolderDeleted,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = !!folder.children?.length;

  // Состояния инлайн-редактирования
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [renameLoading, setRenameLoading] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Создание вложенной папки
  const [creatingChild, setCreatingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childLoading, setChildLoading] = useState(false);
  const childInputRef = useRef<HTMLInputElement>(null);

  // Удаление
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { if (renaming) renameInputRef.current?.focus(); }, [renaming]);
  useEffect(() => { if (creatingChild) { setExpanded(true); childInputRef.current?.focus(); } }, [creatingChild]);

  const submittedRef = useRef(false);

  async function handleRename() {
    if (submittedRef.current) return;
    if (!renameName.trim() || renameName.trim() === folder.name) {
      setRenaming(false);
      setRenameName(folder.name);
      return;
    }
    setRenameLoading(true);
    try {
      await api.patch(`/api/v1/folders/${folder.id}`, { name: renameName.trim() });
      await onRefresh();
    } finally {
      setRenameLoading(false);
      setRenaming(false);
      submittedRef.current = false;
    }
  }

  async function handleCreateChild() {
    if (submittedRef.current) return;
    if (!childName.trim()) { setCreatingChild(false); return; }
    setChildLoading(true);
    try {
      await api.post("/api/v1/folders/", { name: childName.trim(), parent_id: folder.id });
      setChildName("");
      setCreatingChild(false);
      await onRefresh();
    } finally {
      setChildLoading(false);
      submittedRef.current = false;
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/v1/folders/${folder.id}`);
      // Если удалили активную папку — переходим в корень
      if (currentActiveFolderId === folder.id) onActiveFolderDeleted();
      await onRefresh();
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div>
      {/* Строка папки */}
      {renaming ? (
        <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${0.5 + depth * 1}rem` }}>
          <svg className="w-4 h-4 shrink-0 text-sky-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
          <input
            ref={renameInputRef}
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setRenaming(false); setRenameName(folder.name); }
            }}
            onBlur={handleRename}
            disabled={renameLoading}
            maxLength={255}
            className="flex-1 text-xs bg-white border border-sky-400 rounded px-1.5 py-0.5
              outline-none focus:ring-2 focus:ring-sky-100 min-w-0"
          />
        </div>
      ) : (
        <FolderItem
          label={folder.name}
          depth={depth}
          isActive={activeFolderId === folder.id}
          hasChildren={hasChildren}
          expanded={expanded}
          onClick={() => onSelect(folder.id, folder.name)}
          onExpandToggle={() => setExpanded((p) => !p)}
          onRename={() => { setRenaming(true); setRenameName(folder.name); }}
          onCreateChild={() => setCreatingChild(true)}
          onDelete={() => setDeleteConfirm(true)}
        />
      )}

      {/* Диалог удаления */}
      {deleteConfirm && (
        <div className="mx-2 my-1 p-2.5 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-slate-700 mb-2">
            Удалить папку <span className="font-medium">«{folder.name}»</span>?
            Документы внутри потеряют привязку к папке.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              disabled={deleteLoading}
              className="flex-1 py-1 text-xs rounded bg-white border border-slate-200
                text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 py-1 text-xs rounded bg-red-500 text-white
                hover:bg-red-600 transition-all disabled:opacity-40"
            >
              {deleteLoading ? "..." : "Удалить"}
            </button>
          </div>
        </div>
      )}

      {/* Вложенные папки */}
      {expanded && (
        <div>
          {folder.children?.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
              currentActiveFolderId={currentActiveFolderId}
              onSelect={onSelect}
              onRefresh={onRefresh}
              onActiveFolderDeleted={onActiveFolderDeleted}
            />
          ))}

          {/* Инлайн-создание вложенной папки */}
          {creatingChild && (
            <div className="flex items-center gap-1 py-1"
              style={{ paddingLeft: `${0.5 + (depth + 1) * 1}rem` }}>
              <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
              <input
                ref={childInputRef}
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateChild();
                  if (e.key === "Escape") { setCreatingChild(false); setChildName(""); }
                }}
                onBlur={handleCreateChild}
                disabled={childLoading}
                maxLength={255}
                placeholder="Название папки"
                className="flex-1 text-xs bg-white border border-sky-400 rounded px-1.5 py-0.5
                  outline-none focus:ring-2 focus:ring-sky-100 min-w-0 mr-2"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FolderItemProps {
  label: string;
  depth: number;
  isActive: boolean;
  isRoot?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onClick: () => void;
  onExpandToggle?: () => void;
  onRename?: () => void;
  onCreateChild?: () => void;
  onDelete?: () => void;
}

function FolderItem({
  label, depth, isActive, isRoot = false,
  hasChildren, expanded, onClick, onExpandToggle,
  onRename, onCreateChild, onDelete,
}: FolderItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className={`relative flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer
        text-sm transition-all select-none group
        ${isActive ? "bg-sky-50 text-sky-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`}
      style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
      onClick={onClick}
    >
      {/* Стрелка */}
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

      {/* Иконка папки */}
      <svg className={`w-4 h-4 shrink-0 ${isActive ? "text-sky-500" : "text-slate-400"}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        {isRoot ? (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0121.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        )}
      </svg>

      <span className="truncate text-xs flex-1">{label}</span>

      {/* Кнопка «…» — только для не-root папок, появляется при hover */}
      {!isRoot && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-all
              text-slate-400 hover:text-slate-600 hover:bg-slate-200
              ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200
              rounded-lg shadow-lg py-1 w-44 text-xs">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onCreateChild?.(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700
                  hover:bg-slate-50 transition-all text-left"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Создать вложенную
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename?.(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700
                  hover:bg-slate-50 transition-all text-left"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Переименовать
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete?.(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-red-500
                  hover:bg-red-50 transition-all text-left"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Удалить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}