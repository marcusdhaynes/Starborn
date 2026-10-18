import React, { useState, useEffect } from 'react';
import { safeStorage } from '../storage';

function getActiveCharacterClassAndRace() {
  const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
  
  // Get Class (Epithet/Mantle)
  const savedClass = safeStorage.getItem(`vtt_char_${activeId}_vtt_char_class`);
  const activeClass = savedClass !== null ? savedClass : (activeId === 'default' ? 'Starborn Outcast' : '');

  // Get Race
  const savedRace = safeStorage.getItem(`vtt_char_${activeId}_vtt_char_race`);
  const activeRace = savedRace !== null ? savedRace : (activeId === 'default' ? 'Aelfborn' : '');
  
  return { mantle: activeClass, race: activeRace };
}

export default function RibbonEnds() {
  const [charInfo, setCharInfo] = useState(() => getActiveCharacterClassAndRace());

  useEffect(() => {
    const handleUpdate = () => {
      setCharInfo(getActiveCharacterClassAndRace());
    };
    window.addEventListener('tabletop-state-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tabletop-state-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const displayMantle = charInfo.mantle.toUpperCase();
  const displayRace = charInfo.race.toUpperCase();

  // Left wing (Epithet/Mantle) font size scaling
  let mantleFontSize = 9.2;
  if (displayMantle.length > 15) {
    mantleFontSize = Math.max(6.2, 9.2 - (displayMantle.length - 15) * 0.35);
  } else if (displayMantle.length > 10) {
    mantleFontSize = Math.max(7.2, 9.2 - (displayMantle.length - 10) * 0.45);
  }
  const mantleDy = Math.max(2.5, mantleFontSize * 0.35);

  // Right wing (Race) font size scaling
  let raceFontSize = 9.2;
  if (displayRace.length > 15) {
    raceFontSize = Math.max(6.2, 9.2 - (displayRace.length - 15) * 0.35);
  } else if (displayRace.length > 10) {
    raceFontSize = Math.max(7.2, 9.2 - (displayRace.length - 10) * 0.45);
  }
  const raceDy = Math.max(2.5, raceFontSize * 0.35);

  return (
    <div 
      id="01_ribbon_ends" 
      className="absolute bottom-[24px] left-1/2 -translate-x-1/2 z-[5] pointer-events-none select-none"
      style={{ width: '317px', height: '51px' }}
    >
      <div id="03_ends" className="relative" style={{ width: '317px', height: '51px' }}>
        <svg 
          width="317" 
          height="51" 
          viewBox="0 0 317 51" 
          xmlns="http://www.w3.org/2000/svg" 
          className="absolute top-0 left-0 w-full h-full filter drop-shadow-[0_2.5px_5px_rgba(0,0,0,0.6)]"
        >
          <defs>
            <linearGradient id="cosmicRibbonEndsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#05081c" /> {/* Dark space blue at the far left edge */}
              <stop offset="25%" stopColor="#1e2270" /> {/* Purple-indigo */}
              <stop offset="50%" stopColor="#cf580c" /> {/* Orange center */}
              <stop offset="75%" stopColor="#1e2270" /> {/* Purple-indigo */}
              <stop offset="100%" stopColor="#05081c" /> {/* Dark space blue at the far right edge */}
            </linearGradient>

            {/* Mathematically exact centerlines matching the slope and curvature of the left and right wings */}
            <path id="ribbonLeftEndPath" d="M 22,35.2 Q 65,32.9 108,32.0" fill="none" />
            <path id="ribbonRightEndPath" d="M 209,32.0 Q 252,32.9 295,35.2" fill="none" />
          </defs>
          
          {/* Arched/Bowed wide rectangle ribbon ends - spans 317px with beautiful triangular fishtail cuts pointing inwards */}
          <path 
            d="M 0,24 Q 158.5,14 317,24 L 297,36.5 L 317,49 Q 158.5,39 0,49 L 20,36.5 L 0,24 Z" 
            fill="url(#cosmicRibbonEndsGradient)" 
            stroke="white" 
            strokeWidth="2"
          />

          {/* Curved Text matching left swallowtail curve - Epithet/Mantle */}
          <text 
            fontSize={mantleFontSize} 
            fontWeight="bold" 
            fontFamily="Inter, system-ui, sans-serif" 
            fill="#ffffff" 
            textAnchor="middle"
            letterSpacing="0.2"
            className="select-none pointer-events-none drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]"
            dy={mantleDy} /* Center vertically within path line height */
          >
            <textPath href="#ribbonLeftEndPath" startOffset="50%">
              {displayMantle}
            </textPath>
          </text>

          {/* Curved Text matching right swallowtail curve - Race */}
          <text 
            fontSize={raceFontSize} 
            fontWeight="bold" 
            fontFamily="Inter, system-ui, sans-serif" 
            fill="#ffe8d6" 
            textAnchor="middle"
            letterSpacing="0.2"
            className="select-none pointer-events-none drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]"
            dy={raceDy} /* Center vertically within path line height */
          >
            <textPath href="#ribbonRightEndPath" startOffset="50%">
              {displayRace}
            </textPath>
          </text>
          
          {/* Stars spread onto the left wing */}
          <circle cx="16" cy="35" r="0.75" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '2.5s', opacity: 0.7 }} />
          <circle cx="36" cy="37" r="0.5" fill="#f7a250" className="opacity-60" />
          <circle cx="60" cy="32" r="1.0" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '1.9s', opacity: 0.85 }} />
          <circle cx="84" cy="36" r="0.6" fill="#f3ff33" className="opacity-70" />
          
          {/* Stars spread onto the right wing */}
          <circle cx="232" cy="36" r="0.6" fill="#f3ff33" className="opacity-70" />
          <circle cx="256" cy="32" r="1.0" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '2.1s', opacity: 0.85 }} />
          <circle cx="280" cy="37" r="0.5" fill="#f7a250" className="opacity-60" />
          <circle cx="300" cy="35" r="0.75" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '2.8s', opacity: 0.7 }} />
        </svg>
      </div>
    </div>
  );
}
