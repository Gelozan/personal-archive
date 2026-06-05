import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне меню и по Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const menuWidth = 200;
  const menuHeight = items.length * 36 + 16;
  const left = x + menuWidth > window.innerWidth  ? x - menuWidth : x;
  const top  = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <div
      ref={ref}
      style={{ left, top }}
      className="fixed z-50 w-48 bg-white rounded-xl shadow-lg border border-slate-200
        py-1.5 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.dividerBefore && (
            <div className="my-1 border-t border-slate-100" />
          )}
          <button
            onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
            disabled={item.disabled}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              ${item.danger
                ? "text-red-500 hover:bg-red-50"
                : "text-slate-700 hover:bg-slate-100"
              }`}
          >
            <span className="w-4 h-4 shrink-0 flex items-center justify-center">
              {item.icon}
            </span>
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}