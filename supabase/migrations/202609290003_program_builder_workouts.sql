create table if not exists public.program_builder_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.program_builder_templates(id) on delete cascade,
  name text not null,
  workout_order integer not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, workout_order)
);

create table if not exists public.program_builder_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.program_builder_workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  exercise_order integer not null,
  sets integer not null default 3 check (sets between 1 and 20),
  rep_min integer not null default 8 check (rep_min between 1 and 100),
  rep_max integer not null default 12 check (rep_max between 1 and 100),
  target_rir numeric(4,1) check (target_rir between 0 and 10),
  rest_seconds integer check (rest_seconds between 0 and 1800),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workout_id, exercise_order),
  check (rep_max >= rep_min)
);

alter table public.program_builder_workouts enable row level security;
alter table public.program_builder_exercises enable row level security;
create policy "Authenticated users can view program builder workouts" on public.program_builder_workouts for select to authenticated using (true);
create policy "Authenticated users can view program builder exercises" on public.program_builder_exercises for select to authenticated using (true);
create index if not exists idx_program_builder_workouts_program on public.program_builder_workouts(program_id);
create index if not exists idx_program_builder_exercises_workout on public.program_builder_exercises(workout_id);
