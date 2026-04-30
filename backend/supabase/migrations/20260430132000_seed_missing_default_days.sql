do $$
declare
  v_template_id uuid;
  v_day_tuesday uuid;
  v_day_wednesday uuid;
  v_day_thursday uuid;
begin
  select id into v_template_id
  from public.routine_templates
  where owner_id is null and name = 'PPLA Default 7D'
  limit 1;

  if v_template_id is null then
    raise notice 'Default template not found. Skipping seed fix.';
    return;
  end if;

  select id into v_day_tuesday
  from public.routine_template_days
  where template_id = v_template_id and day_key = 'tuesday';

  select id into v_day_wednesday
  from public.routine_template_days
  where template_id = v_template_id and day_key = 'wednesday';

  select id into v_day_thursday
  from public.routine_template_days
  where template_id = v_template_id and day_key = 'thursday';

  if v_day_tuesday is not null then
    insert into public.routine_template_day_exercises (day_id, exercise_id, sets, is_s_tier, sort_order)
    select
      v_day_tuesday,
      e.id,
      e.default_sets,
      e.slug in ('remo-en-t', 'curl-bayesian-con-polea'),
      row_number() over (order by array_position(array[
        'peso-muerto-convencional',
        'remo-en-t',
        'jalon-al-pecho-en-polea-agarre-prono',
        'remo-con-mancuerna-unilateral',
        'curl-bayesian-con-polea'
      ], e.slug))
    from public.exercise_catalog e
    where e.slug = any(array[
      'peso-muerto-convencional',
      'remo-en-t',
      'jalon-al-pecho-en-polea-agarre-prono',
      'remo-con-mancuerna-unilateral',
      'curl-bayesian-con-polea'
    ])
    on conflict (day_id, sort_order) do nothing;
  end if;

  if v_day_wednesday is not null then
    insert into public.routine_template_day_exercises (day_id, exercise_id, sets, is_s_tier, sort_order)
    select
      v_day_wednesday,
      e.id,
      e.default_sets,
      false,
      row_number() over (order by array_position(array[
        'sentadilla-con-barra',
        'prensa-de-piernas',
        'extensiones-de-cuadriceps-en-maquina',
        'peso-muerto-rumano-con-barra',
        'curl-femoral-en-maquina-tumbado',
        'hip-thrust-con-barra',
        'elevaciones-de-gemelo-de-pie-en-maquina'
      ], e.slug))
    from public.exercise_catalog e
    where e.slug = any(array[
      'sentadilla-con-barra',
      'prensa-de-piernas',
      'extensiones-de-cuadriceps-en-maquina',
      'peso-muerto-rumano-con-barra',
      'curl-femoral-en-maquina-tumbado',
      'hip-thrust-con-barra',
      'elevaciones-de-gemelo-de-pie-en-maquina'
    ])
    on conflict (day_id, sort_order) do nothing;
  end if;

  if v_day_thursday is not null then
    insert into public.routine_template_day_exercises (day_id, exercise_id, sets, is_s_tier, sort_order)
    select
      v_day_thursday,
      e.id,
      e.default_sets,
      e.slug in (
        'curl-bayesian-con-polea',
        'curl-predicador-unilateral-con-polea',
        'extensiones-triceps-unilateral-con-polea-en-diagonal',
        'rompecraneos-en-banco-inclinado-con-mancuernas',
        'extensiones-katana-con-codo-fijo-en-banco-polea'
      ),
      row_number() over (order by array_position(array[
        'curl-con-barra-z-ez',
        'curl-bayesian-con-polea',
        'curl-predicador-unilateral-con-polea',
        'fondos-en-paralelas-o-press-cerrado',
        'extensiones-triceps-unilateral-con-polea-en-diagonal',
        'rompecraneos-en-banco-inclinado-con-mancuernas',
        'extensiones-katana-con-codo-fijo-en-banco-polea',
        'curl-de-muneca-con-mancuerna-antebrazos'
      ], e.slug))
    from public.exercise_catalog e
    where e.slug = any(array[
      'curl-con-barra-z-ez',
      'curl-bayesian-con-polea',
      'curl-predicador-unilateral-con-polea',
      'fondos-en-paralelas-o-press-cerrado',
      'extensiones-triceps-unilateral-con-polea-en-diagonal',
      'rompecraneos-en-banco-inclinado-con-mancuernas',
      'extensiones-katana-con-codo-fijo-en-banco-polea',
      'curl-de-muneca-con-mancuerna-antebrazos'
    ])
    on conflict (day_id, sort_order) do nothing;
  end if;
end $$;
