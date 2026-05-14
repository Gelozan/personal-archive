import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400 outline-none transition-all
          border-slate-200 bg-white
          focus:border-sky-400 focus:ring-3 focus:ring-sky-100
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";
export default Input;