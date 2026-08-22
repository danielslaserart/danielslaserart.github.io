-- Daniels Laser Art Kalkulator 6.6 – datensparsame Auftragsprüfung
-- Einmalig im Supabase SQL Editor ausführen, bevor Version 6.6 getestet wird.

create table if not exists public.order_monitor_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"schemaVersion":1,"projects":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.order_monitor_state enable row level security;
revoke all on table public.order_monitor_state from anon;
grant select, insert, update, delete on table public.order_monitor_state to authenticated;

drop policy if exists "Eigene Auftragsprüfung lesen" on public.order_monitor_state;
create policy "Eigene Auftragsprüfung lesen" on public.order_monitor_state for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Eigene Auftragsprüfung anlegen" on public.order_monitor_state;
create policy "Eigene Auftragsprüfung anlegen" on public.order_monitor_state for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Eigene Auftragsprüfung ändern" on public.order_monitor_state;
create policy "Eigene Auftragsprüfung ändern" on public.order_monitor_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Eigene Auftragsprüfung löschen" on public.order_monitor_state;
create policy "Eigene Auftragsprüfung löschen" on public.order_monitor_state for delete to authenticated using ((select auth.uid()) = user_id);

-- Es gibt bewusst keine anonyme Lesepolicy. Der geschützte Übertragungsweg folgt separat.
