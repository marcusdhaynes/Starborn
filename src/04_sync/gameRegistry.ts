/**
 * Starborn Game Sync — game registry (who owns a code, is it live, is it unique).
 *
 * THE uniqueness rule: a join code must never repeat, even with many people
 * creating games at the same time. Two phones cannot reliably agree on that
 * between themselves — so when Supabase is configured, codes are minted
 * INSIDE the database: `app_starborn_create_game` generates the code in a
 * loop and inserts it as a PRIMARY KEY, retrying on conflict. That is atomic
 * server-side, so two simultaneous creators can never get the same code.
 *
 * Access is least-privilege by design (see supabase/migrations/
 * 0001_app_starborn_game_sync.sql): anonymous clients get EXECUTE on exactly
 * the six RPCs below and NO direct table access. Game ownership is proved by
 * an `owner_token` the GM's device generated; only its SHA-256 hash is stored
 * server-side, and only the holder can toggle live / change settings.
 *
 * When Supabase is NOT configured, the registry is local-only
 * (`starborn_game_registry` in safeStorage): codes are unique on this device
 * and the UI labels the game "local only" instead of pretending otherwise.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { generateJoinCode, generateOwnerToken, normalizeJoinCode } from './joinCode';
import type { GameInfo, GameSettings } from './types';
import { DEFAULT_GAME_SETTINGS } from './types';
import { safeStorage } from '../storage';
import type { GameSave } from './snapshot';

const REGISTRY_KEY = 'starborn_game_registry';
const OWNER_KEY_PREFIX = 'starborn_game_owner_';

export interface CreateGameInput {
  name: string;
  settings?: Partial<GameSettings>;
}

export interface CreateGameResult {
  game: GameInfo;
  /** Secret that proves GM ownership. Keep on this device; never share. */
  ownerToken: string;
}

interface LocalRegistryEntry extends GameInfo {
  ownerToken: string;
}

function readLocalRegistry(): Record<string, LocalRegistryEntry> {
  try {
    const raw = safeStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalRegistryEntry>) : {};
  } catch {
    return {};
  }
}

function writeLocalRegistry(reg: Record<string, LocalRegistryEntry>): void {
  try {
    safeStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    /* ignore — local registry is best-effort */
  }
}

function ownerKey(code: string): string {
  return `${OWNER_KEY_PREFIX}${normalizeJoinCode(code)}`;
}

/** Create a game. Server-backed when Supabase is configured AND the
 *  registry RPCs are live; otherwise local (unique on this device).
 *  A failed RPC never blocks creating a game — Broadcast sync still works
 *  and the game is honestly marked `serverBacked: false`. */
export async function createGame(input: CreateGameInput): Promise<CreateGameResult> {
  const name = (input.name || 'Untitled Game').trim().slice(0, 60) || 'Untitled Game';
  const settings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...(input.settings || {}) };
  const ownerToken = generateOwnerToken();

  const client = await getSupabaseClient().catch(() => null);
  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client.rpc('app_starborn_create_game', {
        p_name: name,
        p_owner_token: ownerToken,
        p_settings: settings,
      });
      if (!error) {
        const row = (Array.isArray(data) ? data[0] : data) as {
          code: string; name: string; live: boolean; settings: GameSettings; created_at: string;
        };
        if (row && row.code) {
          const game: GameInfo = {
            code: normalizeJoinCode(row.code),
            name: row.name,
            live: row.live !== false,
            settings: row.settings || settings,
            serverBacked: true,
            createdAt: Date.parse(row.created_at || '') || Date.now(),
          };
          try {
            safeStorage.setItem(ownerKey(game.code), ownerToken);
          } catch {
            /* ignore */
          }
          return { game, ownerToken };
        }
      }
      console.warn('[GameSync] Server game registry unavailable, minting a local code.', error?.message || 'no code returned');
    } catch (e) {
      console.warn('[GameSync] Server game registry unavailable, minting a local code.', e);
    }
  }

  // Local fallback: unique-on-this-device code, minted with a retry loop.
  const reg = readLocalRegistry();
  let code = '';
  for (let attempt = 0; attempt < 50 && !code; attempt++) {
    const candidate = generateJoinCode();
    if (!reg[candidate]) code = candidate;
  }
  if (!code) throw new Error('Could not mint a unique local game code.');
  const game: GameInfo = {
    code,
    name,
    live: true,
    settings,
    serverBacked: false,
    createdAt: Date.now(),
  };
  reg[code] = { ...game, ownerToken };
  writeLocalRegistry(reg);
  try {
    safeStorage.setItem(ownerKey(code), ownerToken);
  } catch {
    /* ignore */
  }
  return { game, ownerToken };
}

