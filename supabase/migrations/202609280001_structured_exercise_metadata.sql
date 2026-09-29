create extension if not exists pgcrypto;

alter table public.exercises
  add column if not exists movement_pattern text,
  add column if not exists difficulty text,
  add column if not exists opt_phases text[] not null default '{}',
  add column if not exists active boolean not null default true;

create table if not exists public.exercise_muscles (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  muscle_group text not null,
  role text not null check (role in ('primary','secondary')),
  stimulus_weight numeric(5,2) not null default 1.00 check (stimulus_weight >= 0 and stimulus_weight <= 2),
  created_at timestamptz not null default now(),
  unique (exercise_id, muscle_group, role)
);

create table if not exists public.exercise_equipment (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  equipment_name text not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (exercise_id, equipment_name)
);

create index if not exists exercise_muscles_exercise_id_idx on public.exercise_muscles(exercise_id);
create index if not exists exercise_muscles_muscle_group_idx on public.exercise_muscles(muscle_group);
create index if not exists exercise_equipment_exercise_id_idx on public.exercise_equipment(exercise_id);
create index if not exists exercise_equipment_name_idx on public.exercise_equipment(equipment_name);

alter table public.exercise_muscles enable row level security;
alter table public.exercise_equipment enable row level security;

drop policy if exists "Authenticated users can view exercise muscles" on public.exercise_muscles;
create policy "Authenticated users can view exercise muscles" on public.exercise_muscles for select to authenticated using (true);
drop policy if exists "Authenticated users can view exercise equipment" on public.exercise_equipment;
create policy "Authenticated users can view exercise equipment" on public.exercise_equipment for select to authenticated using (true);

comment on table public.exercise_muscles is 'Structured muscle contribution metadata used for workout and program analysis.';
comment on table public.exercise_equipment is 'Equipment required or optionally used by an exercise.';
