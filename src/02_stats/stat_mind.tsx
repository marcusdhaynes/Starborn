import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { safeStorage } from '../storage';
import { useTranslation } from '../99_settings/language';

const STAT_THEMES = {
  body: {
    stops: ["#0e0426", "#03010b", "#010005"],
    circleFill: "#03170f",
    renderNebula: (blurId: string) => (
      <>
        <ellipse cx="20" cy="85" rx="35" ry="42" fill="#5200cc" filter={`url(#${blurId})`} opacity="0.7" />
        <ellipse cx="28" cy="42" rx="28" ry="24" fill="#ff007f" filter={`url(#${blurId})`} opacity="0.7" />
        <circle cx="76" cy="68" r="28" fill="#00d5ff" filter={`url(#${blurId})`} opacity="0.6" />
        <circle cx="48" cy="60" r="15" fill="#ffd854" filter={`url(#${blurId})`} opacity="0.55" />
      </>
    )
  },
  mind: {
    stops: ["#03112c", "#010410", "#000105"],
    circleFill: "#010f2c",
    renderNebula: (blurId: string) => (
      <>
        <circle cx="80" cy="80" r="32" fill="#147efb" filter={`url(#${blurId})`} opacity="0.75" />
        <ellipse cx="45" cy="35" rx="35" ry="24" fill="#d500f9" filter={`url(#${blurId})`} opacity="0.65" />
        <circle cx="20" cy="65" r="25" fill="#0c00a3" filter={`url(#${blurId})`} opacity="0.6" />
        <circle cx="50" cy="55" r="14" fill="#a3ffff" filter={`url(#${blurId})`} opacity="0.55" />
      </>
    )
  },
  speed: {
    stops: ["#210505", "#080101", "#020000"],
    circleFill: "#01171a",
    renderNebula: (blurId: string) => (
      <>
        <ellipse cx="78" cy="44" rx="28" ry="32" fill="#ff2a00" filter={`url(#${blurId})`} opacity="0.7" />
        <circle cx="30" cy="52" r="28" fill="#ffd000" filter={`url(#${blurId})`} opacity="0.65" />
        <ellipse cx="68" cy="88" rx="33" ry="24" fill="#ff007f" filter={`url(#${blurId})`} opacity="0.6" />
        <circle cx="48" cy="50" r="14" fill="#ffffff" filter={`url(#${blurId})`} opacity="0.55" />
      </>
    )
  },
  endurance: {
    stops: ["#041a10", "#010604", "#000201"],
    circleFill: "#021404",
    renderNebula: (blurId: string) => (
      <>
        <ellipse cx="22" cy="72" rx="33" ry="40" fill="#00e676" filter={`url(#${blurId})`} opacity="0.65" />
        <ellipse cx="78" cy="46" rx="28" ry="32" fill="#640a99" filter={`url(#${blurId})`} opacity="0.65" />
        <circle cx="28" cy="38" r="24" fill="#00f5ff" filter={`url(#${blurId})`} opacity="0.55" />
        <circle cx="68" cy="88" r="22" fill="#ffa600" filter={`url(#${blurId})`} opacity="0.5" />
      </>
    )
  },
  wield: {
    stops: ["#01140e", "#000503", "#000201"],
    circleFill: "#011707",
    renderNebula: (blurId: string) => (
      <>
        <circle cx="82" cy="42" r="30" fill="#00e5ff" filter={`url(#${blurId})`} opacity="0.75" />
        <ellipse cx="25" cy="58" rx="28" ry="34" fill="#ff7f00" filter={`url(#${blurId})`} opacity="0.65" />
        <ellipse cx="68" cy="88" rx="34" ry="24" fill="#7c4dff" filter={`url(#${blurId})`} opacity="0.6" />
        <circle cx="46" cy="62" r="14" fill="#ffffff" filter={`url(#${blurId})`} opacity="0.5" />
      </>
    )
  },
  magic: {
    stops: ["#15052e", "#050110", "#020006"],
    circleFill: "#0e041d",
    renderNebula: (blurId: string) => (
      <>
        <ellipse cx="74" cy="48" rx="34" ry="26" fill="#8100ff" filter={`url(#${blurId})`} opacity="0.7" />
        <circle cx="28" cy="82" r="30" fill="#ff00a0" filter={`url(#${blurId})`} opacity="0.65" />
        <ellipse cx="32" cy="40" rx="22" ry="28" fill="#1e10bb" filter={`url(#${blurId})`} opacity="0.6" />
        <circle cx="60" cy="74" r="16" fill="#fff677" filter={`url(#${blurId})`} opacity="0.5" />
      </>
    )
  }
};

