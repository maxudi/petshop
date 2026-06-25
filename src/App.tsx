// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.ts";

// Importações dos seus componentes e páginas existentes
import Login from "./components/Login.tsx";
import Customers from "./components/Customers.tsx";
import ExternalPetForm from "./components/ExternalPetForm.tsx";

// Componente de Guarda de Rota (Validação de Sessão Administrativa)
function ProtectedRouteLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão atual no Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-400 font-bold">
        Autenticando sessão administrativa...
      </div>
    );
  }

  // Se não estiver logado, joga para a tela de login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, renderiza a rota filha interna do sistema (ex: /customers)
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================================================================
            1. ROTAS PÚBLICAS (Acessíveis por qualquer pessoa SEM usuário e senha)
           ========================================================================= */}
        <Route path="/login" element={<Login />} />
        
        {/* ROTA MÁGICA: Acesso direto do Tutor através do link gerado no painel */}
        <Route path="/prontuario-externo" element={<ExternalPetForm />} />
        
        {/* Rota de Agradecimento de Sucesso (Exibida após o cliente salvar) */}
        <Route path="/obrigado" element={
          <div className="flex min-h-screen items-center justify-center bg-slate-900 text-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm border-2 border-slate-800 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl">
                🎉
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Formulário Enviado!</h2>
                <p className="text-xs text-slate-600 font-bold mt-2 leading-relaxed">
                  Os dados do seu animal foram sincronizados com sucesso. Já pode fechar esta aba do seu navegador. Obrigado!
                </p>
              </div>
            </div>
          </div>
        } />

        {/* =========================================================================
            2. ROTAS PRIVADAS (Bloqueadas por RLS e Autenticação Corporativa)
           ========================================================================= */}
        <Route element={<ProtectedRouteLayout />}>
          {/* Rota raiz do painel administrativo joga direto para os Clientes */}
          <Route path="/" element={<Navigate to="/customers" replace />} />
          <Route path="/customers" element={<Customers />} />
          
          {/* Caso você adicione novas telas internas administrativas (Ex: Dashboard, Checkins), elas entram aqui: */}
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        </Route>

        {/* Fallback de segurança: qualquer rota inexistente joga para a raiz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}