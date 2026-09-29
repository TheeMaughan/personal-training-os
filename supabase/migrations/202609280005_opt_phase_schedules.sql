create table if not exists public.opt_phase_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  athlete_type text not null check (athlete_type in ('normal','power')),
  phase_numbers integer[] not null check (cardinality(phase_numbers) between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opt_phase_schedules_athlete_type_idx
  on public.opt_phase_schedules(athlete_type);

alter table public.opt_phase_schedules enable row level security;

drop policy if exists "Authenticated users can view OPT phase schedules"
  on public.opt_phase_schedules;
create policy "Authenticated users can view OPT phase schedules"
  on public.opt_phase_schedules for select to authenticated using (true);

insert into public.opt_phase_schedules
  (name, description, athlete_type, phase_numbers)
values
  (
    'Normal Lifter',
    'Standard OPT progression using Phases 1 through 4.',
    'normal',
    '{1,2,3,4}'
  ),
  (
    'Power Lifter',
    'Power-oriented OPT schedule using Phases 1 through 3 followed by Phase 5.',
    'power',
    '{1,2,3,5}'
  )
on conflict (name) do update
set description = excluded.description,
    athlete_type = excluded.athlete_type,
    phase_numbers = excluded.phase_numbers,
    active = true,
    updated_at = now();

comment on table public.opt_phase_schedules is
  'Trainer-selectable OPT phase sequences used when building client programs.';
