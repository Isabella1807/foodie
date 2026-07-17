-- foodie database-skema
-- Indsættes i Supabase: SQL Editor -> New query -> kør det hele på én gang

create table public.foods (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  kcal         integer not null check (kcal >= 0),
  per_unit     text check (per_unit in ('g', 'ml')), -- sat = kcal er pr. 100 g/ml; tom = kcal er pr. portion
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Kørte du en ældre udgave af dette skema, så tilføj kolonnen med:
-- alter table public.foods add column per_unit text check (per_unit in ('g', 'ml'));

create table public.entries (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_name  text not null,          -- kopi af navnet på log-tidspunktet
  kcal       integer not null check (kcal >= 0),
  eaten_on   date not null,          -- LOKAL kalenderdag, beregnet på telefonen
  created_at timestamptz not null default now()
);

alter table public.foods   enable row level security;
alter table public.entries enable row level security;

create policy "own foods" on public.foods
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own entries" on public.entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index entries_user_eaten_idx on public.entries (user_id, eaten_on desc);
create index foods_user_idx on public.foods (user_id);
