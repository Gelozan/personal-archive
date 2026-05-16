import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/axios";
import { useAuthStore } from "@/store/authStore";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { AuthLayout } from "@/components/AuthLayout";

function parseApiError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail[0].msg ?? "Ошибка";
  return "Ошибка регистрации";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email) errs.email = "Введите email";
    if (password.length < 8) errs.password = "Минимум 8 символов";
    if (password !== confirm) errs.confirm = "Пароли не совпадают";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", {
        email,
        password,
        name: name.trim() || null,
      });
      const { data } = await api.post("/api/v1/auth/login", { email, password });
      setAuth(data.access_token, data.refresh_token);
      navigate("/");
    } catch (err: any) {
      setErrors({ general: parseApiError(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Создать аккаунт">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Имя"
          type="text"
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <div className="flex flex-col gap-1">
          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
            error={errors.password}
            required
          />
          {password.length > 0 && password.length < 8 && !errors.password && (
            <p className="text-xs text-amber-500 pl-1">
              Ещё {8 - password.length} симв.
            </p>
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
        {errors.general && (
          <p className="text-sm text-red-500 text-center">{errors.general}</p>
        )}
        <Button type="submit" loading={loading}>Зарегистрироваться</Button>
        <p className="text-center text-sm text-slate-500">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-sky-500 hover:text-sky-600 font-medium hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}