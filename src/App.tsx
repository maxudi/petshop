// src/App.tsx
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import Customers from "./components/Customers";

interface UserProfile {
  tenant_id: string;
  role: string;
  full_name: string;
}

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Verifica se já existe uma sessão ativa ao carregar a página
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id, role, full_name")
          .eq("id", session.user.id)
          .single();
          
        if (profile) setUserProfile(profile);
      }
      setCheckingAuth(false);
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
        Carregando ambiente seguro...
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login
  if (!userProfile) {
    return <Login onLoginSuccess={(profile) => setUserProfile(profile)} />;
  }

  // Se estiver logado, exibe o Dashboard / Painel do Pet Shop
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-800">🐾 Painel Administrativo</h1>
          <p className="text-xs text-slate-500">Olá, {userProfile.full_name} ({userProfile.role})</p>
        </div>
        <button 
          onClick={handleLogout}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          Sair
        </button>
      </header>

      {/* Área de Conteúdo Principal Dinâmico */}
      <main className="mt-8">
        <Customers />
      </main>
    </div>
  );
}