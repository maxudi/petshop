// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.ts";

import Login from "./pages/Login.tsx";
import Customers from "./components/Customers.tsx";
import ExternalPetForm from "./pages/ExternalPetForm.tsx";

function ProtectedRouteLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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

  if (!session) {
    return <Navigate to="/login" replace />;
  }

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
        {/* ================= ROTAS PÚBLICAS ================= */}
        {/* Satisfeita a propriedade onLoginSuccess exigida pelo componente original */}
        <Route path="/login" element={<Login onLoginSuccess={() => {}} />} />
        
        {/* Rota pública de auto-preenchimento para o cliente final */}
        <Route path="/prontuario-externo" element={<ExternalPetForm />} />
        
        {/* Rota de Agradecimento pós-envio */}
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

        {/* ================= ROTAS PRIVADAS (PAINEL ADM) ================= */}
        <Route element={<ProtectedRouteLayout />}>
          <Route path="/" element={<Navigate to="/customers" replace />} />
          <Route path="/customers" element={<Customers />} />
        </Route>

        {/* Fallback de segurança */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}