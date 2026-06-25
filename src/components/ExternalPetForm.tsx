// src/pages/ExternalPetForm.tsx
import { useSearchParams } from "react-router-dom";
import PetFormModal from "../components/PetFormModal.tsx";

export default function ExternalPetForm() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("t");
  const customerId = searchParams.get("c");

  // Se o link vier sem os parâmetros, bloqueia o acesso por segurança
  if (!tenantId || !customerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-center">
        <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-red-500 max-w-sm">
          <span className="text-3xl">⚠️</span>
          <h3 className="text-lg font-bold text-slate-900 mt-2">Link Inválido</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Este link está corrompido ou expirado. Solicite um novo link ao estabelecimento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-4 sm:py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 shadow-2xl border border-slate-800">
        
        {/* Cabeçalho Acolhedor para o Cliente */}
        <div className="text-center pb-6 border-b border-slate-200 mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900">🐾 Ficha de Admissão Digital</h2>
          <p className="text-xs text-slate-600 font-bold mt-1.5 leading-relaxed max-w-md mx-auto">
            Insira as informações do seu pet abaixo. Elas serão integradas diretamente ao nosso prontuário clínico para garantirmos um atendimento seguro e personalizado.
          </p>
        </div>
        
        {/* Injeta o formulário que já configuramos com abas e drag-drop */}
        <div className="relative">
          <PetFormModal 
            customerId={customerId} 
            petId={null} // Sempre nulo porque o cliente está criando um NOVO pet
            onClose={() => window.location.href = "/obrigado"} 
            onSuccess={() => window.location.href = "/obrigado"} 
          />
        </div>
      </div>
    </div>
  );
}