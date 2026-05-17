import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import DocumentCard from "./DocumentCard";
import DocumentRow from "./DocumentRow";
import FolderCard from "@/components/folders/FolderCard";
import FolderRow from "@/components/folders/FolderRow";
import type { Document, Folder } from "@/types";
import { EMPTY_FILTERS } from "@/components/layout/SearchFilters";
import FolderActionModal from "@/components/ui/FolderActionModal";

interface DocumentGridProps {
  onDocumentClick: (doc: Document) => void;
  onDocumentShare?: (doc: Document) => void;
  onRefresh?: () => void;
}

export default function DocumentGrid({ onDocumentClick, onDocumentShare, onRefresh }: DocumentGridProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const { activeFolderId, activeCategoryId, viewMode, searchQuery, filters,setActiveFolder } = useNavigationStore();

  const isSearchMode = searchQuery.trim() !== "" || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const [folderModal, setFolderModal] = useState<{mode: "rename" | "create-child"; folder: Folder;} | null>(null);

  
  async function load() {
    setLoading(true);
    try {
    // Режим поиска
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

    // Обычный режим
    if (activeCategoryId === null) {
        const { data } = await api.get("/api/v1/folders/children", {
        params: { folder_id: activeFolderId },
        });
        setFolders(data);
    } else {
        setFolders([]);
    }

    // Загружаем документы
    const params: Record<string, string | number> = {};
    if (activeFolderId !== null) params.folder_id = activeFolderId;
    if (activeCategoryId !== null) params.category_id = activeCategoryId;
    const { data } = await api.get("/api/v1/documents/", { params });
    setDocuments(data);
    } finally {
    setLoading(false);
    }
  }
    

  useEffect(() => { load(); }, [activeFolderId, activeCategoryId, searchQuery, filters]);

  function handleFolderClick(folder: Folder) {
    setActiveFolder(folder.id, folder.name);
  }

  async function handleDownload(doc: Document) {
    try {
      const { data } = await api.get(`/api/v1/documents/${doc.id}/download`);
      const presignedUrl: string = data.url;
      const response = await fetch(presignedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement("a");
      a.href = url;
      a.download = doc.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Ошибка скачивания");
    }
  }

  async function handleDocumentTrash(doc: Document) {
    try {
      await api.delete(`/api/v1/documents/${doc.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      onRefresh?.();
    } catch {
      console.error("Ошибка удаления");
    }
  }

  async function handleFolderDelete(folder: Folder) {
    if (!confirm(`Удалить папку «${folder.name}»? Все вложенные документы будут отправлены в корзину.`)) return;
    try {
      await api.delete(`/api/v1/folders/${folder.id}`);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    } catch {
      console.error("Ошибка удаления папки");
    }
  }

  async function handleFolderRename(folder: Folder, newName: string) {
    await api.patch(`/api/v1/folders/${folder.id}`, { name: newName });
    setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, name: newName } : f));
  }

  async function handleCreateChild(parentFolder: Folder, name: string) {
    await api.post("/api/v1/folders/", { name, parent_id: parentFolder.id });
    // Если сейчас смотрим внутрь этой папки — перезагружаем
    if (activeFolderId === parentFolder.id) await load();
  }

  // Скелетон
  if (loading) {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3">
              <div className="w-16 h-16 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-3 w-14 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      );
    }
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
    if (searchQuery.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">Ничего не найдено</p>
          <p className="text-xs text-slate-400 mt-1">Попробуйте изменить запрос или фильтры</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600">Папка пуста</p>
        <p className="text-xs text-slate-400 mt-1">Загрузите документ или создайте папку</p>
      </div>
    );
  }
  
  function folderCardProps(folder: Folder) {
    return {
      name: folder.name,
      onClick: () => handleFolderClick(folder),
      onRename: () => setFolderModal({ mode: "rename", folder }),
      onCreateChild: () => setFolderModal({ mode: "create-child", folder }),
      onDelete: () => handleFolderDelete(folder),
    };
  }

  function docCardProps(doc: Document) {
    return {
      document: doc,
      onClick: () => onDocumentClick(doc),
      onDownload: () => handleDownload(doc),
      onTrash: () => handleDocumentTrash(doc),
      onShare: () => onDocumentShare?.(doc),
    };
  }
  
  return (
    <>
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
    </>
  );
}