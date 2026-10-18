import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Palette, Sparkles, Sun, Moon, Gamepad, Dice5, Activity } from 'lucide-react';
import { safeStorage } from '../storage';
import { useTranslation } from './language';

interface VisualsSettingsProps {
  playTick: (freq?: number, duration?: number, type?: 'sine' | 'square' | 'triangle' | 'sawtooth') => void;
}

export default function VisualsSettings({ playTick }: VisualsSettingsProps) {
  const { t } = useTranslation();
  // Theme Mode: Light vs Dark
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (safeStorage.getItem('setting_theme_mode') as 'dark' | 'light') || 'dark';
  });

  // Layout Orientation: Horizontal vs Vertical
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    return (safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical';
  });

  // Default Controller: D-Pad vs Joypad
  const [defaultController, setDefaultController] = useState<'dpad' | 'joypad'>(() => {
    return (safeStorage.getItem('setting_default_controller') as 'dpad' | 'joypad') || 'dpad';
  });

  // Hover Text: On vs Off (default to off)
  const [hoverText, setHoverText] = useState<'on' | 'off'>(() => {
    return (safeStorage.getItem('setting_hover_text') as 'on' | 'off') || 'off';
  });

  // Stats Count: 4 vs 6 (default to 6)
  const [statsCount, setStatsCount] = useState<4 | 6>(() => {
    const val = safeStorage.getItem('setting_stats_count');
    return val === '4' ? 4 : 6;
  });

  // Dice Theme
  const [diceTheme, setDiceTheme] = useState<string>(() => {
    return safeStorage.getItem('setting_dice_theme') || 'amber';
  });

  // Global Sync Accent color from storage
  const [accent, setAccent] = useState<string>(() => {
    return safeStorage.getItem('setting_theme_accent') || 'pink';
  });

  // Dynamic Live Dice Preview States
  const [d20Value, setD20Value] = useState<number>(20);
  const [d6Value, setD6Value] = useState<number>(6);
  const [isPreviewRolling, setIsPreviewRolling] = useState<boolean>(false);

  const handleTestRoll = () => {
    if (isPreviewRolling) return;
    setIsPreviewRolling(true);
    playTick(440, 0.04, 'triangle');
    
    let ticks = 0;
    const interval = setInterval(() => {
      setD20Value(Math.floor(Math.random() * 20) + 1);
      setD6Value(Math.floor(Math.random() * 6) + 1);
      
      const freq = 400 + Math.random() * 150;
      playTick(freq, 0.02, 'sine');
      ticks++;
      if (ticks > 7) {
        clearInterval(interval);
        const randD20 = Math.floor(Math.random() * 20) + 1;
        const randD6 = Math.floor(Math.random() * 6) + 1;
        setD20Value(randD20);
        setD6Value(randD6);
        setIsPreviewRolling(false);
        playTick(randD20 === 20 ? 840 : 540, 0.1, 'sine');
      }
    }, 70);
  };

  useEffect(() => {
    const handleStorageUpdate = () => {
      setAccent(safeStorage.getItem('setting_theme_accent') || 'pink');
      setLayoutOrientation((safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical');
      setHoverText((safeStorage.getItem('setting_hover_text') as 'on' | 'off') || 'off');
      const savedCount = safeStorage.getItem('setting_stats_count');
      setStatsCount(savedCount === '4' ? 4 : 6);
    };
    window.addEventListener('tabletop-state-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('tabletop-state-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const saveValue = (key: string, value: string) => {
    safeStorage.setItem(key, value);
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleHoverTextToggle = (value: 'on' | 'off') => {
    setHoverText(value);
    saveValue('setting_hover_text', value);
    playTick(value === 'on' ? 620 : 380, 0.08, 'triangle');
  };

  const handleStatsCountToggle = (count: 4 | 6) => {
    setStatsCount(count);
    saveValue('setting_stats_count', count.toString());
    playTick(count === 4 ? 420 : 620, 0.08, 'triangle');
  };

  const handleThemeModeToggle = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    saveValue('setting_theme_mode', mode);
    
    // Apply theme mode class to document body
    if (mode === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }

    playTick(mode === 'light' ? 620 : 380, 0.08, 'triangle');
  };

  const handleLayoutOrientationChange = (mode: 'horizontal' | 'vertical') => {
    setLayoutOrientation(mode);
    saveValue('setting_layout_orientation', mode);
    saveValue('setting_restructure_alignment', 'false');
    playTick(550, 0.05, 'sine');
  };

  const handleControllerToggle = (ctrl: 'dpad' | 'joypad') => {
    setDefaultController(ctrl);
    saveValue('setting_default_controller', ctrl);
    playTick(480, 0.06, 'triangle');
  };

  const handleDiceThemeChange = (theme: string) => {
    setDiceTheme(theme);
    saveValue('setting_dice_theme', theme);
    
    const themePitches: Record<string, number> = {
      amber: 440,
      celestial: 523,
      abyssal: 330,
      ruby: 587,
      emerald: 659
    };
    playTick(themePitches[theme] || 440, 0.08, 'sine');
  };

  return (
    <div className="flex flex-col gap-3.5 animate-fadeIn" id="vtt-visuals-tab-content">
      
      {/* 1. Theme Selection: Light vs Dark */}
      <div className={`flex items-center justify-between p-2 rounded border transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-stone-100/70 border-stone-200 text-stone-800'
          : 'bg-stone-900/40 border-white/5 text-stone-200'
      }`}>
        <div className="flex items-center gap-1.5">
          {themeMode === 'dark' ? <Moon size={11} className="text-amber-400" /> : <Sun size={11} className="text-amber-400" />}
          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${
            themeMode === 'light' ? 'text-stone-700' : 'text-stone-200'
          }`}>
            {t("Theme")}
          </span>
        </div>
        <div className={`grid grid-cols-2 w-[140px] p-0.5 rounded text-[8px] font-mono uppercase tracking-widest text-center border ${
          themeMode === 'light'
            ? 'bg-[#f7f6f0] border-stone-200/80'
            : 'bg-stone-950/60 border-white/5'
        }`}>
          <button
            onClick={() => handleThemeModeToggle('dark')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              themeMode === 'dark'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("Dark")}
          </button>
          <button
            onClick={() => handleThemeModeToggle('light')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              themeMode === 'light'
                ? themeMode === 'light' 
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("Light")}
          </button>
        </div>
      </div>

      {/* 2. Character Layout Configuration */}
      <div className={`flex items-center justify-between p-2 rounded border transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-stone-100/70 border-stone-200 text-stone-800'
          : 'bg-stone-900/40 border-white/5 text-stone-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <LayoutTemplate size={11} className="text-amber-400" />
          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${
            themeMode === 'light' ? 'text-stone-700' : 'text-stone-200'
          }`}>
            {t("Character")}
          </span>
        </div>
        <div className={`grid grid-cols-2 w-[140px] p-0.5 rounded text-[8px] font-mono uppercase tracking-widest text-center border ${
          themeMode === 'light'
            ? 'bg-[#f7f6f0] border-stone-200/80'
            : 'bg-stone-950/60 border-white/5'
        }`}>
          <button
            onClick={() => handleLayoutOrientationChange('vertical')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              layoutOrientation === 'vertical'
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("Vertical")}
          </button>
          <button
            onClick={() => handleLayoutOrientationChange('horizontal')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              layoutOrientation === 'horizontal'
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("Horizontal")}
          </button>
        </div>
      </div>

      {/* 3. Navigation: D-Pad vs Joystick */}
      <div className={`flex items-center justify-between p-2 rounded border transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-stone-100/70 border-stone-200 text-stone-800'
          : 'bg-stone-900/40 border-white/5 text-stone-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <Gamepad size={11} className="text-amber-400" />
          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${
            themeMode === 'light' ? 'text-stone-700' : 'text-stone-200'
          }`}>
            {t("Navigation")}
          </span>
        </div>
        <div className={`grid grid-cols-2 w-[140px] p-0.5 rounded text-[8px] font-mono uppercase tracking-widest text-center border ${
          themeMode === 'light'
            ? 'bg-[#f7f6f0] border-stone-200/80'
            : 'bg-stone-950/60 border-white/5'
        }`}>
          <button
            onClick={() => handleControllerToggle('dpad')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              defaultController === 'dpad'
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("D-Pad")}
          </button>
          <button
            onClick={() => handleControllerToggle('joypad')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              defaultController === 'joypad'
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("Joystick")}
          </button>
        </div>
      </div>

      {/* 4. Hover Text configuration */}
      <div className={`flex items-center justify-between p-2 rounded border transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-stone-100/70 border-stone-200 text-stone-800'
          : 'bg-stone-900/40 border-white/5 text-stone-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-amber-400" />
          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${
            themeMode === 'light' ? 'text-stone-700' : 'text-stone-200'
          }`}>
            {t("Hover Text")}
          </span>
        </div>
        <div className={`grid grid-cols-2 w-[140px] p-0.5 rounded text-[8px] font-mono uppercase tracking-widest text-center border ${
          themeMode === 'light'
            ? 'bg-[#f7f6f0] border-stone-200/80'
            : 'bg-stone-950/60 border-white/5'
        }`}>
          <button
            onClick={() => handleHoverTextToggle('off')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              hoverText === 'off'
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("Off")}
          </button>
          <button
            onClick={() => handleHoverTextToggle('on')}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              hoverText === 'on'
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            {t("On")}
          </button>
        </div>
      </div>

      {/* 5. Stats count: 4 vs 6 */}
      <div className={`flex items-center justify-between p-2 rounded border transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-stone-100/70 border-stone-200 text-stone-800'
          : 'bg-stone-900/40 border-white/5 text-stone-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <Activity size={11} className="text-amber-400" />
          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${
            themeMode === 'light' ? 'text-stone-700' : 'text-stone-200'
          }`}>
            {t("Stats")}
          </span>
        </div>
        <div className={`grid grid-cols-2 w-[140px] p-0.5 rounded text-[8px] font-mono uppercase tracking-widest text-center border ${
          themeMode === 'light'
            ? 'bg-[#f7f6f0] border-stone-200/80'
            : 'bg-stone-950/60 border-white/5'
        }`}>
          <button
            onClick={() => handleStatsCountToggle(4)}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              statsCount === 4
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            4
          </button>
          <button
            onClick={() => handleStatsCountToggle(6)}
            className={`w-full py-0.5 rounded transition-all cursor-pointer text-center truncate ${
              statsCount === 6
                ? themeMode === 'light'
                  ? 'bg-amber-600/15 text-amber-700 border border-amber-600/30 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-stone-500 hover:text-stone-300 border border-transparent'
            }`}
          >
            6
          </button>
        </div>
      </div>

      {/* 4. Dice Theme System */}
      <div className={`flex flex-col gap-1.5 p-2 rounded border transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-stone-100/70 border-stone-200 text-stone-800'
          : 'bg-stone-900/40 border-white/5 text-stone-200'
      }`} id="vtt-dice-theme-system">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Dice5 size={11} className="text-amber-400" />
            <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${
              themeMode === 'light' ? 'text-stone-700' : 'text-stone-200'
            }`}>
              {t("Dice Theme")}
            </span>
          </div>
        </div>

        {/* Global SVG Gradients for high-fidelity interactive dice renderings */}
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            {/* Magma / Fiery Amber */}
            <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#450a0a" stopOpacity="1" />
            </linearGradient>

            {/* Cosmos / Celestial Nebula */}
            <linearGradient id="grad-celestial" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Water / Deep Sea Ripple */}
            <linearGradient id="water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.98" />
            </linearGradient>

            {/* Diamond / Crimson Gemstone */}
            <linearGradient id="grad-ruby" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="1" />
              <stop offset="60%" stopColor="#9f1239" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4c0519" stopOpacity="0.98" />
            </linearGradient>

            {/* Emerald Crystalline */}
            <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>

        {/* Horizontal Selectable Dice Row */}
        <div className="grid grid-cols-5 gap-1 mt-0.5">
          {[
            {
              key: 'amber',
              name: 'Magma',
              dieFill: 'url(#grad-amber)',
              stroke: 'stroke-amber-400/85',
            },
            {
              key: 'celestial',
              name: 'Cosmos',
              dieFill: 'url(#grad-celestial)',
              stroke: 'stroke-cyan-300/85',
            },
            {
              key: 'abyssal',
              name: 'Water',
              dieFill: 'url(#water-grad)',
              stroke: 'stroke-sky-400/85',
            },
            {
              key: 'ruby',
              name: 'Diamond',
              dieFill: 'url(#grad-ruby)',
              stroke: 'stroke-red-300/85',
            },
            {
              key: 'emerald',
              name: 'Emerald',
              dieFill: 'url(#grad-emerald)',
              stroke: 'stroke-emerald-300/85',
            }
          ].map((theme) => {
            const isActive = diceTheme === theme.key;
            return (
              <button
                key={theme.key}
                onClick={() => handleDiceThemeChange(theme.key)}
                className={`group flex items-center justify-center p-0 border-0 bg-transparent outline-none focus:outline-none transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'scale-[1.18] brightness-125 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.55)]'
                    : 'opacity-55 hover:opacity-100 scale-100 hover:scale-[1.08] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                }`}
                title={t(`Select ${theme.name} Theme`)}
              >
                {/* Visual D6 Dice Representation (No numbers, all D6, unique aesthetics) */}
                <div className="relative w-11 h-11 flex items-center justify-center transition-transform duration-300">
                  <div className="absolute inset-0.5 rounded-[12px] bg-white/[0.02] pointer-events-none mix-blend-overlay" />
                  
                  <svg viewBox="0 0 100 100" className="w-10 h-10 select-none">
                    {/* D6 Rounded Square body */}
                    <rect x="8" y="8" width="84" height="84" rx="16" ry="16" fill={theme.dieFill} className={theme.stroke} strokeWidth="3" />
                    <rect x="11" y="11" width="78" height="78" rx="13" ry="13" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.08" />
                    
                    {/* Unique Internal Aesthetics */}
                    {theme.key === 'amber' && (
                      <>
                        {/* Crackling lava lines for magma */}
                        <path d="M 12 40 L 30 50 L 50 35 L 70 60 L 88 45" stroke="#f59e0b" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round" />
                        <path d="M 40 12 L 50 35 L 45 75 L 25 85" stroke="#ef4444" strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round" />
                        <path d="M 70 60 L 65 88" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
                        
                        {/* Lava glow hot spots */}
                        <circle cx="35" cy="45" r="8" fill="#f59e0b" fillOpacity="0.15" filter="blur(2px)" />
                        <circle cx="65" cy="55" r="10" fill="#ef4444" fillOpacity="0.2" filter="blur(2px)" />
                      </>
                    )}

                    {theme.key === 'celestial' && (
                      <>
                        {/* Starry cosmos swirling nebula paths */}
                        <path d="M 20,50 A 30,30 0 1,1 80,50 A 25,25 0 1,1 25,50 A 20,20 0 1,1 75,50 A 15,15 0 1,1 35,50" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.45" />
                        
                        {/* Glow spots */}
                        <circle cx="50" cy="50" r="12" fill="#818cf8" fillOpacity="0.25" filter="blur(3px)" />

                        {/* Sparkles */}
                        <polygon points="53,20 55,27 62,29 55,31 53,38 51,31 44,29 51,27" fill="#fff" opacity="0.85" />
                        <polygon points="45,72 47,77 52,79 47,81 45,86 43,81 38,79 43,77" fill="#22d3ee" opacity="0.85" />
                      </>
                    )}

                    {theme.key === 'abyssal' && (
                      <>
                        {/* Fluid rolling waves for water */}
                        <path d="M 8 30 C 30 20, 40 40, 60 25 C 80 10, 85 30, 92 20" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.45" strokeLinecap="round" />
                        <path d="M 8 50 C 25 40, 45 60, 65 45 C 75 35, 85 55, 92 45" fill="none" stroke="#0ea5e9" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
                        <path d="M 8 70 C 25 60, 35 80, 55 65 C 75 50, 85 75, 92 65" fill="none" stroke="#1d4ed8" strokeWidth="2" opacity="0.5" strokeDasharray="4,2" strokeLinecap="round" />
                        
                        {/* Highlighting pool glow */}
                        <circle cx="50" cy="50" r="14" fill="#38bdf8" fillOpacity="0.2" filter="blur(3px)" />
                      </>
                    )}

                    {theme.key === 'ruby' && (
                      <>
                        {/* High-contrast glittering diamond facets */}
                        <path d="M 8 8 L 50 50 L 92 8 Z" fill="white" fillOpacity="0.08" />
                        <path d="M 92 8 L 50 50 L 92 92 Z" fill="black" fillOpacity="0.12" />
                        <path d="M 92 92 L 50 50 L 8 92 Z" fill="white" fillOpacity="0.12" />
                        <path d="M 8 92 L 50 50 L 8 8 Z" fill="black" fillOpacity="0.2" />
                        
                        {/* Diamond facet intersection lines */}
                        <line x1="8" y1="8" x2="92" y2="92" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
                        <line x1="92" y1="8" x2="8" y2="92" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
                        <line x1="50" y1="8" x2="50" y2="92" stroke="#fff" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />
                        <line x1="8" y1="50" x2="92" y2="50" stroke="#fff" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />

                        {/* Glossy diamond reflection */}
                        <circle cx="50" cy="50" r="10" fill="#fecdd3" fillOpacity="0.25" filter="blur(2px)" />
                      </>
                    )}

                    {theme.key === 'emerald' && (
                      <>
                        {/* Perfect crystalline / Emerald facet pathways */}
                        <path d="M 50 12 L 88 34 L 88 78 L 50 88 L 12 78 L 12 34 Z" fill="none" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.55" strokeLinejoin="round" />
                        <line x1="50" y1="12" x2="50" y2="88" stroke="#34d399" strokeWidth="1" strokeOpacity="0.3" />
                        <line x1="12" y1="34" x2="88" y2="78" stroke="#34d399" strokeWidth="1" strokeOpacity="0.3" />
                        <line x1="12" y1="78" x2="88" y2="34" stroke="#34d399" strokeWidth="1" strokeOpacity="0.3" />

                        {/* Crystal prism aura */}
                        <circle cx="50" cy="50" r="12" fill="#a7f3d0" fillOpacity="0.2" filter="blur(2.5px)" />
                      </>
                    )}
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
