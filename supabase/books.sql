-- ═══════════════════════════════════════════════════════════════════════════
-- Librò / BookEcho — libreria salvata online (una riga per libro)
-- Da eseguire nel SQL Editor di Supabase dopo schema.sql. Si può rieseguire.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.books (
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  id         text not null,                    -- stesso id usato nell'app (book-…)
  data       jsonb not null,                   -- scheda completa del libro
  deleted    boolean not null default false,   -- cancellato: resta come segnaposto per gli altri dispositivi
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

grant select, insert, update, delete on public.books to authenticated;
alter table public.books enable row level security;

drop policy if exists "libri: solo i miei" on public.books;
create policy "libri: solo i miei" on public.books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
