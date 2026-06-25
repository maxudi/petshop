-- =========================================================================
-- 1. EXTENSÕES E TIPOS PERSONALIZADOS (ENUMS)
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Garantir criação segura dos ENUMS se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_size') THEN
        CREATE TYPE public.pet_size AS ENUM ('mini', 'pequeno', 'medio', 'grande', 'gigante');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('owner', 'manager', 'receptionist', 'groomer', 'veterinarian');
    END IF;
END $$;

-- =========================================================================
-- 2. ESTRUTURA BASE (TENANTS, PERFIS, CLIENTES E PETS)
-- =========================================================================

-- Tabela de Tenants (As Empresas/Pet Shops)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    phone TEXT,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Perfis de Usuários (Profiles vinculados ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'receptionist'::public.user_role NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Clientes (Tutores)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    cpf TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    emergency_phone TEXT,
    emergency_contact_name TEXT,
    address_zip_code TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_neighborhood TEXT,
    address_city TEXT,
    address_state TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT unique_customer_cpf_per_tenant UNIQUE (tenant_id, cpf)
);

-- Tabela de Pets (Atualizada com Integridade Referencial Estrita)
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    species TEXT NOT NULL, 
    breed TEXT,            
    birth_date DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'U')), 
    size public.pet_size DEFAULT 'medio'::public.pet_size NOT NULL,
    coat TEXT,             
    weight_kg NUMERIC(5,2),
    temperament TEXT,      
    allergies TEXT,
    castrated BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 3. MÓDULOS DE EXTENSÃO (SAÚDE, COMPORTAMENTO, ROTINAS E CHECK-IN)
-- =========================================================================

-- Perfil Clínico e de Saúde do Pet
CREATE TABLE IF NOT EXISTS public.pet_health_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE UNIQUE NOT NULL,
    vaccines_up_to_date BOOLEAN DEFAULT true NOT NULL,
    last_deworming_date DATE,
    has_diseases TEXT,
    allergies TEXT,
    food_restrictions TEXT,
    external_vet_name TEXT,
    external_clinic_name TEXT,
    external_vet_phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Perfil Comportamental e de Hábitos (Daycare/Hotelzinho)
CREATE TABLE IF NOT EXISTS public.pet_behavior_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE UNIQUE NOT NULL,
    good_with_dogs BOOLEAN DEFAULT true,
    good_with_cats BOOLEAN DEFAULT true,
    good_with_children BOOLEAN DEFAULT true,
    excessive_barking_meowing BOOLEAN DEFAULT false,
    separation_anxiety BOOLEAN DEFAULT false,
    history_of_aggressiveness BOOLEAN DEFAULT false,
    fears_and_obs TEXT,
    walking_schedule TEXT,      
    preferred_sleeping_spot TEXT, 
    favorite_toys TEXT,
    allowed_on_furniture BOOLEAN DEFAULT false, 
    elimination_habits TEXT,     
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Medicamentos Ativos do Pet (Garante array de textos para os horários)
CREATE TABLE IF NOT EXISTS public.pet_medications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT,            
    frequencies TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Rotina de Alimentação do Pet
CREATE TABLE IF NOT EXISTS public.pet_feeding_routines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE UNIQUE NOT NULL, -- Adicionado UNIQUE para evitar duplicidade na upsert
    food_name TEXT NOT NULL, 
    amount_per_feeding TEXT, 
    frequencies TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    allows_treats BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Controle de Check-in e Pertences (Entrada na Hospedagem)
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    brought_food BOOLEAN DEFAULT false,
    brought_bowls BOOLEAN DEFAULT false, 
    brought_leash BOOLEAN DEFAULT false, 
    brought_medications BOOLEAN DEFAULT false,
    brought_bedding BOOLEAN DEFAULT false, 
    brought_toys BOOLEAN DEFAULT false,
    brought_vaccine_card BOOLEAN DEFAULT false,
    other_items TEXT, 
    emergency_authorized BOOLEAN DEFAULT false NOT NULL, 
    checkin_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    checkout_at TIMESTAMP WITH TIME ZONE
);

-- =========================================================================
-- 4. ÍNDICES DE PERFORMANCE DO BANCO DE DADOS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant ON public.pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_customer ON public.pets(customer_id);
CREATE INDEX IF NOT EXISTS idx_pet_health_pet ON public.pet_health_profiles(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_behavior_pet ON public.pet_behavior_profiles(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_meds_pet ON public.pet_medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_feed_pet ON public.pet_feeding_routines(pet_id);
CREATE INDEX IF NOT EXISTS idx_checkins_pet ON public.checkins(pet_id);

-- =========================================================================
-- 5. FUNÇÕES AUXILIARES E SEGURANÇA A NÍVEL DE LINHA (RLS)
-- =========================================================================

-- Função para capturar o tenant_id do usuário autenticado contextualmente
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ativando RLS em todas as tabelas transacionais de forma segura
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_feeding_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Criando as Políticas de Isolamento por Tenant de forma condicional (evita erros se já existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para profiles') THEN
        CREATE POLICY "Tenant RLS para profiles" ON public.profiles FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para customers') THEN
        CREATE POLICY "Tenant RLS para customers" ON public.customers FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para pets') THEN
        CREATE POLICY "Tenant RLS para pets" ON public.pets FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para health profiles') THEN
        CREATE POLICY "Tenant RLS para health profiles" ON public.pet_health_profiles FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para behavior profiles') THEN
        CREATE POLICY "Tenant RLS para behavior profiles" ON public.pet_behavior_profiles FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para medications') THEN
        CREATE POLICY "Tenant RLS para medications" ON public.pet_medications FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para feeding routines') THEN
        CREATE POLICY "Tenant RLS para feeding routines" ON public.pet_feeding_routines FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant RLS para checkins') THEN
        CREATE POLICY "Tenant RLS para checkins" ON public.checkins FOR ALL USING (tenant_id = public.get_auth_tenant_id());
    END IF;
END $$;