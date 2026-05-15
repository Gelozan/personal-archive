interface FolderRowProps {
  name: string;
  onClick: () => void;
}

export default function FolderRow({ name, onClick }: FolderRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 pl-3 pr-12 py-3.5 rounded-lg cursor-pointer
        hover:bg-slate-100 active:bg-slate-200 transition-all duration-100"
    >
      <svg className="w-5 h-5 shrink-0 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15z" />
        <path d="M3.75 9.75A.75.75 0 013 9V6a3 3 0 013-3h2.25a3 3 0 012.4 1.2l.6.8h5.55a3 3 0 013 3v.75a.75.75 0 01-.75.75H3.75z"
          opacity="0.6" />
      </svg>
      <span className="flex-1 text-base text-slate-700 truncate">{name}</span>
    </div>
  );
}