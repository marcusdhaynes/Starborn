import React from 'react';

interface MagicMeterProps {
  currentMagic: number;
  maxMagic: number;
  onReplenish?: () => void;
  onRest?: (percent: number) => void;
}

export default function MagicMeter({ currentMagic, maxMagic }: MagicMeterProps) {
  const percentage = maxMagic > 0 ? Math.min(100, Math.max(0, (currentMagic / maxMagic) * 100)) : 0;
  
  return (
    <div className="flex items-center justify-between w-full gap-1.5 py-0.5 select-none">
      {/* Current Magic Value on Left */}
      <span className="font-mono font-extrabold text-[#c084fc] text-[8.5px] leading-none shrink-0 min-w-[20px] text-left drop-shadow-[0_0_4px_rgba(168,85,247,0.2)]">
        {currentMagic.toLocaleString()}
      </span>

      {/* Progress Bar Track in Middle */}
      <div className="flex-1 h-1 bg-stone-900 border border-white/5 rounded-full overflow-hidden relative group/bar">
        {/* Glow behind the bar */}
        <div 
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-300 ease-out opacity-25 filter blur-[1px]"
          style={{ width: `${percentage}%` }}
        />
        {/* Solid bar */}
        <div 
          className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400 transition-all duration-300 ease-out rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] relative"
          style={{ width: `${percentage}%` }}
        >
          {/* Active magical shimmer particle overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
        </div>
      </div>

      {/* Max Magic Value on Right */}
      <span className="font-mono font-medium text-stone-500 text-[8.5px] leading-none shrink-0 min-w-[20px] text-right">
        {maxMagic.toLocaleString()}
      </span>
    </div>
  );
}
