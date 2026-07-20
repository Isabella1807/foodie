-- foodie database-skema
-- Indsættes i Supabase: SQL Editor -> New query -> kør det hele på én gang

create table public.foods (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  kcal         integer not null check (kcal >= 0),
  per_unit     text check (per_unit in ('g', 'ml')), -- sat = kcal er pr. 100 g/ml; tom = kcal er pr. portion
  piece_size   numeric check (piece_size > 0), -- valgfri: hvad ét stk vejer/fylder (fx én kiks = 13 g)
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Kørte du en ældre udgave af dette skema, så tilføj kolonnerne med:
-- alter table public.foods add column per_unit text check (per_unit in ('g', 'ml'));
-- alter table public.foods add column piece_size numeric check (piece_size > 0);

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

-- Kørte du en ældre udgave af dette skema, så kør kun alt herfra og ned.

create table public.weights (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kg          numeric not null check (kg > 0),
  measured_on date not null,          -- LOKAL kalenderdag, beregnet på telefonen
  created_at  timestamptz not null default now()
);

-- Mål: én række pr. bruger — dagligt kalorie-mål og målvægt
create table public.goals (
  user_id   uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  kcal_goal integer check (kcal_goal > 0),
  goal_kg   numeric check (goal_kg > 0)
);

-- Hygge-/festdage: dage brugeren selv markerer, så en planlagt festdag ikke
-- vises som en fejl. Én række pr. markeret dag.
create table public.celebrations (
  id      uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date    date not null,
  unique (user_id, date)
);

alter table public.weights      enable row level security;
alter table public.goals        enable row level security;
alter table public.celebrations enable row level security;

create policy "own weights" on public.weights
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own goals" on public.goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own celebrations" on public.celebrations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index weights_user_measured_idx on public.weights (user_id, measured_on desc);
create index celebrations_user_date_idx on public.celebrations (user_id, date);
