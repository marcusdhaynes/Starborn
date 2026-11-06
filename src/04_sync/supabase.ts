/**
 * Starborn Game Sync — Supabase client, loaded lazily.
 *
 * The Supabase JS client is deliberately NOT imported at the top of any
 * module that the main bundle loads. It is pulled in with a dynamic import()
 * the first time a game is hosted or joined, so the initial page load does
 * not pay for it (the app's main chunk is already ~1.4 MB).
 *
 * Env (Vite — set these in the GitHub Pages deploy environment or .env.local):
 *   VITE_SUPABASE_URL        e.g. https://tbrqqjrzknhdnwcpkqro.supabase.co
 *   VITE_SUPABASE_ANON_KEY   the project's *publishable / anon* key — never
 *                              a service-role key, never in the repo.
 *
 * When either is missing, sync still works in local/demo mode
 * (BroadcastChannel between tabs on the same device) and the UI says so.
 * Nothing silently falls back to Firebase — Firebase is legacy.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function supabaseEnv(): { url: string; anonKey: string } {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return {
    url: (env.VITE_SUPABASE_URL || '').trim(),
    anonKey: (env.VITE_SUPABASE_ANON_KEY || '').trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = supabaseEnv();
  return Boolean(url && anonKey && /^https:\/\//.test(url));
}

/**
 * Lazily create (and cache) the Supabase client. Returns null when the app
 * is not configured for Supabase — callers must handle local mode.
 */
export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = (async (): Promise<SupabaseClient | null> => {
      if (!isSupabaseConfigured()) return null;
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { url, anonKey } = supabaseEnv();
        return createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          realtime: { params: { eventsPerSecond: 10 } },
        });
      } catch (e) {
        console.warn('[GameSync] Supabase client could not be loaded, using local mode.', e);
        return null;
      }
    })();
  }
  return clientPromise;
}
