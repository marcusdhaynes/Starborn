import React from 'react';

export default function RibbonBack() {
  return (
    <div 
      id="01_ribbon_back" 
      className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 w-[132px] h-[74px] z-[10] pointer-events-none select-none"
    >
      <div id="02_back" className="w-[132px] h-[74px] relative">
        <svg 
          width="132" 
          height="74" 
          viewBox="0 0 132 74" 
          xmlns="http://www.w3.org/2000/svg" 
          className="absolute top-0 left-0 w-full h-full filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]"
        >
          <defs>
            <linearGradient id="cosmicRibbonBackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#05081c" /> {/* Darkest deep space blue */}
              <stop offset="50%" stopColor="#121445" /> {/* Under shadow purple-indigo */}
              <stop offset="100%" stopColor="#8c3605" /> {/* Dark nebula orange accent */}
            </linearGradient>
          </defs>
          {/* Arched/Bowed background rectangle ribbon - flipped top arc to curve UP and bottom arc to curve DOWN */}
          <path 
            d="M 0,23.1 Q 66,0 132,23.1 Q 126,36.3 132,49.6 Q 66,72.7 0,49.6 Q 6,36.3 0,23.1 Z" 
            fill="url(#cosmicRibbonBackGradient)" 
            stroke="white" 
            strokeWidth="2"
          />
          
          {/* Subtle cosmic elements or glowing stars on the backing for background mystery */}
          <circle cx="20" cy="43.1" r="0.5" fill="#f7a250" className="opacity-50" />
          <circle cx="66" cy="53.1" r="0.75" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '3s', opacity: 0.6 }} />
          <circle cx="112" cy="45.1" r="0.5" fill="#f3ff33" className="opacity-50" />
        </svg>
      </div>
    </div>
  );
}
