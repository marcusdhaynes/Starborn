/**
 * Starborn Game Sync — mini-map.
 *
 * A small scaled-down view of the 2400x2400 map space where every player's
 * token moves in real time. Tokens are initials discs (never images), so the
 * map stays light. Positions glide with a short CSS transition, which makes
 * 100 ms throttled updates look smooth instead of jumpy.
 */
import React from 'react';
import type { PlayerToken } from './types';
import { MAP_MAX, MAP_MIN, initialsForName } from './types';

interface MiniMapProps {
  players: PlayerToken[];
  selfId: string;
  /** Width in px; height follows the map's square aspect. */
  size?: number;
}

export default function MiniMap({ players, selfId, size = 260 }: MiniMapProps) {
  const span = MAP_MAX - MAP_MIN;
  const toPct = (v: number) => ((v - MAP_MIN) / span) * 100;

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-purple-500/20 bg-[#0c0d1b]"
      style={{ height: size * 0.62 }}
      role="img"
      aria-label={`Table map with ${players.length} player token${players.length === 1 ? '' : 's'}`}
    >
      {/* faint grid, echoing the battlemap grid */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(167,139,250,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.25) 1px, transparent 1px)',
          backgroundSize: '12.5% 12.5%',
        }}
      />
      {players.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-[10px] uppercase tracking-widest text-stone-500">
            No one at the table yet
          </span>
        </div>
      )}
      {players.map((p) => {
        const isSelf = p.playerId === selfId;
        return (
          <div
            key={p.playerId}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{
              left: `${toPct(p.x)}%`,
              top: `${toPct(p.y)}%`,
              transition: 'left 120ms linear, top 120ms linear',
            }}
            title={`${p.name}${p.role === 'gm' ? ' (Game Master)' : ''}${p.hp !== null ? ` — ${p.hp}/${p.maxHp ?? '?'} HP` : ''}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 font-serif text-[9px] font-bold text-white shadow-[0_0_10px_rgba(0,0,0,0.6)] ${
                isSelf ? 'border-amber-300' : 'border-white/40'
              }`}
              style={{ backgroundColor: p.color }}
            >
              {initialsForName(p.name)}
            </div>
            <span className="mt-0.5 max-w-[64px] truncate rounded bg-black/60 px-1 font-mono text-[8px] text-stone-200">
              {p.name}
              {p.role === 'gm' ? ' 👑' : ''}
            </span>
            {p.hp !== null && p.maxHp !== null && p.maxHp > 0 && (
              <span className="mt-0.5 h-1 w-8 overflow-hidden rounded-full bg-white/15">
                <span
                  className="block h-full rounded-full bg-emerald-400"
                  style={{ width: `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%` }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
