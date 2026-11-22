-- ═══════════════════════════════════════════════════════════════════════════
-- Librò / BookEcho — account e "Amici lettori"
-- Incolla tutto questo nel SQL Editor di Supabase e premi "Run". Una volta sola.
-- ═══════════════════════════════════════════════════════════════════════════

-- Profilo pubblico di ogni utente (uno per account)
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null default 'Lettore',
  ref_code     text unique not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  current_book jsonb,                 -- { title, author, genre, cover } del libro in lettura
  genres       text[] not null default '{}',
  sharing      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Amicizie: una riga per direzione (A→B e B→A)
create table if not exists public.friendships (
  user_id    uuid not null references public.profiles on delete cascade,
  friend_id  uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profilo: leggo il mio"   on public.profiles;
drop policy if exists "profilo: modifico il mio" on public.profiles;
drop policy if exists "amicizie: leggo le mie"   on public.friendships;
drop policy if exists "amicizie: tolgo le mie"   on public.friendships;

create policy "profilo: leggo il mio"    on public.profiles    for select using (id = auth.uid());
create policy "profilo: modifico il mio" on public.profiles    for update using (id = auth.uid());
create policy "amicizie: leggo le mie"   on public.friendships for select using (user_id = auth.uid());
create policy "amicizie: tolgo le mie"   on public.friendships for delete using (user_id = auth.uid());

-- Collega due utenti in entrambe le direzioni
create or replace function public.link_friends(a uuid, b uuid) returns void
language sql security definer set search_path = public as $$
  insert into friendships (user_id, friend_id) values (a, b), (b, a)
  on conflict do nothing;
$$;
revoke all on function public.link_friends(uuid, uuid) from public, anon, authenticated;

-- Alla registrazione: crea il profilo e, se arriva da un invito, l'amicizia
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inviter uuid;
begin
  insert into profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)));

  select id into inviter from profiles
  where ref_code = upper(coalesce(new.raw_user_meta_data->>'invite', ''));
  if inviter is not null and inviter <> new.id then
    perform link_friends(inviter, new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nome di chi invita (visibile anche a chi non è ancora iscritto)
create or replace function public.inviter_name(code text) returns text
language sql security definer set search_path = public stable as $$
  select name from profiles where ref_code = upper(code);
$$;
grant execute on function public.inviter_name(text) to anon, authenticated;

-- Utente già iscritto che apre un link d'invito: si collega all'amico
create or replace function public.accept_invite(code text) returns text
language plpgsql security definer set search_path = public as $$
declare inviter uuid; inviter_label text;
begin
  if auth.uid() is null then return null; end if;
  select id, name into inviter, inviter_label from profiles where ref_code = upper(code);
  if inviter is null or inviter = auth.uid() then return null; end if;
  perform link_friends(inviter, auth.uid());
  return inviter_label;
end $$;
grant execute on function public.accept_invite(text) to authenticated;

-- Lista amici con cosa stanno leggendo (solo se condividono)
create or replace function public.my_friends()
returns table (id uuid, name text, current_book jsonb, genres text[], joined_at timestamptz, updated_at timestamptz)
language sql security definer set search_path = public stable as $$
  select p.id, p.name,
         case when p.sharing then p.current_book end,
         p.genres, f.created_at, p.updated_at
  from friendships f
  join profiles p on p.id = f.friend_id
  where f.user_id = auth.uid()
  order by f.created_at desc;
$$;
grant execute on function public.my_friends() to authenticated;

-- Profili già esistenti (se qualcuno si era registrato prima di questo script)
insert into public.profiles (id, name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
