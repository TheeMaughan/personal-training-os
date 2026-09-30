create table if not exists public.program_builder_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  duration_weeks integer not null default 12 check (duration_weeks between 1 and 52),
  days_per_week integer not null default 4 check (days_per_week between 1 and 7),
  opt_schedule_id uuid references public.opt_phase_schedules(id) on delete set null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.program_builder_templates enable row level security;
create policy "Authenticated users can view program builder templates"
on public.program_builder_templates for select to authenticated using (true);

create index if not exists idx_program_builder_templates_schedule
on public.program_builder_templates(opt_schedule_id);
