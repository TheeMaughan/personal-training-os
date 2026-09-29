create table if not exists public.client_exercise_preferences (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  preference text not null default 'neutral' check (preference in ('favorite','neutral','avoid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, exercise_id)
);

create index if not exists idx_client_exercise_preferences_client on public.client_exercise_preferences(client_id);
create index if not exists idx_client_exercise_preferences_exercise on public.client_exercise_preferences(exercise_id);

alter table public.client_exercise_preferences enable row level security;

create policy "Authenticated users can view client exercise preferences"
on public.client_exercise_preferences for select to authenticated using (true);