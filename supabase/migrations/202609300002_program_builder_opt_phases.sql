alter table public.program_builder_workouts
  add column if not exists opt_phase_number integer;

alter table public.program_builder_workouts
  drop constraint if exists program_builder_workouts_opt_phase_number_check;

alter table public.program_builder_workouts
  add constraint program_builder_workouts_opt_phase_number_check
  check (opt_phase_number is null or opt_phase_number between 1 and 5);

create index if not exists idx_program_builder_workouts_opt_phase
  on public.program_builder_workouts(opt_phase_number);
