/**
 * Starborn Game Sync — the Game menu.
 *
 * One beautiful menu, in the app's own visual language (stone-950 panels,
 * amber/purple accents, Cinzel headings — the same chrome as SettingsWindow):
 *
 *   Create — GM names the game, sets limits, saves it. A basic code is
 *     generated, with a Share button to send it out.
 *   Join   — a player types the code (or opens a share link and drops in).
 *   Table  — once in a game: code + copy/share, live toggle (GM only,
 *     never changes anything else), GM settings, players with HP,
 *     the mini-map with moving tokens, and the shared roll feed.
 *
 * The panel is always mounted (floating button when closed) so the sync hook
 * stays alive for the whole session.
 */
import React, { useState } from 'react';
import { Crown, Link2, Copy, Check, Users, Dices, Wifi, WifiOff, Loader2, Share2, LogOut, X, Sparkles } from 'lucide-react';
import { useGameSync } from './useGameSync';
import MiniMap from './MiniMap';
import { initialsForName } from './types';
import { normalizeJoinCode } from './joinCode';

type Tab = 'create' | 'join';

export default function GameSyncPanel() {
  const sync = useGameSync();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('create');
  const [gameName, setGameName] = useState('');
  const [playerName, setPlayerName] = useState(sync.playerName);
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [publicRolls, setPublicRolls] = useState(true);
  const [freeMovement, setFreeMovement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Keep the panel open (and on the table) when a share link auto-joins.
  React.useEffect(() => {
    if (sync.session) setOpen(true);
  }, [sync.session]);

  const error = localError || sync.error;
  const inGame = Boolean(sync.session);
  const isGm = sync.role === 'gm';
  const connected = sync.status === 'connected';
  const allPlayers = sync.players;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const shareGame = async () => {
    if (!sync.session) return;
    const text = `Join my Starborn game "${sync.session.name}" — code ${sync.session.code}: ${sync.shareLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Starborn: ${sync.session.name}`, text, url: sync.shareLink });
        return;
      } catch {
        /* user cancelled share sheet — fall through to copy */
      }
    }
    await copyText(text);
  };

  const handleCreate = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await sync.createGame(gameName.trim() || 'Untitled Game', { maxPlayers, publicRolls, freeMovement });
      if (playerName.trim()) sync.setPlayerName(playerName.trim());
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not create the game.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    setLocalError(null);
    const code = normalizeJoinCode(joinCode);
    if (code.length !== 6) {
      setLocalError('That code should be 6 letters and numbers.');
      return;
    }
    setBusy(true);
    try {
      await sync.joinGame(code, playerName.trim() || undefined);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not join the game.');
    } finally {
      setBusy(false);
    }
  };

  const toggleLive = async () => {
    if (!sync.session) return;
    setBusy(true);
    await sync.setLive(!sync.isLive);
    setBusy(false);
  };

  const saveSettings = async () => {
    setBusy(true);
    await sync.updateSettings({ maxPlayers, publicRolls, freeMovement });
    setBusy(false);
  };

  // Sync the GM settings form with the live game when it changes.
  React.useEffect(() => {
    if (sync.session) {
      setMaxPlayers(sync.session.settings.maxPlayers);
      setPublicRolls(sync.session.settings.publicRolls);
      setFreeMovement(sync.session.settings.freeMovement);
    }
  }, [sync.session]);

  return (
    <>
      {/* Floating button — always visible so a game is one tap away. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[4100] flex items-center gap-2 rounded-full border border-purple-500/40 bg-stone-950/90 px-3 py-2 font-serif text-[11px] font-bold uppercase tracking-widest text-purple-200 shadow-[0_8px_25px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:scale-105 active:scale-95"
        aria-label={open ? 'Close game sync' : 'Open game sync'}
      >
        <Users size={14} />
        <span className="hidden sm:inline">Game Sync</span>
        {inGame && (
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]' : 'bg-amber-400 animate-pulse'}`} />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[4150] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center">
          <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl border border-amber-500/30 bg-stone-950/95 p-4 text-stone-200 shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <span className="font-serif text-xs font-extrabold uppercase tracking-widest text-amber-200">
                {inGame ? `✦ ${sync.session?.name}` : '✦ Play Together'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 transition-colors hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Connection line */}
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-stone-400">
              {connected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-amber-400" />}
              <span>
                {sync.status === 'idle' && 'Not in a game'}
                {sync.status === 'connecting' && 'Connecting…'}
                {sync.status === 'connected' && (sync.transportKind === 'supabase' ? 'Live — synced' : 'Local only — same device')}
                {sync.status === 'reconnecting' && 'Reconnecting… your moves are queued'}
                {sync.status === 'closed' && 'Disconnected'}
              </span>
              {inGame && !sync.isLive && <span className="text-amber-300">· Paused by GM</span>}
            </div>

            {error && (
              <div className="mb-3 rounded border border-red-500/40 bg-red-950/50 px-3 py-2 text-[11px] text-red-200">{error}</div>
            )}

            {!inGame ? (
              <>
                {/* Your name */}
                <label className="mb-3 block">
                  <span className="mb-1 block font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">Your name</span>
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Lyra"
                    maxLength={40}
                    className="w-full rounded border border-white/10 bg-stone-900/70 px-3 py-2 text-sm text-white outline-none placeholder:text-stone-500 focus:border-purple-400"
                  />
                </label>

                {/* Tabs */}
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-white/5 bg-stone-900/50 p-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className={`rounded py-1.5 font-serif font-bold uppercase tracking-wider transition-all ${tab === 'create' ? 'bg-purple-600/25 text-purple-200 shadow-inner' : 'text-stone-400'}`}
                  >
                    <Crown size={11} className="mr-1 inline" /> Host a game
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('join')}
                    className={`rounded py-1.5 font-serif font-bold uppercase tracking-wider transition-all ${tab === 'join' ? 'bg-purple-600/25 text-purple-200 shadow-inner' : 'text-stone-400'}`}
                  >
                    <Link2 size={11} className="mr-1 inline" /> Join a game
                  </button>
                </div>

                {tab === 'create' ? (
                  <div className="flex flex-col gap-3">
                    <label className="block">
                      <span className="mb-1 block font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">Game name</span>
                      <input
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="e.g. The Starlight Circle"
                        maxLength={60}
                        className="w-full rounded border border-white/10 bg-stone-900/70 px-3 py-2 text-sm text-white outline-none placeholder:text-stone-500 focus:border-purple-400"
                      />
                    </label>

                    <div className="flex flex-col gap-2 rounded border border-white/5 bg-stone-900/40 p-2.5">
                      <span className="font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">Game settings</span>
                      <label className="flex items-center justify-between text-[12px] text-stone-300">
                        <span>Max players</span>
                        <span className="flex items-center gap-2">
                          <button type="button" onClick={() => setMaxPlayers((v) => Math.max(2, v - 1))} className="h-6 w-6 rounded border border-white/10 bg-stone-800">−</button>
                          <span className="w-6 text-center font-mono font-bold text-amber-200">{maxPlayers}</span>
                          <button type="button" onClick={() => setMaxPlayers((v) => Math.min(12, v + 1))} className="h-6 w-6 rounded border border-white/10 bg-stone-800">+</button>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center justify-between text-[12px] text-stone-300">
                        <span>Dice rolls visible to everyone</span>
                        <input type="checkbox" checked={publicRolls} onChange={(e) => setPublicRolls(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                      </label>
                      <label className="flex cursor-pointer items-center justify-between text-[12px] text-stone-300">
                        <span>Players can move any token</span>
                        <input type="checkbox" checked={freeMovement} onChange={(e) => setFreeMovement(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={busy}
                      className="w-full rounded bg-purple-600/80 py-2.5 font-serif text-[12px] font-bold uppercase tracking-widest text-white transition-all hover:bg-purple-600 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : <Sparkles size={14} className="mr-1 inline" />}
                      Create game
                    </button>
                    <p className="text-center font-mono text-[10px] leading-relaxed text-stone-500">
                      A short code is made for your game
                      {sync.supabaseConfigured ? ' and registered so it is never reused.' : '.'}
                      {!sync.supabaseConfigured && ' Local mode: codes work on this device only until Supabase is connected.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="block">
                      <span className="mb-1 block font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">Game code</span>
                      <input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                        placeholder="e.g. M47KQ2"
                        maxLength={6}
                        autoCapitalize="characters"
                        autoComplete="off"
                        className="w-full rounded border border-white/10 bg-stone-900/70 px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-amber-200 outline-none placeholder:text-stone-600 focus:border-purple-400"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleJoin}
                      disabled={busy}
                      className="w-full rounded bg-purple-600/80 py-2.5 font-serif text-[12px] font-bold uppercase tracking-widest text-white transition-all hover:bg-purple-600 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : 'Join game'}
                    </button>
                    <p className="text-center font-mono text-[10px] leading-relaxed text-stone-500">
                      Or open a share link from your GM — it drops you straight into the game and restores your character for it.
                    </p>
                    {sync.knownCodes.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {sync.knownCodes.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setJoinCode(c)}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-purple-200 hover:bg-white/10"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Code + share */}
                <div className="mb-3 rounded-lg border border-purple-500/20 bg-purple-950/30 p-3 text-center">
                  <div className="font-serif text-[10px] font-bold uppercase tracking-widest text-purple-300">Game code</div>
                  <div className="my-1 font-mono text-2xl font-bold tracking-[0.25em] text-amber-200">{sync.session?.code}</div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(sync.session?.code || '')}
                      className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase text-stone-200 hover:bg-white/10"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />} Copy code
                    </button>
                    <button
                      type="button"
                      onClick={shareGame}
                      className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] uppercase text-amber-200 hover:bg-amber-500/25"
                    >
                      <Share2 size={11} /> Share
                    </button>
                  </div>
                  <div className="mt-2 truncate font-mono text-[9px] text-stone-500" title={sync.shareLink}>{sync.shareLink}</div>
                  <div className="mt-1 font-mono text-[9px] text-stone-500">
                    {sync.session?.serverBacked
                      ? 'Registered — this code will never be reused.'
                      : 'Local code — connect Supabase to guarantee it is never reused.'}
                  </div>
                </div>

                {/* GM live toggle */}
                {isGm && (
                  <div className="mb-3 flex items-center justify-between rounded border border-white/5 bg-stone-900/40 px-3 py-2">
                    <span className="font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">
                      Game is {sync.isLive ? 'live' : 'paused'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sync.isLive}
                      onClick={toggleLive}
                      disabled={busy}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${sync.isLive ? 'bg-emerald-500/80' : 'bg-stone-700'}`}
                    >
                      <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${sync.isLive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )}

                {/* Mini-map */}
                <MiniMap players={[{ playerId: sync.playerId, name: `${sync.playerName} (you)`, color: '#ff71cd', role: sync.role || 'player', x: sync.selfPos.x, y: sync.selfPos.y, hp: sync.selfHp.hp, maxHp: sync.selfHp.maxHp, tempHp: sync.selfHp.tempHp, seq: 0, updatedAt: Date.now(), lastSeen: Date.now() }, ...allPlayers.filter((p) => p.playerId !== sync.playerId)]} selfId={sync.playerId} />

                {/* Players */}
                <div className="mb-3 mt-3">
                  <div className="mb-1.5 font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">
                    At the table ({allPlayers.length + 1})
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 rounded border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff71cd] font-serif text-[9px] font-bold text-white">{initialsForName(sync.playerName)}</span>
                      <span className="flex-1 truncate text-[12px] text-stone-100">{sync.playerName} (you){isGm ? ' 👑 GM' : ''}</span>
                      {sync.selfHp.hp !== null && sync.selfHp.maxHp !== null && (
                        <span className="font-mono text-[10px] text-stone-300">{sync.selfHp.hp}/{sync.selfHp.maxHp} HP</span>
                      )}
                      <span className="font-mono text-[9px] text-emerald-300">{connected ? 'online' : 'offline'}</span>
                    </div>
                    {allPlayers.filter((p) => p.playerId !== sync.playerId).map((p) => (
                      <div key={p.playerId} className="flex items-center gap-2 rounded border border-white/5 bg-stone-900/40 px-2.5 py-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full font-serif text-[9px] font-bold text-white" style={{ backgroundColor: p.color }}>
                          {initialsForName(p.name)}
                        </span>
                        <span className="flex-1 truncate text-[12px] text-stone-100">{p.name}{p.role === 'gm' ? ' 👑 GM' : ''}</span>
                        {p.hp !== null && p.maxHp !== null && (
                          <span className="font-mono text-[10px] text-stone-300">{p.hp}/{p.maxHp} HP</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* GM settings */}
                {isGm && (
                  <div className="mb-3 flex flex-col gap-2 rounded border border-white/5 bg-stone-900/40 p-2.5">
                    <span className="font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">Game settings</span>
                    <label className="flex items-center justify-between text-[12px] text-stone-300">
                      <span>Max players</span>
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => setMaxPlayers((v) => Math.max(2, v - 1))} className="h-6 w-6 rounded border border-white/10 bg-stone-800">−</button>
                        <span className="w-6 text-center font-mono font-bold text-amber-200">{maxPlayers}</span>
                        <button type="button" onClick={() => setMaxPlayers((v) => Math.min(12, v + 1))} className="h-6 w-6 rounded border border-white/10 bg-stone-800">+</button>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center justify-between text-[12px] text-stone-300">
                      <span>Dice rolls visible to everyone</span>
                      <input type="checkbox" checked={publicRolls} onChange={(e) => setPublicRolls(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between text-[12px] text-stone-300">
                      <span>Players can move any token</span>
                      <input type="checkbox" checked={freeMovement} onChange={(e) => setFreeMovement(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                    </label>
                    <button
                      type="button"
                      onClick={saveSettings}
                      disabled={busy}
                      className="rounded border border-purple-500/40 bg-purple-500/10 py-1.5 font-serif text-[11px] font-bold uppercase tracking-widest text-purple-200 hover:bg-purple-500/20 disabled:opacity-50"
                    >
                      Save settings
                    </button>
                  </div>
                )}

                {/* Shared rolls */}
                {sync.rolls.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center gap-1 font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">
                      <Dices size={12} /> Shared rolls
                    </div>
                    <div className="flex flex-col gap-1">
                      {sync.rolls.slice(0, 5).map((r) => (
                        <div key={r.id} className="rounded border border-white/5 bg-stone-900/40 px-2.5 py-1.5 font-mono text-[11px] text-stone-200">
                          <span className="text-purple-300">{r.playerName}</span> — {r.formulaName}: <span className="font-bold text-amber-200">{r.total}</span>
                          <span className="text-stone-500"> ({r.rolls.join(', ')}{r.modifier ? ` ${r.modifier > 0 ? '+' : ''}${r.modifier}` : ''})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent actions */}
                {sync.actions.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1.5 font-serif text-[10.5px] font-bold uppercase tracking-wider text-stone-200">Table feed</div>
                    <div className="flex flex-col gap-1">
                      {sync.actions.slice(0, 4).map((a) => (
                        <div key={a.id} className="rounded border border-white/5 bg-stone-900/40 px-2.5 py-1.5 text-[11px] text-stone-300">
                          <span className="text-purple-300">{a.playerName}</span> {a.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={sync.leaveGame}
                  className="flex w-full items-center justify-center gap-1 rounded border border-red-500/30 bg-red-950/40 py-2 font-serif text-[11px] font-bold uppercase tracking-widest text-red-200 hover:bg-red-950/70"
                >
                  <LogOut size={12} /> Leave game
                </button>
                <p className="mt-2 text-center font-mono text-[9px] leading-relaxed text-stone-500">
                  Leaving saves your character for this game, so rejoining restores it.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
