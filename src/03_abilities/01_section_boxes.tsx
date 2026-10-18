import React, { useRef, useState, useEffect } from 'react';
import { StarbornLabel, CompendiumLabel, JournalLabel, InventoryLabel, WeaponsLabel, MagicLabel, TabletopLabel, EmptyEightLabel, DiceLabel } from './01_section_labels';
import DiceRoller from './99_dice';
import Tabletop from './07_tabletop/01_maps/01_maps';
import { safeStorage } from '../storage';

interface PanelProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

function BowedInPanel({ children, style, className = "" }: PanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const { width: W, height: H } = dimensions;
  
  // Reduced radius and spacing offsets for smaller 3x3 grid boxes to look aesthetically perfect
  const R = 14; 
  const d = 3.5;  
  const notchWidth = 12;
  const notchDepth = 5;
  const Ri = R + d;

  // Primary outer path (2px thickness)
  const oPath = W && H ? `
    M ${R} 0
    L ${W / 2 - notchWidth} 0
    L ${W / 2} ${notchDepth}
    L ${W / 2 + notchWidth} 0
    L ${W - R} 0
    A ${R} ${R} 0 0 0 ${W} ${R}
    L ${W} ${H - R}
    A ${R} ${R} 0 0 0 ${W - R} ${H}
    L ${R} ${H}
    A ${R} ${R} 0 0 0 0 ${H - R}
    L 0 ${R}
    A ${R} ${R} 0 0 0 ${R} 0
    Z
  `.replace(/\s+/g, ' ').trim() : '';

  // Parallel Inner border (1px thickness)
  const iPath = W && H ? `
    M ${R + d} ${d}
    L ${W / 2 - notchWidth - d / 2} ${d}
    L ${W / 2} ${notchDepth + d}
    L ${W / 2 + notchWidth + d / 2} ${d}
    L ${W - R - d} ${d}
    A ${Ri} ${Ri} 0 0 0 ${W - d} ${R + d}
    L ${W - d} ${H - R - d}
    A ${Ri} ${Ri} 0 0 0 ${W - R - d} ${H - d}
    L ${R + d} ${H - d}
    A ${Ri} ${Ri} 0 0 0 ${d} ${H - R - d}
    L ${d} ${R + d}
    A ${Ri} ${Ri} 0 0 0 ${R + d} ${d}
    Z
  `.replace(/\s+/g, ' ').trim() : '';

  // Tiny chevron ornament accent just underneath the top-center notch
  const chevY = notchDepth + 4;
  const chevronPath = W && H ? `
    M ${W / 2 - 8} ${chevY}
    L ${W / 2} ${chevY + 3}
    L ${W / 2 + 8} ${chevY}
  `.replace(/\s+/g, ' ').trim() : '';

  const hasOverflow = className.includes('overflow-');
  return (
    <div 
      ref={containerRef}
      className={`flex-1 h-full relative bg-transparent ${hasOverflow ? '' : 'overflow-hidden'} transition-all duration-300 ${className}`}
      style={style}
    >
      {W > 0 && H > 0 && (
        <svg 
          className="absolute inset-0 pointer-events-none z-0" 
          width={W} 
          height={H}
          viewBox={`0 0 ${W} ${H}`}
        >
          {/* Main outer white stroke */}
          <path 
            d={oPath} 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Delicate inner white stroke */}
          <path 
            d={iPath} 
            fill="none" 
            stroke="white" 
            strokeWidth="1" 
            opacity="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Elegant Top Center Chevron Arrow Notch */}
          <path 
            d={chevronPath} 
            fill="none" 
            stroke="white" 
            strokeWidth="1" 
            opacity="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Reduced concentric corner arcs matching the exact styling in the image */}
          {/* Top-Left */}
          <path d={`M 0 ${R + 6} A ${R + 6} ${R + 6} 0 0 0 ${R + 6} 0`} fill="none" stroke="white" strokeWidth="1" opacity="0.25" />
          <path d={`M 0 ${R + 12} A ${R + 12} ${R + 12} 0 0 0 ${R + 12} 0`} fill="none" stroke="white" strokeWidth="1" opacity="0.12" />

          {/* Top-Right */}
          <path d={`M ${W - R - 6} 0 A ${R + 6} ${R + 6} 0 0 0 ${W} ${R + 6}`} fill="none" stroke="white" strokeWidth="1" opacity="0.25" />
          <path d={`M ${W - R - 12} 0 A ${R + 12} ${R + 12} 0 0 0 ${W} ${R + 12}`} fill="none" stroke="white" strokeWidth="1" opacity="0.12" />

          {/* Bottom-Right */}
          <path d={`M ${W} ${H - R - 6} A ${R + 6} ${R + 6} 0 0 0 ${W - R - 6} ${H}`} fill="none" stroke="white" strokeWidth="1" opacity="0.25" />
          <path d={`M ${W} ${H - R - 12} A ${R + 12} ${R + 12} 0 0 0 ${W - R - 12} ${H}`} fill="none" stroke="white" strokeWidth="1" opacity="0.12" />

          {/* Bottom-Left */}
          <path d={`M ${R + 6} ${H} A ${R + 6} ${R + 6} 0 0 0 0 ${H - R - 6}`} fill="none" stroke="white" strokeWidth="1" opacity="0.25" />
          <path d={`M ${R + 12} ${H} A ${R + 12} ${R + 12} 0 0 0 0 ${H - R - 12}`} fill="none" stroke="white" strokeWidth="1" opacity="0.12" />
        </svg>
      )}

      {/* Sparkling Twinkling Starfield in each section box */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1] opacity-50 select-none">
        <div className="absolute w-[1.2px] h-[1.2px] bg-white rounded-full top-[25%] left-[22%] animate-pulse" />
        <div className="absolute w-1 h-1 bg-cyan-200 rounded-full top-[65%] left-[78%] animate-pulse" style={{ animationDuration: '3.5s' }} />
        <div className="absolute w-[1px] h-[1px] bg-white rounded-full top-[75%] left-[30%]" />
        <div className="absolute w-1 h-1 bg-fuchsia-300 rounded-full top-[30%] left-[85%] animate-pulse" style={{ animationDuration: '4.2s' }} />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center pt-3 pb-2 px-3">
        {children}
      </div>
    </div>
  );
}

