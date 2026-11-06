-- ============================================================================
-- Starborn Game Sync — app_starborn registry + per-game saves
-- Project: tbrqqjrzknhdnwcpkqro | Schema: app_starborn
-- ============================================================================
-- REVIEW REQUIRED — DO NOT APPLY BLINDLY.
-- Per AGENTS.md, this schema is private and not Data API-exposed. Before
-- applying:
--   1. Review the RLS + grants below (anon gets EXECUTE on six functions
--      ONLY — no direct table access, no service-role key in the client).
--   2. In Supabase Dashboard -> Settings -> API, add `app_starborn` to the
--      exposed schemas so these RPCs are reachable. Do NOT expose any other
--      app's schema.
--   3. Verify with the app's local-mode fallback first (Game Sync works
--      without this migration; only global code uniqueness and cross-device
--      save restore need it).
--
-- What this gives you:
--   * `games.code` is a PRIMARY KEY and codes are minted INSIDE
--     `app_starborn_create_game` in a retry loop, so two GMs creating games
--     at the same instant can never receive the same code.
--   * Ownership is proved by an `owner_token` the GM's device generated;
--     only its SHA-256 hash is stored. Only the holder can toggle live or
--     change settings.
--   * `game_saves` holds one per-player, per-game snapshot so a share link
--     restores that player's character/stats/items for THAT game.
--
-- Live sync itself does NOT need these tables: positions/rolls ride
-- Supabase Realtime Broadcast (ephemeral, no storage), which works as soon
-- as VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables (RLS on, no direct access for anon/authenticated)
-- ---------------------------------------------------------------------------

