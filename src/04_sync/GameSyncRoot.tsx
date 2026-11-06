/**
 * Starborn Game Sync — mount point.
 *
 * Rendered once in App.tsx. The panel owns the sync hook, so the session
 * (and its window-event listeners) live for the whole app lifetime, whether
 * the panel is open or just showing its floating button.
 */
import React from 'react';
import GameSyncPanel from './GameSyncPanel';

export default function GameSyncRoot() {
  return <GameSyncPanel />;
}
