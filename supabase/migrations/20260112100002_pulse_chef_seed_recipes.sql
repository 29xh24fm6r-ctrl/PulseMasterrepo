begin;

-- Minimal “starter pack” recipes (expand later)
insert into public.chef_recipes (title, cuisine, prep_minutes, cook_minutes, energy_profile, instructions)
values
  (
    'Spinach Egg Scramble',
    'american',
    3,
    8,
    'high-protein',
    jsonb_build_object(
      'steps', jsonb_build_array(
        'Heat pan, add a little oil or butter.',
        'Add spinach, wilt 1-2 minutes.',
        'Add beaten eggs, scramble until set.',
        'Season with salt/pepper.'
      )
    )
  ),
  (
    'Chicken Stir Fry (Basic)',
    'asian',
    10,
    12,
    'balanced',
    jsonb_build_object(
      'steps', jsonb_build_array(
        'Slice chicken and vegetables.',
        'Cook chicken in hot pan.',
        'Add vegetables, cook until tender-crisp.',
        'Add soy sauce (or salt) and serve.'
      )
    )
  ),
  (
    'Greek Yogurt Protein Bowl',
    'mediterranean',
    2,
    0,
    'high-protein',
    jsonb_build_object(
      'steps', jsonb_build_array(
        'Add yogurt to bowl.',
        'Top with fruit or honey.',
        'Add nuts or granola if available.'
      )
    )
  )
on conflict do nothing;

-- Ingredients (idempotent)
insert into public.chef_ingredients (canonical_name, category, shelf_life_days)
values
  ('eggs', 'protein', 21),
  ('spinach', 'produce', 7),
  ('chicken breast', 'protein', 3),
  ('mixed vegetables', 'produce', 5),
  ('soy sauce', 'pantry', 365),
  ('greek yogurt', 'dairy', 14),
  ('fruit', 'produce', 7),
  ('honey', 'pantry', 3650),
  ('nuts', 'pantry', 180),
  ('granola', 'pantry', 180)
on conflict do nothing;

-- Map ingredients to recipes
with r as (
  select id, lower(title) as t from public.chef_recipes
),
i as (
  select id, lower(canonical_name) as n from public.chef_ingredients
)
insert into public.chef_recipe_ingredients (recipe_id, ingredient_id, required, substitute_group)
select
  r.id,
  i.id,
  case
    when r.t = 'spinach egg scramble' and i.n in ('eggs','spinach') then true
    when r.t = 'chicken stir fry (basic)' and i.n in ('chicken breast') then true
    when r.t = 'greek yogurt protein bowl' and i.n in ('greek yogurt') then true
    else false
  end as required,
  case
    when r.t = 'chicken stir fry (basic)' and i.n = 'mixed vegetables' then 'veg'
    when r.t = 'greek yogurt protein bowl' and i.n in ('fruit','honey','nuts','granola') then 'toppings'
    else null
  end as substitute_group
from r
join i on (
  (r.t = 'spinach egg scramble' and i.n in ('eggs','spinach'))
  or (r.t = 'chicken stir fry (basic)' and i.n in ('chicken breast','mixed vegetables','soy sauce'))
  or (r.t = 'greek yogurt protein bowl' and i.n in ('greek yogurt','fruit','honey','nuts','granola'))
)
on conflict do nothing;

commit;
