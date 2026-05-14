import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/axios";
import { useAuthStore } from "@/store/authStore";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { AuthLayout } from "@/components/AuthLayout";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/v1/auth/login", { email, password });
      setAuth(data.access_token, data.refresh_token);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Вход в аккаунт">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Пароль"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-sky-500 hover:text-sky-600 hover:underline">
            Забыли пароль?
          </Link>
        </div>
        <Button type="submit" loading={loading}>Войти</Button>
        <p className="text-center text-sm text-slate-500">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-sky-500 hover:text-sky-600 font-medium hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}