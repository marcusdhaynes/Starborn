/**
 * Starborn Game Sync — React hook.
 *
 * One hook instance owns one game session. It bridges the app's existing
 * local event system and the sync transport, so the rest of the app does not
 * change:
 *
 *   OUTBOUND (local play -> table):
 *     - `tabletop-state-update` / `storage`  -> avatar position + HP
 *     - `vtt-roll-settled-event`             -> dice roll (skips echoes of
 *       rolls that arrived from the table — see remoteEchoRef)
 *     - `vtt-hp-adjust` / `vtt-hp-adjust-temp` -> HP
 *     - new `vtt_combat_logs` entries        -> short action lines
 *       (roll-result lines are skipped: the roll message covers them)
 *   INBOUND (table -> local play):
 *     - move / hp   -> remote player tokens (never touches local storage)
 *     - roll        -> dispatches the app's own `vtt-remote-roll` event,
 *       so the dice animate here exactly as if they were rolled locally
 *     - settings/live -> game state; snapshot-request -> GM answers
 *
 * Movement is optimistic: the local token moves instantly on this device and
 * the broadcast is throttled/coalesced (latest position wins). While offline,
 * outbound messages queue (moves collapse to one) and flush on reconnect,
 * followed by a snapshot-request so the client resyncs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeStorage } from '../storage';
import type { GameInfo, GameSettings, PlayerToken, SharedRoll, SyncMessage } from './types';
import {
  DEFAULT_MOVE_THROTTLE_MS,
  HEARTBEAT_MS,
  MAP_MAX,
  MAP_MIN,
  MOVE_THROTTLE_MAX_MS,
  MOVE_THROTTLE_MIN_MS,
  OFFLINE_QUEUE_CAP,
  PRESENCE_TIMEOUT_MS,
  clampMapCoord,
  colorForPlayer,
} from './types';
import { normalizeJoinCode, parseGameCodeFromUrl, shortId, buildShareLink } from './joinCode';
import { createMoveThrottler, createTransport } from './transport';
import type { SyncTransport, TransportKind, TransportStatus } from './transport';
import { isSupabaseConfigured } from './supabase';
import {
  createGame as registryCreateGame,
  lookupGame,
  setGameLive as registrySetGameLive,
  updateGameSettings as registryUpdateSettings,
  saveGameStateServer,
  loadGameStateServer,
  getOwnerToken,
} from './gameRegistry';
import {
  applyGameSave,
  collectGameSave,
  getDisplayName,
  listKnownGameCodes,
  loadGameSaveLocally,
  rememberGameCode,
  setDisplayName as persistDisplayName,
  storeGameSaveLocally,
} from './snapshot';

export interface GameSyncState {
  status: TransportStatus | 'idle';
  transportKind: TransportKind | null;
  supabaseConfigured: boolean;
  session: GameInfo | null;
  role: 'gm' | 'player' | null;
  playerId: string;
  playerName: string;
  /** This device's own token position (map space), for the mini-map. */
  selfPos: { x: number; y: number };
  /** This device's own HP, for the player list. */
  selfHp: { hp: number | null; maxHp: number | null; tempHp: number | null };
  players: PlayerToken[];
  rolls: SharedRoll[];
  actions: { id: string; playerName: string; text: string; at: number }[];
  error: string | null;
  isLive: boolean;
  shareLink: string;
  knownCodes: string[];
}

const PLAYER_ID_KEY = 'starborn_player_id';

