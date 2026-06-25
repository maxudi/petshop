// src/components/Customers.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.ts";
import { getPresignedUrl } from "../lib/storage.ts";
import PetFormModal from "./PetFormModal.tsx";
import NotificationModal from "./NotificationModal.tsx";

interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  emergency_phone?: string;
  emergency_contact_name?: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTutorId, setEditingTutorId] = useState<string | null>(null);
  
  // Estados do Formulário (Tutor)
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [email, setEmail] = useState("");

  // Estados para Gerenciamento de Pets
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [petList, setPetList] = useState<any[]>([]);
  const [selectedPetDetails, setSelectedPetDetails] = useState<any | null>(null);

  // Estado para Modal de Confirmação Customizado de Exclusão
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "tutor" | "pet";
    id: string;
    name: string;
  }>({ isOpen: false, type: "tutor", id: "", name: "" });

  // Estado de Notificações Customizadas
  const [noti, setNoti] = useState({ 
    isOpen: false, 
    type: "success" as "success" | "error" | "warning", 
    title: "", 
    message: "" 
  });

  const inputClass = "w-full rounded-xl border border-slate-300 bg-slate-100 p-2.5 text-sm text-slate-900 font-medium focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors";

  const showNotify = (type: "success" | "error" | "warning", title: string, message: string) => {
    setNoti({ isOpen: true, type, title, message });
  };

  const handleCopyExternalLink = (customer: Customer) => {
    const baseUrl = window.location.origin;
    const externalLink = `${baseUrl}/prontuario-externo?t=${customer.tenant_id}&c=${customer.id}`;
    
    navigator.clipboard.writeText(externalLink);
    showNotify(
      "success", 
      "Link Copiado! 🔗", 
      `O link de auto-preenchimento para "${customer.name}" foi copiado. Já pode enviar pelo WhatsApp!`
    );
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const loadPets = async (customerId: string) => {
    const { data, error } = await supabase
      .from("pets")
      .select("id, name, species, breed, photo_url")
      .eq("customer_id", customerId);

    if (!error && data) {
      const petsWithUrls = await Promise.all(
        data.map(async (pet) => {
          if (pet.photo_url) {
            const url = await getPresignedUrl(pet.photo_url);
            return { ...pet, temp_photo_url: url };
          }
          return { ...pet, temp_photo_url: null };
        })
      );
      setPetList(petsWithUrls);
    }
  };

  const handleOpenPetDetails = async (petId: string) => {
    try {
      const { data: pet, error: petErr } = await supabase.from("pets").select("*").eq("id", petId).single();
      const { data: medsData } = await supabase.from("pet_medications").select("*").eq("pet_id", petId);

      if (petErr) throw petErr;
      const meds = medsData || [];
      const signedPhoto = pet.photo_url ? await getPresignedUrl(pet.photo_url) : null;

      setSelectedPetDetails({ 
        ...pet, 
        signedPhoto, 
        meds 
      });
    } catch (err: any) {
      showNotify("error", "Erro ao Buscar Ficha", err.message);
    }
  };

  const handlePrintPet = async (petId: string) => {
    try {
      const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();
      const { data: tutor } = await supabase.from("customers").select("*").eq("id", pet.customer_id).single();
      const { data: health } = await supabase.from("pet_health_profiles").select("*").eq("pet_id", petId).maybeSingle();
      const { data: medsData } = await supabase.from("pet_medications").select("*").eq("pet_id", petId);

      const meds = medsData || [];
      let petPhotoUrl = "";
      if (pet.photo_url) {
        petPhotoUrl = await getPresignedUrl(pet.photo_url) || "";
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Ficha - ${pet.name}</title>
            <style>
              @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 15px; } }
              body { font-family: 'Segoe UI', Arial, sans-serif; color: #334155; margin: 30px; line-height: 1.6; font-size: 13px; }
              .main-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 25px; }
              .header-text { flex: 1; }
              .main-header h1 { margin: 0; font-size: 24px; color: #1e293b; text-transform: uppercase; font-weight: 800; }
              .pet-photo-container { width: 90px; height: 90px; border-radius: 12px; border: 2px solid #cbd5e1; overflow: hidden; background: #f8fafc; }
              .pet-photo-container img { width: 100%; height: 100%; object-fit: cover; }
              .section-title { font-size: 12px; font-weight: 800; background-color: #f1f5f9; color: #1e3a8a; padding: 8px 12px; margin-top: 22px; text-transform: uppercase; border-left: 5px solid #2563eb; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
              .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
              .field { font-size: 13px; color: #475569; }
              .field strong { color: #0f172a; font-weight: 600; }
              .badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
              .table { width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #e2e8f0; }
              .table th { background: #f8fafc; padding: 8px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
              .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
              .footer { margin-top: 45px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
          </head>
          <body>
            <div class="main-header">
              <div class="header-text">
                <h1>Prontuário Médico e Ficha de Admissão</h1>
                <p>Identificação Organizacional Corporativa • Emissão Unificada por Controle de Tenant</p>
              </div>
              <div class="pet-photo-container">
                ${petPhotoUrl ? `<img src="${petPhotoUrl}" alt="" />` : `<span style="font-size:32px; opacity:0.4;">🐾</span>`}
              </div>
            </div>
            <div class="section-title">I - Dados de Identificação do Tutor</div>
            <div class="grid">
              <div class="field"><strong>Responsável:</strong> ${tutor.name}</div>
              <div class="field"><strong>Telefone:</strong> ${tutor.phone}</div>
            </div>
            <div class="section-title">II - Características Gerais do Animal</div>
            <div class="grid-3">
              <div class="field"><strong>Nome do Pet:</strong> ${pet.name}</div>
              <div class="field"><strong>Espécie:</strong> <span class="badge">${pet.species}</span></div>
              <div class="field"><strong>Raça Cadastrada:</strong> ${pet.breed}</div>
            </div>
            <div class="section-title">III - Avaliação Clínica e Sanitária</div>
            <div class="grid">
              <div class="field"><strong>Protocolo de Vacinas:</strong> ${health?.vaccines_up_to_date ? "Em Dia" : "Desatualizado"}</div>
              <div class="field"><strong>Último Vermífugo:</strong> ${health?.last_deworming_date || "Sem registro"}</div>
            </div>
            <div class="section-title">V - Prescrição Dietética e Farmacológica Diária</div>
            <table class="table">
              <thead><tr><th>Medicamento</th><th>Dosagem</th><th>Horários</th></tr></thead>
              <tbody>
                ${meds.length === 0 ? "<tr><td colspan='3'>Nenhum ativo.</td></tr>" : meds.map((m: any) => `<tr><td><strong>${m.medication_name}</strong></td><td>${m.dosage}</td><td>${m.frequencies?.join(", ") || "-"}</td></tr>`).join("")}
              </tbody>
            </table>
            <div class="footer">Ficha Clínica Oficial emitida em ${new Date().toLocaleDateString("pt-BR")}</div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
    } catch (err: any) {
      showNotify("error", "Erro na Impressão", err.message);
    }
  };

  const handleOpenEditTutor = (tutor: Customer) => {
    setEditingTutorId(tutor.id);
    setName(tutor.name);
    setCpf(tutor.cpf || "");
    setPhone(tutor.phone);
    setEmergencyPhone(tutor.emergency_phone || "");
    setEmergencyContactName(tutor.emergency_contact_name || "");
    setEmail(tutor.email || "");
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const { type, id, name } = deleteModal;
    if (type === "tutor") {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (!error) {
        if (selectedCustomerId === id) setSelectedCustomerId(null);
        fetchCustomers();
        showNotify("success", "Tutor Removido", `O registro de "${name}" foi excluído.`);
      } else {
        showNotify("error", "Erro ao Excluir", error.message);
      }
    } else if (type === "pet") {
      const { error } = await supabase.from("pets").delete().eq("id", id);
      if (!error) {
        setSelectedPetDetails(null);
        if (selectedCustomerId) loadPets(selectedCustomerId);
        showNotify("success", "Animal Removido", `Ficha de "${name}" excluída.`);
      } else {
        showNotify("error", "Erro", error.message);
      }
    }
    setDeleteModal({ isOpen: false, type: "tutor", id: "", name: "" });
  };

  const handleSubmitTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!profile) return;

    const payload = {
      tenant_id: profile.tenant_id,
      name, cpf: cpf || null, phone, email: email || null,
      emergency_phone: emergencyPhone || null, emergency_contact_name: emergencyContactName || null
    };

    let responseError;
    if (editingTutorId) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editingTutorId);
      responseError = error;
    } else {
      const { error } = await supabase.from("customers").insert([payload]);
      responseError = error;
    }

    if (!responseError) {
      setIsModalOpen(false);
      setEditingTutorId(null);
      setName(""); setCpf(""); setPhone(""); setEmail(""); setEmergencyPhone(""); setEmergencyContactName("");
      fetchCustomers();
      showNotify("success", "Dados Gravados", "Tutor sincronizado com sucesso.");
    } else {
      showNotify("error", "Falha", responseError.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes e Tutores</h2>
          <p className="text-sm text-slate-500">Gerencie os tutores, copie links de auto-admissão ou abra prontuários.</p>
        </div>
        <button onClick={() => { setEditingTutorId(null); setIsModalOpen(true); }} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-sm">+ Novo Tutor</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">A processar dados...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-200 text-xs font-bold uppercase text-slate-700">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">CPF</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{customer.name}</td>
                  <td className="px-6 py-4 font-medium">{customer.phone}</td>
                  <td className="px-6 py-4 font-medium">{customer.cpf || "-"}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{customer.email || "-"}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleCopyExternalLink(customer)} className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded-lg hover:bg-emerald-200 transition-all cursor-pointer">🔗 Link Cliente</button>
                    <button onClick={() => { setSelectedCustomerId(customer.id); setSelectedCustomerName(customer.name); loadPets(customer.id); }} className="text-xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-300 px-2.5 py-1.5 rounded-lg hover:bg-indigo-200 cursor-pointer">🔍 Ver Pets</button>
                    <button onClick={() => handleOpenEditTutor(customer)} className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-200 cursor-pointer">✏️ Editar</button>
                    <button onClick={() => setDeleteModal({ isOpen: true, type: "tutor", id: customer.id, name: customer.name })} className="text-xs font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-200 cursor-pointer">🗑️ Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedCustomerId && (
        <div className="mt-8 rounded-2xl border-2 border-slate-300 bg-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-300 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">🐾 Animais de {selectedCustomerName}</h3>
            <button onClick={() => { setEditingPetId(null); setIsPetModalOpen(true); }} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm">+ Adicionar Pet</button>
          </div>

          {petList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600 bg-white rounded-2xl border border-slate-300 font-bold">Nenhum animal cadastrado.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {petList.map((pet) => (
                <div key={pet.id} className="group relative flex flex-col items-center text-center p-5 rounded-2xl border-2 border-slate-300 bg-white shadow-sm hover:shadow-xl transition-all">
                  <div onClick={() => handleOpenPetDetails(pet.id)} className="w-full flex flex-col items-center cursor-pointer">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden p-1 border-2 border-slate-300 bg-white">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-100">
                        {pet.temp_photo_url ? <img src={pet.temp_photo_url} alt="" className="w-full h-full object-cover" /> : <div className="flex w-full h-full items-center justify-center text-3xl bg-slate-200">{pet.species === "Gato" ? "🐱" : "🐶"}</div>}
                      </div>
                    </div>
                    <h4 className="font-extrabold text-slate-900 mt-4 text-sm">{pet.name}</h4>
                    <span className="mt-2 inline-block text-[10px] bg-slate-200 border border-slate-300 text-slate-800 font-extrabold uppercase px-2.5 py-0.5 rounded-full">{pet.breed || "Sem Raça"}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handlePrintPet(pet.id); }} className="mt-4 w-full text-[11px] font-extrabold bg-slate-100 border border-slate-300 text-slate-700 hover:bg-indigo-600 hover:text-white py-1.5 rounded-xl shadow-2xs">🖨️ Imprimir Ficha</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPetDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-300 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center space-x-4 border-b border-slate-200 pb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-300 bg-slate-100 flex-shrink-0">
                {selectedPetDetails.signedPhoto ? <img src={selectedPetDetails.signedPhoto} alt="" className="w-full h-full object-cover" /> : <div className="flex w-full h-full items-center justify-center text-2xl bg-slate-200">{selectedPetDetails.species === "Gato" ? "🐱" : "🐶"}</div>}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-slate-900">{selectedPetDetails.name}</h3>
                <p className="text-xs font-bold text-indigo-600 uppercase">{selectedPetDetails.species} • {selectedPetDetails.breed || "Sem Raça"}</p>
              </div>
              <div className="flex flex-col space-y-2">
                <button onClick={() => handlePrintPet(selectedPetDetails.id)} className="rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-700 px-3 py-1.5 text-xs font-bold hover:bg-indigo-100">🖨️ Imprimir</button>
                <button onClick={() => { setEditingPetId(selectedPetDetails.id); setIsPetModalOpen(true); setSelectedPetDetails(null); }} className="rounded-lg bg-amber-100 border border-amber-400 text-amber-800 px-3 py-1.5 text-xs font-bold hover:bg-amber-200">✏️ Alterar</button>
                <button onClick={() => setDeleteModal({ isOpen: true, type: "pet", id: selectedPetDetails.id, name: selectedPetDetails.name })} className="rounded-lg bg-red-100 border border-red-400 text-red-700 px-3 py-1.5 text-xs font-bold hover:bg-red-200">🗑️ Deletar</button>
              </div>
            </div>
            {selectedPetDetails.meds && selectedPetDetails.meds.length > 0 && (
              <div className="bg-purple-50 border border-purple-300 p-3 rounded-xl text-purple-950 text-xs font-medium">
                <h4 className="font-bold text-purple-900 uppercase text-[10px] mb-1">💊 Medicamentos Ativos</h4>
                {selectedPetDetails.meds.map((m: any, i: number) => (
                  <p key={i}>• <strong>{m.medication_name}</strong> ({m.dosage}) — Horários: {m.frequencies?.join(", ")}</p>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedPetDetails(null)} className="w-full sm:w-auto rounded-xl border-2 border-slate-400 bg-slate-300 text-slate-800 px-5 py-2.5 text-xs font-extrabold shadow-sm">Fechar Prontuário</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingTutorId ? "📝 Editar Dados" : "Cadastrar Novo Tutor"}</h3>
            <form onSubmit={handleSubmitTutor} className="space-y-4">
              <input type="text" placeholder="Nome *" required className={inputClass} value={name} onChange={e => setName(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="CPF" className={inputClass} value={cpf} onChange={e => setCpf(e.target.value)} />
                <input type="text" placeholder="Telefone *" required className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingTutorId(null); }} className="rounded-xl border-2 border-slate-400 bg-slate-300 text-slate-800 font-bold px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" className="rounded-xl bg-indigo-600 text-white font-bold px-4 py-2 text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CUSTOMIZADO DE EXCLUSÃO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-955/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-300 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-xl">⚠️</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-2">Tem certeza de que deseja deletar o {deleteModal.type === "tutor" ? "tutor" : "pet"} <span className="font-extrabold text-slate-800">"{deleteModal.name}"</span>? Esta ação é irreversível.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDeleteModal({ isOpen: false, type: "tutor", id: "", name: "" })} className="flex-1 rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-700 font-bold py-2.5 text-sm cursor-pointer">Cancelar</button>
              <button type="button" onClick={handleConfirmDelete} className="flex-1 rounded-xl bg-red-600 text-white font-bold py-2.5 text-sm hover:bg-red-700 cursor-pointer shadow-sm">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isPetModalOpen && selectedCustomerId && (
        <PetFormModal customerId={selectedCustomerId} petId={editingPetId} onClose={() => { setIsPetModalOpen(false); setEditingPetId(null); }} onSuccess={() => { setIsPetModalOpen(false); setEditingPetId(null); if (selectedCustomerId) loadPets(selectedCustomerId); }} />
      )}

      <NotificationModal isOpen={noti.isOpen} type={noti.type} title={noti.title} message={noti.message} onClose={() => setNoti({ ...noti, isOpen: false })} />
    </div>
  );
}