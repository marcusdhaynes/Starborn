import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Plus, Minus } from 'lucide-react';
import { safeStorage } from '../storage';
import { useTranslation } from '../99_settings/language';

interface LifeProps {
  noPadding?: boolean;
}

export default function Life({ noPadding = false }: LifeProps = {}) {
  const { t, tn } = useTranslation();
  const [currentHp, setCurrentHp] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_hp_current');
    return saved ? parseInt(saved, 10) : 35;
  });
  const [bodyScore, setBodyScore] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_stat_body');
    return saved ? parseInt(saved, 10) : 12;
  });
  const maxHp = bodyScore * 10;

  const [tempHp, setTempHp] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_hp_temp');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Keep storage in sync with local HP changes
  useEffect(() => {
    safeStorage.setItem('vtt_hp_current', currentHp.toString());
  }, [currentHp]);

  useEffect(() => {
    safeStorage.setItem('vtt_hp_max', maxHp.toString());
  }, [maxHp]);

  useEffect(() => {
    safeStorage.setItem('vtt_hp_temp', tempHp.toString());
  }, [tempHp]);

  // Handle case where current HP exceeds reactive max HP
  useEffect(() => {
    if (currentHp > maxHp) {
      setCurrentHp(maxHp);
    }
  }, [currentHp, maxHp]);

  // Synchronize HP state from external sources (e.g. Firebase login/sync)
  useEffect(() => {
    const handleSync = () => {
      const savedHp = safeStorage.getItem('vtt_hp_current');
      const savedTemp = safeStorage.getItem('vtt_hp_temp');
      const savedBody = safeStorage.getItem('vtt_stat_body');
      if (savedHp !== null) setCurrentHp(parseInt(savedHp, 10));
      if (savedTemp !== null) setTempHp(parseInt(savedTemp, 10));
      if (savedBody !== null) setBodyScore(parseInt(savedBody, 10));
    };
    window.addEventListener('tabletop-state-update', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('tabletop-state-update', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  useEffect(() => {
    const handleHpAdjust = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.amount === 'number') {
        setCurrentHp(prev => Math.min(maxHp, Math.max(0, prev + customEvent.detail.amount)));
      }
    };
    const handleTempHpAdjust = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.amount === 'number') {
        setTempHp(prev => Math.max(0, prev + customEvent.detail.amount));
      }
    };
    window.addEventListener('vtt-hp-adjust', handleHpAdjust);
    window.addEventListener('vtt-hp-adjust-temp', handleTempHpAdjust);
    return () => {
      window.removeEventListener('vtt-hp-adjust', handleHpAdjust);
      window.removeEventListener('vtt-hp-adjust-temp', handleTempHpAdjust);
    };
  }, [maxHp]);

  // Quick increment/decrement helper for state variables
  const adjustStat = (stat: 'current' | 'max' | 'temp', delta: number) => {
    if (stat === 'current') {
      setCurrentHp(prev => Math.min(maxHp, Math.max(0, prev + delta)));
    } else if (stat === 'max') {
      const bodyDelta = delta >= 10 ? 1 : (delta <= -10 ? -1 : (delta > 0 ? 1 : -1));
      const newBody = Math.max(1, bodyScore + bodyDelta);
      safeStorage.setItem('vtt_stat_body', newBody.toString());
      setBodyScore(newBody);
      window.dispatchEvent(new Event('tabletop-state-update'));
    } else if (stat === 'temp') {
      setTempHp(prev => Math.max(0, prev + delta));
    }
  };

  return (
    <div 
      id="02_stats_life_component"
      className={`relative flex flex-col items-center justify-center ${noPadding ? 'p-0' : 'pt-0 px-4 pb-4'}`}
    >
      {/* Container holding the HP Badge */}
      <div 
        className="relative w-[105px] h-[105px] select-none group"
        style={{ filter: "drop-shadow(0 5px 8px rgba(0,0,0,0.65))" }}
      >
        {/* SVG Drawing for the Decorative Frames and Arches */}
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 200 200" 
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <defs>
            {/* Dark Metallic Cosmic Blue Gradient for the Badge Fill */}
            <linearGradient id="cosmicLifeBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0c1a" />
              <stop offset="50%" stopColor="#101226" />
              <stop offset="100%" stopColor="#05060d" />
            </linearGradient>

            {/* Glowing crystal gradient for the top diamond jewel */}
            <linearGradient id="jewelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="50%" stopColor="#55aaff" />
              <stop offset="100%" stopColor="#112266" />
            </linearGradient>

            {/* Neon radial glow behind top crystal */}
            <radialGradient id="diamondGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0, 255, 255, 0.45)" />
              <stop offset="100%" stopColor="rgba(0, 255, 255, 0)" />
            </radialGradient>

            {/* Clip path to exclude the central dome interior so frame lines do not bleed inside */}
            <clipPath id="excludeDomeClip">
              <path 
                d="M -10,-10 L 210,-10 L 210,210 L -10,210 Z M 58.2,110 A 54.5,54.5 0 1,1 141.8,110 Z" 
                clipRule="evenodd"
              />
            </clipPath>

            {/* Clip path for the whole background shield structure */}
            <clipPath id="baseShieldClip">
              <path d="M 8,10 L 192,10 L 192,46 Q 142,46 142,110 L 142,165 L 100,190 L 58,165 L 58,110 Q 58,46 8,46 Z" />
            </clipPath>

            {/* Cosmic Blue (like cosmic-blue-fill circle above) */}
            <radialGradient id="cosmicHpBlue" cx="70%" cy="70%" r="70%">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="60%" stopColor="#00bfff" />
              <stop offset="100%" stopColor="#002266" />
            </radialGradient>

            {/* Cosmic Pink (like cosmic-pink-fill circle above) */}
            <radialGradient id="cosmicMaxPink" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ff71cd" />
              <stop offset="50%" stopColor="#700b97" />
              <stop offset="100%" stopColor="#3e065f" />
            </radialGradient>

            {/* Cosmic Ribbon (like the ribbon) */}
            <linearGradient id="cosmicTempOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1335" />
              <stop offset="35%" stopColor="#1e2270" />
              <stop offset="70%" stopColor="#cf580c" />
              <stop offset="100%" stopColor="#f7a250" />
            </linearGradient>

            {/* Cosmic Dome/Central default background - super vibrant, glowing purple, magenta & indigo space nebula */}
            <radialGradient id="cosmicDomeBg" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#a124ff" />
              <stop offset="35%" stopColor="#ec008c" />
              <stop offset="70%" stopColor="#120c56" />
              <stop offset="100%" stopColor="#03011c" />
            </radialGradient>
          </defs>

          {/* 1. Base unified and clipped cosmic gradient fills */}
          <g clipPath="url(#baseShieldClip)">
            {/* Left Side: HP Wing Cosmic Blue */}
            <rect x="0" y="0" width="100" height="110" fill="url(#cosmicHpBlue)" />
            
            {/* Right Side: MAX Wing Cosmic Pink */}
            <rect x="100" y="0" width="100" height="110" fill="url(#cosmicMaxPink)" />
            
            {/* Central Dome Background */}
            <path d="M 58.2,110 A 54.5,54.5 0 1,1 141.8,110 Z" fill="url(#cosmicDomeBg)" />
            
            {/* Bottom Shield: Temp Cosmic Ribbon Gradient */}
            <path d="M 58,110 L 142,110 L 142,165 L 100,190 L 58,165 Z" fill="url(#cosmicTempOrange)" />
          </g>

          {/* BACKGROUND DECORATION - Richly distributed glowing cosmic stars across all sections */}
          {/* Left Section Stars (HP Blue Zone) */}
          <circle cx="30" cy="30" r="0.75" fill="#ffffff" opacity="0.8" className="animate-pulse" style={{ animationDuration: '4s' }} />
          <circle cx="45" cy="25" r="0.5" fill="#e0f7fa" opacity="0.75" />
          <circle cx="25" cy="50" r="0.6" fill="#00ffff" opacity="0.85" />
          <circle cx="40" cy="75" r="0.8" fill="#ffffff" opacity="0.9" className="animate-pulse" style={{ animationDuration: '3.5s' }} />
          <circle cx="20" cy="85" r="0.4" fill="#ffffff" opacity="0.6" />

          {/* Right Section Stars (MAX Pink Zone) */}
          <circle cx="170" cy="30" r="0.75" fill="#ffffff" opacity="0.8" className="animate-pulse" style={{ animationDuration: '4.2s' }} />
          <circle cx="155" cy="25" r="0.5" fill="#fce4ec" opacity="0.75" />
          <circle cx="175" cy="50" r="0.6" fill="#ff71cd" opacity="0.85" />
          <circle cx="160" cy="75" r="0.8" fill="#ffffff" opacity="0.9" className="animate-pulse" style={{ animationDuration: '2.8s' }} />
          <circle cx="180" cy="85" r="0.4" fill="#ffffff" opacity="0.6" />

          {/* Middle Section Stars (Central Dome Nebulous Zone) */}
          <circle cx="80" cy="65" r="0.75" fill="#00ffff" opacity="0.95" className="animate-pulse" style={{ animationDuration: '2.5s' }} />
          <circle cx="120" cy="65" r="0.7" fill="#ff80df" opacity="0.95" className="animate-pulse" style={{ animationDuration: '3.2s' }} />
          <circle cx="100" cy="58" r="0.6" fill="#ffffff" opacity="0.95" />
          <circle cx="70" cy="80" r="0.8" fill="#ffffff" opacity="0.85" className="animate-pulse" style={{ animationDuration: '4.5s' }} />
          <circle cx="130" cy="85" r="0.5" fill="#f7a250" opacity="0.85" />
          <circle cx="90" cy="75" r="0.4" fill="#ffffff" opacity="0.8" />
          <circle cx="110" cy="75" r="0.5" fill="#00ffff" opacity="0.85" />
          <circle cx="85" cy="98" r="0.55" fill="#ffffff" opacity="0.8" />
          <circle cx="115" cy="98" r="0.6" fill="#ff71cd" opacity="0.85" />

          {/* Bottom Section Stars (TEMP Orange Zone) */}
          <circle cx="100" cy="122" r="0.8" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '3s', opacity: 0.95 }} />
          <circle cx="75" cy="150" r="0.6" fill="#ffffff" opacity="0.85" />
          <circle cx="125" cy="150" r="0.65" fill="#f7a250" opacity="0.9" />
          <circle cx="100" cy="158" r="0.7" fill="#ffffff" opacity="0.9" className="animate-pulse" style={{ animationDuration: '2.2s' }} />
          <circle cx="90" cy="138" r="0.5" fill="#ffffff" opacity="0.75" />
          <circle cx="110" cy="138" r="0.55" fill="#00ffff" opacity="0.8" />
          <circle cx="85" cy="168" r="0.45" fill="#ffffff" opacity="0.75" />
          <circle cx="115" cy="168" r="0.45" fill="#ffffff" opacity="0.75" />

          {/* 2. Outer decorative metal line */}
          <path
            d="M 8,10 L 192,10 L 192,46 Q 142,46 142,110 L 142,165 L 100,190 L 58,165 L 58,110 Q 58,46 8,46 Z"
            fill="none"
            stroke="white"
            strokeWidth="2"
            clipPath="url(#excludeDomeClip)"
          />

          {/* 3. Inner parallel engraving line (the classic double-line frame) */}
          <path
            d="M 13,15 L 187,15 L 187,41 Q 138,41 138,106 L 138,161 L 100,184 L 62,161 L 62,106 Q 62,41 13,41 Z"
            fill="none"
            stroke="white"
            strokeWidth="2"
            clipPath="url(#excludeDomeClip)"
          />

          {/* 5. Expanded Central Arc that touches the corners of the temp section */}
          <path
            d="M 58.2,110 A 54.5,54.5 0 1,1 141.8,110"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
          <path
            d="M 63.6,110 A 50.5,50.5 0 1,1 136.4,110"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />

          {/* 7. Glowing Top Center Diamond Royal Gemstone */}
          <path
            d="M 100,12 L 107,19.5 L 100,27 L 93,19.5 Z"
            fill="url(#jewelGradient)"
            stroke="white"
            strokeWidth="2"
          />

          {/* Diagonal struts slanting from bottom/sides of the diamond to the top frame */}
          {/* Inner strut triangle */}
          <line
            x1="100"
            y1="41"
            x2="72"
            y2="15"
            stroke="white"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="41"
            x2="128"
            y2="15"
            stroke="white"
            strokeWidth="2"
          />

          {/* Outer/larger parallel strut triangle */}
          <line
            x1="100"
            y1="46"
            x2="61.5"
            y2="10"
            stroke="white"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="46"
            x2="138.5"
            y2="10"
            stroke="white"
            strokeWidth="2"
          />

          {/* 8. Flat divider line separating HP/MAX section from Temp section */}
          <line 
            x1="58" 
            y1="110" 
            x2="142" 
            y2="110" 
            stroke="white" 
            strokeWidth="2" 
          />
          <line 
            x1="62" 
            y1="113" 
            x2="138" 
            y2="113" 
            stroke="white" 
            strokeWidth="2" 
          />

          {/* 9. Temp section inner borders and decorations */}
          <path
            d="M 58,110 L 142,110 L 142,165 L 100,190 L 58,165 Z"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
          <path
            d="M 62,114 L 138,114 L 138,161 L 100,184 L 62,161 Z"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />

          {/* 10. Text Labels styled in classic serif style */}
          {/* HP Wing Label */}
          <text 
            x="39" 
            y="34" 
            textAnchor="middle" 
            fill="rgba(255, 255, 255, 0.9)" 
            className="font-serif text-[16.5px] tracking-[0.1em] select-none font-bold"
            style={{ textShadow: '0 0 6px rgba(255, 255, 255, 0.35)' }}
          >
            {t("HP")}
          </text>

          {/* MAX Wing Label */}
          <text 
            x="161" 
            y="34" 
            textAnchor="middle" 
            fill="rgba(255, 255, 255, 0.9)" 
            className="font-serif text-[15px] tracking-[0.08em] select-none font-bold"
            style={{ textShadow: '0 0 6px rgba(255, 255, 255, 0.35)' }}
          >
            {t("MAX")}
          </text>

          {/* TEMP Shield Label */}
          <text 
            x="100" 
            y="139" 
            textAnchor="middle" 
            fill="rgba(255, 255, 255, 0.85)" 
            className="font-serif text-[15px] tracking-[0.2em] uppercase select-none font-bold"
            style={{ textShadow: '0 0 5px rgba(255, 255, 255, 0.2)' }}
          >
            {t("TEMP")}
          </text>

          {/* 11. STAT LINES inside central Dome:  ______ / ______ */}
          {/* Left horizontal slot line */}
          <line 
            x1="56" 
            y1="89" 
            x2="92" 
            y2="89" 
            stroke="white" 
            strokeWidth="2" 
          />

          {/* Central Slash Separator */}
          <line 
            x1="97" 
            y1="93" 
            x2="103" 
            y2="76" 
            stroke="white" 
            strokeWidth="2" 
          />

          {/* Right horizontal slot line */}
          <line 
            x1="108" 
            y1="89" 
            x2="144" 
            y2="89" 
            stroke="white" 
            strokeWidth="2" 
          />

          {/* Underline for Temp HP inside bottom shield */}
          <line 
            x1="82" 
            y1="167" 
            x2="118" 
            y2="167" 
            stroke="white" 
            strokeWidth="2" 
            strokeDasharray="2 2"
          />
        </svg>

        {/* --- INTERACTIVE FLOATING STAT CONTROLS (Overlaid on SVG Paths) --- */}
        
        {/* CURRENT HP INPUT CONTAINER */}
        <div 
          className="absolute left-[37%] top-[39.5%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/hp"
        >
          {/* Subtle increment/decrement arrow controls on hover */}
          <button 
            onClick={() => adjustStat('current', 1)}
            className="opacity-0 group-hover/hp:opacity-100 duration-150 absolute top-[-10px] text-white hover:text-cyan-400 p-0"
            title="Increase HP (Shift+Click to add 10)"
            onClickCapture={(e) => {
              if (e.shiftKey) { e.stopPropagation(); adjustStat('current', 10); }
            }}
          >
            <Plus size={7} strokeWidth={3} />
          </button>

          <input 
            type="text" 
            value={tn(currentHp)}
            onChange={(e) => {
              const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
              const val = parseInt(normalized.replace(/\D/g, ''));
              setCurrentHp(isNaN(val) ? 0 : Math.min(maxHp, val));
            }}
            className="w-[38px] h-[22px] text-center bg-transparent border-none outline-none text-white font-serif p-0 font-semibold focus:ring-0 select-text cursor-text"
            style={{ 
              textShadow: "0 0 3px rgba(0,255,255,0.7), 0 0 1px rgba(0,0,0,1)",
              letterSpacing: "-0.02em",
              fontSize: String(currentHp).length <= 2 ? "15px" : String(currentHp).length === 3 ? "11.2px" : "8.7px"
            }}
          />

          <button 
            onClick={() => adjustStat('current', -1)}
            className="opacity-0 group-hover/hp:opacity-100 duration-150 absolute bottom-[-10px] text-white hover:text-red-400 p-0"
            title="Decrease HP (Shift+Click to minus 10)"
            onClickCapture={(e) => {
              if (e.shiftKey) { e.stopPropagation(); adjustStat('current', -10); }
            }}
          >
            <Minus size={7} strokeWidth={3} />
          </button>
        </div>

        {/* MAX HP INPUT CONTAINER */}
        <div 
          className="absolute left-[63%] top-[39.5%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/max"
        >
          <button 
            onClick={() => adjustStat('max', 1)}
            className="opacity-0 group-hover/max:opacity-100 duration-150 absolute top-[-10px] text-white hover:text-cyan-400 p-0"
            title="Increase Max HP"
            onClickCapture={(e) => {
              if (e.shiftKey) { e.stopPropagation(); adjustStat('max', 10); }
            }}
          >
            <Plus size={7} strokeWidth={3} />
          </button>

          <input 
            type="text" 
            value={tn(maxHp)}
            onChange={(e) => {
              const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
              const val = parseInt(normalized.replace(/\D/g, ''));
              if (!isNaN(val)) {
                const newBody = Math.max(1, Math.round(val / 10));
                safeStorage.setItem('vtt_stat_body', newBody.toString());
                setBodyScore(newBody);
                window.dispatchEvent(new Event('tabletop-state-update'));
              }
            }}
            className="w-[38px] h-[22px] text-center bg-transparent border-none outline-none text-white/90 font-serif p-0 font-semibold focus:ring-0 select-text cursor-text"
            style={{ 
              textShadow: "0 0 3px rgba(255,200,250,0.5), 0 0 1px rgba(0,0,0,1)", 
              letterSpacing: "-0.02em",
              fontSize: String(maxHp).length <= 2 ? "15px" : String(maxHp).length === 3 ? "11.2px" : "8.7px"
            }}
          />

          <button 
            onClick={() => adjustStat('max', -1)}
            className="opacity-0 group-hover/max:opacity-100 duration-150 absolute bottom-[-10px] text-white hover:text-red-400 p-0"
            title="Decrease Max HP"
            onClickCapture={(e) => {
              if (e.shiftKey) { e.stopPropagation(); adjustStat('max', -10); }
            }}
          >
            <Minus size={7} strokeWidth={3} />
          </button>
        </div>

        {/* TEMP HP INPUT CONTAINER (In lower shield) */}
        <div 
          className="absolute left-[50%] top-[76.5%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/temp"
        >
          <button 
            onClick={() => adjustStat('temp', 1)}
            className="opacity-0 group-hover/temp:opacity-100 duration-150 absolute top-[-9px] text-white hover:text-yellow-400 p-0"
            title="Increase Temp HP"
            onClickCapture={(e) => {
              if (e.shiftKey) { e.stopPropagation(); adjustStat('temp', 5); }
            }}
          >
            <Plus size={6} strokeWidth={3} />
          </button>

          <input 
            type="text" 
            value={tn(tempHp)}
            onChange={(e) => {
              const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
              const val = parseInt(normalized.replace(/\D/g, ''));
              setTempHp(isNaN(val) ? 0 : val);
            }}
            className="w-[38px] h-[20px] text-center bg-transparent border-none outline-none text-[#f3ff33] font-serif p-0 font-medium focus:ring-0 select-text cursor-text"
            style={{ 
              textShadow: "0 0 3px rgba(243,255,51,0.65), 0 0 1px rgba(0,0,0,1)",
              fontSize: String(tempHp).length <= 2 ? "12.75px" : String(tempHp).length === 3 ? "9.5px" : "7.4px"
            }}
          />

          <button 
            onClick={() => adjustStat('temp', -1)}
            className="opacity-0 group-hover/temp:opacity-100 duration-150 absolute bottom-[-9px] text-white hover:text-amber-600 p-0"
            title="Decrease Temp HP"
            onClickCapture={(e) => {
              if (e.shiftKey) { e.stopPropagation(); adjustStat('temp', -5); }
            }}
          >
            <Minus size={6} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Interactive Quick HUD Reset & Actions inside small subtle controls panel */}
      {!noPadding && (
        <div className="mt-2 flex items-center gap-4 text-[10px] text-white/40 font-mono tracking-wider opacity-0 hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={() => {
              setCurrentHp(maxHp);
              setTempHp(0);
            }}
            className="hover:text-cyan-400 hover:bg-white/5 px-2 py-0.5 rounded transition-all"
          >
            {t("FULL HP")}
          </button>
          <span>•</span>
          <button 
            onClick={() => {
              setCurrentHp(12);
              setTempHp(0);
            }}
            className="hover:text-red-400 hover:bg-white/5 px-2 py-0.5 rounded transition-all flex items-center gap-1"
          >
            <ShieldAlert size={10} /> {t("BLOODIED")}
          </button>
        </div>
      )}
    </div>
  );
}