create table if not exists app_starborn.games (
  code        text primary key
    constraint games_code_format check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name        text not null
    constraint games_name_len check (char_length(name) between 1 and 60),
  live        boolean not null default true,
  settings    jsonb not null default '{"maxPlayers": 8, "publicRolls": true, "freeMovement": false}'::jsonb,
  owner_token_hash text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists app_starborn.game_saves (
  code       text not null references app_starborn.games (code) on delete cascade,
  player_id  text not null
    constraint game_saves_player_len check (char_length(player_id) between 1 and 64),
  state      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (code, player_id)
);

alter table app_starborn.games enable row level security;
alter table app_starborn.game_saves enable row level security;

-- No policies = deny by default. All access goes through the RPCs below.
revoke all on table app_starborn.games from anon, authenticated;
revoke all on table app_starborn.game_saves from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function app_starborn._mint_code()
returns text
language plpgsql
security definer
set search_path = app_starborn, pg_temp
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function app_starborn._owner_hash(p_owner_token text)
returns text
language sql
security definer
set search_path = app_starborn, pg_temp
as $$
  select encode(digest(convert_to(p_owner_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function app_starborn._clean_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = app_starborn, pg_temp
as $$
declare
  max_players int;
  public_rolls boolean;
  free_movement boolean;
begin
  max_players := coalesce((p_settings ->> 'maxPlayers')::int, 8);
  max_players := greatest(2, least(12, max_players));
  public_rolls := coalesce((p_settings ->> 'publicRolls')::boolean, true);
  free_movement := coalesce((p_settings ->> 'freeMovement')::boolean, false);
  return jsonb_build_object(
    'maxPlayers', max_players,
    'publicRolls', public_rolls,
    'freeMovement', free_movement
  );
exception when others then
  return '{"maxPlayers": 8, "publicRolls": true, "freeMovement": false}'::jsonb;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs — the ONLY surface anon/authenticated may call
-- ---------------------------------------------------------------------------

-- Create a game. The code is minted server-side; on a (vanishingly rare)
-- primary-key collision the loop retries with a fresh code.
create or replace function app_starborn_create_game(
  p_name text,
  p_owner_token text,
  p_settings jsonb default '{"maxPlayers": 8, "publicRolls": true, "freeMovement": false}'::jsonb
)
returns table (code text, name text, live boolean, settings jsonb, created_at timestamptz)
language plpgsql
security definer
set search_path = app_starborn, pg_temp
as $$
declare
  v_code text;
  v_attempts int := 0;
begin
  if p_name is null or char_length(btrim(p_name)) = 0 or char_length(p_name) > 60 then
    raise exception 'invalid game name';
  end if;
  if p_owner_token is null or char_length(p_owner_token) < 16 then
    raise exception 'invalid owner token';
  end if;

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'could not mint a unique game code';
    end if;
    v_code := app_starborn._mint_code();
    begin
      insert into app_starborn.games (code, name, live, settings, owner_token_hash)
      values (
        v_code,
        btrim(p_name),
        true,
        app_starborn._clean_settings(p_settings),
        app_starborn._owner_hash(p_owner_token)
      );
      exit;
    exception when unique_violation then
      -- Another GM just took this code; mint a fresh one and retry.
      continue;
    end;
  end loop;

  return query
    select g.code, g.name, g.live, g.settings, g.created_at
    from app_starborn.games g where g.code = v_code;
end;
$$;

-- Look a game up by code (join check). Returns zero rows when unknown.
create or replace function app_starborn_lookup_game(p_code text)
returns table (code text, name text, live boolean, settings jsonb, created_at timestamptz)
language sql
security definer
set search_path = app_starborn, pg_temp
as $$
  select g.code, g.name, g.live, g.settings, g.created_at
  from app_starborn.games g
  where g.code = upper(btrim(p_code));
$$;

-- GM only: flip the live toggle. Touches nothing else about the game.
create or replace function app_starborn_set_game_live(
  p_code text,
  p_owner_token text,
  p_live boolean
)
returns boolean
language plpgsql
security definer
set search_path = app_starborn, pg_temp
as $$
declare
  v_updated int := 0;
begin
  update app_starborn.games g
     set live = p_live, updated_at = now()
   where g.code = upper(btrim(p_code))
     and g.owner_token_hash = app_starborn._owner_hash(p_owner_token);
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

-- GM only: change limits/settings inside the game.
create or replace function app_starborn_update_game_settings(
  p_code text,
  p_owner_token text,
  p_settings jsonb
)
returns boolean
language plpgsql
security definer
set search_path = app_starborn, pg_temp
as $$
declare
  v_updated int := 0;
begin
  update app_starborn.games g
     set settings = app_starborn._clean_settings(p_settings), updated_at = now()
   where g.code = upper(btrim(p_code))
     and g.owner_token_hash = app_starborn._owner_hash(p_owner_token);
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

-- Save one player's per-game snapshot (upsert). No owner check: a player
-- may only write their own player_id row, and the payload is their own data.
create or replace function app_starborn_save_game_state(
  p_code text,
  p_player_id text,
  p_state jsonb
)
returns boolean
language plpgsql
security definer
set search_path = app_starborn, pg_temp
as $$
begin
  if p_player_id is null or char_length(btrim(p_player_id)) = 0
     or char_length(p_player_id) > 64 then
    return false;
  end if;
  if not exists (select 1 from app_starborn.games g where g.code = upper(btrim(p_code))) then
    return false;
  end if;
  insert into app_starborn.game_saves (code, player_id, state, updated_at)
  values (upper(btrim(p_code)), btrim(p_player_id), coalesce(p_state, '{}'::jsonb), now())
  on conflict (code, player_id)
  do update set state = excluded.state, updated_at = now();
  return true;
end;
$$;

-- Load one player's per-game snapshot. Returns zero rows when none exists.
create or replace function app_starborn_load_game_state(
  p_code text,
  p_player_id text
)
returns table (state jsonb)
language sql
security definer
set search_path = app_starborn, pg_temp
as $$
  select s.state
  from app_starborn.game_saves s
  where s.code = upper(btrim(p_code))
    and s.player_id = btrim(p_player_id);
$$;

-- ---------------------------------------------------------------------------
-- Grants: RPCs only. No table access for anon/authenticated, ever.
-- ---------------------------------------------------------------------------

grant execute on function app_starborn._mint_code() to anon, authenticated;
grant execute on function app_starborn._owner_hash(text) to anon, authenticated;
grant execute on function app_starborn._clean_settings(jsonb) to anon, authenticated;
grant execute on function app_starborn_create_game(text, text, jsonb) to anon, authenticated;
grant execute on function app_starborn_lookup_game(text) to anon, authenticated;
grant execute on function app_starborn_set_game_live(text, text, boolean) to anon, authenticated;
grant execute on function app_starborn_update_game_settings(text, text, jsonb) to anon, authenticated;
grant execute on function app_starborn_save_game_state(text, text, jsonb) to anon, authenticated;
grant execute on function app_starborn_load_game_state(text, text) to anon, authenticated;
