import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/api/axios";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function parseApiError(err: any): string {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) return detail[0].msg ?? "Ошибка";
    return "Ссылка недействительна или истекла";
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (password.length < 8) errs.password = "Минимум 8 символов";
    if (password !== confirm) errs.confirm = "Пароли не совпадают";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset-password", { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setErrors({ general: parseApiError(err) });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Пароль изменён">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm text-slate-600">Пароль успешно изменён. Перенаправляем на страницу входа...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Новый пароль">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Input
            label="Новый пароль"
            type="password"
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
            error={errors.password}
            required
            autoFocus
          />
          {password.length > 0 && password.length < 8 && !errors.password && (
            <p className="text-xs text-amber-500 pl-1">Ещё {8 - password.length} симв.</p>
          )}
          {password.length >= 8 && (
            <p className="text-xs text-green-600 pl-1">✓ Длина подходит</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Input
            label="Повторите пароль"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
            error={errors.confirm}
            required
          />
          {confirm.length > 0 && confirm !== password && !errors.confirm && (
            <p className="text-xs text-red-500 pl-1">Пароли не совпадают</p>
          )}
          {confirm.length > 0 && confirm === password && (
            <p className="text-xs text-green-600 pl-1">✓ Пароли совпадают</p>
          )}
        </div>
        {errors.general && <p className="text-sm text-red-500 text-center">{errors.general}</p>}
        <Button type="submit" loading={loading}>Сохранить пароль</Button>
        <Link to="/login" className="text-center text-sm text-slate-500 hover:text-slate-700">
          ← Вернуться ко входу
        </Link>
      </form>
    </AuthLayout>
  );
}