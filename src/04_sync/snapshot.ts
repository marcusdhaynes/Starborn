/**
 * Starborn Game Sync — per-game save / restore.
 *
 * "Restores all their data for that specific game" means: when you drop back
 * into a game via its share link, you get YOUR character, stats, items and
 * tabletop state back exactly as you left them in THAT game — not another
 * game's, and not a blank sheet.
 *
 * Implementation: a snapshot is the same key set the app already persists
 * through safeStorage (`vtt_*` character, `setting_*` preferences,
 * `tabletop_*` tabletop), collected the same way storage.ts does, with the
 * same large-data-URL stripping (images stay local-only; a >50 KB data: URL
 * is never put in a snapshot). One snapshot is stored per game code, locally
 * under `starborn_game_save_<CODE>`, and — when Supabase is configured —
 * also on the server via the `app_starborn_load/save_game_state` RPCs
 * (see gameRegistry.ts). Local storage is the source of truth when offline;
 * the server copy is what makes the same game restore on another device.
 */

import { safeStorage, listStoredKeys, readStoredValue } from '../storage';

export interface GameSave {
  code: string;
  playerId: string;
  characterId: string;
  displayName: string;
  /** Serialised key/value pairs, as stored by safeStorage. */
  data: Record<string, string>;
  updatedAt: number;
}

const SAVE_KEY_PREFIX = 'starborn_game_save_';
const KNOWN_GAMES_KEY = 'starborn_known_games';
const DISPLAY_NAME_KEY = 'starborn_display_name';

const SNAPSHOT_PREFIXES = ['vtt_', 'setting_', 'tabletop_'];

/** Mirror of storage.ts: never snapshot a huge inline image. */
function isTooLargeToSnapshot(value: string): boolean {
  if (value.startsWith('data:') && value.length > 50_000) return true;
  if (value.length > 150_000) return true;
  return false;
}

function readAllLocalEntries(): Record<string, string> {
  const out: Record<string, string> = {};
  // Reads raw stored keys (memory fallback + localStorage) so snapshots
  // work even when localStorage is blocked (e.g. sandboxed iframes).
  for (const k of listStoredKeys()) {
    const v = readStoredValue(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

/** Collect this player's current game data into a snapshot. */
export function collectGameSave(code: string, playerId: string): GameSave {
  const data: Record<string, string> = {};
  const all = readAllLocalEntries();
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(SAVE_KEY_PREFIX) || k.startsWith('starborn_game_')) continue;
    if (!SNAPSHOT_PREFIXES.some((p) => k.startsWith(p))) continue;
    if (isTooLargeToSnapshot(v)) continue;
    data[k] = v;
  }
  const characterId = all['setting_active_character_id'] || 'default';
  return {
    code,
    playerId,
    characterId,
    displayName: getDisplayName(),
    data,
    updatedAt: Date.now(),
  };
}

/** Apply a snapshot for THIS game only. Keys outside the snapshot are left
 *  alone; the restore never touches another game's data.
 *
 *  The active character is restored FIRST: safeStorage namespaces bare
 *  `vtt_*` keys under the current character, and the snapshot's keys were
 *  stored under the snapshot's character — restoring the character first is
 *  what makes un-namespaced keys land on the right character instead of
 *  whichever character happens to be active right now. */
export function applyGameSave(save: GameSave): void {
  try {
    safeStorage.setItem('setting_active_character_id', save.characterId);
  } catch {
    /* ignore */
  }
  for (const [k, v] of Object.entries(save.data)) {
    if (k === 'setting_active_character_id') continue; // already set above
    try {
      safeStorage.setItem(k, v);
    } catch {
      /* one bad key must not abort the whole restore */
    }
  }
  try {
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
  } catch {
    /* ignore */
  }
}

function saveKey(code: string): string {
  return `${SAVE_KEY_PREFIX}${code.toUpperCase()}`;
}

export function storeGameSaveLocally(save: GameSave): void {
  try {
    safeStorage.setItem(saveKey(save.code), JSON.stringify(save));
    rememberGameCode(save.code);
  } catch {
    /* storage full/unavailable — the live session still works, restore just
       will not survive a reload on this device. */
  }
}

export function loadGameSaveLocally(code: string): GameSave | null {
  try {
    const raw = safeStorage.getItem(saveKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSave;
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Codes this device has played, so a returning player can rejoin quickly. */
export function rememberGameCode(code: string): void {
  try {
    const raw = safeStorage.getItem(KNOWN_GAMES_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [code.toUpperCase(), ...list.filter((c) => c !== code.toUpperCase())].slice(0, 12);
    safeStorage.setItem(KNOWN_GAMES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function listKnownGameCodes(): string[] {
  try {
    const raw = safeStorage.getItem(KNOWN_GAMES_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function getDisplayName(): string {
  try {
    return safeStorage.getItem(DISPLAY_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name: string): void {
  try {
    safeStorage.setItem(DISPLAY_NAME_KEY, name.slice(0, 40));
  } catch {
    /* ignore */
  }
}
