import React, { useState, useEffect } from 'react';
import { safeStorage } from '../storage';

function getActiveCharacterName() {
  const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
  let name = 'Default Hero';
  const saved = safeStorage.getItem('setting_vtt_characters');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const found = parsed.find((c: any) => c.id === activeId);
        if (found) {
          name = found.name;
        }
      }
    } catch (e) {
      console.error("Error parsing characters in RibbonFront:", e);
    }
  }
  return name;
}

export default function RibbonFront() {
  const [name, setName] = useState(() => getActiveCharacterName());

  useEffect(() => {
    const handleUpdate = () => {
      setName(getActiveCharacterName());
    };
    window.addEventListener('tabletop-state-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tabletop-state-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const displayName = name.toUpperCase();
  
  // Dynamic scaling for font size based on string length
  let fontSize = 11.5;
  if (displayName.length > 14) {
    fontSize = Math.max(7.2, 11.5 - (displayName.length - 14) * 0.45);
  } else if (displayName.length > 9) {
    fontSize = Math.max(8.5, 11.5 - (displayName.length - 9) * 0.6);
  }

  // Adjust vertical placement tweak based on font size to keep centered
  const dy = Math.max(3.0, fontSize * 0.35);

  return (
    <div 
      id="01_ribbon" 
      className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 w-[132px] h-[51px] z-[250] pointer-events-none select-none"
    >
      <div id="01_front" className="w-[132px] h-[51px] relative">
        <svg 
          width="132" 
          height="51" 
          viewBox="0 0 132 51" 
          xmlns="http://www.w3.org/2000/svg" 
          className="absolute top-0 left-0 w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          <defs>
            <linearGradient id="cosmicRibbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1335" /> {/* Deep space blue */}
              <stop offset="35%" stopColor="#1e2270" /> {/* Space indigo/purple */}
              <stop offset="70%" stopColor="#cf580c" /> {/* Celestial orange nebula */}
              <stop offset="100%" stopColor="#f7a250" /> {/* Light orange star flare */}
            </linearGradient>

            {/* Mathematically precise vertical centerline of front ribbon */}
            <path id="ribbonFrontPath" d="M 4,13.25 Q 66,36.35 128,13.25" fill="none" />
          </defs>

          {/* Arched/Bowed rectangle ribbon */}
          <path 
            d="M 0,0 Q 66,23.1 132,0 Q 126,13.2 132,26.5 Q 66,49.6 0,26.5 Q 6,13.2 0,0 Z" 
            fill="url(#cosmicRibbonGradient)" 
            stroke="white" 
            strokeWidth="2"
          />
          
          {/* Glowing nebulous starry points */}
          <circle cx="15" cy="18" r="0.85" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '1.8s', opacity: 0.8 }} />
          <circle cx="28" cy="34" r="0.6" fill="#f7a250" className="opacity-70" />
          <circle cx="42" cy="28" r="1.1" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '2.4s', opacity: 0.9 }} />
          <circle cx="58" cy="36" r="0.5" fill="#33ff57" className="opacity-60" />
          <circle cx="74" cy="34" r="1.2" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '2.1s', opacity: 0.95 }} />
          <circle cx="92" cy="27" r="0.75" fill="#ffffff" />
          <circle cx="106" cy="28" r="1.0" fill="#f3ff33" className="animate-pulse" style={{ animationDuration: '1.6s', opacity: 0.9 }} />
          <circle cx="118" cy="19" r="0.8" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '2.2s', opacity: 0.85 }} />

          {/* Curved Text matching center curve - Hero Name */}
          <text 
            fontSize={fontSize} 
            fontWeight="black" 
            fontFamily="Inter, system-ui, sans-serif" 
            fill="#ffffff" 
            letterSpacing="0.2"
            className="select-none pointer-events-none drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]"
            dy={dy}
          >
            <textPath href="#ribbonFrontPath" startOffset="50%" textAnchor="middle">
              {displayName}
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}
