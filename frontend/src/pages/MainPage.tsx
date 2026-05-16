import { useState } from "react";
import Header from "@/components/layout/Header";
import AppLayout from "@/components/layout/AppLayout";
import DocumentGrid from "@/components/documents/DocumentGrid";
import UploadModal from "@/components/documents/UploadModal";
import DocumentViewer from "@/components/documents/DocumentViewer"; // +
import type { Document } from "@/types";

export default function MainPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDocumentUpdate(updated: Document) {
    setSelectedDoc(updated);
    setRefreshKey((k) => k + 1);
  }

  function handleDocumentTrashed() {
    setSelectedDoc(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <AppLayout>
      <div className="flex flex-col flex-1 min-w-0">
        <Header onUpload={() => setUploadOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <DocumentGrid
            key={refreshKey}
            onDocumentClick={(doc) => setSelectedDoc(doc)}
          />
        </main>
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdate={handleDocumentUpdate}
          onTrash={handleDocumentTrashed}
        />
      )}
    </AppLayout>
  );
}