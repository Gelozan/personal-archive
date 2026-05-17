// frontend/src/components/ui/MoveToFolderModal.tsx
import { useState } from "react";
import FolderTreeSelect from "@/components/folders/FolderTreeSelect";

interface MoveToFolderModalProps {
  itemName: string;
  currentFolderId: number | null;
  onClose: () => void;
  onMove: (folderId: number | null) => Promise<void>;
}

export default function MoveToFolderModal({
  itemName, currentFolderId, onClose, onMove,
}: MoveToFolderModalProps) {
  const [targetId, setTargetId] = useState<number | null>(currentFolderId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onMove(targetId);
      onClose();
    } catch {
      setError("Не удалось переместить");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Переместить</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">«{itemName}»</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="block text-xs font-medium text-slate-500 mb-1.5">Переместить в</label>
        <FolderTreeSelect value={targetId} onChange={setTargetId} />

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border border-slate-200
              text-slate-600 hover:bg-slate-50 transition-all">
            Отмена
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2 text-sm rounded-lg bg-sky-500 text-white
              hover:bg-sky-600 disabled:opacity-50 transition-all">
            {loading ? "Перемещение..." : "Переместить"}
          </button>
        </div>
      </div>
    </div>
  );
}