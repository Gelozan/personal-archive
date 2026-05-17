import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import DocumentCard from "./DocumentCard";
import DocumentRow from "./DocumentRow";
import FolderCard from "@/components/folders/FolderCard";
import FolderRow from "@/components/folders/FolderRow";
import type { Document, Folder } from "@/types";
import { EMPTY_FILTERS } from "@/components/layout/SearchFilters";
import FolderActionModal from "@/components/ui/FolderActionModal";
import MoveToFolderModal from "@/components/ui/MoveToFolderModal";
import GridWrapper from "./GridWrapper";
import type { ContextMenuItem } from "@/components/ui/ContextMenu";

interface DocumentGridProps {
  onDocumentClick: (doc: Document) => void;
  onDocumentShare?: (doc: Document) => void;
  onUpload?: () => void;
  selectedDocId: number | null;
  onSelectedDocTrashed: () => void;
}

export default function DocumentGrid({ onDocumentClick, onDocumentShare, onUpload, selectedDocId, onSelectedDocTrashed }: DocumentGridProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderModal, setFolderModal] = useState<{ mode: "rename" | "create-child"; folder: Folder; } | null>(null);
  const [moveModal, setMoveModal] = useState<{ type: "folder" | "doc"; item: Folder | Document } | null>(null);

  const { activeFolderId, activeCategoryId, viewMode, searchQuery, filters, setActiveFolder, refreshTick, triggerRefresh } = useNavigationStore();

  const isSearchMode = searchQuery.trim() !== "" || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  // Drag & drop
  const [dragging, setDragging] = useState<{ type: "doc" | "folder"; id: number } | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isSearchMode) {
        setFolders([]);
        const params: Record<string, string | number> = {
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
        };
        if (searchQuery.trim()) params.q = searchQuery.trim();
        if (filters.mime_type) params.mime_type = filters.mime_type;
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;
        if (filters.size_min) params.size_min = Number(filters.size_min) * 1024;
        if (filters.size_max) params.size_max = Number(filters.size_max) * 1024;
        const { data } = await api.get("/api/v1/search/", { params });
        setDocuments(data);
        return;
      }
      if (activeCategoryId === null) {
        const { data } = await api.get("/api/v1/folders/children", {
          params: { folder_id: activeFolderId },
        });
        setFolders(data);
      } else {
        setFolders([]);
      }
      const params: Record<string, string | number> = {};
      if (activeFolderId   !== null) params.folder_id   = activeFolderId;
      if (activeCategoryId !== null) params.category_id = activeCategoryId;
      const { data } = await api.get("/api/v1/documents/", { params });
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, activeCategoryId, searchQuery, filters, isSearchMode]);

  useEffect(() => { load(); }, [load, refreshTick]);

  async function handleDownload(doc: Document) {
    try {
      const { data } = await api.get(`/api/v1/documents/${doc.id}/download`);
      const response = await fetch(data.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement("a");
      a.href = url;
      a.download = doc.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch { console.error("Ошибка скачивания"); }
  }

  async function handleDocumentTrash(doc: Document) {
    try {
      await api.delete(`/api/v1/documents/${doc.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (doc.id === selectedDocId) onSelectedDocTrashed();
      triggerRefresh();
    } catch { console.error("Ошибка удаления"); }
  }

  async function handleFolderDelete(folder: Folder) {
    if (!confirm(`Удалить папку «${folder.name}»? Все вложенные документы будут отправлены в корзину.`)) return;
    try {
      await api.delete(`/api/v1/folders/${folder.id}`);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      triggerRefresh();
    } catch { console.error("Ошибка удаления папки"); }
  }

  async function handleFolderRename(folder: Folder, newName: string) {
    await api.patch(`/api/v1/folders/${folder.id}`, { name: newName });
    setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, name: newName } : f));
    triggerRefresh();
  }

  async function handleCreateChild(parentFolder: Folder, name: string) {
    await api.post("/api/v1/folders/", { name, parent_id: parentFolder.id });
    triggerRefresh();
    if (activeFolderId === parentFolder.id) await load();
  }

  async function handleDrop(targetFolderId: number) {
    if (!dragging) return;
    setDragOver(null);
    try {
      if (dragging.type === "doc") {
        await api.patch(`/api/v1/documents/${dragging.id}`, { folder_id: targetFolderId });
      } else {
        await api.patch(`/api/v1/folders/${dragging.id}`, { parent_id: targetFolderId });
      }
      triggerRefresh();
      await load();
    } catch { console.error("Ошибка перемещения"); }
    setDragging(null);
  }

  function handleGridDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(null);
    setDragOver(null);
  }

  function startLongPress(callback: () => void) {
    return {
      onTouchStart: () => { longPressTimer.current = setTimeout(callback, 500); },
      onTouchEnd: () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); },
      onTouchMove: () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); },
    };
  }

  function folderCardProps(folder: Folder) {
    return {
      name: folder.name,
      isDragOver: dragOver === folder.id,
      onClick: () => setActiveFolder(folder.id, folder.name),
      onRename: () => setFolderModal({ mode: "rename", folder }),
      onMove: () => setMoveModal({ type: "folder", item: folder }),
      onCreateChild: () => setFolderModal({ mode: "create-child", folder }),
      onDelete: () => handleFolderDelete(folder),
      draggable: true,
      onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; setDragging({ type: "folder", id: folder.id }); },
      onDragEnd: () => { setDragging(null); setDragOver(null); },
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (dragging && dragging.id !== folder.id) setDragOver(folder.id); },
      onDragLeave: () => setDragOver(null),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); handleDrop(folder.id); },
      longPressHandlers: startLongPress(() => setFolderModal({ mode: "rename", folder })),
    };
  }

  function docCardProps(doc: Document) {
    return {
      document: doc,
      onClick: () => onDocumentClick(doc),
      onDownload: () => handleDownload(doc),
      onTrash: () => handleDocumentTrash(doc),
      onShare: () => onDocumentShare?.(doc),
      draggable: true,
      onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; setDragging({ type: "doc", id: doc.id }); },
      onDragEnd: () => { setDragging(null); setDragOver(null); },
      longPressHandlers: startLongPress(() => {}),
      onMove: () => setMoveModal({ type: "doc", item: doc }),
    };
  }

  const bgMenuItems: ContextMenuItem[] = [
    {
      label: "Загрузить файл",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
      onClick: () => onUpload?.(),
    },
    {
      label: "Создать папку",
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
      onClick: () => setFolderModal({
        mode: "create-child",
        folder: { id: activeFolderId ?? -1, name: "текущая папка" } as Folder,
      }),
    },
  ];

  // Скелетон
  if (loading) {
    if (viewMode === "grid") return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-3">
            <div className="w-16 h-16 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-3 w-14 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    );
    return (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const isEmpty = folders.length === 0 && documents.length === 0;

  if (isEmpty) {
    return (
      <GridWrapper onDrop={handleGridDrop} bgMenuItems={bgMenuItems}>
        {isSearchMode ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">Ничего не найдено</p>
            <p className="text-xs text-slate-400 mt-1">Попробуйте изменить запрос или фильтры</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">Папка пуста</p>
            <p className="text-xs text-slate-400 mt-1">Загрузите документ или создайте папку</p>
          </div>
        )}
      </GridWrapper>
    );
  }

  return (
    <GridWrapper onDrop={handleGridDrop} bgMenuItems={bgMenuItems}>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folders.map((f) => <FolderCard key={`folder-${f.id}`} {...folderCardProps(f)} />)}
          {documents.map((doc) => <DocumentCard key={`doc-${doc.id}`} {...docCardProps(doc)} />)}
        </div>
      ) : (
        <div>
          {documents.length > 0 && (
            <div className="flex items-center gap-3 pl-3 pr-12 py-1 mb-1">
              <span className="flex-1 text-xs text-slate-400 font-medium">Имя</span>
              <span className="text-xs text-slate-400 font-medium w-20 text-right">Размер</span>
              <span className="text-xs text-slate-400 font-medium w-28 text-right">Изменён</span>
            </div>
          )}
          {folders.map((f) => <FolderRow key={`folder-${f.id}`} {...folderCardProps(f)} />)}
          {documents.map((doc) => <DocumentRow key={`doc-${doc.id}`} {...docCardProps(doc)} />)}
        </div>
      )}

      {folderModal && (
        <FolderActionModal
          mode={folderModal.mode}
          initialName={folderModal.mode === "rename" ? folderModal.folder.name : ""}
          parentName={folderModal.folder.name}
          onConfirm={(name) =>
            folderModal.mode === "rename"
              ? handleFolderRename(folderModal.folder, name)
              : handleCreateChild(folderModal.folder, name)
          }
          onClose={() => setFolderModal(null)}
        />
      )}
      {moveModal && (
        <MoveToFolderModal
          itemName={
          moveModal.type === "folder"
            ? (moveModal.item as Folder).name
            : (moveModal.item as Document).original_filename
          }
          currentFolderId={
          moveModal.type === "folder"
            ? (moveModal.item as Folder).parent_id ?? null
            : (moveModal.item as Document).folder_id ?? null
          }
          onClose={() => setMoveModal(null)}
          onMove={async (folderId) => {
          if (moveModal.type === "folder") {
            const folder = moveModal.item as Folder;
            if (folderId === folder.id) throw new Error("Нельзя переместить папку саму в себя");
            await api.patch(`/api/v1/folders/${folder.id}`, { parent_id: folderId });
          } else {
            const doc = moveModal.item as Document;
            await api.patch(`/api/v1/documents/${doc.id}`, { folder_id: folderId });
          }
          triggerRefresh();
          await load();
          }}
        />
      )}
    </GridWrapper>
  );
}