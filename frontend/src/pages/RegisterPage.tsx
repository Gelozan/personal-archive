import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/axios";
import { useAuthStore } from "@/store/authStore";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { AuthLayout } from "@/components/AuthLayout";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!email) e.email = "Введите email";
    if (password.length < 8) e.password = "Минимум 8 символов";
    if (password !== confirm) e.confirm = "Пароли не совпадают";
    return e;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", { email, password });
      const { data } = await api.post("/api/v1/auth/login", { email, password });
      setAuth(data.access_token, data.refresh_token);
      navigate("/");
    } catch (err: any) {
      setErrors({ general: err.response?.data?.detail ?? "Ошибка регистрации" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Создать аккаунт">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          autoFocus
        />
        <Input
          label="Пароль"
          type="password"
          placeholder="Минимум 8 символов"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Input
          label="Повторите пароль"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        {errors.general && <p className="text-sm text-red-500 text-center">{errors.general}</p>}
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