-- Feedlo Navale — systeme d'amis
-- =================================================================
-- A executer UNE FOIS dans Supabase -> SQL Editor, sur le projet
-- cible par le build (par defaut celui de src/net/supabase.ts, ou
-- celui de ton fichier .env).
--
-- Le jeu n'a pas d'auth : l'identite d'un joueur est un uuid genere
-- cote client. Les tables sont en RLS fermee (aucune policy) et tout
-- passe par des fonctions SECURITY DEFINER exposees a `anon`.
-- Script idempotent : rejouable sans risque.
-- =================================================================

create extension if not exists pgcrypto;

-- ---- Tables --------------------------------------------------------

create table if not exists public.players (
  id         uuid primary key,
  name       text not null default 'Joueur',
  code       text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null,
  addressee  uuid not null,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee)
);

create index if not exists friendships_requester_idx on public.friendships (requester);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

alter table public.players     enable row level security;
alter table public.friendships enable row level security;
-- aucune policy => acces direct impossible pour anon ; tout passe par les fonctions ci-dessous.

-- ---- Helpers ------------------------------------------------------

create or replace function public._gen_friend_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
  i int;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.players where code = c);
  end loop;
  return c;
end;
$$;

-- ---- RPC ----------------------------------------------------------

-- upsert du profil, renvoie le code ami
create or replace function public.sync_player(p_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_name text := coalesce(nullif(btrim(p_name), ''), 'Joueur');
begin
  insert into public.players (id, name, code)
  values (p_id, v_name, public._gen_friend_code())
  on conflict (id) do update
    set name = excluded.name, updated_at = now()
  returning code into v_code;
  return v_code;
end;
$$;

-- etat social complet du joueur
create or replace function public.get_social(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_friends jsonb;
  v_incoming jsonb;
  v_outgoing jsonb;
begin
  select code into v_code from public.players where id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pl.id, 'name', pl.name, 'friendshipId', f.id
         ) order by pl.name), '[]'::jsonb)
    into v_friends
  from public.friendships f
  join public.players pl
    on pl.id = case when f.requester = p_id then f.addressee else f.requester end
  where f.status = 'accepted' and (f.requester = p_id or f.addressee = p_id);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pl.id, 'name', pl.name, 'friendshipId', f.id
         ) order by f.created_at desc), '[]'::jsonb)
    into v_incoming
  from public.friendships f
  join public.players pl on pl.id = f.requester
  where f.status = 'pending' and f.addressee = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pl.id, 'name', pl.name, 'friendshipId', f.id
         ) order by f.created_at desc), '[]'::jsonb)
    into v_outgoing
  from public.friendships f
  join public.players pl on pl.id = f.addressee
  where f.status = 'pending' and f.requester = p_id;

  return jsonb_build_object(
    'myCode', v_code,
    'friends', v_friends,
    'incoming', v_incoming,
    'outgoing', v_outgoing
  );
end;
$$;

-- envoyer une demande d'ami (par code OU par id)
create or replace function public.send_friend_request(
  p_from uuid,
  p_from_name text,
  p_to_code text default null,
  p_to_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to uuid;
  v_existing public.friendships%rowtype;
begin
  perform public.sync_player(p_from, p_from_name);

  if p_to_id is not null then
    v_to := p_to_id;
  elsif p_to_code is not null then
    select id into v_to from public.players where code = upper(btrim(p_to_code));
  end if;

  if v_to is null then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;
  if v_to = p_from then
    return jsonb_build_object('ok', false, 'reason', 'soi-meme');
  end if;

  select * into v_existing
  from public.friendships
  where (requester = p_from and addressee = v_to)
     or (requester = v_to and addressee = p_from)
  limit 1;

  if found then
    if v_existing.status = 'accepted' then
      return jsonb_build_object('ok', false, 'reason', 'deja-ami');
    end if;
    -- demande inverse deja en attente => on accepte directement
    if v_existing.addressee = p_from then
      update public.friendships set status = 'accepted' where id = v_existing.id;
      return jsonb_build_object('ok', true, 'reason', 'accepte');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'deja-envoyee');
  end if;

  insert into public.friendships (requester, addressee, status)
  values (p_from, v_to, 'pending');
  return jsonb_build_object('ok', true, 'reason', 'envoyee');
end;
$$;

-- accepter / refuser une demande recue
create or replace function public.respond_friend_request(
  p_me uuid,
  p_friendship uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_accept then
    update public.friendships
      set status = 'accepted'
      where id = p_friendship and addressee = p_me and status = 'pending';
  else
    delete from public.friendships
      where id = p_friendship and addressee = p_me;
  end if;
end;
$$;

-- retirer un ami (ou annuler une demande)
create or replace function public.remove_friend(p_me uuid, p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where (requester = p_me and addressee = p_other)
     or (requester = p_other and addressee = p_me);
end;
$$;

-- ---- Grants -----------------------------------------------------

grant execute on function public.sync_player(uuid, text)                     to anon;
grant execute on function public.get_social(uuid)                            to anon;
grant execute on function public.send_friend_request(uuid, text, text, uuid) to anon;
grant execute on function public.respond_friend_request(uuid, uuid, boolean) to anon;
grant execute on function public.remove_friend(uuid, uuid)                   to anon;