function readInt(key: string, fallback: number): number {
  try {
    const v = safeStorage.getItem(key);
    if (v === null) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function readAvatarPos(): { x: number; y: number } {
  return {
    x: clampMapCoord(readInt('tabletop_avatar_x', 1200)),
    y: clampMapCoord(readInt('tabletop_avatar_y', 1200)),
  };
}

function readHp(): { hp: number | null; maxHp: number | null; tempHp: number | null } {
  const hp = readInt('vtt_hp_current', -1);
  const maxHp = readInt('vtt_hp_max', -1);
  const tempHp = readInt('vtt_hp_temp', -1);
  return {
    hp: hp >= 0 ? hp : null,
    maxHp: maxHp >= 0 ? maxHp : null,
    tempHp: tempHp >= 0 ? tempHp : null,
  };
}

function moveThrottleMs(): number {
  const raw = readInt('setting_sync_rate', DEFAULT_MOVE_THROTTLE_MS);
  return Math.max(MOVE_THROTTLE_MIN_MS, Math.min(MOVE_THROTTLE_MAX_MS, raw || DEFAULT_MOVE_THROTTLE_MS));
}

export function useGameSync() {
  const [state, setState] = useState<GameSyncState>({
    status: 'idle',
    transportKind: null,
    supabaseConfigured: isSupabaseConfigured(),
    session: null,
    role: null,
    playerId: '',
    playerName: getDisplayName() || 'Player',
    selfPos: { x: 1200, y: 1200 },
    selfHp: { hp: null, maxHp: null, tempHp: null },
    players: [],
    rolls: [],
    actions: [],
    error: null,
    isLive: true,
    shareLink: '',
    knownCodes: listKnownGameCodes(),
  });

  const transportRef = useRef<SyncTransport | null>(null);
  const sessionRef = useRef<GameInfo | null>(null);
  const roleRef = useRef<'gm' | 'player' | null>(null);
  const playerIdRef = useRef<string>('');
  const playerNameRef = useRef<string>(state.playerName);
  const seqRef = useRef(0);
  const playersRef = useRef(new Map<string, PlayerToken>());
  const outboxRef = useRef<SyncMessage[]>([]);
  const seenLogIdsRef = useRef<Set<string>>(new Set());
  const remoteEchoRef = useRef<{ rolls: string; formulaName: string; at: number } | null>(null);
  const autoJoinedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const patch = useCallback((p: Partial<GameSyncState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  /** Functional update — avoids stale `rolls`/`actions` closures in the
   *  transport callbacks, which are registered once per session. */
  const update = useCallback((fn: (s: GameSyncState) => Partial<GameSyncState>) => {
    setState((s) => ({ ...s, ...fn(s) }));
  }, []);

  // ---- identity (stable per device) ---------------------------------------

  useEffect(() => {
    let id = '';
    try {
      id = safeStorage.getItem(PLAYER_ID_KEY) || '';
    } catch {
      id = '';
    }
    if (!id) {
      id = shortId('p');
      try {
        safeStorage.setItem(PLAYER_ID_KEY, id);
      } catch {
        /* ignore */
      }
    }
    playerIdRef.current = id;
    patch({ playerId: id });
  }, [patch]);

  const selfToken = useCallback((): PlayerToken => {
    const pos = readAvatarPos();
    const hp = readHp();
    return {
      playerId: playerIdRef.current,
      name: playerNameRef.current || 'Player',
      color: colorForPlayer(playerIdRef.current || 'x'),
      role: roleRef.current || 'player',
      x: pos.x,
      y: pos.y,
      hp: hp.hp,
      maxHp: hp.maxHp,
      tempHp: hp.tempHp,
      seq: seqRef.current,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
    };
  }, []);

  const setPlayers = useCallback((next: Map<string, PlayerToken>) => {
    playersRef.current = next;
    patch({ players: [...next.values()].sort((a, b) => a.name.localeCompare(b.name)) });
  }, [patch]);

  const upsertPlayer = useCallback((token: PlayerToken) => {
    const next = new Map<string, PlayerToken>(playersRef.current);
    const prev = next.get(token.playerId);
    if (prev && prev.seq > token.seq) return; // stale — last-wins by sequence
    next.set(token.playerId, { ...token, lastSeen: Date.now() });
    setPlayers(next);
  }, [setPlayers]);

  // ---- outbound plumbing ---------------------------------------------------

  const sendNow = useCallback((msg: SyncMessage) => {
    const t = transportRef.current;
    if (t && t.status === 'connected') {
      t.send(msg);
      return true;
    }
    // Offline: queue (moves collapse to the latest one).
    const outbox = outboxRef.current;
    if (msg.t === 'move') {
      const idx = outbox.findIndex((m) => m.t === 'move');
      if (idx >= 0) outbox[idx] = msg;
      else outbox.push(msg);
    } else if (outbox.length < OFFLINE_QUEUE_CAP) {
      outbox.push(msg);
    }
    return false;
  }, []);

  const flushOutbox = useCallback(() => {
    const queued = outboxRef.current;
    outboxRef.current = [];
    queued.forEach((m) => sendNow(m));
  }, [sendNow]);

  const sendMove = useCallback((x: number, y: number) => {
    seqRef.current += 1;
    sendNow({ t: 'move', playerId: playerIdRef.current, x: clampMapCoord(x), y: clampMapCoord(y), seq: seqRef.current, at: Date.now() });
  }, [sendNow]);

  const throttlerRef = useRef<ReturnType<typeof createMoveThrottler> | null>(null);
  const lastPosRef = useRef<string>('');
  const reportLocalPosition = useCallback(() => {
    if (!sessionRef.current) return;
    if (!throttlerRef.current) {
      throttlerRef.current = createMoveThrottler((x, y) => sendMove(x, y), moveThrottleMs());
    }
    const pos = readAvatarPos();
    const key = `${pos.x},${pos.y}`;
    if (key !== lastPosRef.current) {
      lastPosRef.current = key;
      patch({ selfPos: pos });
    }
    throttlerRef.current.push(pos.x, pos.y);
  }, [patch, sendMove]);

  const lastHpRef = useRef<string>('');
  const broadcastHp = useCallback(() => {
    if (!sessionRef.current) return;
    const hp = readHp();
    const key = `${hp.hp}/${hp.maxHp}/${hp.tempHp}`;
    if (key === lastHpRef.current) return; // HP unchanged — stay silent
    lastHpRef.current = key;
    patch({ selfHp: hp });
    seqRef.current += 1;
    sendNow({ t: 'hp', playerId: playerIdRef.current, hp: hp.hp, maxHp: hp.maxHp, tempHp: hp.tempHp, seq: seqRef.current, at: Date.now() });
  }, [patch, sendNow]);

  const broadcastRoll = useCallback((detail: { rolls: number[]; formulaName: string; modifier: number; statContext?: string; numSides: number }) => {
    if (!sessionRef.current) return;
    const session = sessionRef.current;
    if (session && roleRef.current === 'player' && !session.settings.publicRolls) {
      // Rolls stay GM-only in this game — still show locally, do not share.
      return;
    }
    const total = detail.rolls.reduce((a, b) => a + b, 0) + (detail.modifier || 0);
    const roll: SharedRoll = {
      id: `${playerIdRef.current}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      playerId: playerIdRef.current,
      playerName: playerNameRef.current || 'Player',
      formulaName: detail.formulaName || 'Roll',
      rolls: detail.rolls,
      numSides: detail.numSides || 6,
      modifier: detail.modifier || 0,
      total,
      at: Date.now(),
    };
    update((s) => ({ rolls: [roll, ...s.rolls].slice(0, 12) }));
    sendNow({ t: 'roll', roll });
  }, [update, sendNow]);

  // ---- inbound --------------------------------------------------------------

  const handleMessage = useCallback((msg: SyncMessage) => {
    const session = sessionRef.current;
    if (!session) return;
    switch (msg.t) {
      case 'hello': {
        if (msg.player.playerId === playerIdRef.current) break;
        upsertPlayer(msg.player);
        // Answer a hello with our own, so the newcomer sees us.
        sendNow({ t: 'hello', player: selfToken() });
        break;
      }
      case 'bye': {
        const next = new Map<string, PlayerToken>(playersRef.current);
        next.delete(msg.playerId);
        setPlayers(next);
        break;
      }
      case 'heartbeat': {
        if (msg.playerId === playerIdRef.current) break;
        const next = new Map<string, PlayerToken>(playersRef.current);
        const prev = next.get(msg.playerId);
        if (prev) next.set(msg.playerId, { ...prev, lastSeen: Date.now() });
        setPlayers(next);
        break;
      }
      case 'move': {
        if (msg.playerId === playerIdRef.current) break;
        const next = new Map<string, PlayerToken>(playersRef.current);
        const prev = next.get(msg.playerId);
        if (prev && prev.seq > msg.seq) break;
        const base: PlayerToken = prev || {
          playerId: msg.playerId, name: 'Player', color: colorForPlayer(msg.playerId),
          role: 'player', x: msg.x, y: msg.y, hp: null, maxHp: null, tempHp: null,
          seq: msg.seq, updatedAt: msg.at, lastSeen: Date.now(),
        };
        next.set(msg.playerId, { ...base, x: clampMapCoord(msg.x), y: clampMapCoord(msg.y), seq: msg.seq, updatedAt: msg.at, lastSeen: Date.now() });
        setPlayers(next);
        break;
      }
      case 'roll': {
        if (msg.roll.playerId === playerIdRef.current) break;
        update((s) => ({ rolls: [msg.roll, ...s.rolls].slice(0, 12) }));
        // Show the roll on this device's dice, exactly as a local roll.
        remoteEchoRef.current = { rolls: msg.roll.rolls.join(','), formulaName: msg.roll.formulaName, at: Date.now() };
        try {
          window.dispatchEvent(new CustomEvent('vtt-remote-roll', {
            detail: {
              count: msg.roll.rolls.length,
              sides: msg.roll.numSides,
              values: msg.roll.rolls,
              formulaName: msg.roll.formulaName,
              statContext: undefined,
              modifier: msg.roll.modifier,
            },
          }));
        } catch {
          /* dice not mounted — the roll still shows in the feed */
        }
        break;
      }
      case 'hp': {
        if (msg.playerId === playerIdRef.current) break;
        const next = new Map<string, PlayerToken>(playersRef.current);
        const prev = next.get(msg.playerId);
        if (prev && prev.seq > msg.seq) break;
        const base: PlayerToken = prev || {
          playerId: msg.playerId, name: 'Player', color: colorForPlayer(msg.playerId),
          role: 'player', x: 1200, y: 1200, hp: null, maxHp: null, tempHp: null,
          seq: msg.seq, updatedAt: msg.at, lastSeen: Date.now(),
        };
        next.set(msg.playerId, { ...base, hp: msg.hp, maxHp: msg.maxHp, tempHp: msg.tempHp, seq: msg.seq, updatedAt: msg.at, lastSeen: Date.now() });
        setPlayers(next);
        break;
      }
      case 'action': {
        if (msg.playerId === playerIdRef.current) break;
        update((s) => ({ actions: [{ id: `${msg.playerId}-${msg.at}`, playerName: msg.playerName, text: msg.text, at: msg.at }, ...s.actions].slice(0, 12) }));
        break;
      }
      case 'settings': {
        patch({ session: { ...session, settings: msg.settings, live: msg.live }, isLive: msg.live });
        sessionRef.current = { ...session, settings: msg.settings, live: msg.live };
        break;
      }
      case 'live': {
        patch({ session: { ...session, live: msg.live }, isLive: msg.live });
        sessionRef.current = { ...session, live: msg.live };
        break;
      }
      case 'snapshot-request': {
        // The GM answers with the current table; any peer with a session may
        // answer, GM first. Never includes our private character data.
        if (roleRef.current === 'gm' || playersRef.current.size === 0) {
          sendNow({
            t: 'snapshot', from: playerIdRef.current, to: msg.from,
            game: sessionRef.current as GameInfo,
            players: [selfToken(), ...playersRef.current.values()],
            at: Date.now(),
          });
        }
        break;
      }
      case 'snapshot': {
        if (msg.to !== playerIdRef.current) break;
        if (msg.game) {
          sessionRef.current = msg.game;
          patch({ session: msg.game, isLive: msg.game.live });
        }
        const next = new Map<string, PlayerToken>(playersRef.current);
        msg.players.forEach((p) => {
          if (p.playerId !== playerIdRef.current) next.set(p.playerId, { ...p, lastSeen: Date.now() });
        });
        setPlayers(next);
        break;
      }
      default:
        break;
    }
  }, [patch, sendNow, selfToken, setPlayers, update, upsertPlayer]);

  // ---- session lifecycle ------------------------------------------------------

  const saveCurrentGame = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const save = collectGameSave(session.code, playerIdRef.current);
    storeGameSaveLocally(save);
    void saveGameStateServer(save);
  }, []);

  const disconnectTransport = useCallback(() => {
    try {
      transportRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    transportRef.current = null;
    if (saveTimerRef.current) {
      clearInterval(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const joinTransport = useCallback(async (game: GameInfo, role: 'gm' | 'player') => {
    disconnectTransport();
    patch({ status: 'connecting', error: null });
    const transport = await createTransport(game.code, playerIdRef.current);
    transportRef.current = transport;
    patch({ transportKind: transport.kind });
    transport.onMessage(handleMessage);
    transport.onStatus((s) => {
      patch({ status: s });
      if (s === 'connected') {
        flushOutbox();
        sendNow({ t: 'hello', player: selfToken() });
        sendNow({ t: 'snapshot-request', from: playerIdRef.current, at: Date.now() });
        transport.trackPresence({ playerId: playerIdRef.current, name: playerNameRef.current || 'Player', role });
        reportLocalPosition();
        broadcastHp();
      }
    });
    await transport.connect();
    sessionRef.current = game;
    roleRef.current = role;
    // Remember the code straight away, so the game is rejoinable from the
    // Join tab even if the player leaves before the next periodic save.
    rememberGameCode(game.code);
    patch({
      session: game,
      role,
      isLive: game.live,
      status: transport.status,
      shareLink: buildShareLink(game.code),
      knownCodes: listKnownGameCodes(),
    });
    // Restore this player's data for THIS game, then announce presence.
    const localSave = loadGameSaveLocally(game.code);
    if (localSave && localSave.playerId === playerIdRef.current) {
      applyGameSave(localSave);
    } else {
      const serverSave = await loadGameStateServer(game.code, playerIdRef.current);
      if (serverSave) applyGameSave(serverSave);
    }
    saveTimerRef.current = setInterval(saveCurrentGame, 60_000);
    return game;
  }, [broadcastHp, disconnectTransport, flushOutbox, handleMessage, patch, reportLocalPosition, saveCurrentGame, selfToken, sendNow]);

  const createGame = useCallback(async (name: string, settings?: Partial<GameSettings>) => {
    patch({ error: null, status: 'connecting' });
    try {
      const { game } = await registryCreateGame({ name, settings });
      await joinTransport(game, 'gm');
      return game;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create the game.';
      patch({ error: msg, status: 'idle' });
      throw new Error(msg);
    }
  }, [joinTransport, patch]);

  const joinGame = useCallback(async (rawCode: string, displayName?: string) => {
    const code = normalizeJoinCode(rawCode);
    patch({ error: null, status: 'connecting' });
    if (displayName !== undefined) {
      playerNameRef.current = displayName.trim() || 'Player';
      persistDisplayName(playerNameRef.current);
      patch({ playerName: playerNameRef.current });
    }
    try {
      const found = await lookupGame(code);
      if (!found.exists || !found.game) {
        throw new Error(`No game found with code ${code}. Check the code and try again.`);
      }
      if (!found.game.live) {
        throw new Error(`"${found.game.name}" isn't live right now. Ask the GM to turn it live.`);
      }
      if (found.playerCount !== undefined && found.playerCount >= found.game.settings.maxPlayers) {
        throw new Error(`"${found.game.name}" is full.`);
      }
      // A returning GM keeps GM powers: this device still holds the owner
      // token minted at creation, so rejoining restores the GM role (live
      // toggle + settings) instead of demoting them to a player.
      const role: 'gm' | 'player' = getOwnerToken(code) ? 'gm' : 'player';
      await joinTransport(found.game, role);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('game', code);
        window.history.replaceState(null, '', url.toString());
      } catch {
        /* ignore */
      }
      return found.game;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join the game.';
      patch({ error: msg, status: 'idle' });
      throw new Error(msg);
    }
  }, [joinTransport, patch]);

  const leaveGame = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      sendNow({ t: 'bye', playerId: playerIdRef.current });
      saveCurrentGame();
    }
    disconnectTransport();
    throttlerRef.current?.dispose();
    throttlerRef.current = null;
    outboxRef.current = [];
    sessionRef.current = null;
    roleRef.current = null;
    playersRef.current = new Map();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('game');
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* ignore */
    }
    patch({ session: null, role: null, players: [], rolls: [], actions: [], status: 'idle', transportKind: null, error: null, shareLink: '' });
  }, [disconnectTransport, patch, saveCurrentGame, sendNow]);

  const setLive = useCallback(async (live: boolean) => {
    const session = sessionRef.current;
    if (!session || roleRef.current !== 'gm') return false;
    const ownerToken = getOwnerToken(session.code);
    const ok = await registrySetGameLive(session.code, live, ownerToken);
    if (!ok) {
      patch({ error: 'Could not change the live setting. Are you still the GM of this game?' });
      return false;
    }
    sessionRef.current = { ...session, live };
    patch({ session: { ...session, live }, isLive: live });
    sendNow({ t: 'live', live, by: playerIdRef.current, at: Date.now() });
    return true;
  }, [patch, sendNow]);

  const updateSettings = useCallback(async (settings: GameSettings) => {
    const session = sessionRef.current;
    if (!session || roleRef.current !== 'gm') return false;
    const ownerToken = getOwnerToken(session.code);
    const ok = await registryUpdateSettings(session.code, settings, ownerToken);
    if (!ok) {
      patch({ error: 'Could not save the game settings.' });
      return false;
    }
    sessionRef.current = { ...session, settings };
    patch({ session: { ...session, settings } });
    sendNow({ t: 'settings', settings, live: session.live, by: playerIdRef.current, at: Date.now() });
    return true;
  }, [patch, sendNow]);

  const setPlayerName = useCallback((name: string) => {
    const clean = name.trim().slice(0, 40) || 'Player';
    playerNameRef.current = clean;
    persistDisplayName(clean);
    patch({ playerName: clean });
    if (sessionRef.current) sendNow({ t: 'hello', player: selfToken() });
  }, [patch, sendNow, selfToken]);

  // ---- listen to the app's own events (outbound) --------------------------------

  useEffect(() => {
    const onTabletopUpdate = () => {
      reportLocalPosition();
      broadcastHp();
      // New combat-log lines become short shared action lines.
      try {
        const raw = safeStorage.getItem('vtt_combat_logs');
        if (!raw) return;
        const logs = JSON.parse(raw) as { id: string; originalText: string }[];
        if (!Array.isArray(logs)) return;
        const fresh = logs.filter((l) => l && l.id && !seenLogIdsRef.current.has(l.id)).slice(0, 3);
        fresh.forEach((l) => seenLogIdsRef.current.add(l.id));
        if (seenLogIdsRef.current.size > 200) {
          seenLogIdsRef.current = new Set([...seenLogIdsRef.current].slice(-100));
        }
        fresh.forEach((l) => {
          const text = (l.originalText || '').trim();
          if (!text) return;
          if (/Rolled \d+d\d+/.test(text)) return; // covered by the roll message
          if (!sessionRef.current) return;
          update((s) => ({ actions: [{ id: `local-${l.id}`, playerName: playerNameRef.current || 'Player', text, at: Date.now() }, ...s.actions].slice(0, 12) }));
          sendNow({ t: 'action', playerId: playerIdRef.current, playerName: playerNameRef.current || 'Player', text: text.slice(0, 140), at: Date.now() });
        });
      } catch {
        /* malformed log — ignore */
      }
    };
    const onRollSettled = (e: Event) => {
      const detail = (e as CustomEvent<{ rolls: number[]; formulaName: string; modifier: number; statContext?: string; numSides: number }>).detail;
      if (!detail || !Array.isArray(detail.rolls)) return;
      // Echo guard: this settled event is the local dice finishing a roll
      // that arrived from the table — do not broadcast it back.
      const echo = remoteEchoRef.current;
      if (echo && Date.now() - echo.at < 15_000 && echo.rolls === detail.rolls.join(',') && echo.formulaName === detail.formulaName) {
        remoteEchoRef.current = null;
        return;
      }
      broadcastRoll(detail);
    };
    const onHpAdjust = () => {
      // HP state lands in storage right after the event; read it on next tick.
      setTimeout(broadcastHp, 60);
    };
    window.addEventListener('tabletop-state-update', onTabletopUpdate);
    window.addEventListener('storage', onTabletopUpdate);
    window.addEventListener('vtt-roll-settled-event', onRollSettled);
    window.addEventListener('vtt-hp-adjust', onHpAdjust);
    window.addEventListener('vtt-hp-adjust-temp', onHpAdjust);
    return () => {
      window.removeEventListener('tabletop-state-update', onTabletopUpdate);
      window.removeEventListener('storage', onTabletopUpdate);
      window.removeEventListener('vtt-roll-settled-event', onRollSettled);
      window.removeEventListener('vtt-hp-adjust', onHpAdjust);
      window.removeEventListener('vtt-hp-adjust-temp', onHpAdjust);
    };
  }, [broadcastHp, broadcastRoll, reportLocalPosition, sendNow, update]);

  // ---- presence heartbeat + pruning -------------------------------------------

  useEffect(() => {
    if (!state.session) return;
    const beat = setInterval(() => {
      if (!sessionRef.current) return;
      const t = transportRef.current;
      if (t && t.status === 'connected') {
        sendNow({ t: 'heartbeat', playerId: playerIdRef.current, at: Date.now() });
        t.trackPresence({ playerId: playerIdRef.current, name: playerNameRef.current || 'Player', role: roleRef.current || 'player' });
        sendNow({ t: 'hello', player: selfToken() });
      }
      const now = Date.now();
      const next = new Map<string, PlayerToken>(playersRef.current);
      let changed = false;
      next.forEach((p, id) => {
        if (now - p.lastSeen > PRESENCE_TIMEOUT_MS) {
          next.delete(id);
          changed = true;
        }
      });
      if (changed) setPlayers(next);
    }, HEARTBEAT_MS);
    return () => clearInterval(beat);
  }, [state.session, sendNow, selfToken, setPlayers]);

  // ---- auto-join from a share link (?game=CODE) ---------------------------------

  useEffect(() => {
    if (autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    const code = parseGameCodeFromUrl();
    if (!code) return;
    if (!playerIdRef.current) {
      // Identity effect above runs first; retry once it has landed.
      const t = setTimeout(() => {
        void joinGame(code).catch(() => {
          /* error is shown in the panel */
        });
      }, 300);
      return () => clearTimeout(t);
    }
    void joinGame(code).catch(() => {
      /* error is shown in the panel */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on unload / hide so a returning player restores this game.
  useEffect(() => {
    const onHide = () => saveCurrentGame();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [saveCurrentGame]);

  // Leave cleanly on unmount.
  useEffect(() => () => {
    try {
      transportRef.current?.disconnect();
    } catch {
      /* ignore */
    }
  }, []);

  return {
    ...state,
    mapMin: MAP_MIN,
    mapMax: MAP_MAX,
    createGame,
    joinGame,
    leaveGame,
    setLive,
    updateSettings,
    setPlayerName,
  };
}
