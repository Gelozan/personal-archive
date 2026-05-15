import { useEffect, useState } from "react";
import { api } from "@/api/axios";
import { useNavigationStore } from "@/store/navigationStore";
import DocumentCard from "./DocumentCard";
import DocumentRow from "./DocumentRow";
import FolderCard from "@/components/folders/FolderCard";
import FolderRow from "@/components/folders/FolderRow";
import type { Document, Folder } from "@/types";

interface DocumentGridProps {
  onDocumentClick: (doc: Document) => void;
}

export default function DocumentGrid({ onDocumentClick }: DocumentGridProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const { activeFolderId, activeCategoryId, viewMode, setActiveFolder } =
    useNavigationStore();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Загружаем вложенные папки (только если не фильтр по категории)
        if (activeCategoryId === null) {
          const { data } = await api.get("/api/v1/folders/children", { params: { folder_id: activeFolderId } });
          setFolders(data);
        } else {
          setFolders([]);
        }

        // Загружаем документы
        const params: Record<string, string | number> = {};
        if (activeFolderId !== null) params.folder_id = activeFolderId;
        if (activeCategoryId !== null) params.category_id = activeCategoryId;
        const docsRes = await api.get("/api/v1/documents/", { params });
        setDocuments(docsRes.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeFolderId, activeCategoryId]);

  function handleFolderClick(folder: Folder) {
    setActiveFolder(folder.id, folder.name);
  }

  // Скелетон
  if (loading) {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
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

  // Режим сетки
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {folders.map((folder) => (
          <FolderCard
            key={`folder-${folder.id}`}
            name={folder.name}
            onClick={() => handleFolderClick(folder)}
          />
        ))}
        {documents.map((doc) => (
          <DocumentCard
            key={`doc-${doc.id}`}
            document={doc}
            onClick={() => onDocumentClick(doc)}
          />
        ))}
      </div>
    );
  }

  // Режим списка
  return (
    <div>
      {/* Заголовок колонок */}
      {documents.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-1 mb-1">
          <span className="flex-1 text-xs text-slate-400 font-medium">Имя</span>
          <span className="text-xs text-slate-400 font-medium w-20 text-right">Размер</span>
          <span className="text-xs text-slate-400 font-medium w-28 text-right">Изменён</span>
        </div>
      )}

      {folders.map((folder) => (
        <FolderRow
          key={`folder-${folder.id}`}
          name={folder.name}
          onClick={() => handleFolderClick(folder)}
        />
      ))}
      {documents.map((doc) => (
        <DocumentRow
          key={`doc-${doc.id}`}
          document={doc}
          onClick={() => onDocumentClick(doc)}
        />
      ))}
    </div>
  );
}