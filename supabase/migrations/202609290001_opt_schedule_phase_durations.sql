create table if not exists public.opt_schedule_phases (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.opt_phase_schedules(id) on delete cascade,
  phase_id uuid not null references public.opt_phases(id) on delete restrict,
  phase_order integer not null check (phase_order >= 1 and phase_order <= 5),
  weeks integer not null default 4 check (weeks >= 1 and weeks <= 52),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, phase_order),
  unique (schedule_id, phase_id)
);

create index if not exists opt_schedule_phases_schedule_id_idx
  on public.opt_schedule_phases(schedule_id);

create index if not exists opt_schedule_phases_phase_id_idx
  on public.opt_schedule_phases(phase_id);

alter table public.opt_schedule_phases enable row level security;

drop policy if exists "Authenticated users can view OPT schedule phases"
  on public.opt_schedule_phases;
create policy "Authenticated users can view OPT schedule phases"
  on public.opt_schedule_phases for select to authenticated using (true);

insert into public.opt_schedule_phases (schedule_id, phase_id, phase_order, weeks)
select s.id, p.id, v.phase_order, v.weeks
from public.opt_phase_schedules s
join (
  values
    ('Normal Lifter', 1, 1, 4),
    ('Normal Lifter', 2, 2, 4),
    ('Normal Lifter', 3, 3, 8),
    ('Normal Lifter', 4, 4, 6),
    ('Power Lifter', 1, 1, 4),
    ('Power Lifter', 2, 2, 4),
    ('Power Lifter', 3, 3, 8),
    ('Power Lifter', 5, 4, 6)
) as v(schedule_name, phase_number, phase_order, weeks)
  on true
join public.opt_phases p on p.phase_number = v.phase_number
where s.name = v.schedule_name
on conflict (schedule_id, phase_order) do update
set phase_id = excluded.phase_id,
    weeks = excluded.weeks,
    updated_at = now();

comment on table public.opt_schedule_phases is
  'Ordered OPT phases and default duration in weeks for each trainer-selectable schedule.';
