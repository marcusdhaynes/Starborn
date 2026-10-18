import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Sliders, Volume2, ShieldAlert, Sparkles, 
  Database, RotateCcw, Trash2, LayoutTemplate, Palette, 
  Zap, Play, Radio, Logs, Activity, Target
} from 'lucide-react';
import { safeStorage } from '../storage';

interface SettingsWindowProps {
  onClose: () => void;
  playTick: (freq?: number, duration?: number, type?: 'sine' | 'square' | 'triangle' | 'sawtooth') => void;
}

export default function SettingsWindow({ onClose, playTick }: SettingsWindowProps) {
  // -----------------------------------------------------------------
  // 1. STATE INITIALIZATION (Syncing from safeStorage fallbacks)
  // -----------------------------------------------------------------
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>(() => {
    return (safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical';
  });

  const [accent, setAccent] = useState<string>(() => {
    return safeStorage.getItem('setting_theme_accent') || 'pink';
  });

  const [sfxVolume, setSfxVolume] = useState<number>(() => {
    const vol = safeStorage.getItem('setting_sfx_volume');
    return vol ? parseFloat(vol) * 100 : 100;
  });

  const [glowIntensity, setGlowIntensity] = useState<string>(() => {
    return safeStorage.getItem('setting_glow_intensity') || 'normal';
  });

  const [storageMode, setStorageMode] = useState<string>(() => {
    return safeStorage.getItem('setting_storage_mode') || 'persistent';
  });

  const [syncRate, setSyncRate] = useState<number>(() => {
    const rate = safeStorage.getItem('setting_sync_rate');
    return rate ? parseInt(rate, 10) : 300;
  });

  const [logBuffer, setLogBuffer] = useState<number>(() => {
    const buf = safeStorage.getItem('setting_log_buffer');
    return buf ? parseInt(buf, 10) : 25;
  });

  const [threatMode, setThreatMode] = useState<string>(() => {
    return safeStorage.getItem('setting_threat_mode') || 'heavy';
  });

  const [gridSnap, setGridSnap] = useState<string>(() => {
    return safeStorage.getItem('setting_grid_snap') || '50px';
  });

  const [diceBounciness, setDiceBounciness] = useState<number>(() => {
    const bounce = safeStorage.getItem('setting_dice_bounciness');
    return bounce ? parseFloat(bounce) * 100 : 60;
  });

  const [ambientStarDensity, setAmbientStarDensity] = useState<string>(() => {
    return safeStorage.getItem('setting_star_density') || 'medium';
  });

  const [metalClicks, setMetalClicks] = useState<boolean>(() => {
    return safeStorage.getItem('setting_metal_clicks') !== 'false';
  });

  const [confirmPurge, setConfirmPurge] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'frontend' | 'backend' | 'physics'>('frontend');

  // -----------------------------------------------------------------
  // 2. STATE SAVE UTILITIES (Triggering real-time global change sync)
  // -----------------------------------------------------------------
  const saveValue = (key: string, value: string) => {
    safeStorage.setItem(key, value);
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLayoutChange = (newLayout: 'vertical' | 'horizontal') => {
    setLayout(newLayout);
    safeStorage.setItem('setting_layout_orientation', newLayout);
    safeStorage.setItem('setting_restructure_alignment', 'false');
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
    playTick(580, 0.06, 'sine');
  };

  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    saveValue('setting_theme_accent', newAccent);
    const pitches: Record<string, number> = {
      pink: 440,
      cyan: 523,
      gold: 587,
      green: 659,
      purple: 698
    };
    playTick(pitches[newAccent] || 440, 0.1, 'triangle');
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSfxVolume(val);
    safeStorage.setItem('setting_sfx_volume', (val / 100).toString());
    // Directly invoke tick to let them hear the new volume levels in real-time
    playTick(440 + val * 2, 0.05, 'sine');
  };

  const handleGlowChange = (val: string) => {
    setGlowIntensity(val);
    saveValue('setting_glow_intensity', val);
    playTick(490, 0.06, 'sine');
  };

  const handleStorageModeChange = (mode: string) => {
    setStorageMode(mode);
    saveValue('setting_storage_mode', mode);
    playTick(350, 0.08, 'triangle');
  };

  const handleSyncRateChange = (rate: number) => {
    setSyncRate(rate);
    saveValue('setting_sync_rate', rate.toString());
    playTick(320 + rate, 0.06, 'sine');
  };

  const handleLogBufferChange = (buf: number) => {
    setLogBuffer(buf);
    saveValue('setting_log_buffer', buf.toString());
    playTick(410, 0.06, 'sine');
  };

  const handleThreatModeChange = (val: string) => {
    setThreatMode(val);
    saveValue('setting_threat_mode', val);
    playTick(180, 0.15, 'sawtooth');
  };

  const handleGridSnapChange = (snap: string) => {
    setGridSnap(snap);
    saveValue('setting_grid_snap', snap);
    playTick(620, 0.05, 'sine');
  };

  const handleDiceBouncinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setDiceBounciness(val);
    safeStorage.setItem('setting_dice_bounciness', (val / 100).toString());
    playTick(120 + val * 4, 0.09, 'triangle');
  };

  const handleStarDensityChange = (density: string) => {
    setAmbientStarDensity(density);
    saveValue('setting_star_density', density);
    playTick(740, 0.06, 'sine');
  };

  const handleMetalClicksToggle = () => {
    const val = !metalClicks;
    setMetalClicks(val);
    saveValue('setting_metal_clicks', val.toString());
    playTick(val ? 880 : 330, 0.07, 'triangle');
  };

  const handlePurgeAllData = () => {
    if (!confirmPurge) {
      setConfirmPurge(true);
      playTick(150, 0.25, 'sawtooth');
      return;
    }
    
    // Wipe VTT values entirely
    safeStorage.removeItem('setting_layout_orientation');
    safeStorage.removeItem('setting_theme_accent');
    safeStorage.removeItem('setting_sfx_volume');
    safeStorage.removeItem('setting_glow_intensity');
    safeStorage.removeItem('setting_storage_mode');
    safeStorage.removeItem('setting_sync_rate');
    safeStorage.removeItem('setting_log_buffer');
    safeStorage.removeItem('setting_threat_mode');
    safeStorage.removeItem('setting_grid_snap');
    safeStorage.removeItem('setting_dice_bounciness');
    safeStorage.removeItem('setting_star_density');
    safeStorage.removeItem('setting_metal_clicks');
    
    // Also reset key app states
    safeStorage.removeItem('vtt_avatar_x');
    safeStorage.removeItem('vtt_avatar_y');
    safeStorage.removeItem('tabletop_is_thrown');
    safeStorage.removeItem('tabletop_app_opacity');
    
    playTick(400, 0.4, 'sawtooth');
    
    // Trigger reset layout reload
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <motion.div
      initial={{ x: '-50%', y: '-45%', scale: 0.95, opacity: 0 }}
      animate={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
      exit={{ x: '-50%', y: '-45%', scale: 0.95, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 23 }}
      className="absolute top-1/2 left-1/2 w-80 h-[560px] max-h-[85vh] bg-stone-950/95 border border-amber-500/30 rounded-xl p-4 flex flex-col z-[4150] shadow-[0_10px_35px_rgba(0,0,0,0.85)] pointer-events-auto overflow-hidden text-stone-200 select-text"
      id="cosmic-settings-panel"
    >
      {/* Top Gloss Highlight Line - Aesthetic Portal Detail */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

      {/* 1. Header Row */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3.5">
        <div className="flex items-center gap-2">
          <Settings size={13} className="text-amber-500 animate-[spin_12s_linear_infinite]" />
          <span className="font-serif text-xs font-extrabold uppercase tracking-widest text-amber-200">
            VTT Cosmic Config
          </span>
        </div>
        <button 
          onClick={() => {
            playTick(380, 0.05, 'sine');
            onClose();
          }}
          className="text-stone-400 hover:text-white transition-colors text-[9px] font-mono uppercase bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded cursor-pointer border border-white/5"
        >
          Close
        </button>
      </div>

      {/* 2. Ingenious Tab Controller */}
      <div className="grid grid-cols-3 gap-1 mb-4 bg-stone-900/50 p-1 rounded-lg border border-white/5 text-[9.5px]">
        <button
          onClick={() => { playTick(500, 0.03); setCurrentTab('frontend'); }}
          className={`py-1 rounded font-serif font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            currentTab === 'frontend' 
              ? 'bg-amber-600/25 text-amber-300 border border-amber-500/20 shadow-inner' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850 border border-transparent'
          }`}
        >
          Visuals
        </button>
        <button
          onClick={() => { playTick(500, 0.03); setCurrentTab('backend'); }}
          className={`py-1 rounded font-serif font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            currentTab === 'backend' 
              ? 'bg-purple-600/25 text-purple-350 border border-purple-500/20 shadow-inner' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850 border border-transparent'
          }`}
        >
          Backend
        </button>
        <button
          onClick={() => { playTick(500, 0.03); setCurrentTab('physics'); }}
          className={`py-1 rounded font-serif font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            currentTab === 'physics' 
              ? 'bg-cyan-600/25 text-cyan-350 border border-cyan-500/20 shadow-inner' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850 border border-transparent'
          }`}
        >
          Gameplay
        </button>
      </div>

      {/* 3. Central Category View Container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
        
        {/* =====================================
            TAB 1: FRONTEND VISUALS & LOOK/FEEL
            ===================================== */}
        {currentTab === 'frontend' && (
          <div className="flex flex-col gap-3.5 animate-fadeIn">
            
            {/* Setting: Ribbon + Life Alignment orientation */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <LayoutTemplate size={12} className="text-amber-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Dashboard Orientation
                </span>
              </div>
              <p className="text-[7.5px] text-stone-500 leading-normal mb-1">
                Switches the top ribbon tracker and health badges between stacked vertical and inline horizontal layouts.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                <button
                  onClick={() => handleLayoutChange('vertical')}
                  className={`py-1.5 rounded font-mono uppercase tracking-widest border transition-all cursor-pointer ${
                    layout === 'vertical'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                      : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Vertical Stack
                </button>
                <button
                  onClick={() => handleLayoutChange('horizontal')}
                  className={`py-1.5 rounded font-mono uppercase tracking-widest border transition-all cursor-pointer ${
                    layout === 'horizontal'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                      : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Horizontal Row
                </button>
              </div>
            </div>

            {/* Setting: Theme Accent Selection */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <Palette size={12} className="text-amber-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Cosmic Portal Accent
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 pt-1">
                {[
                  { key: 'pink', color: 'bg-pink-500', label: 'Nebula' },
                  { key: 'cyan', color: 'bg-cyan-500', label: 'Celestial' },
                  { key: 'gold', color: 'bg-amber-500', label: 'Stellar' },
                  { key: 'green', color: 'bg-emerald-500', label: 'Verdant' },
                  { key: 'purple', color: 'bg-violet-500', label: 'Abyssal' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleAccentChange(item.key)}
                    className={`h-7 rounded flex items-center justify-center relative justify-self-stretch cursor-pointer border-2 transition-transform hover:scale-110 active:scale-95 ${
                      accent === item.key ? 'border-white scale-105' : 'border-transparent'
                    }`}
                    title={item.label}
                  >
                    <span className={`w-4 h-4 rounded-full ${item.color} shadow-md`} />
                    {accent === item.key && (
                      <span className="absolute bottom-0.5 w-1 h-1 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-[7.5px] font-mono text-stone-400 uppercase tracking-widest text-center mt-0.5">
                Active Accent: {accent.toUpperCase()}
              </span>
            </div>

            {/* Setting: Audio Volume */}
            <div className="flex flex-col gap-1.5 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Volume2 size={12} className="text-amber-400" />
                  <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                    Chime Feedback Vol
                  </span>
                </div>
                <span className="text-[9px] font-mono text-amber-400 font-bold">{sfxVolume}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sfxVolume} 
                onChange={handleSfxChange}
                className="w-full accent-amber-500 h-1 bg-stone-950 rounded cursor-pointer"
              />
            </div>

            {/* Setting: Neon Glow Intensity */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Atmospheric Bloom Level
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono uppercase tracking-widest">
                {['subtle', 'normal', 'extreme'].map((level) => (
                  <button
                    key={level}
                    onClick={() => handleGlowChange(level)}
                    className={`py-1 rounded border transition-all cursor-pointer ${
                      glowIntensity === level
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-stone-950/30 border-stone-850 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =====================================
            TAB 2: BACKEND OPTIONS & MEMORY
            ===================================== */}
        {currentTab === 'backend' && (
          <div className="flex flex-col gap-3.5 animate-fadeIn">
            
            {/* Setting: Storage Mode */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <Database size={12} className="text-purple-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Data Persistence Layer
                </span>
              </div>
              <p className="text-[7.5px] text-stone-500 leading-normal">
                Determine if configuration updates are saved to high-performance local storage or temporary run-time engine context.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[8.5px] font-mono uppercase tracking-widest">
                <button
                  onClick={() => handleStorageModeChange('persistent')}
                  className={`py-1 rounded border transition-all cursor-pointer ${
                    storageMode === 'persistent'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                      : 'bg-stone-950/40 border-stone-850 text-stone-500'
                  }`}
                >
                  LocalStorage
                </button>
                <button
                  onClick={() => handleStorageModeChange('session')}
                  className={`py-1 rounded border transition-all cursor-pointer ${
                    storageMode === 'session'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                      : 'bg-stone-950/40 border-stone-850 text-stone-500'
                  }`}
                >
                  RAM Cache
                </button>
              </div>
            </div>

            {/* Setting: Remote Sync Latency */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Radio size={12} className="text-purple-400" />
                  <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                    VTT Broadcast Sync
                  </span>
                </div>
                <span className="text-[9px] font-mono text-purple-400 font-bold">{syncRate} ms</span>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1 text-[8.5px] font-mono">
                {[100, 300, 500, 1000].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSyncRateChange(rate)}
                    className={`py-1 rounded border transition-all cursor-pointer ${
                      syncRate === rate
                        ? 'bg-purple-500/10 border-purple-500 text-purple-300'
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    {rate}ms
                  </button>
                ))}
              </div>
            </div>

            {/* Setting: Log Buffer Records */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Logs size={12} className="text-purple-400" />
                  <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                    Action Buffer Limit
                  </span>
                </div>
                <span className="text-[9px] font-mono text-purple-400 font-bold">{logBuffer} rolls</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 text-[8.5px] font-mono">
                {[15, 25, 50].map((buf) => (
                  <button
                    key={buf}
                    onClick={() => handleLogBufferChange(buf)}
                    className={`py-1 rounded border transition-all cursor-pointer ${
                      logBuffer === buf
                        ? 'bg-purple-500/10 border-purple-500 text-purple-300'
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    {buf} Records
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Layout Config / Disaster Recovery */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-red-500/10">
              <div className="flex items-center gap-1.5">
                <Trash2 size={12} className="text-red-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-red-300">
                  Extreme Memory Purge
                </span>
              </div>
              <p className="text-[7.5px] text-stone-500 leading-normal">
                Clears entire portal storage, resetting maps, orientations, custom limits, stats and positions to original code baselines.
              </p>
              <button
                onClick={handlePurgeAllData}
                className={`w-full py-1.5 rounded text-[8.5px] font-serif font-extrabold uppercase tracking-widest border transition-all cursor-pointer ${
                  confirmPurge 
                    ? 'bg-red-700 hover:bg-red-800 text-white border-red-500 animate-pulse' 
                    : 'bg-red-950/35 hover:bg-red-900/45 text-red-400 border-red-900/50'
                }`}
              >
                {confirmPurge ? 'HOLD TO CONFIRM PURGE!' : 'Purge All Database & Reset'}
              </button>
              {confirmPurge && (
                <button 
                  onClick={() => { playTick(500, 0.05); setConfirmPurge(false); }}
                  className="w-full text-center text-[7.5px] font-mono uppercase text-stone-400 hover:text-white mt-1 cursor-pointer"
                >
                  Cancel Purge Action
                </button>
              )}
            </div>

          </div>
        )}

        {/* =====================================
            TAB 3: GAMEPLAY PHYSICS & GRID SNAPPING
            ===================================== */}
        {currentTab === 'physics' && (
          <div className="flex flex-col gap-3.5 animate-fadeIn">
            
            {/* Setting: Walking grid snap limits */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-cyan-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Token Snap Precision
                </span>
              </div>
              <p className="text-[7.5px] text-stone-500 leading-normal">
                Configures movement snapping sizes for character assets when navigated via keyboard D-pads.
              </p>
              <div className="grid grid-cols-3 gap-1 pt-1 text-[8.5px] font-mono">
                {['none', '25px', '50px'].map((snap) => (
                  <button
                    key={snap}
                    onClick={() => handleGridSnapChange(snap)}
                    className={`py-1 rounded border transition-all cursor-pointer uppercase font-semibold ${
                      gridSnap === snap
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    {snap === 'none' ? 'Fluid' : snap}
                  </button>
                ))}
              </div>
            </div>

            {/* Setting: Dice Gravity / elasticity bouncy factor */}
            <div className="flex flex-col gap-1.5 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-cyan-400" />
                  <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                    Dice Gravity & Friction
                  </span>
                </div>
                <span className="text-[9px] font-mono text-cyan-400 font-bold">{diceBounciness}%</span>
              </div>
              <p className="text-[7.5px] text-stone-500 leading-normal mb-1">
                Customize velocity spreads and decay, from dense lead/iron resin to highly bouncy celestial plastic.
              </p>
              <input 
                type="range" 
                min="10" 
                max="90" 
                value={diceBounciness} 
                onChange={handleDiceBouncinessChange}
                className="w-full accent-cyan-500 h-1 bg-stone-950 rounded cursor-pointer"
              />
            </div>

            {/* Setting: Threat Vignette Mode */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-cyan-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Threat Vignette Mode
                </span>
              </div>
              <p className="text-[7.5px] text-stone-500 leading-normal">
                How aggressively the screen glows and pulses red when critical threat levels (6+ skulls) are active.
              </p>
              <div className="grid grid-cols-3 gap-1 text-[8px] font-mono uppercase tracking-widest">
                {['subtle', 'heavy', 'pulse'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleThreatModeChange(mode)}
                    className={`py-1 rounded border transition-all cursor-pointer ${
                      threatMode === mode
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Setting: Background Star Density */}
            <div className="flex flex-col gap-2 bg-stone-900/40 p-2.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                <span className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-stone-200">
                  Nebula Starfield Density
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono uppercase tracking-widest">
                {['low', 'medium', 'high'].map((density) => (
                  <button
                    key={density}
                    onClick={() => handleStarDensityChange(density)}
                    className={`py-1 rounded border transition-all cursor-pointer ${
                      ambientStarDensity === density
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </div>

            {/* Setting: Metal sound clicks toggle */}
            <div className="flex items-center justify-between bg-stone-900/40 p-2.5 rounded border border-white/5 text-[10.5px] font-serif">
              <span className="font-bold uppercase tracking-wider text-stone-200">Metal Dice Audio Clicks</span>
              <button
                onClick={handleMetalClicksToggle}
                className={`px-3 py-1 rounded text-[8px] font-mono uppercase tracking-widest border transition-all cursor-pointer ${
                  metalClicks
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                    : 'bg-stone-950/30 border-stone-850 text-stone-500'
                }`}
              >
                {metalClicks ? 'Enabled' : 'Disabled'}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 4. Mini Tablet Action logs footer attachment - mirroring VTT sections */}
      <div className="mt-4 border-t border-white/5 pt-3.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[7.5px] font-mono uppercase tracking-widest text-stone-500">
          <span>Real-time Status</span>
          <span className="text-amber-500 animate-pulse">● Connected</span>
        </div>
        <div className="bg-stone-900/55 rounded p-2 border border-white/5 flex flex-col gap-0.5 text-[7px] font-mono leading-relaxed text-stone-400">
          <div>Engine: AstroGothic RPG v3.2.14</div>
          <div>Storage Sync: {storageMode === 'persistent' ? 'LOCALSTORAGE' : 'VOLATILE RAM'}</div>
          <div>Dashboard Align: {layout.toUpperCase()} MODE</div>
        </div>
      </div>

    </motion.div>
  );
}
