import { useState } from "react";
import Header from "@/components/layout/Header";
import AppLayout from "@/components/layout/AppLayout";

export default function MainPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <AppLayout>
    <div className="flex flex-col flex-1 min-w-0">
      <Header onUpload={() => setUploadOpen(true)} />

      <main className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-slate-400">Документы появятся здесь</p>
      </main>
    </div>
    </AppLayout>
  );
}