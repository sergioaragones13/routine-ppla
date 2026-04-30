create extension if not exists "pgcrypto";

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  default_sets text not null default '',
  default_guide jsonb not null default '[]'::jsonb,
  youtube_url text,
  image_query text,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.routine_templates(id) on delete cascade,
  day_key text not null check (day_key in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  day_order smallint not null check (day_order between 1 and 7),
  created_at timestamptz not null default now(),
  unique (template_id, day_key),
  unique (template_id, day_order)
);

create table if not exists public.routine_template_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.routine_template_days(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  sets text not null default '',
  is_s_tier boolean not null default false,
  sort_order int not null check (sort_order >= 1),
  created_at timestamptz not null default now(),
  unique (day_id, sort_order)
);

create table if not exists public.user_routine_assignments (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  template_id uuid not null references public.routine_templates(id) on delete restrict,
  planned_day_key text not null check (planned_day_key in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_user_routine_assignments_active
on public.user_routine_assignments (user_id)
where active = true;

create index if not exists idx_routine_templates_owner on public.routine_templates(owner_id);
create index if not exists idx_routine_template_days_template on public.routine_template_days(template_id, day_order);
create index if not exists idx_routine_template_day_exercises_day on public.routine_template_day_exercises(day_id, sort_order);

alter table public.exercise_catalog enable row level security;
alter table public.routine_templates enable row level security;
alter table public.routine_template_days enable row level security;
alter table public.routine_template_day_exercises enable row level security;
alter table public.user_routine_assignments enable row level security;

drop policy if exists "exercise catalog read authenticated" on public.exercise_catalog;
create policy "exercise catalog read authenticated"
on public.exercise_catalog
for select
to authenticated
using (true);

drop policy if exists "templates read public or own" on public.routine_templates;
drop policy if exists "templates insert own" on public.routine_templates;
drop policy if exists "templates update own" on public.routine_templates;
drop policy if exists "templates delete own" on public.routine_templates;

create policy "templates read public or own"
on public.routine_templates
for select
to authenticated
using (is_public = true or owner_id = auth.uid());

create policy "templates insert own"
on public.routine_templates
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "templates update own"
on public.routine_templates
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "templates delete own"
on public.routine_templates
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "template days read when template visible" on public.routine_template_days;
drop policy if exists "template days write own template" on public.routine_template_days;
drop policy if exists "template days delete own template" on public.routine_template_days;

create policy "template days read when template visible"
on public.routine_template_days
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_templates t
    where t.id = template_id
      and (t.is_public = true or t.owner_id = auth.uid())
  )
);

create policy "template days write own template"
on public.routine_template_days
for insert
to authenticated
with check (
  exists (
    select 1 from public.routine_templates t
    where t.id = template_id and t.owner_id = auth.uid()
  )
);

create policy "template days update own template"
on public.routine_template_days
for update
to authenticated
using (
  exists (
    select 1 from public.routine_templates t
    where t.id = template_id and t.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.routine_templates t
    where t.id = template_id and t.owner_id = auth.uid()
  )
);

create policy "template days delete own template"
on public.routine_template_days
for delete
to authenticated
using (
  exists (
    select 1 from public.routine_templates t
    where t.id = template_id and t.owner_id = auth.uid()
  )
);

drop policy if exists "template day exercises read when template visible" on public.routine_template_day_exercises;
drop policy if exists "template day exercises write own template" on public.routine_template_day_exercises;
drop policy if exists "template day exercises delete own template" on public.routine_template_day_exercises;

create policy "template day exercises read when template visible"
on public.routine_template_day_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_template_days d
    join public.routine_templates t on t.id = d.template_id
    where d.id = day_id
      and (t.is_public = true or t.owner_id = auth.uid())
  )
);

create policy "template day exercises write own template"
on public.routine_template_day_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.routine_template_days d
    join public.routine_templates t on t.id = d.template_id
    where d.id = day_id
      and t.owner_id = auth.uid()
  )
);

create policy "template day exercises update own template"
on public.routine_template_day_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.routine_template_days d
    join public.routine_templates t on t.id = d.template_id
    where d.id = day_id
      and t.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routine_template_days d
    join public.routine_templates t on t.id = d.template_id
    where d.id = day_id
      and t.owner_id = auth.uid()
  )
);

create policy "template day exercises delete own template"
on public.routine_template_day_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from public.routine_template_days d
    join public.routine_templates t on t.id = d.template_id
    where d.id = day_id
      and t.owner_id = auth.uid()
  )
);

drop policy if exists "assignment read own" on public.user_routine_assignments;
drop policy if exists "assignment insert own" on public.user_routine_assignments;
drop policy if exists "assignment update own" on public.user_routine_assignments;

create policy "assignment read own"
on public.user_routine_assignments
for select
to authenticated
using (user_id = auth.uid());

