create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_equipment (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  available boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id,equipment_id)
);

create index if not exists client_equipment_client_idx on public.client_equipment(client_id);
create index if not exists client_equipment_equipment_idx on public.client_equipment(equipment_id);

alter table public.equipment enable row level security;
alter table public.client_equipment enable row level security;

drop policy if exists "Authenticated users can view equipment" on public.equipment;
create policy "Authenticated users can view equipment" on public.equipment for select to authenticated using (true);
drop policy if exists "Authenticated users can view client equipment" on public.client_equipment;
create policy "Authenticated users can view client equipment" on public.client_equipment for select to authenticated using (true);
