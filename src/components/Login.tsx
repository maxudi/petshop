// src/components/Login.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

interface LoginProps {
  onLoginSuccess: (profile: { tenant_id: string; role: string; full_name: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Autentica o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData?.user) {
        // 2. Busca o perfil vinculado para capturar o tenant_id da empresa
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id, role, full_name")
          .eq("id", authData.user.id)
          .single();

        if (profileError) throw new Error("Erro ao carregar perfil organizacional.");

        // 3. Retorna o sucesso para o componente pai
        if (profileData) {
          onLoginSuccess(profileData);
        }
      }
    } catch (err: any) {
      setError(err.message || "Falha ao realizar login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
            🐾 PetShop Gestão
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Entre para gerenciar seu Pet Shop ou Hospedagem
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                className="relative block w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 placeholder-slate-400 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                className="relative block w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 placeholder-slate-400 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all active:scale-98"
            >
              {loading ? "Autenticando..." : "Entrar no Sistema"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}