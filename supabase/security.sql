-- ═══════════════════════════════════════════════════════════════════════════
-- Librò / BookEcho — sicurezza: limiti giornalieri AI ed eliminazione account
-- Da eseguire nel SQL Editor di Supabase. Si può rieseguire.
-- ═══════════════════════════════════════════════════════════════════════════

-- Contatore giornaliero dell'uso delle funzioni AI, per persona e per tipo.
-- Nessuno può leggerlo o scriverlo direttamente: solo tramite use_ai_quota().
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null default (now() at time zone 'Europe/Rome')::date,
  kind    text not null,
  count   int  not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Conta un utilizzo; restituisce false se oggi il limite è già raggiunto
drop function if exists public.use_ai_quota(text, int);
create or replace function public.use_ai_quota(p_kind text, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return false; end if;
  insert into ai_usage (user_id, day, kind, count)
  values (auth.uid(), (now() at time zone 'Europe/Rome')::date, p_kind, 1)
  on conflict on constraint ai_usage_pkey do update set count = ai_usage.count + 1
    where ai_usage.count < p_max
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke all on function public.use_ai_quota(text, int) from public, anon;
grant execute on function public.use_ai_quota(text, int) to authenticated;

-- Diritto all'oblio (GDPR art. 17): l'utente cancella il proprio account e,
-- a cascata, profilo, amicizie, libri, club creati, iscrizioni e segnalazioni.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'non autenticato'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- I libri sono collegati a auth.users: anche loro spariscono con l'account.
