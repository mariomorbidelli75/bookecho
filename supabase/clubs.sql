-- ═══════════════════════════════════════════════════════════════════════════
-- Librò / BookEcho — Book club della community (le discussioni stanno su Telegram)
-- Da eseguire nel SQL Editor di Supabase dopo schema.sql. Si può rieseguire.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.book_clubs (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles on delete cascade default auth.uid(),
  name         text not null check (char_length(name) between 3 and 80),
  topic        text not null check (char_length(topic) between 2 and 60),
  description  text check (char_length(description) <= 600),
  book         jsonb not null,                -- { title, author, cover?, isbn? }
  telegram_url text not null check (telegram_url ~* '^https://(t\.me|telegram\.me)/[A-Za-z0-9_+/-]{3,}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.book_club_members (
  club_id   uuid not null references public.book_clubs on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.book_club_reports (
  club_id     uuid not null references public.book_clubs on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade default auth.uid(),
  reason      text check (char_length(reason) <= 300),
  reported_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

grant select, insert, update, delete on public.book_clubs        to authenticated;
grant select, insert, delete         on public.book_club_members to authenticated;
grant insert                         on public.book_club_reports to authenticated;

alter table public.book_clubs        enable row level security;
alter table public.book_club_members enable row level security;
alter table public.book_club_reports enable row level security;

drop policy if exists "club: li vede chi è iscritto all'app" on public.book_clubs;
drop policy if exists "club: crea il proprio"                on public.book_clubs;
drop policy if exists "club: modifica il proprio"            on public.book_clubs;
drop policy if exists "club: elimina il proprio"             on public.book_clubs;
create policy "club: li vede chi è iscritto all'app" on public.book_clubs for select using (auth.uid() is not null);
create policy "club: crea il proprio"     on public.book_clubs for insert with check (creator_id = auth.uid());
create policy "club: modifica il proprio" on public.book_clubs for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "club: elimina il proprio"  on public.book_clubs for delete using (creator_id = auth.uid());

drop policy if exists "membri: visibili"   on public.book_club_members;
drop policy if exists "membri: entro io"   on public.book_club_members;
drop policy if exists "membri: esco io"    on public.book_club_members;
create policy "membri: visibili" on public.book_club_members for select using (auth.uid() is not null);
create policy "membri: entro io" on public.book_club_members for insert with check (user_id = auth.uid());
create policy "membri: esco io"  on public.book_club_members for delete using (user_id = auth.uid());

drop policy if exists "segnalazioni: le invio io" on public.book_club_reports;
create policy "segnalazioni: le invio io" on public.book_club_reports for insert with check (user_id = auth.uid());

-- Elenco dei club con nome di chi l'ha creato, numero di iscritti e se ci sono anch'io.
-- I club segnalati da 3 o più persone spariscono dall'elenco (restano visibili al creatore).
create or replace function public.list_book_clubs()
returns table (
  id uuid, name text, topic text, description text, book jsonb, telegram_url text,
  created_at timestamptz, creator_id uuid, creator_name text,
  members bigint, am_member boolean, mine boolean
)
language sql security definer set search_path = public stable as $$
  select c.id, c.name, c.topic, c.description, c.book, c.telegram_url,
         c.created_at, c.creator_id, p.name,
         (select count(*) from book_club_members m where m.club_id = c.id),
         exists (select 1 from book_club_members m where m.club_id = c.id and m.user_id = auth.uid()),
         c.creator_id = auth.uid()
  from book_clubs c
  join profiles p on p.id = c.creator_id
  where auth.uid() is not null
    and (c.creator_id = auth.uid()
         or (select count(*) from book_club_reports r where r.club_id = c.id) < 3)
  order by c.created_at desc;
$$;
grant execute on function public.list_book_clubs() to authenticated;

-- Chi crea un club ne fa parte automaticamente
create or replace function public.club_creator_joins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into book_club_members (club_id, user_id) values (new.id, new.creator_id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_book_club_created on public.book_clubs;
create trigger on_book_club_created after insert on public.book_clubs
  for each row execute function public.club_creator_joins();
