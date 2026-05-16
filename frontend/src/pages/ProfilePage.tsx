import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/axios";
import { useAuthStore } from "@/store/authStore";

interface UserData {
  id: number;
  email: string;
  name: string | null;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { setUser, clearAuth } = useAuthStore();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Редактирование имени
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Смена пароля
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    api.get("/api/v1/users/me")
      .then(({ data }) => {
        setUserData(data);
        setName(data.name ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveName() {
    setNameLoading(true);
    setNameError(null);
    try {
      const { data } = await api.patch("/api/v1/users/me", { name: name.trim() || null });
      setUserData(data);
      setUser({ id: data.id, email: data.email, name: data.name });
      setEditingName(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setNameError(typeof detail === "string" ? detail : "Ошибка при сохранении");
    } finally {
      setNameLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) { setPasswordError("Минимум 8 символов"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
    setPasswordLoading(true);
    try {
      await api.post("/api/v1/users/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordSuccess(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setPasswordError(typeof detail === "string" ? detail : "Ошибка при смене пароля");
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate("/")}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-slate-800">Профиль</h1>
      </header>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-4">

        {/* Данные профиля */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Данные аккаунта</h2>

          {loading ? (
            <div className="space-y-3">
              <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
            </div>
          ) : (
            <>
              {/* Имя */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Имя</label>
                {editingName ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setEditingName(false);
                          setName(userData?.name ?? "");
                          setNameError(null);
                        }
                      }}
                      maxLength={100}
                      placeholder="Ваше имя"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-sky-400
                        outline-none focus:ring-2 focus:ring-sky-100 transition-all"
                    />
                    <button onClick={handleSaveName} disabled={nameLoading}
                      className="px-3 py-2 text-sm rounded-lg bg-sky-500 text-white
                        hover:bg-sky-600 transition-all disabled:opacity-40">
                      {nameLoading ? "..." : "OK"}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setName(userData?.name ?? ""); setNameError(null); }}
                      className="px-3 py-2 text-sm rounded-lg border border-slate-200
                        text-slate-500 hover:bg-slate-50 transition-all">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-700">
                      {userData?.name ?? <span className="text-slate-400">Не указано</span>}
                    </span>
                    <button onClick={() => { setEditingName(true); setName(userData?.name ?? ""); }}
                      className="text-xs text-sky-500 hover:text-sky-600 transition-all">
                      Изменить
                    </button>
                  </div>
                )}
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Email</label>
                <p className="text-sm text-slate-700 py-1">{userData?.email}</p>
              </div>
            </>
          )}
        </div>

        {/* Смена пароля */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Смена пароля</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Текущий пароль</label>
              <input type="password" value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                autoComplete="current-password"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                  focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Новый пароль</label>
              <input type="password" value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                autoComplete="new-password"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                  focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all" />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-amber-500">Минимум 8 символов</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Повторите новый пароль</label>
              <input type="password" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                autoComplete="new-password"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all
                  focus:outline-none focus:ring-2 focus:ring-sky-100
                  ${confirmPassword.length > 0 && confirmPassword !== newPassword
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-sky-400"}`} />
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500">Пароли не совпадают</p>
              )}
            </div>
            {passwordError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">Пароль успешно изменён</p>
            )}
            <button type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-2 text-sm rounded-lg bg-sky-500 text-white font-medium
                hover:bg-sky-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {passwordLoading ? "Сохранение..." : "Изменить пароль"}
            </button>
          </form>
        </div>

        {/* Выход */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Выйти из аккаунта</p>
              <p className="text-xs text-slate-400 mt-0.5">Вы будете перенаправлены на страницу входа</p>
            </div>
            <button onClick={() => setConfirmLogout(true)}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500
                hover:bg-red-50 transition-all">
              Выйти
            </button>
          </div>
        </div>
      </main>

      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Выйти из аккаунта?</h3>
            <p className="text-xs text-slate-500 mb-5">Вы будете перенаправлены на страницу входа.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmLogout(false)}
                className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition-all">
                Отмена
              </button>
              <button onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all">
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}