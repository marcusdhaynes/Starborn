# Starborn Game Sync

GM + players sync to the **same game** in real time — movement, dice rolls,
HP and short table actions — with tiny messages only. No video, no images,
no heavy mechanics.

## How a game works

**GM — host a game**
1. Tap **Game Sync** (bottom-right) → **Host a game**.
2. Name the game, set limits (max players 2–12, rolls public or GM-only,
   players move any token or only their own), tap **Create game**.
3. A short 6-character code is generated (e.g. `M47KQ2`). Tap **Share** to
   send the code + link.
4. The **live toggle** pauses joins without changing or deleting anything
   else about the game. Flip it back on and players can join again.

**Player — join a game**
- Tap **Game Sync** → **Join a game**, type the 6-character code — or just
  open the GM's share link: it opens the app **straight into that game**
  (`?game=CODE`) and restores your character, stats, items and tabletop
  state **for that specific game** (a snapshot is kept per game code, on
  this device and — when Supabase is connected — on the server).

**At the table**
- The mini-map shows every player's token moving live; the player list
  shows names, roles (👑 GM) and HP.
- Your token moves instantly on your screen; the move is broadcast
  throttled/coalesced (latest position wins). Rolls you make appear on
  everyone's dice and in the shared roll feed. HP changes and short
  combat-log lines are shared too.

## What syncs, and how big it is

| Message | Measured size |
|---|---|
| move (token position) | 80 bytes |
| roll (dice result) | 186 bytes |
| hp | 92 bytes |
| hello | 203 bytes |
| heartbeat | 58 bytes |
| action (one log line) | 143 bytes |
| settings | 127 bytes |
| live | 56 bytes |
| snapshot-request | 61 bytes |
| snapshot (whole table, on join) | ~1 KB for 5 players |

Tokens are initials discs in a colour — character **images are never sent**
(a data: URL would be kilobytes; a token must stay ~100 bytes). Remote
tokens render on the mini-map in the panel, because the thrown battlemap
uses `object-cover` and its map-space → screen transform cannot be trusted
for token placement without deeper surgery.

## Transport

- **Supabase Realtime Broadcast** (when `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` are set): channel `starborn-game-<code>`,
  ephemeral — nothing is stored. The Supabase client is lazy-loaded, so
  the initial page load does not grow.
- **Local mode** (no Supabase configured): `BroadcastChannel` between
  tabs on the same device. Works offline, labelled "Local only" in the UI,
  and never pretends to sync two devices.

**Poor connections:** optimistic local updates (you see your move
instantly), movement throttled to ~100 ms with latest-wins coalescing,
outbound messages queued while offline (moves collapse to one, cap 50)
and flushed on reconnect, then a snapshot-request resyncs the table.
Presence heartbeats every 15 s; players idle for 45 s drop off the list.

## Join codes — never repeated

Codes are 6 characters from an alphabet with no look-alikes (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`).

- **Server-backed (Supabase migration applied):** codes are minted
  **inside the database** by `app_starborn_create_game`, which inserts the
  code as a PRIMARY KEY in a retry loop — two GMs creating games at the
  same instant can never get the same code.
- **Without the migration:** codes are minted locally and are unique on
  this device only. The UI says so honestly ("Local code") instead of
  pretending otherwise.

## Supabase setup (optional, for cross-device play + unique codes)

1. Set in the deploy environment (never in the repo):
   `VITE_SUPABASE_URL` = `https://tbrqqjrzknhdnwcpkqro.supabase.co`
   `VITE_SUPABASE_ANON_KEY` = the project's **anon/publishable** key.
   Never a service-role key.
2. Apply `supabase/migrations/0001_app_starborn_game_sync.sql` — **read
   the REVIEW REQUIRED header first**. It creates `app_starborn.games` +
   `game_saves` with RLS on and no direct table access; anon may only
   EXECUTE the six RPCs. Game ownership is proved by an owner token whose
   SHA-256 hash is stored server-side.
3. In Supabase Dashboard → Settings → API, add `app_starborn` to the
   exposed schemas so the RPCs are reachable. Do not expose other apps'
   schemas.

Without steps 2–3, live sync still works over Broadcast; only global code
uniqueness and cross-device save restore stay local.

## Files

- `types.ts` — message shapes, constants, payload-size helper.
- `joinCode.ts` — code generation/normalisation, share links, player ids.
- `supabase.ts` — lazy Supabase client (dynamic import only).
- `transport.ts` — Supabase Broadcast + local BroadcastChannel transports,
  move throttler.
- `gameRegistry.ts` — create/lookup/live/settings/save/load (RPCs with
  local fallback).
- `snapshot.ts` — per-game save/restore of `vtt_*` / `setting_*` /
  `tabletop_*` keys (large data: URLs excluded, mirroring `storage.ts`).
- `useGameSync.ts` — the hook: session, presence, outbound listeners on
  the app's own events (`tabletop-state-update`, `vtt-roll-settled-event`,
  `vtt-hp-adjust`), inbound handling (remote rolls re-fire the app's own
  `vtt-remote-roll` event so the dice animate).
- `GameSyncPanel.tsx` — the menu (create / join / table views).
- `MiniMap.tsx` — live token map.
- `GameSyncRoot.tsx` — mount point (rendered once in `App.tsx`).
- `../supabase/migrations/0001_app_starborn_game_sync.sql` — registry + saves.

## Integration points (deliberately tiny)

- `src/App.tsx`: 2 lines — import + `<GameSyncRoot />` next to the
  settings overlay. (Note: the startup-screen agent is also editing
  `App.tsx` — this block is marked `START-OF-SYNC-INTEGRATION`.)
- No dice files touched: inbound rolls reuse the existing
  `vtt-remote-roll` event. No startup/routing files touched beyond the
  two App.tsx lines above. No Firebase code touched (legacy, per AGENTS.md).

## Known limits

- Remote tokens show on the panel mini-map, not on the thrown battlemap
  (see "What syncs" above).
- Max-players enforcement is best-effort (presence is approximate).
- A game with a paused (not live) toggle keeps its snapshot; players
  already inside stay connected but new joins are refused.
- `setting_sync_rate` (Settings) is honoured as the move throttle,
  clamped to 60–500 ms (default 100 ms).
- The two pre-existing `tsc` errors in `01_maps.tsx:357`
  (`ImportMeta.env`, missing `vite/client` types) are untouched.
