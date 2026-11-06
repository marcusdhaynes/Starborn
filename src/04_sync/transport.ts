/**
 * Starborn Game Sync — transport.
 *
 * Two transports, one message shape (see types.ts):
 *
 * 1. SupabaseBroadcastTransport — Supabase Realtime Broadcast on channel
 *    `starborn-game-<code>`. Ephemeral: messages are not stored, which is
 *    exactly right for positions/rolls. No tables, no RLS, no Data API
 *    exposure needed for the live channel itself. Presence uses Realtime
 *    presence (track/state). Reconnects with backoff and re-subscribes.
 *
 * 2. LocalBroadcastTransport — BroadcastChannel between tabs/windows on the
 *    same device. Works with zero configuration and zero network, so the
 *    feature is testable and demonstrable before Supabase is wired up.
 *    It is clearly labelled "local only" in the UI — it cannot sync two
 *    different devices, and it never pretends otherwise.
 *
 * Both transports are tiny-message only. The hook (useGameSync) owns the
 * offline queue: while disconnected, moves collapse to the latest one and
 * other messages are kept (capped); everything is flushed on reconnect,
 * followed by a snapshot-request so the client resyncs.
 */

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { SyncMessage } from './types';
import { getSupabaseClient } from './supabase';

export type TransportKind = 'supabase' | 'local';
export type TransportStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed';

export interface SyncTransport {
  kind: TransportKind;
  status: TransportStatus;
  connect(): Promise<void>;
  send(msg: SyncMessage): void;
  onMessage(cb: (msg: SyncMessage) => void): () => void;
  onStatus(cb: (status: TransportStatus) => void): () => void;
  /** Presence: mark this player present with a small payload. */
  trackPresence(player: { playerId: string; name: string; role: string }): void;
  /** Current presence map (playerId -> payload). Supabase only; local returns {}. */
  presenceState(): Record<string, unknown>;
  disconnect(): void;
}

function channelName(code: string): string {
  return `starborn-game-${code.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Supabase Realtime Broadcast
// ---------------------------------------------------------------------------

export class SupabaseBroadcastTransport implements SyncTransport {
  readonly kind: TransportKind = 'supabase';
  status: TransportStatus = 'connecting';
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private code: string;
  private messageCbs = new Set<(msg: SyncMessage) => void>();
  private statusCbs = new Set<(s: TransportStatus) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private closed = false;

  constructor(code: string) {
    this.code = code;
  }

  private setStatus(s: TransportStatus) {
    this.status = s;
    this.statusCbs.forEach((cb) => cb(s));
  }

  async connect(): Promise<void> {
    this.closed = false;
    this.setStatus('connecting');
    this.client = await getSupabaseClient();
    if (!this.client) throw new Error('Supabase is not configured.');
    const channel = this.client.channel(channelName(this.code), {
      config: { broadcast: { self: false }, presence: { key: '' } },
    });
    channel.on('broadcast', { event: 'msg' }, (payload) => {
      const msg = (payload as { payload?: SyncMessage }).payload;
      if (msg && typeof msg === 'object' && 't' in msg) {
        this.messageCbs.forEach((cb) => cb(msg as SyncMessage));
      }
    });
    this.channel = channel;
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
          resolve();
        } else if (status === 'CLOSED') {
          this.setStatus('closed');
          resolve();
        }
      });
      // Never hang connect() forever if subscribe never calls back.
      setTimeout(resolve, 8000);
    });
  }

  private scheduleReconnect() {
    if (this.closed) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.closed) return;
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  send(msg: SyncMessage): void {
    if (!this.channel || this.status !== 'connected') return;
    void this.channel.send({ type: 'broadcast', event: 'msg', payload: msg });
  }

  onMessage(cb: (msg: SyncMessage) => void): () => void {
    this.messageCbs.add(cb);
    return () => this.messageCbs.delete(cb);
  }

  onStatus(cb: (status: TransportStatus) => void): () => void {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  trackPresence(player: { playerId: string; name: string; role: string }): void {
    if (!this.channel || this.status !== 'connected') return;
    void this.channel.track({ ...player, at: Date.now() });
  }

  presenceState(): Record<string, unknown> {
    try {
      return (this.channel?.presenceState() as Record<string, unknown>) || {};
    } catch {
      return {};
    }
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.channel && this.client) {
      void this.client.removeChannel(this.channel);
    }
    this.channel = null;
    this.setStatus('closed');
  }
}

// ---------------------------------------------------------------------------
// Local BroadcastChannel (same device, zero config)
// ---------------------------------------------------------------------------

export class LocalBroadcastTransport implements SyncTransport {
  readonly kind: TransportKind = 'local';
  status: TransportStatus = 'connecting';
  private channel: BroadcastChannel | null = null;
  private code: string;
  private clientId: string;
  private messageCbs = new Set<(msg: SyncMessage) => void>();
  private statusCbs = new Set<(s: TransportStatus) => void>();

  constructor(code: string, clientId: string) {
    this.code = code;
    this.clientId = clientId;
  }

  private setStatus(s: TransportStatus) {
    this.status = s;
    this.statusCbs.forEach((cb) => cb(s));
  }

  async connect(): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') {
      throw new Error('BroadcastChannel is not available in this browser.');
    }
    this.channel = new BroadcastChannel(channelName(this.code));
    this.channel.onmessage = (ev: MessageEvent) => {
      const data = ev.data as { sender?: string; msg?: SyncMessage } | null;
      if (!data || data.sender === this.clientId) return;
      if (data.msg && typeof data.msg === 'object' && 't' in data.msg) {
        this.messageCbs.forEach((cb) => cb(data.msg as SyncMessage));
      }
    };
    this.setStatus('connected');
  }

  send(msg: SyncMessage): void {
    if (!this.channel || this.status !== 'connected') return;
    try {
      this.channel.postMessage({ sender: this.clientId, msg });
    } catch {
      // Oversized or unclonable payload — drop it rather than crash the game.
    }
  }

  onMessage(cb: (msg: SyncMessage) => void): () => void {
    this.messageCbs.add(cb);
    return () => this.messageCbs.delete(cb);
  }

  onStatus(cb: (status: TransportStatus) => void): () => void {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  trackPresence(_player: { playerId: string; name: string; role: string }): void {
    // Presence in local mode is derived from hello/heartbeat messages by the hook.
  }

  presenceState(): Record<string, unknown> {
    return {};
  }

  disconnect(): void {
    try {
      this.channel?.close();
    } catch {
      /* ignore */
    }
    this.channel = null;
    this.setStatus('closed');
  }
}

/** Pick the best available transport for a game code. */
export async function createTransport(
  code: string,
  clientId: string,
): Promise<SyncTransport> {
  const client = await getSupabaseClient().catch(() => null);
  if (client) return new SupabaseBroadcastTransport(code);
  return new LocalBroadcastTransport(code, clientId);
}

/**
 * Coalescing move throttle. Calls `send` at most once per `interval`, and
 * always sends the LATEST position (plus a trailing send if moves kept
 * arriving). Pure and unit-testable without React.
 */
export function createMoveThrottler(
  send: (x: number, y: number) => void,
  intervalMs: number,
) {
  let lastSentAt = 0;
  let pending: { x: number; y: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (!pending) return;
    const { x, y } = pending;
    pending = null;
    lastSentAt = Date.now();
    send(x, y);
  };

  return {
    push(x: number, y: number) {
      pending = { x, y };
      const now = Date.now();
      const since = now - lastSentAt;
      if (since >= intervalMs) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        flush();
      } else if (!timer) {
        timer = setTimeout(flush, intervalMs - since);
      }
    },
    flush,
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