export default function StatMind({ colorTheme = 'mind' }: { colorTheme?: 'body' | 'mind' | 'speed' | 'endurance' | 'wield' | 'magic' }) {
  const { t, tn } = useTranslation();
  const [score, setScore] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_stat_mind');
    return saved ? parseInt(saved, 10) : 14;
  });

  const theme = STAT_THEMES[colorTheme] || STAT_THEMES.mind;

  useEffect(() => {
    const saved = safeStorage.getItem('vtt_stat_mind');
    if (saved !== score.toString()) {
      safeStorage.setItem('vtt_stat_mind', score.toString());
      window.dispatchEvent(new Event('tabletop-state-update'));
    }
  }, [score]);

  useEffect(() => {
    const handleSync = () => {
      const saved = safeStorage.getItem('vtt_stat_mind');
      if (saved !== null) {
        setScore(parseInt(saved, 10));
      }
    };
    window.addEventListener('tabletop-state-update', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('tabletop-state-update', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const adjustVal = (delta: number) => {
    setScore(prev => Math.max(1, prev + delta));
  };

  const modifier = Math.floor(score / 10);
  const modSign = '';

  return (
    <div 
      className="relative flex flex-col items-center justify-center select-none"
      title={t("Mind Stat (Score / Modifier)")}
    >
      <div 
        className="relative w-[50px] h-[77.5px] group"
        style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.55))" }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 100 155" 
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <defs>
            <clipPath id="mindGothicClip">
              <path d="M 6,124 L 6,50 A 44,44 0 0,1 94,50 L 94,124 Z" />
            </clipPath>
            <filter id="mindNebulaBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="13" />
            </filter>
            <radialGradient id="mindSpaceBg" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor={theme.stops[0]} />
              <stop offset="60%" stopColor={theme.stops[1]} />
              <stop offset="100%" stopColor={theme.stops[2]} />
            </radialGradient>
          </defs>

          {/* Symmetrical Arch Background Fill */}
          <g clipPath="url(#mindGothicClip)">
            <rect width="100" height="130" fill="url(#mindSpaceBg)" />
            {theme.renderNebula("mindNebulaBlur")}
          </g>

          {/* Symmetrical Stars/Sparkles details */}
          <path d="M 25,36 Q 25,40 21,40 Q 25,40 25,44 Q 25,40 29,40 Q 25,40 25,36" fill="#00ffff" opacity="0.9" />
          <path d="M 75,36 Q 75,40 71,40 Q 75,40 75,44 Q 75,40 79,40 Q 75,40 75,36" fill="#ff71cd" opacity="0.9" />
          <circle cx="50" cy="22" r="0.5" fill="#ffffff" opacity="0.95" />
          <circle cx="30" cy="85" r="0.55" fill="#14fbf4" opacity="0.85" />
          <circle cx="70" cy="85" r="0.55" fill="#14fbf4" opacity="0.85" />
          {/* Added more background starfield particles */}
          <circle cx="15" cy="30" r="0.45" fill="#ffffff" opacity="0.8" />
          <circle cx="85" cy="30" r="0.45" fill="#ffffff" opacity="0.8" />
          <circle cx="20" cy="65" r="0.55" fill="#00ffff" opacity="0.9" />
          <circle cx="80" cy="65" r="0.55" fill="#00ffff" opacity="0.9" />
          <circle cx="35" cy="48" r="0.4" fill="#ff77ff" opacity="0.85" />
          <circle cx="65" cy="48" r="0.4" fill="#ff77ff" opacity="0.85" />
          <circle cx="45" cy="32" r="0.5" fill="#ffff88" opacity="0.9" />
          <circle cx="55" cy="32" r="0.5" fill="#ffff88" opacity="0.9" />
          <circle cx="28" cy="102" r="0.5" fill="#ffffff" opacity="0.75" />
          <circle cx="72" cy="102" r="0.5" fill="#ffffff" opacity="0.75" />
          <circle cx="42" cy="74" r="0.45" fill="#c084fc" opacity="0.8" />
          <circle cx="58" cy="74" r="0.45" fill="#c084fc" opacity="0.8" />

          {/* Symmetrical Gothic Arch Outlines (Double Borders) */}
          <path
            d="M 6,124 L 6,50 A 44,44 0 0,1 94,50 L 94,124 Z"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M 10,120 L 10,50 A 40,40 0 0,1 90,50 L 90,120 Z"
            fill="none"
            stroke="white"
            strokeWidth="1.1"
            opacity="0.85"
          />

          {/* Gothic Catenary / Clover Cusp at the Top Symmetrically */}
          <path
            d="M 12,50 Q 50,11 88,50"
            fill="none"
            stroke="white"
            strokeWidth="1.1"
            opacity="0.8"
          />
          <path
            d="M 50,11 Q 50,25 38,30"
            fill="none"
            stroke="white"
            strokeWidth="1"
            opacity="0.85"
          />
          <path
            d="M 50,11 Q 50,25 62,30"
            fill="none"
            stroke="white"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* Tiny Geometric Corner Wireframes Symmetrically */}
          <line x1="6" y1="112" x2="18" y2="124" stroke="white" strokeWidth="1" opacity="0.75" />
          <line x1="6" y1="117" x2="13" y2="124" stroke="white" strokeWidth="0.8" opacity="0.6" />
          <line x1="94" y1="112" x2="82" y2="124" stroke="white" strokeWidth="1" opacity="0.75" />
          <line x1="94" y1="117" x2="87" y2="124" stroke="white" strokeWidth="0.8" opacity="0.6" />

          {/* Symmetrical Large Upper circle */}
          <circle 
            cx="50" 
            cy="52" 
            r="33" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.3" 
          />
          <circle 
            cx="50" 
            cy="52" 
            r="30" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.8" 
            strokeDasharray="1.5 1.5"
            opacity="0.75" 
          />

          {/* Symmetrical Small Lower Overlapping Circle */}
          <circle 
            cx="50" 
            cy="95" 
            r="26.4" 
            fill={theme.circleFill} 
            stroke="white" 
            strokeWidth="1.3" 
          />
          <circle 
            cx="50" 
            cy="95" 
            r="21.5" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.8" 
            opacity="0.7" 
          />

          {/* Small Cusp detailing inside lower overlapping circle */}
          <path
            d="M 50,111 Q 50,102 44,100"
            fill="none"
            stroke="white"
            strokeWidth="0.8"
            opacity="0.8"
          />
          <path
            d="M 50,111 Q 50,102 56,100"
            fill="none"
            stroke="white"
            strokeWidth="0.8"
            opacity="0.8"
          />

          {/* Decorative Bottom Name Plate Box */}
          <polygon
            points="10,128 90,128 94,132 94,148 90,152 10,152 6,148 6,132"
            fill="#010005"
            stroke="white"
            strokeWidth="1.2"
          />
          <polygon
            points="11,131 89,131 91,133 91,146 89,149 11,149 9,146 9,133"
            fill="none"
            stroke="white"
            strokeWidth="0.8"
            opacity="0.7"
          />

          {/* Stat Name inside the bottom box */}
          <text 
            x="50" 
            y="145.5" 
            textAnchor="middle" 
            fill="#ffffff" 
            stroke="#1c1917"
            strokeWidth="0.7"
            paintOrder="stroke fill"
            className="font-serif text-[15.5px] tracking-wider select-none font-bold"
            style={{ textShadow: "0 0.5px 1.5px rgba(28,25,23,0.6)" }}
          >
            {t("MIND")}
          </text>
        </svg>

        {/* --- Interactive Floating Controls --- */}

        {/* Large Score (Middle) */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/ctl"
          style={{ top: "33.55%" }}
        >
          <button 
            type="button"
            onClick={() => adjustVal(1)}
            className="opacity-0 group-hover/ctl:opacity-100 duration-150 absolute top-[-11px] text-white hover:text-cyan-400 p-0"
          >
            <Plus size={6} strokeWidth={3} />
          </button>

          <input 
            type="text" 
            value={tn(score)}
            onChange={(e) => {
              const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
              const val = parseInt(normalized.replace(/\D/g, ''));
              setScore(isNaN(val) ? 0 : val);
            }}
            className="w-[46px] h-[26px] text-center bg-transparent border-none outline-none text-white font-serif p-0 font-bold focus:ring-0 select-text cursor-text"
            style={{ 
              textShadow: "0.5px 0.5px 0 #1c1917, -0.5px -0.5px 0 #1c1917, 0.5px -0.5px 0 #1c1917, -0.5px 0.5px 0 #1c1917, 0px 0.5px 0 #1c1917, 0px -0.5px 0 #1c1917, 0.5px 0px 0 #1c1917, -0.5px 0px 0 #1c1917, 0px 0px 3px rgba(0,255,255,0.7)",
              fontSize: "20.5px"
            }}
          />

          <button 
            type="button"
            onClick={() => adjustVal(-1)}
            className="opacity-0 group-hover/ctl:opacity-100 duration-150 absolute bottom-[-11px] text-white hover:text-red-400 p-0"
          >
            <Minus size={6} strokeWidth={3} />
          </button>
        </div>

        {/* Modifier value in the small bottom circle */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: "61.29%", marginTop: "1px" }}
        >
          <span 
            className="text-stone-200 font-serif font-black"
            style={{ 
              textShadow: "0.5px 0.5px 0 #1c1917, -0.5px -0.5px 0 #1c1917, 0.5px -0.5px 0 #1c1917, -0.5px 0.5px 0 #1c1917, 0px 0.5px 0 #1c1917, 0px -0.5px 0 #1c1917, 0.5px 0px 0 #1c1917, -0.5px 0px 0 #1c1917, 0px 0px 2.5px rgba(255,255,255,0.95), 0px 0px 5px rgba(255,215,0,0.95), 0px 0px 9px rgba(255,215,0,0.6)",
              fontSize: "21.5px"
            }}
          >
            {tn(`${modifier}`)}
          </span>
        </div>
      </div>
    </div>
  );
}
