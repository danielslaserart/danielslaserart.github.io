-- Bereits erfolgreich in Supabase ausgeführt. Nur als Dokumentation aufbewahren.

-- Daniels Laser Art Kalkulator – Supabase Einrichtung
-- In Supabase unter SQL Editor → New query einfügen und ausführen.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

revoke all on table public.app_state from anon;
grant select, insert, update, delete on table public.app_state to authenticated;

drop policy if exists "Eigene Kalkulatordaten lesen" on public.app_state;
create policy "Eigene Kalkulatordaten lesen"
on public.app_state
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Eigene Kalkulatordaten anlegen" on public.app_state;
create policy "Eigene Kalkulatordaten anlegen"
on public.app_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Eigene Kalkulatordaten ändern" on public.app_state;
create policy "Eigene Kalkulatordaten ändern"
on public.app_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Eigene Kalkulatordaten löschen" on public.app_state;
create policy "Eigene Kalkulatordaten löschen"
on public.app_state
for delete
to authenticated
using ((select auth.uid()) = user_id);
