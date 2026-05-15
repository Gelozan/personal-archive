interface FolderCardProps {
  name: string;
  onClick: () => void;
}

export default function FolderCard({ name, onClick }: FolderCardProps) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer
        hover:bg-slate-100 active:bg-slate-200 transition-all duration-100 select-none"
    >
      {/* Иконка папки */}
      <div className="w-16 h-16 flex items-center justify-center">
        <svg className="w-14 h-14 text-sky-400 group-hover:text-sky-500 transition-colors"
          viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15z" />
          <path d="M3.75 9.75A.75.75 0 013 9V6a3 3 0 013-3h2.25a3 3 0 012.4 1.2l.6.8h5.55a3 3 0 013 3v.75a.75.75 0 01-.75.75H3.75z"
            opacity="0.6" />
        </svg>
      </div>

      {/* Название */}
      <p className="text-sm text-slate-700 text-center leading-tight max-w-full
        line-clamp-2 break-all">
        {name}
      </p>
    </div>
  );
}
