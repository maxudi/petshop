// src/components/Customers.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.ts";
import { getPresignedUrl } from "../lib/storage.ts";
import PetFormModal from "./PetFormModal.tsx";
import NotificationModal from "./NotificationModal.tsx";

interface Customer {
  id: string;
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
      const { data: health } = await supabase.from("pet_health_profiles").select("*").eq("pet_id", petId).maybeSingle();
      const { data: behavior = {} } = await supabase.from("pet_behavior_profiles").select("*").eq("pet_id", petId).maybeSingle();
      const { data: feeding } = await supabase.from("pet_feeding_routines").select("*").eq("pet_id", petId).maybeSingle();
      const { data: meds } = await supabase.from("pet_medications").select("*").eq("pet_id", petId);

      if (petErr) throw petErr;
      let signedPhoto = pet.photo_url ? await getPresignedUrl(pet.photo_url) : null;

      setSelectedPetDetails({ ...pet, signedPhoto, health, behavior, feeding, meds });
    } catch (err: any) {
      showNotify("error", "Erro ao Buscar Ficha", err.message);
    }
  };

  // --- FUNÇÃO DE IMPRESSÃO ATUALIZADA: DESIGN PREMIUM, CORES SUAVES E FOTO DO ANIMAL ---
  const handlePrintPet = async (petId: string) => {
    try {
      const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();
      const { data: tutor } = await supabase.from("customers").select("*").eq("id", pet.customer_id).single();
      const { data: health } = await supabase.from("pet_health_profiles").select("*").eq("pet_id", petId).maybeSingle();
      const { data: behavior } = await supabase.from("pet_behavior_profiles").select("*").eq("pet_id", petId).maybeSingle();
      const { data: feeding } = await supabase.from("pet_feeding_routines").select("*").eq("pet_id", petId).maybeSingle();
      const { data: meds = [] } = await supabase.from("pet_medications").select("*").eq("pet_id", petId);

      // Resgata a URL assinada da foto se ela existir
      let petPhotoUrl = "";
      if (pet.photo_url) {
        petPhotoUrl = await getPresignedUrl(pet.photo_url);
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Ficha - ${pet.name}</title>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 15px; }
              }
              body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; margin: 30px; line-height: 1.6; font-size: 13px; background-color: #ffffff; }
              
              /* Cabeçalho Principal Moderno */
              .main-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 25px; }
              .header-text { flex: 1; }
              .main-header h1 { margin: 0; font-size: 24px; color: #1e293b; text-transform: uppercase; font-weight: 800; letter-spacing: -0.5px; }
              .main-header p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500; }
              
              /* Box da Foto Estruturada no Topo */
              .pet-photo-container { width: 90px; height: 90px; border-radius: 12px; border: 2px solid #cbd5e1; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; margin-left: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
              .pet-photo-container img { width: 100%; height: 100%; object-cover: cover; }
              .pet-photo-placeholder { font-size: 32px; filter: grayscale(100%); opacity: 0.4; }

              /* Títulos das Seções com Tons de Cor Suaves */
              .section-title { font-size: 12px; font-weight: 800; background-color: #f1f5f9; color: #1e3a8a; padding: 8px 12px; margin-top: 22px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; border-left: 5px solid #2563eb; border-radius: 0 8px 8px 0; }
              
              /* Grids e Blocos de Informação */
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 20px; padding: 0 6px; }
              .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; padding: 0 6px; }
              .field { font-size: 13px; color: #475569; }
              .field strong { color: #0f172a; font-weight: 600; display: inline-block; margin-right: 3px; }
              
              /* Elemento de Badge Suave */
              .badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
              .badge-success { background: #dcfce7; color: #15803d; }
              .badge-danger { background: #fee2e2; color: #b91c1c; }

              /* Tabelas Formatadas */
              .table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 12px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
              .table th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; }
              .table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
              .table tr:last-child td { border-bottom: none; }
              
              .obs-box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-style: italic; color: #334155; margin-top: 8px; line-height: 1.5; }
              .footer { margin-top: 45px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="main-header">
              <div class="header-text">
                <h1>Prontuário Médico e Ficha de Admissão</h1>
                <p>Identificação Organizacional Corporativa • Emissão Unificada por Controle de Tenant</p>
              </div>
              
              <div class="pet-photo-container">
                ${petPhotoUrl ? `
                  <img src="${petPhotoUrl}" alt="Foto de ${pet.name}" />
                ` : `
                  <span class="pet-photo-placeholder">${pet.species === "Gato" ? "🐱" : "🐶"}</span>
                `}
              </div>
            </div>

            <div class="section-title">I - Dados de Identificação do Tutor</div>
            <div class="grid">
              <div class="field"><strong>Responsável:</strong> ${tutor.name}</div>
              <div class="field"><strong>Telefone:</strong> ${tutor.phone}</div>
            </div>
            <div class="grid">
              <div class="field"><strong>Documento CPF:</strong> ${tutor.cpf || "Não cadastrado"}</div>
              <div class="field"><strong>E-mail institucional:</strong> ${tutor.email || "Não cadastrado"}</div>
            </div>
            <div class="grid">
              <div class="field"><strong>Contato de Emergência:</strong> ${tutor.emergency_contact_name || "-"}</div>
              <div class="field"><strong>Tel. Emergência:</strong> ${tutor.emergency_phone || "-"}</div>
            </div>

            <div class="section-title">II - Características Gerais do Animal</div>
            <div class="grid-3">
              <div class="field"><strong>Nome do Pet:</strong> ${pet.name}</div>
              <div class="field"><strong>Espécie:</strong> <span class="badge">${pet.species}</span></div>
              <div class="field"><strong>Raça Cadastrada:</strong> ${pet.breed}</div>
            </div>
            <div class="grid-3">
              <div class="field"><strong>Nascimento:</strong> ${pet.birth_date || "Não informada"}</div>
              <div class="field"><strong>Gênero / Sexo:</strong> ${pet.gender === "M" ? "Macho" : "Fêmea"}</div>
              <div class="field"><strong>Morfologia / Porte:</strong> ${pet.size.toUpperCase()}</div>
            </div>
            <div class="grid-3">
              <div class="field"><strong>Pelagem padrão:</strong> ${pet.coat}</div>
              <div class="field"><strong>Massa Corporal:</strong> ${pet.weight_kg ? pet.weight_kg + " kg" : "Não pesado"}</div>
              <div class="field"><strong>Status Castração:</strong> ${pet.castrated ? "Animal Castrado" : "Inteiro"}</div>
            </div>
            <div class="field" style="margin-top: 6px;"><strong>Perfil Psicológico / Temperamento:</strong> ${pet.temperament}</div>

            <div class="section-title">III - Avaliação Clínica e Sanitária</div>
            <div class="grid">
              <div class="field"><strong>Protocolo de Vacinas:</strong> <span class="badge ${health?.vaccines_up_to_date ? "badge-success" : "badge-danger"}">${health?.vaccines_up_to_date ? "Atualizado / Em Dia" : "Desatualizado"}</span></div>
              <div class="field"><strong>Última Desparasitação:</strong> ${health?.last_deworming_date || "Sem registro"}</div>
            </div>
            <div class="field" style="margin-top: 6px;"><strong>Patologias Ativas / Diagnósticos:</strong> ${health?.has_diseases || "Nenhuma patologia crônica ativa registrada."}</div>
            <div class="field"><strong>Restrições ou Alergias Críticas:</strong> ${health?.allergies || "Nenhuma alergia alimentar ou medicamentosa descrita."}</div>
            <div class="grid-3" style="margin-top: 6px;">
              <div class="field"><strong>Médico de Referência:</strong> ${health?.external_vet_name || "-"}</div>
              <div class="field"><strong>Hospital / Clínica:</strong> ${health?.external_clinic_name || "-"}</div>
              <div class="field"><strong>Contato do Vet:</strong> ${health?.external_vet_phone || "-"}</div>
            </div>

            <div class="section-title">IV - Sociabilidade e Condicionamento</div>
            <div class="grid-3">
              <div class="field"><strong>Aceita Outros Cães:</strong> ${behavior?.good_with_dogs ? "Sim" : "Não"}</div>
              <div class="field"><strong>Aceita Gatos:</strong> ${behavior?.good_with_cats ? "Sim" : "Não"}</div>
              <div class="field"><strong>Aceita Crianças:</strong> ${behavior?.good_with_children ? "Sim" : "Não"}</div>
            </div>
            <div class="grid-3">
              <div class="field"><strong>Vocalização / Latido:</strong> ${behavior?.excessive_barking_meowing ? "Excessivo" : "Normal"}</div>
              <div class="field"><strong>Ansiedade de Isolamento:</strong> ${behavior?.separation_anxiety ? "Sim" : "Não"}</div>
              <div class="field"><strong>Histórico de Reatividade:</strong> ${behavior?.history_of_aggressiveness ? "Sim (Atenção)" : "Não"}</div>
            </div>
            <div class="field" style="margin-top: 6px;"><strong>Reações de Medo / Fobias:</strong> ${behavior?.fears_and_obs || "Sem observações de fobias."}</div>

            <div class="section-title">V - Prescrição Dietética e Farmacológica Diária</div>
            <div class="field"><strong>Alimentação Fornecida:</strong> ${feeding?.food_name || "Alimento Padrão"} ${feeding?.amount_per_feeding ? " — Dosagem: " + feeding.amount_per_feeding : ""}</div>
            <div class="field"><strong>Cronograma de Trato (Horários):</strong> ${feeding?.frequencies?.join(", ") || "Conforme demanda"}</div>
            <div class="field"><strong>Mimos / Petiscos Liberados:</strong> ${feeding?.allows_treats ? "Sim" : "Restrito"}</div>

            <h4 style="margin-top:14px; margin-bottom:4px; font-size:11px; color:#1e3a8a; text-transform:uppercase; font-weight:700;">Cronograma de Medicamentos em Andamento:</h4>
            ${meds.length === 0 ? "<p style='font-style:italic; color:#64748b; margin: 4px 0;'>Nenhum medicamento ativo mapeado para administração.</p>" : `
              <table class="table">
                <thead>
                  <tr>
                    <th>Princípio Ativo / Medicamento</th>
                    <th>Dosagem Estrita</th>
                    <th>Horários de Tomada</th>
                  </tr>
                </thead>
                <tbody>
                  ${meds.map((m: any) => `
                    <tr>
                      <td><strong>${m.medication_name}</strong></td>
                      <td>${m.dosage}</td>
                      <td>${m.frequencies?.join(", ") || "-"}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `}

            ${pet.general_observations ? `
              <div class="section-title">VI - Notas Técnicas Complementares</div>
              <div class="obs-box">${pet.general_observations}</div>
            ` : ""}

            <div class="footer">
              Ficha Clínica Oficial emitida em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} <br/>
              Assinatura de Validação do Responsável Técnico: __________________________________________________
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
    } catch (err: any) {
      showNotify("error", "Erro na Impressão", "Falha ao compilar dados para o relatório: " + err.message);
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

  const handleDeleteTutor = async (id: string, tutorName: string) => {
    if (confirm(`⚠️ Tem certeza de que deseja deletar o tutor "${tutorName}"? Todos os animais dele serão excluídos permanentemente!`)) {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (!error) {
        if (selectedCustomerId === id) setSelectedCustomerId(null);
        fetchCustomers();
        showNotify("success", "Tutor Removido", `O registro de "${tutorName}" foi excluído com sucesso.`);
      } else {
        showNotify("error", "Erro ao Excluir", error.message);
      }
    }
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
      showNotify("success", "Dados Gravados", "As informações do tutor foram sincronizadas com sucesso.");
    } else {
      showNotify("error", "Falha Operacional", responseError.message);
    }
  };

  const handleDeletePet = async (id: string, petName: string) => {
    if (confirm(`🗑️ Deseja remover permanentemente a ficha de "${petName}"?`)) {
      const { error } = await supabase.from("pets").delete().eq("id", id);
      if (!error) {
        setSelectedPetDetails(null);
        if (selectedCustomerId) loadPets(selectedCustomerId);
        showNotify("success", "Animal Removido", `A ficha clínica de "${petName}" foi excluída.`);
      } else {
        showNotify("error", "Erro ao Excluir Pet", error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes e Tutores</h2>
          <p className="text-sm text-slate-500">Gerencie os tutores e os registros dos animais vinculados.</p>
        </div>
        <button
          onClick={() => { setEditingTutorId(null); setIsModalOpen(true); }}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-sm"
        >
          + Novo Tutor
        </button>
      </div>

      {/* Tabela de Tutores */}
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
                    <button onClick={() => { setSelectedCustomerId(customer.id); setSelectedCustomerName(customer.name); loadPets(customer.id); }} className="text-xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-300 px-2.5 py-1.5 rounded-lg hover:bg-indigo-200 transition-all cursor-pointer">🔍 Ver Pets</button>
                    <button onClick={() => handleOpenEditTutor(customer)} className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-200 transition-all cursor-pointer">✏️ Editar</button>
                    <button onClick={() => handleDeleteTutor(customer.id, customer.name)} className="text-xs font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-200 transition-all cursor-pointer">🗑️ Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAINEL DE CARDS DE PETS */}
      {selectedCustomerId && (
        <div className="mt-8 rounded-2xl border-2 border-slate-300 bg-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-300 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">🐾 Animais de {selectedCustomerName}</h3>
              <p className="text-xs text-slate-600 font-medium">Clique no card para abrir o prontuário ou use o botão para gerar o papel de impressão</p>
            </div>
            <button onClick={() => { setEditingPetId(null); setIsPetModalOpen(true); }} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer">+ Adicionar Pet</button>
          </div>

          {petList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600 bg-white rounded-2xl border border-slate-300 shadow-2xs font-bold">Nenhum animal cadastrado para este tutor.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {petList.map((pet) => (
                <div 
                  key={pet.id} 
                  className="group relative flex flex-col items-center text-center p-5 rounded-2xl border-2 border-slate-300 bg-white shadow-sm hover:shadow-xl hover:border-indigo-600 transition-all duration-200"
                >
                  <div onClick={() => handleOpenPetDetails(pet.id)} className="w-full flex flex-col items-center cursor-pointer">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden p-1 border-2 border-slate-300 bg-white group-hover:border-indigo-600 group-hover:ring-4 group-hover:ring-indigo-100 transition-all flex-shrink-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-100">
                        {pet.temp_photo_url ? (
                          <img src={pet.temp_photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex w-full h-full items-center justify-center text-3xl select-none bg-slate-200">
                            {pet.species === "Gato" ? "🐱" : "🐶"}
                          </div>
                        )}
                      </div>
                    </div>
                    <h4 className="font-extrabold text-slate-900 mt-4 text-sm tracking-tight group-hover:text-indigo-700">{pet.name}</h4>
                    <span className="mt-2 inline-block text-[10px] bg-slate-200 border border-slate-300 text-slate-800 font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                      {pet.breed || "Sem Raça"}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handlePrintPet(pet.id); }}
                    className="mt-4 w-full text-[11px] font-extrabold bg-slate-100 border border-slate-300 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    🖨️ Imprimir Ficha
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRONTUÁRIO VISUAL DO ANIMAL */}
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
                <p className="text-xs text-slate-500 mt-0.5 font-bold">Porte: {selectedPetDetails.size} | Sexo: {selectedPetDetails.gender}</p>
              </div>
              <div className="flex flex-col space-y-2">
                <button onClick={() => handlePrintPet(selectedPetDetails.id)} className="rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-700 px-3 py-1.5 text-xs font-bold hover:bg-indigo-100 cursor-pointer">🖨️ Imprimir</button>
                <button onClick={() => { setEditingPetId(selectedPetDetails.id); setIsPetModalOpen(true); setSelectedPetDetails(null); }} className="rounded-lg bg-amber-100 border border-amber-400 text-amber-800 px-3 py-1.5 text-xs font-bold hover:bg-amber-200 cursor-pointer">✏️ Alterar</button>
                <button onClick={() => handleDeletePet(selectedPetDetails.id, selectedPetDetails.name)} className="rounded-lg bg-red-100 border border-red-400 text-red-800 px-3 py-1.5 text-xs font-bold hover:bg-red-200 cursor-pointer">🗑️ Deletar</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 space-y-1.5 text-slate-900">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wide">🏥 Saúde e Vacinas</h4>
                <p><strong>Vacinação:</strong> {selectedPetDetails.health?.vaccines_up_to_date ? "✅ Em Dia" : "❌ Atrasada"}</p>
                <p><strong>Último Vermífugo:</strong> {selectedPetDetails.health?.last_deworming_date || "Não informado"}</p>
                <p><strong>Doenças:</strong> {selectedPetDetails.health?.has_diseases || "Nenhuma"}</p>
                <p><strong>Alergias:</strong> {selectedPetDetails.health?.allergies || "Nenhuma"}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 space-y-1.5 text-slate-900">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wide">🧠 Comportamento</h4>
                <p>🐕 **Aceita Cães:** {selectedPetDetails.behavior?.good_with_dogs ? "Sim" : "Não"}</p>
                <p>🐈 **Aceita Gatos:** {selectedPetDetails.behavior?.good_with_cats ? "Sim" : "Não"}</p>
                <p>🗣️ **Vocalização:** {selectedPetDetails.behavior?.excessive_barking_meowing ? "Sim" : "Não"}</p>
                <p>⚠️ **Histórico Reativo:** {selectedPetDetails.behavior?.history_of_aggressiveness ? "Sim" : "Não"}</p>
              </div>
            </div>

            {selectedPetDetails.general_observations && (
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wide mb-1">📝 Notas Clínicas / Obs Gerais</h4>
                <p className="leading-relaxed">{selectedPetDetails.general_observations}</p>
              </div>
            )}

            <div className="space-y-3 text-xs font-medium">
              {selectedPetDetails.feeding?.food_name && (
                <div className="bg-blue-50 border border-blue-300 p-3 rounded-xl text-blue-950">
                  <h4 className="font-bold text-blue-900 uppercase text-[10px] mb-1">🍽️ Alimentação Diária</h4>
                  <p><strong>Ração:</strong> {selectedPetDetails.feeding.food_name} — Porção: {selectedPetDetails.feeding.amount_per_feeding}</p>
                  <p><strong>Horários:</strong> {selectedPetDetails.feeding.frequencies?.join(", ") || "Não informados"}</p>
                </div>
              )}
              {selectedPetDetails.meds && selectedPetDetails.meds.length > 0 && (
                <div className="bg-purple-50 border border-purple-300 p-3 rounded-xl text-purple-950">
                  <h4 className="font-bold text-purple-900 uppercase text-[10px] mb-1">💊 Medicamentos Ativos</h4>
                  <div className="space-y-1">
                    {selectedPetDetails.meds.map((m: any, i: number) => (
                      <p key={i}>• <strong>{m.medication_name}</strong> ({m.dosage}) — Horários: {m.frequencies?.join(", ")}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedPetDetails(null)} className="w-full sm:w-auto rounded-xl border-2 border-slate-400 bg-slate-300 text-slate-800 px-5 py-2.5 text-xs font-extrabold hover:bg-slate-400 cursor-pointer shadow-sm">Fechar Prontuário</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TUTOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingTutorId ? "📝 Editar Dados do Tutor" : "Cadastrar Novo Tutor"}</h3>
            <form onSubmit={handleSubmitTutor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                <input type="text" required className={inputClass} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CPF</label>
                  <input type="text" className={inputClass} value={cpf} onChange={e => setCpf(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone Principal *</label>
                  <input type="text" required className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contato de Emergência</label>
                  <input type="text" className={inputClass} value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tel. Emergência</label>
                  <input type="text" className={inputClass} value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail</label>
                <input type="email" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingTutorId(null); }} className="rounded-xl border-2 border-slate-400 bg-slate-300 text-slate-800 font-bold px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" className="rounded-xl bg-indigo-600 text-white font-bold px-4 py-2 text-sm hover:bg-indigo-700">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANIMAL */}
      {isPetModalOpen && selectedCustomerId && (
        <PetFormModal 
          customerId={selectedCustomerId}
          petId={editingPetId}
          onClose={() => { setIsPetModalOpen(false); setEditingPetId(null); }}
          onSuccess={() => { setIsPetModalOpen(false); setEditingPetId(null); if (selectedCustomerId) loadPets(selectedCustomerId); }}
        />
      )}

      {/* MODAL DE NOTIFICAÇÃO CUSTOMIZADA */}
      <NotificationModal 
        isOpen={noti.isOpen}
        type={noti.type}
        title={noti.title}
        message={noti.message}
        onClose={() => setNoti({ ...noti, isOpen: false })}
      />
    </div>
  );
}