export interface LookupResult {
  exists: boolean;
  game: GameInfo | null;
  /** How many players are currently in the game, when known. */
  playerCount?: number;
}

/** Look a game up by code (join check). Never throws for "not found".
 *  Server first, local registry second — a game created in local mode can
 *  still be joined on this device. */
export async function lookupGame(code: string): Promise<LookupResult> {
  const normalized = normalizeJoinCode(code);
  const client = await getSupabaseClient().catch(() => null);
  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client.rpc('app_starborn_lookup_game', {
        p_code: normalized,
      });
      if (!error) {
        const row = (Array.isArray(data) ? data[0] : data) as {
          code: string; name: string; live: boolean; settings: GameSettings; created_at: string;
        } | null;
        if (row) {
          return {
            exists: true,
            game: {
              code: normalizeJoinCode(row.code),
              name: row.name,
              live: row.live !== false,
              settings: row.settings || DEFAULT_GAME_SETTINGS,
              serverBacked: true,
              createdAt: Date.parse(row.created_at || '') || Date.now(),
            },
          };
        }
      }
    } catch {
      /* fall through to the local registry */
    }
  }
  const entry = readLocalRegistry()[normalized];
  if (!entry) return { exists: false, game: null };
  const { ownerToken: _ignored, ...game } = entry;
  return { exists: true, game };
}

/** GM only: flip the live toggle. Never changes or deletes anything else. */
export async function setGameLive(code: string, live: boolean, ownerToken: string): Promise<boolean> {
  const normalized = normalizeJoinCode(code);
  const client = await getSupabaseClient().catch(() => null);
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client.rpc('app_starborn_set_game_live', {
        p_code: normalized,
        p_owner_token: ownerToken,
        p_live: live,
      });
      if (!error) return true;
    } catch {
      /* fall through to the local registry */
    }
  }
  const reg = readLocalRegistry();
  const entry = reg[normalized];
  if (!entry || entry.ownerToken !== ownerToken) return false;
  entry.live = live;
  writeLocalRegistry(reg);
  return true;
}

/** GM only: change limits/settings inside the game. */
export async function updateGameSettings(
  code: string,
  settings: GameSettings,
  ownerToken: string,
): Promise<boolean> {
  const normalized = normalizeJoinCode(code);
  const client = await getSupabaseClient().catch(() => null);
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client.rpc('app_starborn_update_game_settings', {
        p_code: normalized,
        p_owner_token: ownerToken,
        p_settings: settings,
      });
      if (!error) return true;
    } catch {
      /* fall through to the local registry */
    }
  }
  const reg = readLocalRegistry();
  const entry = reg[normalized];
  if (!entry || entry.ownerToken !== ownerToken) return false;
  entry.settings = settings;
  writeLocalRegistry(reg);
  return true;
}

/** Persist this player's per-game save on the server (best-effort). */
export async function saveGameStateServer(save: GameSave): Promise<boolean> {
  const client = await getSupabaseClient().catch(() => null);
  if (!client || !isSupabaseConfigured()) return false;
  try {
    const { error } = await client.rpc('app_starborn_save_game_state', {
      p_code: normalizeJoinCode(save.code),
      p_player_id: save.playerId,
      p_state: save,
    });
    return !error;
  } catch {
    return false;
  }
}

/** Load this player's per-game save from the server, if one exists. */
export async function loadGameStateServer(code: string, playerId: string): Promise<GameSave | null> {
  const client = await getSupabaseClient().catch(() => null);
  if (!client || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await client.rpc('app_starborn_load_game_state', {
      p_code: normalizeJoinCode(code),
      p_player_id: playerId,
    });
    if (error || !data) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { state?: GameSave } | null;
    return (row && (row as { state?: GameSave }).state) || null;
  } catch {
    return null;
  }
}

/** The owner token this device holds for a game (empty when not the GM). */
export function getOwnerToken(code: string): string {
  try {
    return safeStorage.getItem(ownerKey(code)) || '';
  } catch {
    return '';
  }
}
