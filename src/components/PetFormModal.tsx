// src/components/PetFormModal.tsx
import { useState, useEffect, useRef, type DragEvent } from "react";
import { supabase } from "../lib/supabase.ts";
import { uploadPetFile } from "../lib/storage.ts";
import NotificationModal from "./NotificationModal.tsx";

interface PetFormModalProps {
  customerId: string;
  petId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = "basics" | "health" | "behavior" | "routines";

const COAT_TYPES = [
  "Curta", "Média", "Longa", "Dupla Camada", 
  "Dura / Aramada", "Longa e Sedosa", "Semicurta", 
  "Inexistente (Calvo)", "Frisada / Caracolada"
];

const TEMPERAMENT_TYPES = [
  "Dócil / Sociável", "Muito Ativo / Agitado", "Arredio / Assustado",
  "Reativo com outros Animais", "Reativo com Pessoas", "Dominante", 
  "Idoso / Calmo", "Ansioso", "Independente"
];

interface Breed { name: string; species: string; }
interface Disease { id?: string; name: string; species: string; }
interface MedicationItem { id?: string; medication_name: string; dosage: string; frequencies: string; }
interface AttachmentItem { name: string; file: File; type: string; }

export default function PetFormModal({ customerId, petId, onClose, onSuccess }: PetFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("basics");
  const [loading, setLoading] = useState(false);
  const isEditMode = !!petId;

  const [noti, setNoti] = useState({ isOpen: false, type: "success" as "success"|"error"|"warning", title: "", message: "" });
  const showNotify = (type: "success"|"error"|"warning", title: string, message: string) => {
    setNoti({ isOpen: true, type, title, message });
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Cão");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("M");
  const [size, setSize] = useState("medio");
  const [coat, setCoat] = useState("Curta");
  const [weight, setWeight] = useState("");
  const [temperament, setTemperament] = useState("Dócil / Sociável");
  const [generalObservations, setGeneralObservations] = useState("");
  const [castrated, setCastrated] = useState(false);

  const [allBreeds, setAllBreeds] = useState<Breed[]>([]);
  const [filteredBreeds, setFilteredBreeds] = useState<Breed[]>([]);
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const breedRef = useRef<HTMLDivElement>(null);

  const [diseasesCatalog, setDiseasesCatalog] = useState<Disease[]>([]);
  const [filteredDiseases, setFilteredDiseases] = useState<Disease[]>([]);
  const [showDiseaseDropdown, setShowDiseaseDropdown] = useState(false);
  const [vaccinesUpToDate, setVaccinesUpToDate] = useState(true);
  const [lastDeworming, setLastDeworming] = useState("");
  const [hasDisease, setHasDisease] = useState("");
  const diseaseRef = useRef<HTMLDivElement>(null);
  
  const [allergies, setAllergies] = useState("");
  const [externalVet, setExternalVet] = useState("");
  const [externalClinic, setExternalClinic] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [attachmentsList, setAttachmentsList] = useState<AttachmentItem[]>([]);

  const [goodWithDogs, setGoodWithDogs] = useState(true);
  const [goodWithCats, setGoodWithCats] = useState(true);
  const [goodWithChildren, setGoodWithChildren] = useState(true);
  const [excessiveBark, setExcessiveBark] = useState(false);
  const [anxiety, setAnxiety] = useState(false);
  const [aggressiveness, setAggressiveness] = useState(false);
  const [fears, setFears] = useState("");
  const [walkSchedule, setWalkSchedule] = useState("");
  const [sleepingSpot, setSleepingSpot] = useState("");
  const [furnitureAllowed, setFurnitureAllowed] = useState(false);
  const [eliminationHabits, setEliminationHabits] = useState("");

  const [foodName, setFoodName] = useState("");
  const [amountPerFeeding, setAmountPerFeeding] = useState("");
  const [foodHours, setFoodHours] = useState("");
  const [allowsTreats, setAllowsTreats] = useState(true);

  const [tmpMedName, setTmpMedName] = useState("");
  const [tmpMedDosage, setTmpMedDosage] = useState("");
  const [tmpMedHours, setTmpMedHours] = useState("");
  const [medicationsList, setMedicationsList] = useState<MedicationItem[]>([]);

  const inputClass = "w-full rounded-xl border border-slate-300 bg-slate-100 p-2.5 text-sm text-slate-900 font-medium focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors";

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handlePhotoDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = () => {
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
      } else {
        showNotify("warning", "Ficheiro Inválido", "Por favor, arraste apenas imagens.");
      }
    }
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments: AttachmentItem[] = Array.from(e.target.files).map(file => ({
        name: file.name,
        file: file,
        type: file.type.includes("pdf") ? "pdf" : "image"
      }));
      setAttachmentsList([...attachmentsList, ...newAttachments]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachmentsList(attachmentsList.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (breedRef.current && !breedRef.current.contains(event.target as Node)) setShowBreedDropdown(false);
      if (diseaseRef.current && !diseaseRef.current.contains(event.target as Node)) setShowDiseaseDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBreeds = async () => {
    const { data } = await supabase.from("pet_breeds").select("name, species").order("name", { ascending: true });
    if (data) setAllBreeds(data);
  };

  const fetchDiseases = async () => {
    const { data } = await supabase.from("pet_diseases").select("*").order("name", { ascending: true });
    if (data) setDiseasesCatalog(data);
  };

  useEffect(() => {
    fetchBreeds();
    fetchDiseases();
  }, []);

  useEffect(() => {
    const list = allBreeds.filter(b => b.species === species);
    setFilteredBreeds(!breed.trim() ? list : list.filter(b => b.name.toLowerCase().includes(breed.toLowerCase())));
  }, [breed, species, allBreeds]);

  useEffect(() => {
    const list = diseasesCatalog.filter(d => d.species === species);
    setFilteredDiseases(!hasDisease.trim() ? list : list.filter(d => d.name.toLowerCase().includes(hasDisease.toLowerCase())));
  }, [hasDisease, species, diseasesCatalog]);

  useEffect(() => {
    if (isEditMode && petId) {
      const loadAllPetData = async () => {
        setLoading(true);
        const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();
        if (pet) {
          setName(pet.name || "");
          setSpecies(pet.species || "Cão");
          setBreed(pet.breed || "");
          setBirthDate(pet.birth_date || "");
          setGender(pet.gender || "M");
          setSize(pet.size || "medio");
          setCoat(pet.coat || "Curta");
          setWeight(pet.weight_kg ? pet.weight_kg.toString() : "");
          setTemperament(pet.temperament || "Dócil / Sociável");
          setGeneralObservations(pet.general_observations || "");
          setCastrated(!!pet.castrated);
        }

        const { data: health } = await supabase.from("pet_health_profiles").select("*").eq("pet_id", petId).maybeSingle();
        if (health) {
          setVaccinesUpToDate(!!health.vaccines_up_to_date);
          setLastDeworming(health.last_deworming_date || "");
          setHasDisease(health.has_diseases || "");
          setAllergies(health.allergies || "");
          setExternalVet(health.external_vet_name || "");
          setExternalClinic(health.external_clinic_name || "");
          setExternalPhone(health.external_vet_phone || "");
        }

        const { data: behavior } = await supabase.from("pet_behavior_profiles").select("*").eq("pet_id", petId).maybeSingle();
        if (behavior) {
          setGoodWithDogs(!!behavior.good_with_dogs);
          setGoodWithCats(!!behavior.good_with_cats);
          setGoodWithChildren(!!behavior.good_with_children);
          setExcessiveBark(!!behavior.excessive_barking_meowing);
          setAnxiety(!!behavior.separation_anxiety);
          setAggressiveness(!!behavior.history_of_aggressiveness);
          setFears(behavior.fears_and_obs || "");
          setWalkSchedule(behavior.walking_schedule || "");
          setSleepingSpot(behavior.preferred_sleeping_spot || "");
          setFurnitureAllowed(!!behavior.allowed_on_furniture);
          setEliminationHabits(behavior.elimination_habits || "");
        }

        const { data: feeding } = await supabase.from("pet_feeding_routines").select("*").eq("pet_id", petId).maybeSingle();
        if (feeding) {
          setFoodName(feeding.food_name || "");
          setAmountPerFeeding(feeding.amount_per_feeding || "");
          setFoodHours(feeding.frequencies ? feeding.frequencies.join(", ") : "");
          setAllowsTreats(!!feeding.allows_treats);
        }

        const { data: meds } = await supabase.from("pet_medications").select("*").eq("pet_id", petId);
        if (meds) {
          setMedicationsList(meds.map(m => ({
            id: m.id, medication_name: m.medication_name, dosage: m.dosage, frequencies: m.frequencies?.join(", ") || ""
          })));
        }
        setLoading(false);
      };
      loadAllPetData();
    }
  }, [isEditMode, petId]);

  const handleAddMedication = () => {
    if (!tmpMedName.trim() || !tmpMedDosage.trim()) {
      showNotify("warning", "Campos Vazios", "Preencha o nome do medicamento e a dosagem.");
      return;
    }
    setMedicationsList([...medicationsList, { medication_name: tmpMedName.trim(), dosage: tmpMedDosage.trim(), frequencies: tmpMedHours.trim() }]);
    setTmpMedName(""); setTmpMedDosage(""); setTmpMedHours("");
  };

  const handleRemoveMedication = (index: number) => {
    setMedicationsList(medicationsList.filter((_, idx) => idx !== index));
  };

  const ensureBreedExists = async (breedName: string, tenantId: string) => {
    const sanitizedName = breedName.trim();
    const existing = allBreeds.find(b => b.species === species && b.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existing) return;
    await supabase.from("pet_breeds").insert([{ tenant_id: tenantId, species, name: sanitizedName }]);
    await fetchBreeds();
  };

  const ensureDiseaseExists = async (diseaseName: string) => {
    const sanitizedName = diseaseName.trim();
    if (!sanitizedName || sanitizedName === "Nenhuma doença relatada") return;
    const existing = diseasesCatalog.find(d => d.species === species && d.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existing) return;
    await supabase.from("pet_diseases").insert([{ species, name: sanitizedName }]);
    await fetchDiseases();
  };

  const handleSavePet = async () => {
    if (!name.trim()) {
      showNotify("warning", "Falta o Nome", "O campo Nome do Pet é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", session?.user.id).single();
      if (!profile) return;
      const tenantId = profile.tenant_id;

      if (breed.trim()) await ensureBreedExists(breed, tenantId);
      if (hasDisease.trim()) await ensureDiseaseExists(hasDisease);

      let activePetId = petId;

      const petPayload = {
        tenant_id: tenantId, customer_id: customerId, name, species, breed: breed || "Sem Raça Definida (SRD)",
        birth_date: birthDate || null, gender, size, coat, weight_kg: weight ? parseFloat(weight) : null,
        temperament, general_observations: generalObservations, castrated
      };

      if (isEditMode && petId) {
        const { error } = await supabase.from("pets").update(petPayload).eq("id", petId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("pets").insert([petPayload]).select().single();
        if (error) throw error;
        activePetId = data.id;
      }

      if (!activePetId) return;

      if (selectedFile) {
        const uploadedPath = await uploadPetFile(selectedFile, activePetId);
        if (uploadedPath) {
          await supabase.from("pets").update({ photo_url: uploadedPath }).eq("id", activePetId);
        }
      }

      const healthPayload = {
        tenant_id: tenantId, pet_id: activePetId, vaccines_up_to_date: vaccinesUpToDate, last_deworming_date: lastDeworming || null,
        has_diseases: hasDisease.trim(), allergies, external_vet_name: externalVet, external_clinic_name: externalClinic, external_vet_phone: externalPhone
      };
      await supabase.from("pet_health_profiles").upsert(healthPayload, { onConflict: "pet_id" });

      const behaviorPayload = {
        tenant_id: tenantId, pet_id: activePetId, good_with_dogs: goodWithDogs, good_with_cats: goodWithCats, good_with_children: goodWithChildren,
        excessive_barking_meowing: excessiveBark, separation_anxiety: anxiety, history_of_aggressiveness: aggressiveness,
        fears_and_obs: fears, walking_schedule: walkSchedule, preferred_sleeping_spot: sleepingSpot, allowed_on_furniture: furnitureAllowed, elimination_habits: eliminationHabits
      };
      await supabase.from("pet_behavior_profiles").upsert(behaviorPayload, { onConflict: "pet_id" });

      if (foodName) {
        await supabase.from("pet_feeding_routines").upsert({
          tenant_id: tenantId, pet_id: activePetId, food_name: foodName, amount_per_feeding: amountPerFeeding, allows_treats: allowsTreats,
          frequencies: foodHours ? foodHours.split(",").map(h => h.trim()) : []
        }, { onConflict: "pet_id" });
      }

      await supabase.from("pet_medications").delete().eq("pet_id", activePetId);
      if (medicationsList.length > 0) {
        const medsPayload = medicationsList.map(m => ({
          tenant_id: tenantId, pet_id: activePetId, medication_name: m.medication_name, dosage: m.dosage, frequencies: m.frequencies ? m.frequencies.split(",").map(h => h.trim()) : []
        }));
        await supabase.from("pet_medications").insert(medsPayload);
      }

      onSuccess();
    } catch (err: any) {
      showNotify("error", "Erro ao Sincronizar", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-300 flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">{isEditMode ? "📝 Alterar Prontuário" : "🐾 Cadastrar Novo Animal"}</h3>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-100 px-4">
          {(["basics", "health", "behavior", "routines"] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {tab === "basics" && "🐾 Dados Básicos"}
              {tab === "health" && "🏥 Saúde & Vet"}
              {tab === "behavior" && "🧠 Comportamento"}
              {tab === "routines" && "🍽️ Rotina / Meds"}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-slate-700 bg-white">
          {activeTab === "basics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                <div onDragOver={handlePhotoDragOver} onDragLeave={handlePhotoDragLeave} onDrop={handlePhotoDrop} className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all h-24 ${isDraggingPhoto ? "border-indigo-600 bg-indigo-100" : "border-slate-400 bg-white hover:border-indigo-50"}`}>
                  <input type="file" accept="image/*" onChange={e => e.target.files && setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <span className="text-xl mb-0.5">📸</span>
                  <span className="text-[10px] text-slate-700 font-bold leading-tight">{selectedFile ? "Carregada" : isDraggingPhoto ? "Solte!" : "Arraste / Clique"}</span>
                  {selectedFile && <span className="text-[9px] text-indigo-700 font-bold truncate max-w-full mt-1 px-1">{selectedFile.name}</span>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Pet *</label>
                  <input type="text" className={inputClass} value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Espécie</label>
                  <select className={inputClass} value={species} onChange={e => { setSpecies(e.target.value); setBreed(""); setHasDisease(""); }}>
                    <option value="Cão">Cão (Cachorro)</option>
                    <option value="Gato">Gato</option>
                  </select>
                </div>
                <div ref={breedRef} className="relative">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Raça</label>
                  <input type="text" placeholder="Digite a raça..." className={inputClass} value={breed} onFocus={() => setShowBreedDropdown(true)} onChange={e => { setBreed(e.target.value); setShowBreedDropdown(true); }} />
                  {showBreedDropdown && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-xl divide-y divide-slate-100">
                      {filteredBreeds.map((b, i) => <div key={i} onClick={() => { setBreed(b.name); setShowBreedDropdown(false); }} className="px-3 py-2.5 text-xs text-slate-800 font-medium hover:bg-indigo-50 cursor-pointer">{b.name}</div>)}
                      {breed.trim() && !filteredBreeds.some(b => b.name.toLowerCase() === breed.toLowerCase().trim()) && (
                        <div onClick={() => setShowBreedDropdown(false)} className="px-3 py-2.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold cursor-pointer">✨ Cadastrar nova raça: "{breed}"</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input type="date" className={inputClass} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                <select className={inputClass} value={gender} onChange={e => setGender(e.target.value)}><option value="M">Macho</option><option value="F">Fêmea</option></select>
                <select className={inputClass} value={coat} onChange={e => setCoat(e.target.value)}>{COAT_TYPES.map((type, idx) => <option key={idx} value={type}>{type}</option>)}</select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <select className={inputClass} value={size} onChange={e => setSize(e.target.value)}>
                  <option value="mini">Mini / Toy</option><option value="pequeno">Pequeno</option><option value="medio">Médio</option><option value="grande">Grande</option><option value="gigante">Gigante</option>
                </select>
                <input type="number" step="0.1" className={inputClass} value={weight} onChange={e => setWeight(e.target.value)} />
                <div className="flex items-center pt-5"><label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded border-slate-400 text-indigo-600" checked={castrated} onChange={e => setCastrated(e.target.checked)} /> <span>Castrado?</span></label></div>
              </div>

              <select className={inputClass} value={temperament} onChange={e => setTemperament(e.target.value)}>{TEMPERAMENT_TYPES.map((type, idx) => <option key={idx} value={type}>{type}</option>)}</select>
              <textarea rows={2} placeholder="Insira detalhes adicionais sobre o animal..." className="w-full rounded-xl border border-slate-300 bg-slate-100 p-2.5 text-sm text-slate-900 font-medium focus:bg-white focus:border-indigo-600 focus:outline-none" value={generalObservations} onChange={e => setGeneralObservations(e.target.value)} />
            </div>
          )}

          {/* TAB 2: SAÚDE & VET */}
          {activeTab === "health" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer"><input type="checkbox" className="w-4 h-4" checked={vaccinesUpToDate} onChange={e => setVaccinesUpToDate(e.target.checked)} /> <span>Vacinas em dia</span></label>
                <input type="date" className={inputClass} value={lastDeworming} onChange={e => setLastDeworming(e.target.value)} />
              </div>

              <div ref={diseaseRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Doenças Clínicas / Diagnósticos ({species})</label>
                <input type="text" placeholder="Selecione ou digite uma patologia registrada..." className={inputClass} value={hasDisease} onFocus={() => setShowDiseaseDropdown(true)} onChange={e => { setHasDisease(e.target.value); setShowDiseaseDropdown(true); }} />
                {showDiseaseDropdown && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-xl divide-y divide-slate-100">
                    <div onClick={() => { setHasDisease("Nenhuma doença relatada"); setShowDiseaseDropdown(false); }} className="px-3 py-2.5 text-xs italic text-slate-500 hover:bg-slate-50 cursor-pointer">Nenhuma doença relatada</div>
                    {filteredDiseases.map((d, i) => <div key={i} onClick={() => { setHasDisease(d.name); setShowDiseaseDropdown(false); }} className="px-3 py-2.5 text-xs text-slate-800 font-medium hover:bg-indigo-50 cursor-pointer">{d.name}</div>)}
                    {hasDisease.trim() && !filteredDiseases.some(d => d.name.toLowerCase() === hasDisease.toLowerCase().trim()) && (
                      <div onClick={() => setShowDiseaseDropdown(false)} className="px-3 py-2.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold cursor-pointer">✨ Cadastrar nova doença: "{hasDisease}"</div>
                    )}
                  </div>
                )}
              </div>

              <input type="text" placeholder="Restrições alimentares ou Alergias" className={inputClass} value={allergies} onChange={e => setAllergies(e.target.value)} />
              <div className="grid grid-cols-3 gap-2"><input type="text" placeholder="Vet Externo" className={inputClass} value={externalVet} onChange={e => setExternalVet(e.target.value)} /><input type="text" placeholder="Clínica Vet" className={inputClass} value={externalClinic} onChange={e => setExternalClinic(e.target.value)} /><input type="text" placeholder="Telefone do Vet" className={inputClass} value={externalPhone} onChange={e => setExternalPhone(maskPhone(e.target.value))} /></div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="relative flex items-center justify-center border-2 border-dashed border-slate-400 rounded-xl p-4 bg-slate-100 hover:bg-slate-200 cursor-pointer">
                  <input type="file" multiple accept="image/*,application/pdf" onChange={handleAddAttachment} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <span className="text-xs text-slate-800 font-bold">📎 Clique ou arraste exames, receitas ou fotos de lesões...</span>
                </div>
                {attachmentsList.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {attachmentsList.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-300 text-xs">
                        <span className="truncate flex-1 pr-2 text-slate-800 font-semibold">{att.type === "pdf" ? "📄" : "🖼️"} {att.name}</span>
                        <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-red-600 font-extrabold hover:text-red-800 px-2 cursor-pointer text-sm">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMPORTAMENTO */}
          {activeTab === "behavior" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center space-x-1 font-semibold text-slate-800"><input type="checkbox" checked={goodWithDogs} onChange={e => setGoodWithDogs(target.checked)} /> <span>Aceita Cães</span></label>
                <label className="flex items-center space-x-1 font-semibold text-slate-800"><input type="checkbox" checked={goodWithCats} onChange={e => setGoodWithCats(target.checked)} /> <span>Aceita Gatos</span></label>
                <label className="flex items-center space-x-1 font-semibold text-slate-800"><input type="checkbox" checked={goodWithChildren} onChange={e => setGoodWithChildren(target.checked)} /> <span>Aceita Crianças</span></label>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-red-700 font-bold">
                <label className="flex items-center space-x-1"><input type="checkbox" checked={excessiveBark} onChange={e => setExcessiveBark(target.checked)} /> <span>Vocaliza muito</span></label>
                <label className="flex items-center space-x-1"><input type="checkbox" checked={anxiety} onChange={e => setAnxiety(target.checked)} /> <span>Ansiedade Separação</span></label>
                <label className="flex items-center space-x-1 text-red-800 font-extrabold"><input type="checkbox" checked={aggressiveness} onChange={e => setAggressiveness(target.checked)} /> <span>Histórico Reativo</span></label>
              </div>
              <input type="text" placeholder="Fobias / Medos..." className={inputClass} value={fears} onChange={e => setFears(target.value)} />
              <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Horários de passeio" className={inputClass} value={walkSchedule} onChange={e => setWalkSchedule(target.value)} /><input type="text" placeholder="Onde costuma dormir?" className={inputClass} value={sleepingSpot} onChange={e => setSleepingSpot(target.value)} /></div>
              <div className="grid grid-cols-2 gap-4 items-center"><label className="flex items-center space-x-2 font-bold text-slate-800"><input type="checkbox" checked={furnitureAllowed} onChange={e => setFurnitureAllowed(target.checked)} /> <span>Sobe em sofás/camas?</span></label><input type="text" placeholder="Hábitos de eliminação" className={inputClass} value={eliminationHabits} onChange={e => setEliminationHabits(target.value)} /></div>
            </div>
          )}

          {/* TAB 4: ROTINA / MEDS */}
          {activeTab === "routines" && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-300">
                <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Nome da Ração" className={inputClass} value={foodName} onChange={e => setFoodName(target.value)} /><input type="text" placeholder="Quantidade por porção" className={inputClass} value={amountPerFeeding} onChange={e => setAmountPerFeeding(target.value)} /></div>
                <input type="text" placeholder="Horários das refeições" className={inputClass} value={foodHours} onChange={e => setFoodHours(target.value)} />
                <label className="flex items-center space-x-2 text-xs font-bold text-blue-900 cursor-pointer"><input type="checkbox" checked={allowsTreats} onChange={e => setAllowsTreats(target.checked)} /> <span>Autorizado a ganhar petiscos?</span></label>
              </div>

              <div className="bg-purple-50 p-4 rounded-xl space-y-3 border border-purple-300">
                <div className="grid grid-cols-3 gap-2 items-end"><input type="text" placeholder="Remédio ativo..." className="bg-white rounded-xl border border-slate-300 p-2 text-xs font-medium" value={tmpMedName} onChange={e => setTmpMedName(target.value)} /><input type="text" placeholder="Dosagem..." className="bg-white rounded-xl border border-slate-300 p-2 text-xs font-medium" value={tmpMedDosage} onChange={e => setTmpMedDosage(target.value)} /><input type="text" placeholder="Horários..." className="bg-white rounded-xl border border-slate-300 p-2 text-xs font-medium" value={tmpMedHours} onChange={e => setTmpMedHours(target.value)} /></div>
                <button type="button" onClick={handleAddMedication} className="w-full bg-purple-700 text-white rounded-xl p-2.5 text-xs font-bold shadow-xs">+ Incluir Medicamento na Lista</button>
                {medicationsList.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-purple-300 bg-white">
                    <table className="w-full text-left text-xs"><thead className="bg-purple-100 font-bold text-purple-900 border-b border-purple-300"><tr><th className="p-2.5">Medicamento</th><th className="p-2.5">Dose</th><th className="p-2.5">Horários</th><th className="p-2.5 text-center">Ação</th></tr></thead>
                      <tbody className="divide-y divide-purple-200 text-slate-800 font-medium">
                        {medicationsList.map((med, idx) => (<tr key={idx} className="hover:bg-purple-50/50"><td className="p-2.5 font-bold">{med.medication_name}</td><td className="p-2.5">{med.dosage}</td><td className="p-2.5 text-slate-600">{med.frequencies || "-"}</td><td className="p-2.5 text-center"><button type="button" onClick={() => handleRemoveMedication(idx)} className="text-red-600 font-bold hover:underline">Remover</button></td></tr>))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-100 rounded-b-2xl">
          <button type="button" onClick={onClose} className="rounded-xl border-2 border-slate-400 bg-slate-300 hover:bg-slate-400 px-5 py-2 text-xs font-extrabold text-slate-800 cursor-pointer shadow-sm">Fechar</button>
          <button type="button" disabled={loading} onClick={handleSavePet} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 cursor-pointer shadow-md">{loading ? "Processando..." : "Salvar Dados"}</button>
        </div>

      </div>

      <NotificationModal isOpen={noti.isOpen} type={noti.type} title={noti.title} message={noti.message} onClose={() => setNoti({ ...noti, isOpen: false })} />
    </div>
  );
}