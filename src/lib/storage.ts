// src/lib/storage.ts
import { supabase } from "./supabase.ts";

/**
 * Realiza o upload de um arquivo para o bucket privado organizado por Tenant.
 * @param file O arquivo capturado pelo input HTML
 * @param petId Opcional - ID do pet para organizar a pasta
 * @returns A URL assinada temporária ou o caminho do arquivo para salvar no banco
 */
export async function uploadPetFile(file: File, petId: string): Promise<string | null> {
  try {
    // 1. Captura o tenant_id do usuário logado
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", session?.user.id)
      .single();

    if (!profile) throw new Error("Perfil organizacional não encontrado.");

    const tenantId = profile.tenant_id;
    
    // 2. Define um nome único para o arquivo para evitar sobrescrita
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    
    // Estrutura da pasta: id-do-tenant/id-do-pet/nome-do-arquivo.ext
    const filePath = `${tenantId}/${petId}/${fileName}`;

    // 3. Executa o upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("petshop-arquivos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Retorna o caminho relativo (é esse caminho que salvaremos na coluna photo_url do Pet)
    return filePath;
  } catch (error: any) {
    console.error("Erro no upload:", error.message);
    alert("Falha ao salvar o arquivo: " + error.message);
    return null;
  }
}

/**
 * Gera uma URL de visualização segura (assinada) válida por 1 hora.
 * Como o bucket é privado, precisamos dessa assinatura para exibir a imagem no <img src="..." />
 */
export async function getPresignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  
  const { data, error } = await supabase.storage
    .from("petshop-arquivos")
    .createSignedUrl(filePath, 3600); // Válida por 3600 segundos (1 hora)

  if (error) {
    console.error("Erro ao gerar URL assinada:", error.message);
    return null;
  }

  return data.signedUrl;
}