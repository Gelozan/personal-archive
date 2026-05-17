import type { ReactNode } from "react";
import type { ContextMenuItem } from "@/components/ui/ContextMenu";
import ContextMenu from "@/components/ui/ContextMenu";
import { useState } from "react";

interface GridWrapperProps {
  children: ReactNode;
  onDrop: (e: React.DragEvent) => void;
  bgMenuItems: ContextMenuItem[];
}

export default function GridWrapper({ children, onDrop, bgMenuItems }: GridWrapperProps) {
  const [bgMenu, setBgMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      className="min-h-full"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          setBgMenu({ x: e.clientX, y: e.clientY });
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {children}

      {bgMenu && (
        <ContextMenu
          x={bgMenu.x} y={bgMenu.y}
          items={bgMenuItems}
          onClose={() => setBgMenu(null)}
        />
      )}
    </div>
  );
}