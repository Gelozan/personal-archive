import { type SidebarView } from "./AppLayout";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  activeView: SidebarView;
  onToggle: (view: SidebarView) => void;
}

interface NavItem {
  view: SidebarView;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar({ activeView, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTrash = location.pathname === "/trash";
  const navItems: NavItem[] = [
    {
      view: "folders",
      label: "Папки",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      ),
    },
    {
      view: "categories",
      label: "Категории",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center w-14 bg-white border-r border-slate-200 py-4 gap-1 shrink-0">

      {/* Логотип */}
      <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center mb-4 shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>

      {/* Навигационные кнопки */}
      {navItems.map((item) => (
        <button
          key={item.view}
          onClick={() => onToggle(item.view)}
          title={item.label}
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center transition-all
            ${activeView === item.view
              ? "bg-sky-50 text-sky-600"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}
          `}
        >
          {item.icon}
        </button>
      ))}

      {/* Нижние кнопки — корзина и профиль */}
      <div className="flex flex-col items-center gap-1 mt-auto">
        <button
          onClick={() => navigate("/trash")}
          title="Корзина"
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          ${isTrash
          ? "bg-red-50 text-red-400"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>

        <button
          title="Профиль"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </button>
      </div>
    </div>
  );
}