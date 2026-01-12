begin;

insert into public.chef_grocery_vendors (name, supports_deeplink, supports_autoplace)
values
  ('Walmart', true, false),
  ('Kroger', true, false),
  ('Instacart', true, false),
  ('Amazon Fresh', true, false)
on conflict do nothing;

commit;
