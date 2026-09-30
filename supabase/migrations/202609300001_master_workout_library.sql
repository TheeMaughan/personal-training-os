create table if not exists public.master_workouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  opt_phase_number integer check (opt_phase_number between 1 and 5),
  description text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.master_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.master_workouts(id) on delete cascade,
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
alter table public.master_workouts enable row level security;
alter table public.master_workout_exercises enable row level security;
create policy "Authenticated users can view master workouts" on public.master_workouts for select to authenticated using (true);
create policy "Authenticated users can view master workout exercises" on public.master_workout_exercises for select to authenticated using (true);
create index if not exists idx_master_workouts_phase on public.master_workouts(opt_phase_number);
create index if not exists idx_master_workout_exercises_workout on public.master_workout_exercises(workout_id);
create index if not exists idx_master_workout_exercises_exercise on public.master_workout_exercises(exercise_id);