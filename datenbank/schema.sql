-- Das Schema der Padel Liga.
--
-- Einmal im Supabase-Dashboard des Projekts ausführen (SQL Editor → New
-- query → einfügen → Run). Jeder Befehl ist wiederholbar: wer die Datei ein
-- zweites Mal ausführt, ändert nichts an bestehenden Daten und legt nur an,
-- was fehlt.
--
-- Die App ändert kein Schema. Sie liest und schreibt nur Zeilen, und zwar
-- mit dem öffentlichen anon-Schlüssel. Wer was darf, steht deshalb hier in
-- den Policies: die Liga ist eine geschlossene Gruppe, jeder mit der Adresse
-- der App darf eintragen. Der service_role-Schlüssel gehört nie in die App.

create extension if not exists pgcrypto;

-- ─── Spieler ────────────────────────────────────────────────────────────
-- elo            Abbild der Saison-Elo; die Rangliste rechnet aus den Partien.
-- drive          Anteil der Partien rechts (Drive-Seite), 0..1. Belegt die
--                Seite bei der Eingabe vor; 0.5 heißt: noch keine Gewohnheit.
-- retired_at     Karriereende, NULL solange aktiv.
-- retired_stand  der eingefrorene Stand des Profils beim Karriereende.
create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  elo           double precision not null default 0,
  drive         double precision not null default 0.5,
  avatar_id     integer,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  retired_at    timestamptz,
  retired_stand jsonb
);

-- ─── Partien ────────────────────────────────────────────────────────────
-- Immer zwei gegen zwei. Team A = a1/a2, Team B = b1/b2, je Spieler die Seite
-- 'drive' (rechts) oder 'reves' (links).
--
-- sets      die Sätze in Games aus Sicht von A, z. B. [[6,4],[3,6],[10,8]]
-- set_kind  je Satz: 'n' normal, 'tb' im Tiebreak (7:6), 'mtb' Match-
--           Tiebreak (Punkte, bis 10), 'open' nicht zu Ende gespielt
-- sets_a/b  gewonnene Sätze; ein offener Satz zählt nicht
-- games_a/b alle Games; ein Match-Tiebreak zählt als ein Game
-- winner    'A' oder 'B'
-- deltas    Elo-Änderung je Spieler-id, beim Speichern geschrieben
-- exp_a     Siegerwartung von A vor der Partie
create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  a1 uuid not null references public.players(id),
  a2 uuid not null references public.players(id),
  b1 uuid not null references public.players(id),
  b2 uuid not null references public.players(id),
  a1_side text not null default 'drive' check (a1_side in ('drive','reves')),
  a2_side text not null default 'reves' check (a2_side in ('drive','reves')),
  b1_side text not null default 'drive' check (b1_side in ('drive','reves')),
  b2_side text not null default 'reves' check (b2_side in ('drive','reves')),
  sets     jsonb not null default '[]'::jsonb,
  set_kind jsonb not null default '[]'::jsonb,
  sets_a  integer not null default 0,
  sets_b  integer not null default 0,
  games_a integer not null default 0,
  games_b integer not null default 0,
  winner  text not null check (winner in ('A','B')),
  deltas  jsonb not null default '{}'::jsonb,
  exp_a   double precision not null default 0.5
);
create index if not exists matches_created_at on public.matches (created_at);

-- ─── Einstellungen ──────────────────────────────────────────────────────
-- Genau eine Zeile (id = 1): die Regler der Elo-Rechnung.
create table if not exists public.config (
  id                 integer primary key default 1 check (id = 1),
  k_factor           double precision not null default 32,
  start_elo          double precision not null default 0,
  risk_split         double precision not null default 0.6,
  pos_swing          double precision not null default 0.45,
  win_boost          double precision not null default 1.12,
  mov_max_boost      double precision not null default 0.4,
  mov_loss_damp      double precision not null default 0.5,
  match_bonus        double precision not null default 1.5,
  low_elo_loss_damp  double precision not null default 0,
  exp_protect_max    double precision not null default 0.1,
  underdog_elo_max   double precision not null default 0.15,
  underdog_games_max double precision not null default 0.05,
  new_player_mult    double precision not null default 1.5,
  new_player_mid_mult double precision not null default 1.2,
  veteran_damp       double precision not null default 0.85
);
-- Die Staffel der Satzlänge und der Ausgleich im Tiebreak. Als eigene
-- Zeilen, damit eine schon angelegte Datenbank sie mit demselben Skript
-- bekommt.
alter table public.config add column if not exists gewicht_eins   double precision not null default 0.5;
alter table public.config add column if not exists gewicht_drei   double precision not null default 0.75;
alter table public.config add column if not exists gewicht_ueber6 double precision not null default 0.1;
alter table public.config add column if not exists tb_ausgleich   double precision not null default 0.4;
insert into public.config (id) values (1) on conflict (id) do nothing;

-- ─── Saisons ────────────────────────────────────────────────────────────
-- Eine Saison ist ein Kalendermonat, id 'YYYY-MM'. Abgeschlossene Monate
-- werden hier archiviert: Meister, Team der Saison, die besten drei und die
-- eingefrorenen Monatschroniken.
create table if not exists public.seasons (
  id         text primary key,
  label      text,
  start_date date,
  end_date   date,
  player_id  uuid,
  team_p1    uuid,
  team_p2    uuid,
  top_elo    text,
  titles     jsonb
);

-- ─── Stories ────────────────────────────────────────────────────────────
-- Der Feed. Ein Gerät schreibt eine Story einmal, danach bleibt sie, wie sie
-- ist; abgelaufene Zeilen löscht die App selbst.
create table if not exists public.stories (
  id          text primary key,
  type        text,
  category    text,
  icon        text,
  title       text,
  description text,
  data_ref    jsonb,
  priority    integer,
  event_at    timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists stories_event_at on public.stories (event_at desc);

-- ─── Zugriff ────────────────────────────────────────────────────────────
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.config  enable row level security;
alter table public.seasons enable row level security;
alter table public.stories enable row level security;

do $$
declare t text;
begin
  foreach t in array array['players','matches','seasons','stories'] loop
    execute format('drop policy if exists %I on public.%I', t || '_alles', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', t || '_alles', t);
  end loop;
  -- Die Einstellungen darf man lesen und ändern, aber nicht löschen oder
  -- eine zweite Zeile anlegen.
  drop policy if exists config_lesen on public.config;
  create policy config_lesen on public.config for select to anon, authenticated using (true);
  drop policy if exists config_aendern on public.config;
  create policy config_aendern on public.config for update to anon, authenticated using (id = 1) with check (id = 1);
end $$;

-- ─── Realtime für den Feed ──────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
end $$;
