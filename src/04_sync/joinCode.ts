/**
 * Starborn Game Sync — join codes and share links.
 *
 * Codes are deliberately VERY basic: 6 characters, no look-alike letters or
 * digits (no 0/O, 1/I/L), so a GM can read one out loud at the table and a
 * player can type it without squinting.
 *
 * Global uniqueness is NOT decided here. Local generation only promises
 * "not seen on this device". True never-repeat-a-code behaviour comes from
 * the server: `gameRegistry.createGame` inserts the code as a PRIMARY KEY
 * through a Supabase RPC that generates the code inside the database and
 * retries on conflict (see supabase/migrations/0001_app_starborn_game_sync.sql).
 * When Supabase is not configured the app says so in the UI instead of
 * pretending the code is globally unique.
 */

/** Characters that survive being read aloud: no 0/O, 1/I/L. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** Generate a random join code, e.g. "MOON42" (format only — the alphabet
 *  has no O, so real codes look like "M47KQ2"). */
export function generateJoinCode(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Normalise what a player typed: trim, drop spaces/dashes, uppercase. */
export function normalizeJoinCode(input: string): string {
  return (input || '').toUpperCase().replace(/[\s-]/g, '');
}

export function isValidJoinCode(input: string): boolean {
  const code = normalizeJoinCode(input);
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((ch) => CODE_ALPHABET.includes(ch));
}

/**
 * Share link: opens the app straight to that game for immediate drop-in.
 * The app reads `?game=CODE` on load and joins automatically.
 * Any existing query/hash is preserved where possible; the game param wins.
 */
export function buildShareLink(code: string, base?: string): string {
  const normalized = normalizeJoinCode(code);
  const origin =
    base ||
    (typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://marcusdhaynes.github.io/Starborn/');
  try {
    const url = new URL(origin);
    url.searchParams.set('game', normalized);
    return url.toString();
  } catch {
    const sep = origin.includes('?') ? '&' : '?';
    return `${origin}${sep}game=${normalized}`;
  }
}

/** Read a game code from a URL (query `?game=` first, then `#game=`). */
export function parseGameCodeFromUrl(href?: string): string | null {
  const raw =
    href ||
    (typeof window !== 'undefined' ? window.location.href : '');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('game');
    if (fromQuery && isValidJoinCode(fromQuery)) return normalizeJoinCode(fromQuery);
    const hash = url.hash || '';
    const m = hash.match(/game=([A-Za-z0-9-]+)/);
    if (m && isValidJoinCode(m[1])) return normalizeJoinCode(m[1]);
    return null;
  } catch {
    const m = raw.match(/[?&#]game=([A-Za-z0-9-]+)/);
    if (m && isValidJoinCode(m[1])) return normalizeJoinCode(m[1]);
    return null;
  }
}

/** Short random id for this player/client, e.g. "p_9f3ka2". */
export function shortId(prefix = 'p'): string {
  let rand = '';
  try {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    rand = [...buf].map((n) => n.toString(36)).join('').slice(0, 6);
  } catch {
    rand = Math.random().toString(36).slice(2, 8);
  }
  return `${prefix}_${rand}`;
}

/** Random secret that proves game ownership (GM only). Stored locally, and
 *  only its SHA-256 hash is kept server-side. Never put it in a share link. */
export function generateOwnerToken(): string {
  try {
    const buf = new Uint8Array(24);
    crypto.getRandomValues(buf);
    return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}
