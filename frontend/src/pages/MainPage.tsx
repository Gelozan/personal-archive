import { useState } from "react";
import Header from "@/components/layout/Header";
import AppLayout from "@/components/layout/AppLayout";
import DocumentGrid from "@/components/documents/DocumentGrid";
import UploadModal from "@/components/documents/UploadModal";
import DocumentViewer from "@/components/documents/DocumentViewer";
import type { Document } from "@/types";

export default function MainPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  function handleDocumentUpdate(updated: Document) {
    setSelectedDoc(updated);
  }

  function handleDocumentTrashed() {
    setSelectedDoc(null);
  }

  return (
    <AppLayout>
      <div className="flex flex-col flex-1 min-w-0">
        <Header onUpload={() => setUploadOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <DocumentGrid
            onDocumentClick={(doc) => setSelectedDoc(doc)}
            onDocumentShare={(doc) => { /* заглушка */ }}
            selectedDocId={selectedDoc?.id ?? null}
            onSelectedDocTrashed={() => setSelectedDoc(null)}
          />
        </main>
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {}} 
        />
      )}

      {selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdate={handleDocumentUpdate}
          onTrash={(id) => {
            setSelectedDoc(null);
          }}
        />
      )}
    </AppLayout>
  );
}