export default function AbilitiesSections() {
  const [isThrown, setIsThrown] = useState(() => safeStorage.getItem('tabletop_is_thrown') === 'true');
  const [bgOpacity, setBgOpacity] = useState(() => {
    const saved = safeStorage.getItem('tabletop_app_opacity');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    return (safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical';
  });

  useEffect(() => {
    const handleUpdate = () => {
      setIsThrown(safeStorage.getItem('tabletop_is_thrown') === 'true');
      const opacitySaved = safeStorage.getItem('tabletop_app_opacity');
      setBgOpacity(opacitySaved ? parseInt(opacitySaved, 10) : 100);
      const savedOrientation = safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal';
      if (savedOrientation) {
        setLayoutOrientation(savedOrientation);
      } else {
        setLayoutOrientation('vertical');
      }
    };
    
    const handleDragStart = () => setIsMapDragging(true);
    const handleDragEnd = () => setIsMapDragging(false);

    window.addEventListener('tabletop-state-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('tabletop-drag-start', handleDragStart);
    window.addEventListener('tabletop-drag-end', handleDragEnd);
    
    return () => {
      window.removeEventListener('tabletop-state-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('tabletop-drag-start', handleDragStart);
      window.removeEventListener('tabletop-drag-end', handleDragEnd);
    };
  }, []);

  const fadeStyle = isThrown ? { opacity: bgOpacity / 100, pointerEvents: bgOpacity === 0 ? 'none' as const : 'auto' as const } : undefined;

  return (
    <div 
      className={`absolute left-0 right-0 bottom-0 ${isMapDragging ? 'z-[9999]' : 'z-[10]'}`}
      style={{
        top: layoutOrientation === 'horizontal' ? "calc(1% + 115px)" : "calc(1% + 202px)",
        padding: "1%",
      }}
    >
      <div className="w-full h-full flex gap-[1%]">
        
        {/* Column 1 (Left) - Divided Vertically into 3 Boxes */}
        <div className="flex-1 w-0 min-w-0 flex flex-col gap-[1.5%] h-full">
          <BowedInPanel style={fadeStyle}>
            <StarbornLabel />
          </BowedInPanel>
          <BowedInPanel style={fadeStyle}>
            <CompendiumLabel />
          </BowedInPanel>
          <BowedInPanel style={fadeStyle}>
            <JournalLabel />
          </BowedInPanel>
        </div>

        {/* Column 2 (Middle) - Divided Vertically into 3 Boxes */}
        <div className="flex-1 w-0 min-w-0 flex flex-col gap-[1.5%] h-full">
          <BowedInPanel style={fadeStyle}>
            <WeaponsLabel />
          </BowedInPanel>
          <BowedInPanel style={fadeStyle}>
            <MagicLabel />
          </BowedInPanel>
          <BowedInPanel style={fadeStyle} className="overflow-visible z-[140]">
            <InventoryLabel />
          </BowedInPanel>
        </div>

        {/* Column 3 (Right) - Divided Vertically into 3 Boxes */}
        <div className="flex-1 w-0 min-w-0 flex flex-col gap-[1.5%] h-full">
          <BowedInPanel className="overflow-visible z-50">
            <Tabletop />
          </BowedInPanel>
          <BowedInPanel style={fadeStyle}>
            <EmptyEightLabel />
          </BowedInPanel>
          <BowedInPanel style={fadeStyle} className="overflow-visible z-[140]">
            <div className="w-full h-full flex flex-col items-center justify-between col-span-1">
              <DiceLabel />
              <div className="flex-1 w-full mt-1 relative overflow-visible flex items-center justify-center">
                <DiceRoller />
              </div>
            </div>
          </BowedInPanel>
        </div>

      </div>
    </div>
  );
}
