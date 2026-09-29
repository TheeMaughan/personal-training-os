create table if not exists public.opt_phases (
  id uuid primary key default gen_random_uuid(),
  phase_number integer not null unique check (phase_number between 1 and 5),
  name text not null unique,
  level text not null check (level in ('stabilization','strength','power')),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opt_phase_rules (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.opt_phases(id) on delete cascade,
  rule_key text not null,
  rule_value jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase_id, rule_key)
);

create index if not exists opt_phase_rules_phase_id_idx
  on public.opt_phase_rules(phase_id);

alter table public.opt_phases enable row level security;
alter table public.opt_phase_rules enable row level security;

drop policy if exists "Authenticated users can view OPT phases" on public.opt_phases;
create policy "Authenticated users can view OPT phases"
  on public.opt_phases for select to authenticated using (true);

drop policy if exists "Authenticated users can view OPT phase rules" on public.opt_phase_rules;
create policy "Authenticated users can view OPT phase rules"
  on public.opt_phase_rules for select to authenticated using (true);

insert into public.opt_phases (phase_number, name, level, description)
values
  (1, 'Stabilization Endurance', 'stabilization', 'Develop stabilization endurance, postural control, and movement quality.'),
  (2, 'Strength Endurance', 'strength', 'Combine strength-focused loading with stabilization demands.'),
  (3, 'Muscular Development', 'strength', 'Emphasize hypertrophy and muscular development.'),
  (4, 'Maximal Strength', 'strength', 'Emphasize high-force strength development.'),
  (5, 'Power', 'power', 'Develop the ability to produce force rapidly.')
on conflict (phase_number) do update
set name = excluded.name,
    level = excluded.level,
    description = excluded.description,
    active = true,
    updated_at = now();

with phase_rules(phase_number, rule_key, rule_value, notes) as (
  values
    (1, 'sets', '{"min":1,"max":3}'::jsonb, 'Typical NASM Phase 1 set range.'),
    (1, 'reps', '{"min":12,"max":20}'::jsonb, 'Typical NASM Phase 1 repetition range.'),
    (1, 'intensity_percent_1rm', '{"min":50,"max":70}'::jsonb, 'Typical Phase 1 loading guidance when 1RM is applicable.'),
    (1, 'tempo', '{"eccentric":"4","isometric":"2","concentric":"1"}'::jsonb, 'Controlled tempo emphasizing stability and technique.'),
    (1, 'rest_seconds', '{"min":0,"max":90}'::jsonb, 'Rest varies by exercise and training design.'),
    (1, 'superset_required', '{"value":false}'::jsonb, 'Phase 1 does not require strength/stability supersets.'),
    (1, 'movement_quality_priority', '{"value":true}'::jsonb, 'Movement quality is a primary programming constraint.'),

    (2, 'sets', '{"min":2,"max":4}'::jsonb, 'Phase 2 commonly uses paired strength/stability work.'),
    (2, 'reps', '{"min":8,"max":12}'::jsonb, 'Typical strength-endurance repetition range.'),
    (2, 'tempo', '{"eccentric":"2","isometric":"0","concentric":"1"}'::jsonb, 'Controlled strength-focused tempo.'),
    (2, 'rest_seconds', '{"min":0,"max":120}'::jsonb, 'Rest depends on the paired exercise design.'),
    (2, 'superset_required', '{"value":true}'::jsonb, 'Phase 2 uses strength exercise paired with stabilization-focused exercise.'),
    (2, 'paired_exercise_required', '{"value":true}'::jsonb, 'Program builder should support complementary paired exercises.'),

    (3, 'sets', '{"min":3,"max":6}'::jsonb, 'Hypertrophy-oriented programming commonly uses multiple working sets.'),
    (3, 'reps', '{"min":6,"max":12}'::jsonb, 'Typical muscular-development repetition range.'),
    (3, 'tempo', '{"eccentric":"2","isometric":"0","concentric":"1"}'::jsonb, 'Controlled hypertrophy-focused tempo.'),
    (3, 'rest_seconds', '{"min":60,"max":120}'::jsonb, 'Typical hypertrophy rest window.'),
    (3, 'superset_required', '{"value":false}'::jsonb, 'Supersets may be used but are not mandatory.'),

    (4, 'sets', '{"min":4,"max":6}'::jsonb, 'Higher set volume supports maximal-strength work.'),
    (4, 'reps', '{"min":1,"max":5}'::jsonb, 'Typical maximal-strength repetition range.'),
    (4, 'intensity_percent_1rm', '{"min":85,"max":100}'::jsonb, 'High-intensity loading when 1RM is applicable.'),
    (4, 'tempo', '{"eccentric":"2","isometric":"0","concentric":"X"}'::jsonb, 'Controlled eccentric with intent to move concentrically fast.'),
    (4, 'rest_seconds', '{"min":120,"max":300}'::jsonb, 'Longer rest supports high-force sets.'),
    (4, 'superset_required', '{"value":false}'::jsonb, 'Primary emphasis is maximal force production.'),

    (5, 'sets', '{"min":3,"max":5}'::jsonb, 'Power work generally uses focused sets to preserve quality.'),
    (5, 'reps', '{"min":1,"max":5}'::jsonb, 'Low repetitions support explosive execution.'),
    (5, 'intensity_percent_1rm', '{"min":30,"max":70}'::jsonb, 'Loading varies substantially by power exercise; use exercise-specific guidance.'),
    (5, 'tempo', '{"eccentric":"controlled","isometric":"0","concentric":"X"}'::jsonb, 'Explosive concentric intent.'),
    (5, 'rest_seconds', '{"min":120,"max":300}'::jsonb, 'Long rest helps maintain power output.'),
    (5, 'superset_required', '{"value":false}'::jsonb, 'Power work is not defined by a mandatory superset.')
)
insert into public.opt_phase_rules (phase_id, rule_key, rule_value, notes)
select p.id, r.rule_key, r.rule_value, r.notes
from phase_rules r
join public.opt_phases p on p.phase_number = r.phase_number
on conflict (phase_id, rule_key) do update
set rule_value = excluded.rule_value,
    notes = excluded.notes,
    updated_at = now();

comment on table public.opt_phases is 'NASM OPT phase definitions used by the Training OS program methodology engine.';
comment on table public.opt_phase_rules is 'Structured, editable programming constraints for each OPT phase.';
