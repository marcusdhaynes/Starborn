import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Volume2, VolumeX, ShieldAlert, Sparkles, LogIn, LogOut,
  Database, RotateCcw, Trash2, LayoutTemplate, Palette, 
  Zap, Play, Radio, Logs, Activity, Target, Save, AlertTriangle
} from 'lucide-react';
import { safeStorage } from '../storage';

// Import our subcomponents
import VisualsSettings from './02_visuals';
import GameplaySettings from './03_gameplay';
import BackendSettings from './04_backend';
import { useTranslation, arDict } from './language';

// Import Firebase Client and Auth helpers
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

interface SettingsWindowProps {
  onClose: () => void;
  playTick: (freq?: number, duration?: number, type?: 'sine' | 'square' | 'triangle' | 'sawtooth') => void;
  initialTab?: 'frontend' | 'backend' | 'physics';
  autostartEditCharId?: string;
}

export default function SettingsWindow({ onClose, playTick, initialTab, autostartEditCharId }: SettingsWindowProps) {
  const { lang, t, setLang } = useTranslation();
  // -----------------------------------------------------------------
  // 1. ORIGINAL PORTED STATES & REAL-TIME EVENT UPDATES
  // -----------------------------------------------------------------
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>(() => {
    return (safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical';
  });

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (safeStorage.getItem('setting_theme_mode') as 'dark' | 'light') || 'dark';
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
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    return safeStorage.getItem('setting_sfx_enabled') !== 'false';
  });
  const [currentTab, setCurrentTab] = useState<'frontend' | 'backend' | 'physics'>(() => {
    return initialTab || 'frontend';
  });

  // -----------------------------------------------------------------
  // NEW STATES: AUTH, SAVE DRAFT MATRIX & CONFIRM UNSAVED MODAL
  // -----------------------------------------------------------------
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  
  // Backend Draft state handlers
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState<boolean>(false);
  const [saveDraftFn, setSaveDraftFn] = useState<(() => Promise<void>) | null>(null);

  // Unsaved dialog prompt state
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);

  // Sync state values on tabletop storage updating
  useEffect(() => {
    const handleSync = () => {
      setLayout((safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical');
      setThemeMode((safeStorage.getItem('setting_theme_mode') as 'dark' | 'light') || 'dark');
      setAccent(safeStorage.getItem('setting_theme_accent') || 'pink');
      const vol = safeStorage.getItem('setting_sfx_volume');
      setSfxVolume(vol ? parseFloat(vol) * 100 : 100);
      setGlowIntensity(safeStorage.getItem('setting_glow_intensity') || 'normal');
      setStorageMode(safeStorage.getItem('setting_storage_mode') || 'persistent');
      
      const rate = safeStorage.getItem('setting_sync_rate');
      setSyncRate(rate ? parseInt(rate, 10) : 300);
      
      const buf = safeStorage.getItem('setting_log_buffer');
      setLogBuffer(buf ? parseInt(buf, 10) : 25);
      
      setThreatMode(safeStorage.getItem('setting_threat_mode') || 'heavy');
      setGridSnap(safeStorage.getItem('setting_grid_snap') || '50px');
      
      const bounce = safeStorage.getItem('setting_dice_bounciness');
      setDiceBounciness(bounce ? parseFloat(bounce) * 100 : 60);
      setAmbientStarDensity(safeStorage.getItem('setting_star_density') || 'medium');
      setMetalClicks(safeStorage.getItem('setting_metal_clicks') !== 'false');
      setSfxEnabled(safeStorage.getItem('setting_sfx_enabled') !== 'false');
    };

    window.addEventListener('tabletop-state-update', handleSync);
    return () => window.removeEventListener('tabletop-state-update', handleSync);
  }, []);

  // -----------------------------------------------------------------
  // GOOGLE LOGIN HANDLER (Auth integration via Firebase SDK)
  // -----------------------------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrUser(user);
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    playTick(580, 0.06, 'sine');
    try {
      const provider = new GoogleAuthProvider();
      // Google Login configured to utilize popups directly inside our canvas context
      await signInWithPopup(auth, provider);
      playTick(880, 0.1, 'sine');
    } catch (err) {
      console.error("Google authentication error:", err);
      playTick(180, 0.25, 'sawtooth');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    playTick(420, 0.08, 'sine');
    try {
      await signOut(auth);
      setHasUnsavedDraft(false); // Clear dirty draft trackers on logout
      playTick(300, 0.15, 'triangle');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    safeStorage.setItem('setting_theme_accent', newAccent);
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
    
    const pitches: Record<string, number> = {
      pink: 440,
      cyan: 523,
      gold: 587,
      green: 659,
      purple: 698
    };
    playTick(pitches[newAccent] || 440, 0.1, 'triangle');
  };

  const toggleSfx = () => {
    const nextVal = !sfxEnabled;
    setSfxEnabled(nextVal);
    safeStorage.setItem('setting_sfx_enabled', nextVal ? 'true' : 'false');
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
    if (nextVal) {
      playTick(520, 0.08, 'sine');
    }
  };

  const activeAccentColMap: Record<string, { background: string; glow: string; text: string }> = {
    pink: { background: "rgba(244, 63, 94, 0.95)", glow: "rgba(244, 63, 94, 0.35)", text: "text-pink-400" },
    cyan: { background: "rgba(6, 182, 212, 0.95)", glow: "rgba(6, 182, 212, 0.35)", text: "text-cyan-400" },
    gold: { background: "rgba(245, 158, 11, 0.95)", glow: "rgba(245, 158, 11, 0.35)", text: "text-amber-400" },
    green: { background: "rgba(16, 185, 129, 0.95)", glow: "rgba(16, 185, 129, 0.35)", text: "text-emerald-400" },
    purple: { background: "rgba(168, 85, 247, 0.95)", glow: "rgba(168, 85, 247, 0.35)", text: "text-purple-400" }
  };
  const activeAccent = activeAccentColMap[accent] || activeAccentColMap.pink;

  // Track backend table differences
  const handleDraftChange = (hasChanges: boolean, saveFn: () => Promise<void>) => {
    setHasUnsavedDraft(hasChanges);
    setSaveDraftFn(() => saveFn);
  };

  // Close validations - check unsaved modifications first
  const handleAttemptClose = () => {
    if (hasUnsavedDraft) {
      playTick(150, 0.15, 'sawtooth');
      setShowExitConfirmModal(true);
    } else {
      playTick(380, 0.05, 'sine');
      onClose();
    }
  };

  const executeSaveFromFooter = async () => {
    if (saveDraftFn) {
      await saveDraftFn();
    }
  };

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (showExitConfirmModal) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleAttemptClose();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [showExitConfirmModal, hasUnsavedDraft, saveDraftFn]);

  return (
    <>
      <motion.div
        ref={panelRef}
        initial={{ x: '-50%', y: '-45%', scale: 0.95, opacity: 0 }}
        animate={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
        exit={{ x: '-50%', y: '-45%', scale: 0.95, opacity: 0 }}
        transition={{ type: 'tween', duration: 0.14, ease: 'easeOut' }}
        className={`absolute top-1/2 left-1/2 w-80 h-[560px] max-h-[85vh] rounded-xl flex flex-col z-[4150] shadow-2xl pointer-events-auto overflow-hidden select-text border transition-colors duration-200 ${
          themeMode === 'light'
            ? 'bg-[#fcfbfa]/98 border-stone-200 text-stone-800'
            : 'bg-stone-950/95 border-amber-500/30 text-stone-200'
        }`}
        id="cosmic-settings-panel"
      >
        {/* Top Gloss Highlight Line - Aesthetic Portal Detail */}
        <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 z-20 pointer-events-none`} />

        {/* 1. Header Row - Now moved above the Major Tabs and matches height exactly */}
        <div className={`h-9 flex items-center justify-between px-4 border-b shrink-0 ${
          themeMode === 'light' ? 'border-stone-200 text-stone-800' : 'border-white/10 text-stone-200'
        }`}>
          <div className="flex items-center gap-2">
            <Settings size={13} className="text-amber-500 animate-[spin_12s_linear_infinite]" />
            <span className={`font-serif text-xs font-extrabold uppercase tracking-widest ${
              themeMode === 'light' ? 'text-stone-700' : 'text-amber-200'
            }`}>
              {t("SETTINGS")}
            </span>
          </div>

          {/* Top-Center Language Toggle */}
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 z-[4200] flex items-center bg-stone-900/90 border border-white/10 rounded-full h-[22px] px-0.5 font-mono text-[7px] uppercase select-none shadow-md">
            <button
              onClick={() => {
                setLang('en');
                playTick(600, 0.05);
              }}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${lang === 'en' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => {
                setLang('ar');
                playTick(720, 0.05);
              }}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${lang === 'ar' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'}`}
            >
              AR
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Toggle Circle Button */}
            <button
              onClick={toggleSfx}
              className={`flex items-center justify-center rounded-full cursor-pointer transition-all w-6 h-6 border ${
                sfxEnabled
                  ? themeMode === 'light'
                    ? 'border-amber-500/30 text-amber-600 bg-amber-500/5 hover:bg-amber-500/10'
                    : 'border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  : themeMode === 'light'
                    ? 'border-stone-200 text-stone-400 bg-stone-100 hover:text-stone-600 hover:bg-stone-200'
                    : 'border-white/5 text-stone-500 bg-white/5 hover:text-stone-400 hover:bg-white/10'
              }`}
              title={sfxEnabled ? t("Mute Sound") : t("Unmute Sound")}
            >
              {sfxEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
            </button>

            {/* GOOGLE SIGN IN BUTTON */}
            {isAuthLoading ? (
              <div className="w-3 h-3 border border-stone-600 border-t-amber-500 rounded-full animate-spin" />
            ) : currUser ? (
              <button
                onClick={handleLogout}
                className="group flex items-center justify-center rounded-full cursor-pointer border border-purple-500/25 transition-all w-6 h-6 overflow-hidden bg-purple-950/40 hover:bg-purple-900/60"
                title={`Signed in as ${currUser.displayName || currUser.email}. Click to Logout`}
              >
                {currUser.photoURL ? (
                  <img src={currUser.photoURL} alt="User Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <LogOut size={10} className="text-purple-300" />
                )}
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center gap-1 text-[8px] font-mono uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2 py-1 rounded cursor-pointer border border-amber-500/35 transition-all"
                title="Google Login (Firestore Sync Support)"
              >
                <LogIn size={9} />
                <span>{t("Google Login")}</span>
              </button>
            )}

            <button 
              onClick={handleAttemptClose}
              className={`transition-colors text-[9px] font-mono uppercase px-2.5 py-1 rounded cursor-pointer border ${
                themeMode === 'light'
                  ? 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border-stone-200'
                  : 'text-stone-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/5'
              }`}
            >
              {t("Close")}
            </button>
          </div>
        </div>

        {/* 2. Ingenious Tab Controller - Positioned underneath the Header Row with matching h-9 height */}
        <div className={`flex flex-nowrap text-[9.5px] select-none shrink-0 border-b z-10 h-9 ${
          themeMode === 'light' ? 'border-b-stone-200 bg-stone-100/50' : 'border-b-white/10 bg-stone-950/40'
        }`} id="cosmic-major-tabs">
          <button
            onClick={() => { playTick(500, 0.03); setCurrentTab('frontend'); }}
            className={`h-9 font-serif font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border-r flex-1 flex items-center justify-center text-center ${
              themeMode === 'light' ? 'border-r-stone-200/60' : 'border-r-white/10'
            } ${
              currentTab === 'frontend' 
                ? themeMode === 'light'
                  ? 'bg-[#fcfbfa]/98 text-amber-700 font-extrabold border-b-2 border-b-amber-500'
                  : 'bg-stone-950/95 text-amber-300 font-extrabold border-b-2 border-b-amber-500/90 shadow-inner' 
                : themeMode === 'light'
                ? 'bg-stone-100/60 text-stone-400 hover:text-stone-600 border-b-2 border-b-transparent'
                : 'bg-stone-950/30 text-stone-500 hover:text-stone-300 border-b-2 border-b-transparent'
            }`}
          >
            {t("Visuals")}
          </button>
          <button
            onClick={() => { playTick(500, 0.03); setCurrentTab('backend'); }}
            className={`h-9 font-serif font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border-r flex-1 flex items-center justify-center text-center ${
              themeMode === 'light' ? 'border-r-stone-200/60' : 'border-r-white/10'
            } ${
              currentTab === 'backend' 
                ? themeMode === 'light'
                  ? 'bg-[#fcfbfa]/98 text-purple-700 font-extrabold border-b-2 border-b-purple-500'
                  : 'bg-stone-950/95 text-purple-300 font-extrabold border-b-2 border-b-purple-500/90 shadow-inner' 
                : themeMode === 'light'
                ? 'bg-stone-100/60 text-stone-400 hover:text-stone-600 border-b-2 border-b-transparent'
                : 'bg-stone-950/30 text-stone-500 hover:text-stone-300 border-b-2 border-b-transparent'
            }`}
          >
            {t("Backend")}
          </button>
          <button
            onClick={() => { playTick(500, 0.03); setCurrentTab('physics'); }}
            className={`h-9 font-serif font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex-1 flex items-center justify-center text-center ${
              currentTab === 'physics' 
                ? themeMode === 'light'
                  ? 'bg-[#fcfbfa]/98 text-cyan-700 font-extrabold border-b-2 border-b-cyan-500'
                  : 'bg-stone-950/95 text-cyan-305 font-extrabold border-b-2 border-b-cyan-500/90 shadow-inner' 
                : themeMode === 'light'
                ? 'bg-stone-100/60 text-stone-400 hover:text-stone-600 border-b-2 border-b-transparent'
                : 'bg-stone-950/30 text-stone-500 hover:text-stone-300 border-b-2 border-b-transparent'
            }`}
          >
            {t("Gameplay")}
          </button>
        </div>

        {/* 3. Central Category View Container */}
        <div className="flex-1 min-h-0 flex flex-col p-3 pt-2 relative overflow-hidden" id="vtt-tab-contents-container">
          
          {/* =====================================
              TAB 1: FRONTEND VISUALS & LOOK/FEEL
              ===================================== */}
          <div className={`${currentTab === 'frontend' ? 'flex flex-col flex-1 overflow-y-auto gap-3.5 pr-0.5' : 'hidden'} scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent`}>
            <VisualsSettings playTick={playTick} />
          </div>

          {/* =====================================
              TAB 2: BACKEND OPTIONS & MEMORY
              ===================================== */}
          <div className={currentTab === 'backend' ? 'flex flex-col flex-1 min-h-0 h-full' : 'hidden'}>
            <BackendSettings playTick={playTick} onDraftChange={handleDraftChange} />
          </div>

          {/* =====================================
              TAB 3: GAMEPLAY PHYSICS & GRID SNAPPING
              ===================================== */}
          <div className={`${currentTab === 'physics' ? 'flex flex-col flex-1 overflow-y-auto pr-0.5' : 'hidden'} scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent`}>
            <GameplaySettings autostartEditCharId={autostartEditCharId} />
          </div>

        </div>



      </motion.div>

      {/* 5. GOTHIC EXIT CONFIRMATION PROMPT DIALOG */}
      <AnimatePresence>
        {showExitConfirmModal && (
          <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-[1.5px] flex items-center justify-center z-[4900] rounded-xl p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[260px] bg-stone-900 border border-red-500/30 rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_5px_22px_rgba(0,0,0,0.8)] text-center text-stone-200"
            >
              <div className="flex flex-col items-center gap-1">
                <AlertTriangle size={24} className="text-red-500 animate-bounce" />
                <span className="font-serif text-[11px] font-extrabold uppercase tracking-widest text-red-300">
                  {t("Unsaved Matrix Edits")}
                </span>
              </div>
              
              <p className="text-[8.5px] text-stone-400 leading-normal">
                {t("You have changed Compendium, Weapons or Items matrix arrays. Do you want to save changes to the database before closing?")}
              </p>
              
              <div className="flex flex-col gap-1.5 text-[8.5px] font-mono uppercase tracking-wider">
                <button
                  onClick={async () => {
                    playTick(600, 0.08, 'sine');
                    if (saveDraftFn) await saveDraftFn();
                    setShowExitConfirmModal(false);
                    onClose();
                  }}
                  className="w-full py-1.5 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded cursor-pointer border border-purple-500/35"
                >
                  {t("Save & Exit Window")}
                </button>
                <button
                  onClick={() => {
                    playTick(240, 0.1, 'sawtooth');
                    setHasUnsavedDraft(false); // Discard changes
                    setShowExitConfirmModal(false);
                    onClose();
                  }}
                  className="w-full py-1.5 bg-stone-950 hover:bg-stone-850 text-stone-400 hover:text-white rounded cursor-pointer border border-white/5"
                >
                  {t("Discard Changes")}
                </button>
                <button
                  onClick={() => {
                    playTick(440, 0.04, 'sine');
                    setShowExitConfirmModal(false);
                  }}
                  className="w-full py-1.5 text-stone-500 hover:text-stone-300 rounded cursor-pointer"
                >
                  {t("Cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