create policy "assignment insert own"
on public.user_routine_assignments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "assignment update own"
on public.user_routine_assignments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into public.exercise_catalog (slug, name, default_sets)
values
  ('press-banca-con-barra', 'Press banca con barra', '4 × 6-8'),
  ('press-inclinado-con-mancuernas', 'Press inclinado con mancuernas', '3 × 8-10'),
  ('cruce-de-poleas-sentado', 'Cruce de poleas sentado', '3 × 12-15'),
  ('press-militar-con-barra', 'Press militar con barra', '3 × 8-10'),
  ('elevaciones-laterales-con-polea-a-altura-del-muslo', 'Elevaciones laterales con polea a altura del muslo', '4 × 15-20'),
  ('rompecraneos-en-banco-declinado-con-mancuernas', 'Rompecráneos en banco declinado con mancuernas', '3 × 10-12'),
  ('peso-muerto-convencional', 'Peso muerto convencional', '4 × 5-6'),
  ('remo-en-t', 'Remo en T', '4 × 8-10'),
  ('jalon-al-pecho-en-polea-agarre-prono', 'Jalón al pecho en polea (agarre prono)', '3 × 10-12'),
  ('remo-con-mancuerna-unilateral', 'Remo con mancuerna unilateral', '3 × 10-12'),
  ('curl-bayesian-con-polea', 'Curl bayesian con polea', '3 × 12-15'),
  ('sentadilla-con-barra', 'Sentadilla con barra', '4 × 6-8'),
  ('prensa-de-piernas', 'Prensa de piernas', '3 × 10-12'),
  ('extensiones-de-cuadriceps-en-maquina', 'Extensiones de cuádriceps en máquina', '3 × 12-15'),
  ('peso-muerto-rumano-con-barra', 'Peso muerto rumano con barra', '3 × 10-12'),
  ('curl-femoral-en-maquina-tumbado', 'Curl femoral en máquina tumbado', '3 × 12-15'),
  ('hip-thrust-con-barra', 'Hip thrust con barra', '3 × 12-15'),
  ('elevaciones-de-gemelo-de-pie-en-maquina', 'Elevaciones de gemelo de pie en máquina', '4 × 15-20'),
  ('curl-con-barra-z-ez', 'Curl con barra Z (EZ)', '4 × 8-10'),
  ('curl-predicador-unilateral-con-polea', 'Curl predicador unilateral con polea', '3 × 12-15'),
  ('fondos-en-paralelas-o-press-cerrado', 'Fondos en paralelas (o press cerrado)', '3 × 8-10'),
  ('extensiones-triceps-unilateral-con-polea-en-diagonal', 'Extensiones tríceps unilateral con polea en diagonal', '3 × 12-15'),
  ('rompecraneos-en-banco-inclinado-con-mancuernas', 'Rompecráneos en banco inclinado con mancuernas', '3 × 10-12'),
  ('extensiones-katana-con-codo-fijo-en-banco-polea', 'Extensiones katana con codo fijo en banco, polea', '3 × 12-15'),
  ('curl-de-muneca-con-mancuerna-antebrazos', 'Curl de muñeca con mancuerna (antebrazos)', '3 × 15-20')
on conflict (slug) do update
set name = excluded.name,
    default_sets = excluded.default_sets;

do $$
declare
  v_template_id uuid;
  v_day_id uuid;
begin
  select id into v_template_id
  from public.routine_templates
  where owner_id is null and name = 'PPLA Default 7D'
  limit 1;

  if v_template_id is null then
    insert into public.routine_templates (owner_id, name, description, is_public)
    values (null, 'PPLA Default 7D', 'Default weekly template (editable per user)', true)
    returning id into v_template_id;
  end if;

  insert into public.routine_template_days (template_id, day_key, day_order)
  values
    (v_template_id, 'monday', 1),
    (v_template_id, 'tuesday', 2),
    (v_template_id, 'wednesday', 3),
    (v_template_id, 'thursday', 4),
    (v_template_id, 'friday', 5),
    (v_template_id, 'saturday', 6),
    (v_template_id, 'sunday', 7)
  on conflict (template_id, day_key) do update
  set day_order = excluded.day_order;

  select id into v_day_id from public.routine_template_days where template_id = v_template_id and day_key = 'monday';
  if v_day_id is not null then
    insert into public.routine_template_day_exercises (day_id, exercise_id, sets, is_s_tier, sort_order)
    select
      v_day_id,
      e.id,
      e.default_sets,
      e.slug in (
        'cruce-de-poleas-sentado',
        'elevaciones-laterales-con-polea-a-altura-del-muslo',
        'rompecraneos-en-banco-declinado-con-mancuernas'
      ),
      row_number() over (order by array_position(array[
        'press-banca-con-barra',
        'press-inclinado-con-mancuernas',
        'cruce-de-poleas-sentado',
        'press-militar-con-barra',
        'elevaciones-laterales-con-polea-a-altura-del-muslo',
        'rompecraneos-en-banco-declinado-con-mancuernas'
      ], e.slug))
    from public.exercise_catalog e
    where e.slug = any(array[
      'press-banca-con-barra',
      'press-inclinado-con-mancuernas',
      'cruce-de-poleas-sentado',
      'press-militar-con-barra',
      'elevaciones-laterales-con-polea-a-altura-del-muslo',
      'rompecraneos-en-banco-declinado-con-mancuernas'
    ])
    on conflict (day_id, sort_order) do nothing;
  end if;
end $$;
