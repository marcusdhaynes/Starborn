/**
 * Starborn Game Sync — shared types.
 *
 * Design: one game = one tiny-message channel. Only small JSON moves over the
 * wire — token positions, dice rolls, HP, and short action lines. No images,
 * no video, no audio, no full character sheets. Remote tokens are rendered
 * from initials + a colour, never from a data: URL, so a move stays ~100 bytes.
 *
 * Transport is pluggable (see transport.ts): Supabase Realtime Broadcast when
 * configured, BroadcastChannel between tabs on the same device when it is not.
 * The message shapes are identical on both transports.
 */

// ---- Map / tokens ---------------------------------------------------------

/** Map coordinate space used by the app today (tabletop_avatar_x/y). */
export const MAP_SIZE = 2400;
export const MAP_MIN = 50;
export const MAP_MAX = 2350;

/** How often a moving token may broadcast at most (ms). Local moves still
 *  render instantly — this only throttles what goes over the wire. The value
 *  honours the app's existing `setting_sync_rate` where it is set. */
export const DEFAULT_MOVE_THROTTLE_MS = 100;
export const MOVE_THROTTLE_MIN_MS = 60;
export const MOVE_THROTTLE_MAX_MS = 500;

/** Presence heartbeat interval / prune timeout (ms). */
export const HEARTBEAT_MS = 15_000;
export const PRESENCE_TIMEOUT_MS = 45_000;

/** Outbound queue cap while offline (moves collapse to the latest one). */
export const OFFLINE_QUEUE_CAP = 50;

export type SyncRole = 'gm' | 'player';

export interface GameSettings {
  /** Max players allowed in the game (GM included). */
  maxPlayers: number;
  /** When false, dice results are only shown to the GM. */
  publicRolls: boolean;
  /** When false, a player may only move their own token. */
  freeMovement: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: 8,
  publicRolls: true,
  freeMovement: false,
};

export interface GameInfo {
  code: string;
  name: string;
  /** Whether new players may join right now. Toggling this never deletes or
   *  changes anything else about the game. */
  live: boolean;
  settings: GameSettings;
  /** True when the code was registered on the server (globally unique).
   *  False in local/demo mode (unique only on this device). */
  serverBacked: boolean;
  createdAt: number;
}

/** One player at the table. `img` is NEVER a data: URL — remote tokens are
 *  rendered as an initials disc in `color`. A short http(s) image URL may be
 *  shared if the player set one, and is dropped if it is not http(s). */
export interface PlayerToken {
  playerId: string;
  name: string;
  color: string;
  role: SyncRole;
  x: number;
  y: number;
  hp: number | null;
  maxHp: number | null;
  tempHp: number | null;
  /** Monotonic per-player sequence for last-wins ordering. */
  seq: number;
  updatedAt: number;
  /** Last-seen timestamp, for presence pruning. */
  lastSeen: number;
}

/** A dice roll that was shared with the table. */
export interface SharedRoll {
  id: string;
  playerId: string;
  playerName: string;
  formulaName: string;
  rolls: number[];
  numSides: number;
  modifier: number;
  total: number;
  at: number;
}

// ---- Wire messages -------------------------------------------------------

export type SyncMessage =
  | { t: 'hello'; player: PlayerToken }
  | { t: 'bye'; playerId: string }
  | { t: 'heartbeat'; playerId: string; at: number }
  | { t: 'move'; playerId: string; x: number; y: number; seq: number; at: number }
  | { t: 'roll'; roll: SharedRoll }
  | { t: 'hp'; playerId: string; hp: number | null; maxHp: number | null; tempHp: number | null; seq: number; at: number }
  | { t: 'action'; playerId: string; playerName: string; text: string; at: number }
  | { t: 'settings'; settings: GameSettings; live: boolean; by: string; at: number }
  | { t: 'live'; live: boolean; by: string; at: number }
  | { t: 'snapshot-request'; from: string; at: number }
  | { t: 'snapshot'; from: string; to: string; game: GameInfo; players: PlayerToken[]; at: number };

/** Byte size of a message on the wire (UTF-8 JSON). Used in tests and logs. */
export function messageByteSize(msg: SyncMessage): number {
  try {
    return new TextEncoder().encode(JSON.stringify(msg)).length;
  } catch {
    return JSON.stringify(msg).length;
  }
}

/** Clamp a map coordinate into the legal range. */
export function clampMapCoord(v: number): number {
  if (!Number.isFinite(v)) return MAP_MIN;
  return Math.max(MAP_MIN, Math.min(MAP_MAX, Math.round(v)));
}

/** Small palette for player token discs. */
export const PLAYER_COLORS = [
  '#ff71cd', '#a78bfa', '#38bdf8', '#fbbf24',
  '#34d399', '#f87171', '#f472b6', '#a3e635',
  '#f59e0b', '#22d3ee', '#e879f9', '#4ade80',
] as const;

export function colorForPlayer(playerId: string): string {
  let h = 0;
  for (let i = 0; i < playerId.length; i++) h = (h * 31 + playerId.charCodeAt(i)) >>> 0;
  return PLAYER_COLORS[h % PLAYER_COLORS.length];
}

export function initialsForName(name: string): string {
  const clean = (name || 'Player').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return clean.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
