-- =========================================================================
-- 1. EXTENSÕES E TIPOS PERSONALIZADOS (ENUMS)
-- =========================================================================
create extension if not exists "uuid-ossp";

create type public.pet_size as enum ('mini', 'pequeno', 'medio', 'grande', 'gigante');
create type public.user_role as enum ('owner', 'manager', 'receptionist', 'groomer', 'veterinarian');

-- =========================================================================
-- 2. ESTRUTURA BASE (TENANTS, PERFIS, CLIENTES E PETS)
-- =========================================================================

-- Tabela de Tenants (As Empresas/Pet Shops)
create table public.tenants (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    cnpj text unique,
    phone text,
    email text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Perfis de Usuários (Profiles vinculados ao auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    full_name text not null,
    role public.user_role default 'receptionist'::public.user_role not null,
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Clientes (Tutores)
create table public.customers (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    name text not null,
    cpf text,
    email text,
    phone text not null,
    emergency_phone text,
    emergency_contact_name text,
    address_zip_code text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

    constraint unique_customer_cpf_per_tenant unique (tenant_id, cpf)
);

-- Tabela de Pets
create table public.pets (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    customer_id uuid references public.customers(id) on delete cascade not null,
    name text not null,
    species text not null, 
    breed text,            
    birth_date date,
    gender text check (gender in ('M', 'F', 'U')), 
    size public.pet_size default 'medio'::public.pet_size not null,
    coat text,             
    weight_kg numeric(5,2),
    temperament text,      
    allergies text,
    castrated boolean default false not null,
    notes text,
    photo_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 3. MÓDULOS DE EXTENSÃO (SAÚDE, COMPORTAMENTO, ROTINAS E CHECK-IN)
-- =========================================================================

-- Perfil Clínico e de Saúde do Pet
create table public.pet_health_profiles (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    pet_id uuid references public.pets(id) on delete cascade unique not null,
    vaccines_up_to_date boolean default true not null,
    last_deworming_date date,
    has_diseases text,
    allergies text,
    food_restrictions text,
    external_vet_name text,
    external_clinic_name text,
    external_vet_phone text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Perfil Comportamental e de Hábitos (Daycare/Hotelzinho)
create table public.pet_behavior_profiles (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    pet_id uuid references public.pets(id) on delete cascade unique not null,
    good_with_dogs boolean default true,
    good_with_cats boolean default true,
    good_with_children boolean default true,
    excessive_barking_meowing boolean default false,
    separation_anxiety boolean default false,
    history_of_aggressiveness boolean default false,
    fears_and_obs text,
    walking_schedule text,      
    preferred_sleeping_spot text, 
    favorite_toys text,
    allowed_on_furniture boolean default false, 
    elimination_habits text,     
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Medicamentos Ativos do Pet
create table public.pet_medications (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    pet_id uuid references public.pets(id) on delete cascade not null,
    medication_name text not null,
    dosage text,            
    frequencies text[],     -- Ex: ['08:00', '20:00']
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rotina de Alimentação do Pet
create table public.pet_feeding_routines (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    pet_id uuid references public.pets(id) on delete cascade not null,
    food_name text not null, 
    amount_per_feeding text, 
    frequencies text[],     -- Ex: ['07:00', '19:00']
    allows_treats boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Controle de Check-in e Pertences (Entrada na Hospedagem)
create table public.checkins (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    pet_id uuid references public.pets(id) on delete cascade not null,
    brought_food boolean default false,
    brought_bowls boolean default false, 
    brought_leash boolean default false, 
    brought_medications boolean default false,
    brought_bedding boolean default false, 
    brought_toys boolean default false,
    brought_vaccine_card boolean default false,
    other_items text, 
    emergency_authorized boolean default false not null, 
    checkin_at timestamp with time zone default timezone('utc'::text, now()) not null,
    checkout_at timestamp with time zone
);

-- =========================================================================
-- 4. ÍNDICES DE PERFORMANCE DO BANCO DE DADOS
-- =========================================================================
create index idx_profiles_tenant on public.profiles(tenant_id);
create index idx_customers_tenant on public.customers(tenant_id);
create index idx_pets_tenant on public.pets(tenant_id);
create index idx_pets_customer on public.pets(customer_id);
create index idx_pet_health_pet on public.pet_health_profiles(pet_id);
create index idx_pet_behavior_pet on public.pet_behavior_profiles(pet_id);
create index idx_pet_meds_pet on public.pet_medications(pet_id);
create index idx_pet_feed_pet on public.pet_feeding_routines(pet_id);
create index idx_checkins_pet on public.checkins(pet_id);

-- =========================================================================
-- 5. FUNÇÕES AUXILIARES E SEGURANÇA A NÍVEL DE LINHA (RLS)
-- =========================================================================

-- Função para capturar o tenant_id do usuário autenticado contextualmente
create or replace function public.get_auth_tenant_id()
returns uuid as $$
  select tenant_id from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- Ativando RLS em todas as tabelas transacionais
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.pets enable row level security;
alter table public.pet_health_profiles enable row level security;
alter table public.pet_behavior_profiles enable row level security;
alter table public.pet_medications enable row level security;
alter table public.pet_feeding_routines enable row level security;
alter table public.checkins enable row level security;

-- Criando as Políticas de Isolamento por Tenant (Tenant Isolation Policies)

-- PROFILES
create policy "Tenant RLS para profiles" on public.profiles for all using (tenant_id = public.get_auth_tenant_id());

-- CUSTOMERS
create policy "Tenant RLS para customers" on public.customers for all using (tenant_id = public.get_auth_tenant_id());

-- PETS
create policy "Tenant RLS para pets" on public.pets for all using (tenant_id = public.get_auth_tenant_id());

-- HEALTH
create policy "Tenant RLS para health profiles" on public.pet_health_profiles for all using (tenant_id = public.get_auth_tenant_id());

-- BEHAVIOR
create policy "Tenant RLS para behavior profiles" on public.pet_behavior_profiles for all using (tenant_id = public.get_auth_tenant_id());

-- MEDICATIONS
create policy "Tenant RLS para medications" on public.pet_medications for all using (tenant_id = public.get_auth_tenant_id());

-- FEEDING ROUTINES
create policy "Tenant RLS para feeding routines" on public.pet_feeding_routines for all using (tenant_id = public.get_auth_tenant_id());

-- CHECKINS
create policy "Tenant RLS para checkins" on public.checkins for all using (tenant_id = public.get_auth_tenant_id());