import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/axios";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/v1/auth/forgot-password", { email });
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Письмо отправлено">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
            </svg>
          </div>
          <p className="text-sm text-slate-600">
            Если аккаунт с адресом <span className="font-medium text-slate-900">{email}</span> существует —
            мы отправили инструкцию по сбросу пароля.
          </p>
          <Link to="/login" className="text-sm text-sky-500 hover:underline">
            Вернуться ко входу
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Сброс пароля">
      <p className="text-sm text-slate-500 text-center -mt-2 mb-2">
        Введите email — пришлём ссылку для сброса пароля
      </p>
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
        <Button type="submit" loading={loading}>Отправить ссылку</Button>
        <Link to="/login" className="text-center text-sm text-slate-500 hover:text-slate-700">
          ← Вернуться ко входу
        </Link>
      </form>
    </AuthLayout>
  );
}