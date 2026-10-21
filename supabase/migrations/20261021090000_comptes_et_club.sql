-- Comptes, liste d'e-mails autorisés et club de chaque utilisateur.
-- Row Level Security : chaque utilisateur ne voit et ne modifie que ses propres données,
-- et seulement si son e-mail est dans la liste autorisée.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Un profil par utilisateur (créé automatiquement à la première connexion)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- E-mails autorisés à utiliser le site (gérés par l'admin)
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);

-- Club de chaque utilisateur : une ligne par carte possédée
create table public.user_club (
  user_id uuid not null references auth.users (id) on delete cascade,
  player_id bigint not null,
  first_owner boolean not null default false,
  primary key (user_id, player_id)
);

-- Réglages de chaque utilisateur
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0), -- jetons en poche
  goal_id text, -- récompense visée (id de data/rewards.json)
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------------

-- L'utilisateur connecté a-t-il un e-mail autorisé ?
create function public.is_allowed() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_emails a
    where a.email = lower((select auth.jwt()) ->> 'email')
  );
$$;

-- L'utilisateur connecté est-il admin ?
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_admin
  );
$$;

-- Avant d'envoyer le lien de connexion : cet e-mail est-il autorisé ?
create function public.is_email_allowed(candidate text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.allowed_emails a where a.email = lower(trim(candidate)));
$$;

-- Création du profil à l'inscription. Le premier compte autorisé devient admin.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    exists (select 1 from public.allowed_emails a where a.email = lower(new.email))
      and not exists (select 1 from public.profiles p where p.is_admin)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.is_allowed() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_allowed() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_email_allowed(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.user_club enable row level security;
alter table public.user_settings enable row level security;

-- Profils : chacun voit le sien, l'admin voit tout
create policy "profil : lecture du sien ou admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- E-mails autorisés : réservé à l'admin
create policy "e-mails autorisés : lecture admin" on public.allowed_emails
  for select to authenticated using ((select public.is_admin()));
create policy "e-mails autorisés : ajout admin" on public.allowed_emails
  for insert to authenticated with check ((select public.is_admin()));
create policy "e-mails autorisés : suppression admin" on public.allowed_emails
  for delete to authenticated using ((select public.is_admin()));

-- Club : seulement le sien, et seulement si l'e-mail est autorisé
create policy "club : lecture du sien" on public.user_club
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed()));
create policy "club : ajout dans le sien" on public.user_club
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_allowed()));
create policy "club : modification du sien" on public.user_club
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed()))
  with check (user_id = (select auth.uid()));
create policy "club : suppression dans le sien" on public.user_club
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed()));

-- Réglages : pareil
create policy "réglages : lecture des siens" on public.user_settings
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed()));
create policy "réglages : ajout des siens" on public.user_settings
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_allowed()));
create policy "réglages : modification des siens" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed()))
  with check (user_id = (select auth.uid()));
