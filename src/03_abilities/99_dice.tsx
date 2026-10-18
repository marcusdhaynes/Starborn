import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, RotateCcw, Plus, Minus } from 'lucide-react';
import { safeStorage } from '../storage';
import { getActiveDiceZIndex, getActiveDiceShadowZIndex } from '../layers';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  opacity: number;
  vx: number;
  vy: number;
}

interface DieInstance {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  height: number;
  vHeight: number;
  currentValue: number;
  targetValue?: number;
  landingFaceSelected: boolean;
  targetRotX: number;
  targetRotY: number;
  targetRotZ: number;
  spawnTime?: number;
  opacity?: number;
  isFading?: boolean;
}

// Map target face to standard rotation angles
const getNearestCongruentAngles = (currentX: number, currentY: number, currentZ: number, face: number) => {
  let baseRegX = 0, baseRegY = 0, baseRegZ = 0;
  switch (face) {
    case 1: baseRegX = 0; baseRegY = 0; baseRegZ = 0; break;      // Front
    case 2: baseRegX = 0; baseRegY = -90; baseRegZ = 0; break;    // Face 2 (styled with rotateY(90deg) translateZ, needs cube rotY = -90 to face front)
    case 3: baseRegX = 90; baseRegY = 0; baseRegZ = 0; break;     // Face 3 (styled with rotateX(-90deg) translateZ, needs cube rotX = 90 to face front)
    case 4: baseRegX = -90; baseRegY = 0; baseRegZ = 0; break;    // Face 4 (styled with rotateX(90deg) translateZ, needs cube rotX = -90 to face front)
    case 5: baseRegX = 0; baseRegY = 90; baseRegZ = 0; break;     // Face 5 (styled with rotateY(-90deg) translateZ, needs cube rotY = 90 to face front)
    case 6: baseRegX = 0; baseRegY = 180; baseRegZ = 0; break;    // Back
  }
  
  return {
    x: Math.round((currentX - baseRegX) / 360) * 360 + baseRegX,
    y: Math.round((currentY - baseRegY) / 360) * 360 + baseRegY,
    z: Math.round((currentZ - baseRegZ) / 360) * 360 + baseRegZ,
  };
};

// Map current angles to closest values congruent to the upright default (0, 0, 0)
const getNearestHomeAngles = (currentX: number, currentY: number, currentZ: number) => {
  const baseRegX = 0, baseRegY = 0, baseRegZ = 0;
  return {
    x: Math.round((currentX - baseRegX) / 360) * 360 + baseRegX,
    y: Math.round((currentY - baseRegY) / 360) * 360 + baseRegY,
    z: Math.round((currentZ - baseRegZ) / 360) * 360 + baseRegZ,
  };
};

// Compute standard rotation and get Z component of a face normal vector
const getZOfNormal = (normal: [number, number, number], rx: number, ry: number, rz: number) => {
  const radX = rx * Math.PI / 180;
  const radY = ry * Math.PI / 180;
  const radZ = rz * Math.PI / 180;

  const [x, y, z] = normal;

  // 1. Rotate around Z:
  const x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
  const y1 = x * Math.sin(radZ) + y * Math.cos(radZ);
  const z1 = z;

  // 2. Rotate around Y:
  const x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  const y2 = y1;
  const z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);

  // 3. Rotate around X:
  const z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

  return z3;
};

// Determine which face is pointing closest to the viewer
const getMostVisibleFace = (rx: number, ry: number, rz: number): number => {
  const faces = [
    { id: 1, normal: [0, 0, 1] as [number, number, number] },
    { id: 6, normal: [0, 0, -1] as [number, number, number] },
    { id: 2, normal: [1, 0, 0] as [number, number, number] }, // Matches style rotateY(90deg)
    { id: 5, normal: [-1, 0, 0] as [number, number, number] }, // Matches style rotateY(-90deg)
    { id: 3, normal: [0, 1, 0] as [number, number, number] },
    { id: 4, normal: [0, -1, 0] as [number, number, number] },
  ];

  let maxZ = -Infinity;
  let bestFace = 1;

  for (const face of faces) {
    const zVal = getZOfNormal(face.normal, rx, ry, rz);
    if (zVal > maxZ) {
      maxZ = zVal;
      bestFace = face.id;
    }
  }

  return bestFace;
};

export default function DiceRoller() {
  const [diceTheme, setDiceTheme] = useState<string>(() => {
    return safeStorage.getItem('setting_dice_theme') || 'amber';
  });

  useEffect(() => {
    const handleStorageUpdate = () => {
      setDiceTheme(safeStorage.getItem('setting_dice_theme') || 'amber');
    };
    window.addEventListener('tabletop-state-update', handleStorageUpdate);
    return () => window.removeEventListener('tabletop-state-update', handleStorageUpdate);
  }, []);

  const [menuBackdropActive, setMenuBackdropActive] = useState(false);

  useEffect(() => {
    const checkState = () => {
      setMenuBackdropActive(!!(window as any).__vtt_menu_open || !!(window as any).__vtt_settings_open || !!(window as any).__vtt_codex_open);
    };
    window.addEventListener('vtt-menu-update', checkState);
    checkState();
    return () => {
      window.removeEventListener('vtt-menu-update', checkState);
    };
  }, []);

  const [currentValue, setCurrentValue] = useState<number>(6);
  const [hasNumber, setHasNumber] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const allSettledTimestamp = useRef<number | null>(null);

  // Tally state: click count on settled dice, behaves as number of dice to throw
  const [tallyCount, setTallyCount] = useState<number>(1);
  const [renderedDice, setRenderedDice] = useState<{ id: number }[]>([{ id: 0 }]);

  // Fast-computation storage for extra virtual dice when rolling a large amount
  const extraDiceValues = useRef<number[]>([]);
  const [allRollValues, setAllRollValues] = useState<number[]>([]);
  const [hoveredTooltipState, setHoveredTooltipState] = useState<string | null>(null);
  const setHoveredTooltip = (val: string | null) => {
    if (val !== null && safeStorage.getItem('setting_hover_text') !== 'on') {
      setHoveredTooltipState(null);
      return;
    }
    setHoveredTooltipState(val);
  };
  const hoveredTooltip = hoveredTooltipState;
  const [hoveredScrollerItemAction, setHoveredScrollerItemAction] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'order' | 'low-high' | 'high-low'>('order');
  const [selectedRollIndexes, setSelectedRollIndexes] = useState<number[]>([]);
  const remainingRollValuesRef = useRef<number[]>([]);
  const isRerollingRef = useRef<boolean>(false);
  const pendingRollInfo = useRef<{
    formulaName: string;
    statContext?: string;
    modifier: number;
    numSides: number;
  } | null>(null);

  // Dragging states and refs for secondary physical red reroll die throwing
  const isRerollDragging = useRef<boolean>(false);
  const rerollDragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rerollX = useRef<number>(0);
  const rerollY = useRef<number>(0);
  const rerollHasDragged = useRef<boolean>(false);
  const rerollTouchTrack = useRef<{ x: number; y: number; t: number }[]>([]);
  const [rerollVisualOffset, setRerollVisualOffset] = useState({ x: 0, y: 0 });

  // Dragging states and refs for tertiary green add roll die throwing
  const [addTallyCount, setAddTallyCount] = useState<number>(1);
  const isAddDragging = useRef<boolean>(false);
  const addDragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const addX = useRef<number>(0);
  const addY = useRef<number>(0);
  const addHasDragged = useRef<boolean>(false);
  const addTouchTrack = useRef<{ x: number; y: number; t: number }[]>([]);
  const [addVisualOffset, setAddVisualOffset] = useState({ x: 0, y: 0 });

  // Bounding coords for resting placeholders relative to viewport
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const coordsRef = useRef({ x: 0, y: 0 });
  const coordsStateRef = useRef({ x: 0, y: 0 });
  const placeholderRef = useRef<HTMLDivElement>(null);

  // References for pure physics (prevents React state latency)
  const x = useRef<number>(0);
  const y = useRef<number>(0);
  const vx = useRef<number>(0);
  const vy = useRef<number>(0);
  
  // 3D Rotations
  const rotX = useRef<number>(0);
  const rotY = useRef<number>(0);
  const rotZ = useRef<number>(0);
  const vRotX = useRef<number>(0);
  const vRotY = useRef<number>(0);
  const vRotZ = useRef<number>(0);

  // Simulated height bounces
  const height = useRef<number>(0);
  const vHeight = useRef<number>(0);

  const isReturningToHome = useRef<boolean>(false);
  const hasDragged = useRef<boolean>(false);
  const currentScale = useRef<number>(0.72);

  const landingFaceSelected = useRef<boolean>(false);
  const targetRotX = useRef<number>(0);
  const targetRotY = useRef<number>(0);
  const targetRotZ = useRef<number>(0);

  const requestRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);

  // Separate physics storage of multiple dice structures
  const dicePhysics = useRef<DieInstance[]>([
    {
      id: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      vRotX: 0,
      vRotY: 0,
      vRotZ: 0,
      height: 0,
      vHeight: 0,
      currentValue: 6,
      landingFaceSelected: false,
      targetRotX: 0,
      targetRotY: 0,
      targetRotZ: 0,
    }
  ]);

  // Synthesize resin dice bounce sounds
  const playHitSound = (speed: number) => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'triangle';
      const vol = Math.min(0.18, Math.abs(speed) / 380);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      
      osc.frequency.setValueAtTime(130 + Math.random() * 60, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio autoplay restrictions
    }
  };

  // Synthesize a beautiful escalating chime for dice click-tallying
  const playTallyClickSound = (count: number) => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      const pitch = 230 + count * 55;
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      
      osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.35, audioCtx.currentTime + 0.04);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      // Audio autoplay restrictions
    }
  };

  // Center dice location tracker
  useEffect(() => {
    if (!placeholderRef.current) return;
    const updateCoords = () => {
      const rect = placeholderRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        coordsRef.current = { x: cx, y: cy };
        coordsStateRef.current = { x: cx, y: cy };
        setCoords({ x: cx, y: cy });
      }
    };

    updateCoords();

    const resizeObserver = new ResizeObserver(() => {
      updateCoords();
    });
    if (placeholderRef.current) {
      resizeObserver.observe(placeholderRef.current);
    }

    const scrollHandler = () => requestAnimationFrame(updateCoords);
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', updateCoords, { passive: true });

    const timer = setTimeout(updateCoords, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', updateCoords);
      clearTimeout(timer);
    };
  }, []);

  // Rolls with direction input and current tally count support
  const triggerRoll = (initialVx: number = 0, initialVy: number = 0, overrideCount?: number, overrideValues?: number[]) => {
    if (isRolling && overrideCount === undefined) return;
    setHasNumber(true);
    setIsRolling(true);
    setShowResults(false);
    allSettledTimestamp.current = null;
    landingFaceSelected.current = false;
    setSelectedRollIndexes([]);
    isRerollingRef.current = false;
    isReturningToHome.current = false;

    if (overrideCount === undefined) {
      pendingRollInfo.current = {
        formulaName: "Manual Roll",
        modifier: 0,
        numSides: 6,
      };
    }

    if (overrideCount !== undefined) {
      x.current = 0;
      y.current = 0;
      vx.current = 0;
      vy.current = 0;
    }
    
    // Support visual throwing of ALL tallyCount dice!
    // Since they fade out after 200ms, they won't cause performance/lag issues.
    const count = overrideCount !== undefined ? overrideCount : tallyCount;
    const physicalCount = count;

    extraDiceValues.current = [];
    setAllRollValues([]);
    setSortMode('order');

    // Update render list for visual dice
    const newDice = Array.from({ length: physicalCount }, (_, i) => ({ id: i }));
    setRenderedDice(newDice);

    const diceArray: DieInstance[] = [];
    const rollStart = Date.now();
    for (let i = 0; i < physicalCount; i++) {
      let dVx = initialVx;
      let dVy = initialVy;

      if (initialVx !== 0 || initialVy !== 0) {
        // User threw/flicked it. Add randomized spreading velocity so they scatter!
        const spread = i === 0 ? 0 : (Math.random() * 8 + 4);
        const angleOffset = Math.random() * Math.PI * 2;
        dVx += Math.cos(angleOffset) * spread;
        dVy += Math.sin(angleOffset) * spread;
      } else {
        // Simulated roll (click tap)
        const angle = Math.random() * Math.PI * 2 + (i * Math.PI * 2 / physicalCount);
        const speed = Math.random() * 8 + 12;
        dVx = Math.cos(angle) * speed;
        dVy = Math.sin(angle) * speed;
      }

      // Limit max throwing speed
      const speed = Math.sqrt(dVx * dVx + dVy * dVy);
      const maxSpeed = 35;
      if (speed > maxSpeed) {
        dVx = (dVx / speed) * maxSpeed;
        dVy = (dVy / speed) * maxSpeed;
      }

      // Rotational velocities respect throw direction
      const dVRotX = -dVy * 2.8 + (Math.random() - 0.5) * 14;
      const dVRotY = dVx * 2.8 + (Math.random() - 0.5) * 14;
      const dVRotZ = (Math.random() - 0.5) * 20;

      // Bounce altitude jump (low and realistic, no high jumping)
      const dVHeight = Math.random() * 0.8 + 0.5;
      const dHeight = i === 0 ? height.current : (Math.random() * 0.5 + 0.5);

      let finalValue = Math.floor(Math.random() * 6) + 1;
      if (overrideValues && overrideValues[i] !== undefined) {
        finalValue = overrideValues[i];
      }

      const spawnX = overrideCount !== undefined ? 0 : x.current;
      const spawnY = overrideCount !== undefined ? 0 : y.current;
      const spawnRotX = overrideCount !== undefined ? 0 : rotX.current;
      const spawnRotY = overrideCount !== undefined ? 0 : rotY.current;
      const spawnRotZ = overrideCount !== undefined ? 0 : rotZ.current;

      diceArray.push({
        id: i,
        x: spawnX + (i > 0 ? (Math.random() - 0.5) * 20 : 0),
        y: spawnY + (i > 0 ? (Math.random() - 0.5) * 20 : 0),
        vx: dVx,
        vy: dVy,
        rotX: spawnRotX + (i > 0 ? Math.random() * 360 : 0),
        rotY: spawnRotY + (i > 0 ? Math.random() * 360 : 0),
        rotZ: spawnRotZ + (i > 0 ? Math.random() * 360 : 0),
        vRotX: dVRotX,
        vRotY: dVRotY,
        vRotZ: dVRotZ,
        height: i === 0 ? height.current : dHeight,
        vHeight: i === 0 ? vHeight.current : dVHeight,
        currentValue: finalValue,
        targetValue: finalValue,
        landingFaceSelected: false,
        targetRotX: 0,
        targetRotY: 0,
        targetRotZ: 0,
        spawnTime: rollStart,
        opacity: 1,
        isFading: false,
      });
    }

    dicePhysics.current = diceArray;
    playHitSound(500);
  };

  const triggerRollRef = useRef(triggerRoll);
  triggerRollRef.current = triggerRoll;

  useEffect(() => {
    const handleRemoteRoll = (e: Event) => {
      const customEvent = e as CustomEvent<{ 
        count: number; 
        sides: number; 
        values?: number[];
        formulaName?: string;
        statContext?: string;
        modifier?: number;
      }>;
      if (customEvent.detail) {
        const { count, values, sides, formulaName, statContext, modifier } = customEvent.detail;
        pendingRollInfo.current = {
          formulaName: formulaName || "VTT Roll",
          statContext: statContext,
          modifier: modifier || 0,
          numSides: sides || 6,
        };
        triggerRollRef.current(0, 0, count || 1, values);
      }
    };
    window.addEventListener('vtt-remote-roll', handleRemoteRoll);
    return () => {
      window.removeEventListener('vtt-remote-roll', handleRemoteRoll);
    };
  }, []);

  const rerollSelected = (initialVx: number = 0, initialVy: number = 0, startOffsetX: number = 0, startOffsetY: number = 0) => {
    if (isReturningToHome.current) return;
    if (selectedRollIndexes.length === 0) return;

    // Filter out the selected rolls
    const remainingRolls = allRollValues.filter((_, idx) => !selectedRollIndexes.includes(idx));
    
    // We are rolling selectedRollIndexes.length new dice!
    const countToRoll = selectedRollIndexes.length;

    setIsRolling(true);
    setHasNumber(true);
    setShowResults(false);
    allSettledTimestamp.current = null;
    landingFaceSelected.current = false;

    // Save the remaining rolls so we can merge them once settled
    remainingRollValuesRef.current = remainingRolls;
    isRerollingRef.current = true;

    // Setup physical render list for ONLY the newly rolled dice
    const newDice = Array.from({ length: countToRoll }, (_, i) => ({ id: i }));
    setRenderedDice(newDice);

    const diceArray: DieInstance[] = [];
    const rollStart = Date.now();
    for (let i = 0; i < countToRoll; i++) {
      let dVx = initialVx;
      let dVy = initialVy;

      if (initialVx !== 0 || initialVy !== 0) {
        // User threw/flicked it. Add randomized spreading velocity so they scatter!
        const spread = i === 0 ? 0 : (Math.random() * 8 + 4);
        const angleOffset = Math.random() * Math.PI * 2;
        dVx += Math.cos(angleOffset) * spread;
        dVy += Math.sin(angleOffset) * spread;
      } else {
        const angle = Math.random() * Math.PI * 2 + (i * Math.PI * 2 / countToRoll);
        const speed = Math.random() * 8 + 12;
        dVx = Math.cos(angle) * speed;
        dVy = Math.sin(angle) * speed;
      }

      // Limit max throwing speed
      const speedMag = Math.sqrt(dVx * dVx + dVy * dVy);
      const maxSpeed = 35;
      if (speedMag > maxSpeed) {
        dVx = (dVx / speedMag) * maxSpeed;
        dVy = (dVy / speedMag) * maxSpeed;
      }

      const dVRotX = -dVy * 2.8 + (Math.random() - 0.5) * 14;
      const dVRotY = dVx * 2.8 + (Math.random() - 0.5) * 14;
      const dVRotZ = (Math.random() - 0.5) * 20;

      const dVHeight = Math.random() * 0.8 + 0.5;
      const dHeight = Math.random() * 0.5 + 0.5;

      const finalValue = Math.floor(Math.random() * 6) + 1;

      // Start position offset by where they dragged/grabbed the red die
      const startXVal = startOffsetX + (i > 0 ? (Math.random() - 0.5) * 20 : 0);
      const startYVal = startOffsetY + (i > 0 ? (Math.random() - 0.5) * 20 : 0);

      diceArray.push({
        id: i,
        x: startXVal,
        y: startYVal,
        vx: dVx,
        vy: dVy,
        rotX: Math.random() * 360,
        rotY: Math.random() * 360,
        rotZ: Math.random() * 360,
        vRotX: dVRotX,
        vRotY: dVRotY,
        vRotZ: dVRotZ,
        height: dHeight,
        vHeight: dVHeight,
        currentValue: finalValue,
        targetValue: finalValue,
        landingFaceSelected: false,
        targetRotX: 0,
        targetRotY: 0,
        targetRotZ: 0,
        spawnTime: rollStart,
        opacity: 1,
        isFading: false,
      });
    }

    dicePhysics.current = diceArray;
    
    // Clear selections since they are being rolled right now!
    setSelectedRollIndexes([]);
    
    playHitSound(500);
  };

  const handleRerollPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (selectedRollIndexes.length === 0) return;
    if (isRolling) return;
    
    isRerollDragging.current = true;
    rerollHasDragged.current = false;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    
    rerollDragStartPos.current = { x: e.clientX, y: e.clientY };
    rerollX.current = 0;
    rerollY.current = 0;
    setRerollVisualOffset({ x: 0, y: 0 });
    rerollTouchTrack.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    playHitSound(120);
  };

  const handleRerollPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isRerollDragging.current) return;
    
    const dx = e.clientX - rerollDragStartPos.current.x;
    const dy = e.clientY - rerollDragStartPos.current.y;
    
    const displacement = Math.hypot(e.clientX - rerollTouchTrack.current[0].x, e.clientY - rerollTouchTrack.current[0].y);
    if (displacement > 5) {
      rerollHasDragged.current = true;
    }
    
    rerollX.current += dx;
    rerollY.current += dy;
    
    setRerollVisualOffset({ x: rerollX.current, y: rerollY.current });
    
    rerollDragStartPos.current = { x: e.clientX, y: e.clientY };
    rerollTouchTrack.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (rerollTouchTrack.current.length > 5) rerollTouchTrack.current.shift();
  };

  const handleRerollPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isRerollDragging.current) return;
    
    isRerollDragging.current = false;
    (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    
    // Reset visual coordinates immediately for layout safety
    setRerollVisualOffset({ x: 0, y: 0 });

    if (!rerollHasDragged.current) {
      // Simple Tap fallback
      rerollSelected(0, 0, 0, 0);
      return;
    }

    if (rerollTouchTrack.current.length >= 2) {
      const pFirst = rerollTouchTrack.current[0];
      const pLast = rerollTouchTrack.current[rerollTouchTrack.current.length - 1];
      const dt = (pLast.t - pFirst.t) || 1;
      const throwVx = (pLast.x - pFirst.x) / dt * 16.66;
      const throwVy = (pLast.y - pFirst.y) / dt * 16.66;

      const mag = Math.sqrt(throwVx * throwVx + throwVy * throwVy);

      // Flick detection
      if (mag > 4.5) {
        rerollSelected(throwVx, throwVy, rerollX.current, rerollY.current);
        return;
      }

      // Drag and drop / slow release: start the reroll at the final offsets
      rerollSelected(throwVx * 0.35, throwVy * 0.35, rerollX.current, rerollY.current);
      return;
    }

    // Default reroll fallback
    rerollSelected(0, 0, rerollX.current, rerollY.current);
  };

  const addRollSelected = (initialVx: number = 0, initialVy: number = 0, startOffsetX: number = 0, startOffsetY: number = 0) => {
    if (isReturningToHome.current) return;
    if (addTallyCount === 0) return;

    // Keep all current rolls
    const remainingRolls = [...allRollValues];
    const countToRoll = addTallyCount;

    setIsRolling(true);
    setHasNumber(true);
    setShowResults(false);
    allSettledTimestamp.current = null;
    landingFaceSelected.current = false;

    // Save remaining so they get merged when settled
    remainingRollValuesRef.current = remainingRolls;
    isRerollingRef.current = true;

    // Setup physical render list
    const newDice = Array.from({ length: countToRoll }, (_, i) => ({ id: i }));
    setRenderedDice(newDice);

    const diceArray: DieInstance[] = [];
    const rollStart = Date.now();
    for (let i = 0; i < countToRoll; i++) {
      let dVx = initialVx;
      let dVy = initialVy;

      if (initialVx !== 0 || initialVy !== 0) {
        // Spread
        const spread = i === 0 ? 0 : (Math.random() * 8 + 4);
        const angleOffset = Math.random() * Math.PI * 2;
        dVx += Math.cos(angleOffset) * spread;
        dVy += Math.sin(angleOffset) * spread;
      } else {
        const angle = Math.random() * Math.PI * 2 + (i * Math.PI * 2 / countToRoll);
        const speed = Math.random() * 8 + 12;
        dVx = Math.cos(angle) * speed;
        dVy = Math.sin(angle) * speed;
      }

      const speedMag = Math.sqrt(dVx * dVx + dVy * dVy);
      const maxSpeed = 35;
      if (speedMag > maxSpeed) {
        dVx = (dVx / speedMag) * maxSpeed;
        dVy = (dVy / speedMag) * maxSpeed;
      }

      const dVRotX = -dVy * 2.8 + (Math.random() - 0.5) * 14;
      const dVRotY = dVx * 2.8 + (Math.random() - 0.5) * 14;
      const dVRotZ = (Math.random() - 0.5) * 20;

      const dVHeight = Math.random() * 0.8 + 0.5;
      const dHeight = Math.random() * 0.5 + 0.5;

      const finalValue = Math.floor(Math.random() * 6) + 1;

      const startXVal = startOffsetX + (i > 0 ? (Math.random() - 0.5) * 20 : 0);
      const startYVal = startOffsetY + (i > 0 ? (Math.random() - 0.5) * 20 : 0);

      diceArray.push({
        id: i,
        x: startXVal,
        y: startYVal,
        vx: dVx,
        vy: dVy,
        rotX: Math.random() * 360,
        rotY: Math.random() * 360,
        rotZ: Math.random() * 360,
        vRotX: dVRotX,
        vRotY: dVRotY,
        vRotZ: dVRotZ,
        height: dHeight,
        vHeight: dVHeight,
        currentValue: finalValue,
        targetValue: finalValue,
        landingFaceSelected: false,
        targetRotX: 0,
        targetRotY: 0,
        targetRotZ: 0,
        spawnTime: rollStart,
        opacity: 1,
        isFading: false,
      });
    }

    dicePhysics.current = diceArray;
    
    setAddTallyCount(1);
    setSelectedRollIndexes([]);
    
    playHitSound(500);
  };

  const handleAddPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isRolling) return;
    
    isAddDragging.current = true;
    addHasDragged.current = false;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    
    addDragStartPos.current = { x: e.clientX, y: e.clientY };
    addX.current = 0;
    addY.current = 0;
    setAddVisualOffset({ x: 0, y: 0 });
    addTouchTrack.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    playHitSound(120);
  };

  const handleAddPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isAddDragging.current) return;
    
    const dx = e.clientX - addDragStartPos.current.x;
    const dy = e.clientY - addDragStartPos.current.y;
    
    const displacement = Math.hypot(e.clientX - addTouchTrack.current[0].x, e.clientY - addTouchTrack.current[0].y);
    if (displacement > 5) {
      addHasDragged.current = true;
    }
    
    addX.current += dx;
    addY.current += dy;
    
    setAddVisualOffset({ x: addX.current, y: addY.current });
    
    addDragStartPos.current = { x: e.clientX, y: e.clientY };
    addTouchTrack.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (addTouchTrack.current.length > 5) addTouchTrack.current.shift();
  };

  const handleAddPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isAddDragging.current) return;
    
    isAddDragging.current = false;
    (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    
    setAddVisualOffset({ x: 0, y: 0 });

    if (!addHasDragged.current) {
      setAddTallyCount(prev => {
        const next = prev + 1;
        playTallyClickSound(next);
        return next;
      });
      return;
    }

    if (addTouchTrack.current.length >= 2) {
      const pFirst = addTouchTrack.current[0];
      const pLast = addTouchTrack.current[addTouchTrack.current.length - 1];
      const dt = (pLast.t - pFirst.t) || 1;
      const throwVx = (pLast.x - pFirst.x) / dt * 16.66;
      const throwVy = (pLast.y - pFirst.y) / dt * 16.66;

      const mag = Math.sqrt(throwVx * throwVx + throwVy * throwVy);

      if (mag > 4.5) {
        addRollSelected(throwVx, throwVy, addX.current, addY.current);
        return;
      }

      addRollSelected(throwVx * 0.35, throwVy * 0.35, addX.current, addY.current);
      return;
    }

    addRollSelected(0, 0, addX.current, addY.current);
  };

  // Frame simulation loop
  const updatePhysics = (timestamp: number) => {
    if (!prevTimeRef.current) prevTimeRef.current = timestamp;
    const dt = Math.min(2.0, (timestamp - prevTimeRef.current) / 16.66);
    prevTimeRef.current = timestamp;

    if (placeholderRef.current) {
      const rect = placeholderRef.current.getBoundingClientRect();
      if (rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        coordsRef.current = { x: cx, y: cy };
        
        // Ensure coords state is kept in sync for portal rendering on viewport position changes, transitions, and loading states
        if (coordsStateRef.current.x === 0 || 
            Math.abs(coordsStateRef.current.x - cx) > 1 || 
            Math.abs(coordsStateRef.current.y - cy) > 1) {
          coordsStateRef.current = { x: cx, y: cy };
          setCoords({ x: cx, y: cy });
        }
      }
    }

    // Direct drag manual overrides synced into master dice node
    if (isDragging.current && dicePhysics.current[0]) {
      dicePhysics.current[0].x = x.current;
      dicePhysics.current[0].y = y.current;
      dicePhysics.current[0].rotX = rotX.current;
      dicePhysics.current[0].rotY = rotY.current;
      dicePhysics.current[0].rotZ = rotZ.current;
      dicePhysics.current[0].height = height.current;
      dicePhysics.current[0].vHeight = vHeight.current;
    }

    if (isRolling) {
      if (isReturningToHome.current) {
        // Return to dice box home pocket animation
        const homeK = 1.0 - Math.pow(0.82, dt);
        let allReturned = true;

        dicePhysics.current.forEach(die => {
          die.x += (0 - die.x) * homeK;
          die.y += (0 - die.y) * homeK;
          die.height += (0 - die.height) * homeK;

          const homeTargets = getNearestHomeAngles(die.rotX, die.rotY, die.rotZ);
          die.rotX += (homeTargets.x - die.rotX) * homeK;
          die.rotY += (homeTargets.y - die.rotY) * homeK;
          die.rotZ += (homeTargets.z - die.rotZ) * homeK;

          if (Math.hypot(die.x, die.y) > 0.3 || die.height > 0.3) {
            allReturned = false;
          }
        });

        if (allReturned) {
          // Reset array to single settled master die
          dicePhysics.current = [{
            id: 0,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            rotX: 0,
            rotY: 0,
            rotZ: 0,
            vRotX: 0,
            vRotY: 0,
            vRotZ: 0,
            height: 0,
            vHeight: 0,
            currentValue: 6,
            landingFaceSelected: false,
            targetRotX: 0,
            targetRotY: 0,
            targetRotZ: 0,
          }];
          setRenderedDice([{ id: 0 }]);
          x.current = 0;
          y.current = 0;
          height.current = 0;
          rotX.current = 0;
          rotY.current = 0;
          rotZ.current = 0;

          isReturningToHome.current = false;
          setIsRolling(false);
          setHasNumber(false);
          setTallyCount(1); // Reset tally to default once re-settled in box
          playHitSound(30);
        }
      } else {
        // Elastic dice collisions to push them apart realistically!
        const radius = 16;
        const count = dicePhysics.current.length;
        const isManyRoll = count > 1;
        const now = Date.now();

        for (let i = 0; i < dicePhysics.current.length; i++) {
          for (let j = i + 1; j < dicePhysics.current.length; j++) {
            const d1 = dicePhysics.current[i];
            const d2 = dicePhysics.current[j];

            // CPU performance optimization: if many dice are thrown and they have scattered initially,
            // or if they are in fade-out state, skip heavy O(N^2) pairwise collisions
            if (d1.isFading || d2.isFading) {
              continue;
            }

            const dx = d2.x - d1.x;
            const dy = d2.y - d1.y;
            const dist = Math.hypot(dx, dy);
            if (dist < radius * 2 && dist > 0.5) {
              const overlap = (radius * 2) - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              // Static resolution (push apart)
              d1.x -= nx * overlap * 0.5;
              d1.y -= ny * overlap * 0.5;
              d2.x += nx * overlap * 0.5;
              d2.y += ny * overlap * 0.5;

              // Dynamic resolution (impulse response)
              const kx = d1.vx - d2.vx;
              const ky = d1.vy - d2.vy;
              const impulse = kx * nx + ky * ny;
              if (impulse > 0) {
                const impulseMag = impulse * 0.65;
                d1.vx -= impulseMag * nx;
                d1.vy -= impulseMag * ny;
                d2.vx += impulseMag * nx;
                d2.vy += impulseMag * ny;

                // Transfer spin energy randomly
                d1.vRotX += (Math.random() - 0.5) * 8;
                d1.vRotY += (Math.random() - 0.5) * 8;
                d2.vRotX += (Math.random() - 0.5) * 8;
                d2.vRotY += (Math.random() - 0.5) * 8;

                playHitSound(Math.abs(impulse) * 45);
              }
            }
          }
        }

        let anyRolling = false;

        dicePhysics.current.forEach(die => {
          const speedTotal = Math.sqrt(die.vx * die.vx + die.vy * die.vy);

          // 1. Position tracking
          die.x += die.vx * dt;
          die.y += die.vy * dt;

          // Standard air friction
          die.vx *= Math.pow(0.972, dt);
          die.vy *= Math.pow(0.972, dt);

          // 2. Altitude Bouncing
          die.vHeight -= 0.5 * dt;
          die.height += die.vHeight * dt;

          if (die.height <= 0) {
            die.height = 0;
            if (Math.abs(die.vHeight) > 1.0) {
              die.vHeight = -die.vHeight * 0.4;
              die.vRotX += (Math.random() - 0.5) * 10;
              die.vRotY += (Math.random() - 0.5) * 10;
              // Avoid playing table impact sounds once faded or fading
              if (!die.isFading) {
                playHitSound(Math.abs(die.vHeight) * 85);
              }
            } else {
              die.vHeight = 0;
            }
          }

          // 3. Screen bounds collision across viewports (only bounce when NOT fading)
          if (!die.isFading) {
            const padding = 22;
            const minX = -coordsRef.current.x + padding;
            const maxX = window.innerWidth - coordsRef.current.x - padding;
            const minY = -coordsRef.current.y + padding;
            const maxY = window.innerHeight - coordsRef.current.y - padding;

            let hitWall = false;

            if (die.x < minX) {
              die.x = minX;
              die.vx = -die.vx * 0.72;
              die.vRotY += (Math.random() * 10 + 5);
              hitWall = true;
            } else if (die.x > maxX) {
              die.x = maxX;
              die.vx = -die.vx * 0.72;
              die.vRotY -= (Math.random() * 10 + 5);
              hitWall = true;
            }

            if (die.y < minY) {
              die.y = minY;
              die.vy = -die.vy * 0.72;
              die.vRotX += (Math.random() * 10 + 5);
              hitWall = true;
            } else if (die.y > maxY) {
              die.y = maxY;
              die.vy = -die.vy * 0.72;
              die.vRotX -= (Math.random() * 10 + 5);
              hitWall = true;
            }

            if (hitWall) {
              playHitSound(Math.sqrt(die.vx * die.vx + die.vy * die.vy) * 40);
            }
          }

          // 4. Decelerate & Flat Align or Spin in place when fading
          if (die.isFading) {
            // Let them spin smoothly while blending away
            die.rotX += die.vRotX * dt;
            die.rotY += die.vRotY * dt;
            die.rotZ += die.vRotZ * dt;

            die.vRotX *= Math.pow(0.94, dt);
            die.vRotY *= Math.pow(0.94, dt);
            die.vRotZ *= Math.pow(0.94, dt);
          } else if (speedTotal < 4.5 && die.height === 0) {
            if (!die.landingFaceSelected) {
              if (die.targetValue !== undefined) {
                const targets = getNearestCongruentAngles(die.rotX, die.rotY, die.rotZ, die.targetValue);
                die.targetRotX = targets.x;
                die.targetRotY = targets.y;
                die.targetRotZ = targets.z;
              } else {
                die.targetRotX = Math.round(die.rotX / 90) * 90;
                die.targetRotY = Math.round(die.rotY / 90) * 90;
                die.targetRotZ = Math.round(die.rotZ / 90) * 90;
              }
              die.landingFaceSelected = true;
            }

            const blend = 1.0 - Math.pow(0.85, dt);
            die.rotX += (die.targetRotX - die.rotX) * blend;
            die.rotY += (die.targetRotY - die.rotY) * blend;
            die.rotZ += (die.targetRotZ - die.rotZ) * blend;

            die.vRotX = 0;
            die.vRotY = 0;
            die.vRotZ = 0;
            die.vx *= Math.pow(0.82, dt);
            die.vy *= Math.pow(0.82, dt);

            // ALWAYS update the physical currentValue of the die based on its exact 3D angle!
            // This is critical for preventing mismatches!
            const bestFace = getMostVisibleFace(die.rotX, die.rotY, die.rotZ);
            die.currentValue = bestFace;

            const gapX = Math.abs(die.targetRotX - die.rotX);
            const gapY = Math.abs(die.targetRotY - die.rotY);
            const gapZ = Math.abs(die.targetRotZ - die.rotZ);

            if (speedTotal < 0.15 && gapX < 0.5 && gapY < 0.5 && gapZ < 0.5) {
              die.rotX = die.targetRotX;
              die.rotY = die.targetRotY;
              die.rotZ = die.targetRotZ;
              die.vx = 0;
              die.vy = 0;
            } else {
              anyRolling = true;
            }
          } else {
            anyRolling = true;

            if (die.height > 0) {
              die.vRotX *= Math.pow(0.975, dt);
              die.vRotY *= Math.pow(0.975, dt);
              die.vRotZ *= Math.pow(0.975, dt);
            } else {
              const rollScale = 3.6;
              die.vRotX = -die.vy * rollScale;
              die.vRotY = die.vx * rollScale;
              die.vRotZ *= Math.pow(0.85, dt);
            }

            die.rotX += die.vRotX * dt;
            die.rotY += die.vRotY * dt;
            die.rotZ += die.vRotZ * dt;

            // ALWAYS update the physical currentValue of the die based on its exact 3D angle!
            const bestFace = getMostVisibleFace(die.rotX, die.rotY, die.rotZ);
            die.currentValue = bestFace;
          }

          // Flame trailer particles
          if (speedTotal > 0.6 && Math.random() < 0.45) {
            const colors = ['#f59e0b', '#ef4444', '#f97316', '#fffbeb'];
            const ember: Particle = {
              id: Math.random(),
              x: die.x + (Math.random() - 0.5) * 6,
              y: die.y + (Math.random() - 0.5) * 6,
              size: Math.random() * 6 + 2,
              color: colors[Math.floor(Math.random() * colors.length)],
              angle: Math.random() * 360,
              opacity: die.opacity !== undefined ? die.opacity : 1,
              vx: -die.vx * 0.2 + (Math.random() - 0.5) * 0.5,
              vy: -die.vy * 0.2 - (Math.random() * 0.3 + 0.1)
            };
            setParticles(prev => [ember, ...prev].slice(0, 30));
          }
        });

        if (!anyRolling) {
          if (allSettledTimestamp.current === null) {
            allSettledTimestamp.current = Date.now();
            
            // Calculate final accurate rolls
            const rolls = dicePhysics.current.map(d => {
              const face = getMostVisibleFace(d.rotX, d.rotY, d.rotZ);
              d.currentValue = face;
              return face;
            });

            let finalRolls = rolls;
            if (isRerollingRef.current) {
              const merged = [...remainingRollValuesRef.current, ...rolls];
              setAllRollValues(merged);
              const sum = merged.reduce((acc, v) => acc + v, 0);
              setCurrentValue(sum);
              isRerollingRef.current = false;
              remainingRollValuesRef.current = [];
              finalRolls = merged;
            } else {
              setAllRollValues(rolls);
              const sum = rolls.reduce((acc, v) => acc + v, 0);
              setCurrentValue(sum);
            }

            const info = pendingRollInfo.current || {
              formulaName: "Manual Roll",
              modifier: 0,
              numSides: 6,
            };

            window.dispatchEvent(new CustomEvent('vtt-roll-settled-event', {
              detail: {
                rolls: finalRolls,
                formulaName: info.formulaName,
                modifier: info.modifier,
                statContext: info.statContext,
                numSides: info.numSides
              }
            }));
            
            pendingRollInfo.current = null;

            setShowResults(true);

            if (!isManyRoll) {
              setIsRolling(false);
              playHitSound(30);
            }
          } else if (isManyRoll) {
            const elapsed = Date.now() - allSettledTimestamp.current;
            if (elapsed > 200) {
              const fadeDuration = 500;
              const progress = Math.min(1, (elapsed - 200) / fadeDuration);
              dicePhysics.current.forEach(die => {
                die.opacity = 1 - progress;
                die.isFading = true;
              });

              if (progress >= 1) {
                setIsRolling(false);
                playHitSound(30);
              }
            }
          }
        } else {
          // If any is still rolling, reset the timer and make them fully visible
          allSettledTimestamp.current = null;
          dicePhysics.current.forEach(die => {
            die.opacity = 1;
            die.isFading = false;
          });
        }
      }
    }

    // Sync first index back to master tracking variables
    if (dicePhysics.current[0]) {
      x.current = dicePhysics.current[0].x;
      y.current = dicePhysics.current[0].y;
      rotX.current = dicePhysics.current[0].rotX;
      rotY.current = dicePhysics.current[0].rotY;
      rotZ.current = dicePhysics.current[0].rotZ;
      height.current = dicePhysics.current[0].height;
      vHeight.current = dicePhysics.current[0].vHeight;
      vx.current = dicePhysics.current[0].vx;
      vy.current = dicePhysics.current[0].vy;
      vRotX.current = dicePhysics.current[0].vRotX;
      vRotY.current = dicePhysics.current[0].vRotY;
      vRotZ.current = dicePhysics.current[0].vRotZ;
    }

    // Hardware transform applications
    dicePhysics.current.forEach((die) => {
      const diceNode = document.getElementById(`vtt-global-d6-${die.id}`);
      const shadowNode = document.getElementById(`vtt-global-d6-shadow-${die.id}`);

      if (diceNode) {
        const isHome = isReturningToHome.current || (die.x === 0 && die.y === 0 && !isDragging.current && !isRolling);
        const targetScale = isHome ? 0.72 : 1.0;
        const isSelected = selectedRollIndexes.includes(die.id);
        const currentOpacity = isSelected ? 1.0 : (die.opacity !== undefined ? die.opacity : 1);
        const s = targetScale * (1 + die.height / 110) * currentOpacity;
        
        diceNode.style.left = `${coordsRef.current.x}px`;
        diceNode.style.top = `${coordsRef.current.y}px`;
        diceNode.style.transform = `translate3d(${die.x}px, ${die.y}px, 0px) scale(${s}) rotateX(${die.rotX}deg) rotateY(${die.rotY}deg) rotateZ(${die.rotZ}deg)`;
        diceNode.style.opacity = `${currentOpacity}`;
        diceNode.style.display = currentOpacity === 0 ? 'none' : 'block';
        diceNode.style.pointerEvents = currentOpacity < 0.2 ? 'none' : 'auto';
      }
 
      if (shadowNode) {
        const isSelected = selectedRollIndexes.includes(die.id);
        const currentOpacity = isSelected ? 1.0 : (die.opacity !== undefined ? die.opacity : 1);
        const shadowScale = Math.max(0.35, 1 - die.height / 80) * ((die.x === 0 && die.y === 0 && !isDragging.current && !isRolling) ? 0.72 : 1.0) * currentOpacity;
        const shadowOp = Math.max(0, 0.45 * (1 - die.height / 100)) * currentOpacity;
        
        shadowNode.style.left = `${coordsRef.current.x - 20}px`;
        shadowNode.style.top = `${coordsRef.current.y + 20}px`;
        shadowNode.style.transform = `translate3d(${die.x}px, ${die.y + 22}px, 0px) scale(${shadowScale})`;
        shadowNode.style.opacity = `${shadowOp}`;
        shadowNode.style.display = currentOpacity === 0 ? 'none' : 'block';
      }
    });

    requestRef.current = requestAnimationFrame(updatePhysics);
  };

  // Keyboard numeric key support
  useEffect(() => {
    const handleNumberPress = (e: KeyboardEvent) => {
      if (isRolling) return;
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const num = parseInt(e.key, 10);
        setHasNumber(true);
        setCurrentValue(num);
        setShowResults(true);
        
        // Instant target rotations setting for first die
        const targets = getNearestCongruentAngles(rotX.current, rotY.current, rotZ.current, num);
        rotX.current = targets.x;
        rotY.current = targets.y;
        rotZ.current = targets.z;
        if (dicePhysics.current[0]) {
          dicePhysics.current[0].rotX = targets.x;
          dicePhysics.current[0].rotY = targets.y;
          dicePhysics.current[0].rotZ = targets.z;
          dicePhysics.current[0].currentValue = num;
        }
        playHitSound(120);
      }
    };
    window.addEventListener('keydown', handleNumberPress);
    return () => window.removeEventListener('keydown', handleNumberPress);
  }, [isRolling]);

  // Launch simulator frame updates
  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRolling, coords]);

  // Flame trajectory updating ticks
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setTimeout(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            opacity: p.opacity - 0.05,
            size: p.size * 0.93
          }))
          .filter(p => p.opacity > 0)
      );
    }, 22);
    return () => clearTimeout(interval);
  }, [particles]);

  // Flick drag controls handlers
  const isDragging = useRef<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchTrack = useRef<{ x: number; y: number; t: number }[]>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isRolling) return;
    
    isDragging.current = true;
    hasDragged.current = false;
    isReturningToHome.current = false;
    landingFaceSelected.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    touchTrack.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    // Check aggregate displacement from start position to distinguish clicks
    const displacement = Math.hypot(e.clientX - touchTrack.current[0].x, e.clientY - touchTrack.current[0].y);
    if (displacement > 5) {
      if (!hasDragged.current) {
        hasDragged.current = true;
        // Raise die heights on pick up
        height.current = 2;
        vHeight.current = 1.0;
        playHitSound(120);
      }
    }
    
    if (hasDragged.current) {
      x.current += dx;
      y.current += dy;
      // Gradually lift height as it's picked up and dragged!
      height.current = Math.min(22, height.current + 2.5);
      rotX.current += dy * 0.5;
      rotY.current += dx * 0.5;
    }
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    touchTrack.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (touchTrack.current.length > 5) touchTrack.current.shift();
  };

  const isInsideDiceBox = (px: number, py: number) => {
    if (!placeholderRef.current) return false;
    let el: HTMLElement | null = placeholderRef.current;
    let panel: HTMLElement | null = null;
    while (el) {
      if (el.classList.contains('bg-transparent') && el.classList.contains('h-full')) {
        panel = el;
        break;
      }
      el = el.parentElement;
    }
    if (!panel) {
      panel = placeholderRef.current.closest('.relative');
    }
    if (!panel) return false;
    const rect = panel.getBoundingClientRect();
    return (
      px >= rect.left &&
      px <= rect.right &&
      py >= rect.top &&
      py <= rect.bottom
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    // 1. Simple Click / Tap (without picking up):
    const totalDisplacement = Math.hypot(x.current, y.current);
    const isTouchClick = !hasDragged.current || totalDisplacement < 18;

    if (isTouchClick) {
      const isSettledInBox = (!isRolling);
      if (isSettledInBox) {
        // Tally clicks! Unlimited click count (no hard cap at 6)
        setTallyCount(prev => {
          const next = prev + 1;
          playTallyClickSound(next);
          return next;
        });
        x.current = 0;
        y.current = 0;
        height.current = 0;
        vHeight.current = 0;
        hasDragged.current = false;
      } else {
        // STRICTLY FORBIDDEN to recover the scattered dice until specifically the "Retrieve Dice" button inside the Dice box is pressed.
        // Tapping/clicking scattered dice on the table does not recover them.
      }
      return;
    }

    // 2. Drag & Drop or Flick:
    if (touchTrack.current.length >= 2) {
      const pFirst = touchTrack.current[0];
      const pLast = touchTrack.current[touchTrack.current.length - 1];
      const dt = (pLast.t - pFirst.t) || 1;
      const throwVx = (pLast.x - pFirst.x) / dt * 16.66;
      const throwVy = (pLast.y - pFirst.y) / dt * 16.66;

      const mag = Math.sqrt(throwVx * throwVx + throwVy * throwVy);

      // Flick detection
      if (mag > 4.5) {
        triggerRoll(throwVx, throwVy);
        return;
      }

      // Drag and drop / slow release close to home
      const distFromHome = Math.hypot(x.current, y.current);
      const isInsideBox = isInsideDiceBox(coordsRef.current.x + x.current, coordsRef.current.y + y.current);

      if (distFromHome < 65 || isInsideBox) {
        isReturningToHome.current = true;
        setIsRolling(true);
        setHasNumber(false);
        setShowResults(false);
        playHitSound(80);
      } else {
        // Drop in place
        setHasNumber(true);
        setIsRolling(true);
        setShowResults(false);
        allSettledTimestamp.current = null;
        landingFaceSelected.current = false;
        vx.current = throwVx * 0.35;
        vy.current = throwVy * 0.35;
        vHeight.current = -0.15;
        
        vRotX.current = (Math.random() - 0.5) * 6;
        vRotY.current = (Math.random() - 0.5) * 6;
        vRotZ.current = (Math.random() - 0.5) * 4;
        playHitSound(120);
      }
      return;
    }

    // Fallback normal roll
    triggerRoll();
  };

  // Load style config for the active theme to apply to everything dynamically (dice, counters, badges)
  const themeStyles = (() => {
    switch (diceTheme) {
      case 'celestial':
        return {
          normalDiceStyle: "bg-gradient-to-br from-teal-500/50 via-indigo-600/40 to-purple-950/90 border-cyan-400 text-cyan-100 shadow-[inset_0_0_8px_rgba(6,182,212,0.55)] hover:border-cyan-300",
          normalCornerDot: "bg-cyan-400/40",
          hoverGlow: "hover:shadow-[0_0_15px_rgba(6,182,212,0.35)]",
          tallyStyle: "bg-gradient-to-br from-teal-400/80 via-indigo-500/60 to-purple-900/95 border-cyan-300 text-cyan-100 shadow-[inset_0_0_12px_rgba(6,182,212,0.8),_0_0_12px_rgba(6,182,212,0.35)]",
          tallyCornerDot: "bg-cyan-300/60",
          tallyBadgeClass: "bg-slate-950/95 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]",
          addButtonClass: "bg-gradient-to-br from-teal-500/50 via-indigo-600/50 to-purple-950/80 border-cyan-400 text-cyan-100 hover:text-white cursor-grab active:cursor-grabbing hover:border-cyan-300 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(6,182,212,0.45)] hover:shadow-[0_0_12px_rgba(6,182,212,0.65)]",
          addDotClass: "bg-cyan-400/40",
        };
      case 'abyssal':
        return {
          normalDiceStyle: "bg-gradient-to-br from-indigo-950/95 via-purple-900/40 to-stone-950/98 border-purple-500 text-yellow-300 shadow-[inset_0_0_8px_rgba(168,85,247,0.55)] hover:border-purple-400",
          normalCornerDot: "bg-purple-400/40",
          hoverGlow: "hover:shadow-[0_0_15px_rgba(168,85,247,0.35)]",
          tallyStyle: "bg-gradient-to-br from-indigo-900/95 via-purple-800/60 to-purple-955 border-purple-400 text-yellow-305 shadow-[inset_0_0_12px_rgba(168,85,247,0.8),_0_0_12px_rgba(168,85,247,0.35)]",
          tallyCornerDot: "bg-purple-300/50",
          tallyBadgeClass: "bg-purple-950/95 border-purple-400 text-yellow-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]",
          addButtonClass: "bg-gradient-to-br from-indigo-955 via-purple-900/70 to-stone-955 border-purple-500 text-yellow-300 hover:text-white cursor-grab active:cursor-grabbing hover:border-purple-400 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(168,85,247,0.45)] hover:shadow-[0_0_12px_rgba(168,85,247,0.65)]",
          addDotClass: "bg-purple-400/40",
        };
      case 'ruby':
        return {
          normalDiceStyle: "bg-gradient-to-br from-red-650/85 via-rose-800/60 to-red-950/95 border-red-500 text-yellow-300 shadow-[inset_0_0_8px_rgba(239,68,68,0.55)] hover:border-red-400",
          normalCornerDot: "bg-red-400/40",
          hoverGlow: "hover:shadow-[0_0_15px_rgba(239,68,68,0.35)]",
          tallyStyle: "bg-gradient-to-br from-red-500/90 via-rose-700/70 to-red-900 border-red-400 text-yellow-255 shadow-[inset_0_0_12px_rgba(239,68,68,0.8),_0_0_12px_rgba(239,68,68,0.35)]",
          tallyCornerDot: "bg-red-300/50",
          tallyBadgeClass: "bg-red-950/95 border-red-500 text-yellow-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
          addButtonClass: "bg-gradient-to-br from-red-650/85 via-rose-800/70 to-red-950 border-red-500 text-yellow-300 hover:text-white cursor-grab active:cursor-grabbing hover:border-red-400 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(239,68,68,0.45)] hover:shadow-[0_0_12px_rgba(239,68,68,0.65)]",
          addDotClass: "bg-red-400/40",
        };
      case 'emerald':
        return {
          normalDiceStyle: "bg-gradient-to-tr from-rose-500/40 via-cyan-400/40 to-slate-900/90 border-sky-450/45 text-yellow-300 shadow-[inset_0_0_8px_rgba(59,130,246,0.55)] hover:border-sky-355",
          normalCornerDot: "bg-sky-400/40",
          hoverGlow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.35)]",
          tallyStyle: "bg-gradient-to-tr from-rose-455 via-cyan-400/50 to-slate-800 border-sky-450 text-yellow-255 shadow-[inset_0_0_12px_rgba(59,130,246,0.8),_0_0_12px_rgba(59,130,246,0.35)]",
          tallyCornerDot: "bg-sky-300/50",
          tallyBadgeClass: "bg-slate-950/95 border-sky-450 text-yellow-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
          addButtonClass: "bg-gradient-to-tr from-rose-500/50 via-cyan-400/50 to-slate-900/80 border-sky-450 text-yellow-300 hover:text-white cursor-grab active:cursor-grabbing hover:border-sky-355 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(59,130,246,0.45)] hover:shadow-[0_0_12px_rgba(59,130,246,0.65)]",
          addDotClass: "bg-sky-400/40",
        };
      case 'amber':
      default:
        return {
          normalDiceStyle: "bg-gradient-to-br from-amber-600/70 via-amber-850/80 to-amber-950/95 border-amber-500 text-amber-100 shadow-[inset_0_0_8px_rgba(245,158,11,0.55)] hover:border-amber-400",
          normalCornerDot: "bg-amber-400/40",
          hoverGlow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]",
          tallyStyle: "bg-gradient-to-br from-amber-500/90 via-amber-700/90 to-amber-905/95 border-amber-300 text-white shadow-[inset_0_0_12px_rgba(245,158,11,0.8),_0_0_12px_rgba(245,158,11,0.3)]",
          tallyCornerDot: "bg-amber-300/60",
          tallyBadgeClass: "bg-amber-950/95 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
          addButtonClass: "bg-gradient-to-br from-amber-600 via-amber-800 to-amber-955 border-amber-500 text-amber-100 hover:text-white cursor-grab active:cursor-grabbing hover:border-amber-400 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(245,158,11,0.45)] hover:shadow-[0_0_12px_rgba(245,158,11,0.65)]",
          addDotClass: "bg-amber-400/40",
        };
    }
  })();

  const isSettledInBox = (x.current === 0 && y.current === 0 && !isRolling && !isDragging.current);
  const isTallyActive = isSettledInBox && tallyCount > 1;

  // Apply magical custom colors to dice faces when click-tallying settled
  const bgBorderClass = isTallyActive 
    ? themeStyles.tallyStyle 
    : themeStyles.normalDiceStyle;

  const cornerDotClass = isTallyActive
    ? themeStyles.tallyCornerDot
    : themeStyles.normalCornerDot;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center -translate-y-2.5">
      <div 
        ref={placeholderRef} 
        className="w-14 h-14 bg-transparent relative flex items-center justify-center pointer-events-none select-none"
      />

      {/* Modern integrated results displayed directly in the Dice Box (completely transparent, showing beautiful stars) */}
      {showResults && hasNumber && (
        <div className="absolute h-full top-0 left-1/2 -translate-x-1/2 w-[155px] flex flex-col items-center justify-between pointer-events-auto select-none p-1.5 z-[99] animate-fade-in text-center">
          <div className="text-[9px] uppercase tracking-widest text-amber-500/80 font-mono font-bold leading-none mt-1">
            Total Roll
          </div>
          <div className="text-3xl font-black font-serif tracking-tight text-amber-200 leading-none my-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse">
            {currentValue}
          </div>
          
          {/* Horizontally scrolling list so the user can see all rolls with scroll capability */}
          {allRollValues.length > 1 && (
            <div className={`w-full mt-0.5 relative px-0.5 flex flex-col items-center select-none ${hoveredTooltip === 'scroller-item' || hoveredTooltip === 'sort' ? 'z-[100]' : 'z-10'}`}>
              <div className="flex items-center justify-center gap-1 max-w-[145px] mx-auto w-full relative">
                
                {/* Sort Button Wrapper for local tooltip */}
                <div className={`relative flex items-center justify-center ${hoveredTooltip === 'sort' ? 'z-[100]' : 'z-10'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortMode(prev => {
                        if (prev === 'order') return 'low-high';
                        if (prev === 'low-high') return 'high-low';
                        return 'order';
                      });
                    }}
                    onMouseEnter={() => setHoveredTooltip('sort')}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    className={`flex items-center justify-center w-[17px] h-[17px] min-w-[17px] rounded border transition-colors cursor-pointer pointer-events-auto ${
                      sortMode === 'order' 
                        ? 'border-amber-500/20 bg-stone-950/80 text-amber-500/80 hover:text-amber-400 hover:border-amber-400/40 hover:bg-stone-900/90' 
                        : sortMode === 'low-high'
                          ? 'border-cyan-500/30 bg-stone-950/90 text-cyan-400 hover:text-cyan-300 hover:border-cyan-300 hover:bg-stone-900/90'
                          : 'border-fuchsia-500/35 bg-stone-950/90 text-fuchsia-400 hover:text-fuchsia-300 hover:border-fuchsia-300 hover:bg-stone-900/90'
                    }`}
                  >
                    <ArrowUpDown size={8} strokeWidth={2.8} />
                  </button>

                  {hoveredTooltip === 'sort' && (
                    <div className="absolute top-[125%] left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[99999] animate-fade-in">
                      Sort: {sortMode === 'order' ? 'Roll Order' : sortMode === 'low-high' ? 'Low to High' : 'High to Low'}
                    </div>
                  )}
                </div>

                <div 
                  className="flex gap-1 overflow-x-auto max-w-[105px] pb-0.5 py-0.5 whitespace-nowrap [&::-webkit-scrollbar]:hidden select-none"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onMouseDown={(e) => {
                    const el = e.currentTarget;
                    const startX = e.pageX - el.offsetLeft;
                    const scrollLeft = el.scrollLeft;
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const x = moveEvent.pageX - el.offsetLeft;
                      const walk = (x - startX) * 1.5;
                      el.scrollLeft = scrollLeft - walk;
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  {(() => {
                    const mapped = allRollValues.map((val, idx) => ({ val, originalIdx: idx }));
                    const sorted = sortMode === 'order'
                      ? mapped
                      : [...mapped].sort((a, b) => sortMode === 'low-high' ? a.val - b.val : b.val - a.val);

                    return sorted.map((item) => {
                      const isSelected = selectedRollIndexes.includes(item.originalIdx);
                      let colorClasses = '';
                      if (isSelected) {
                        colorClasses = 'border-red-500 bg-red-950 text-red-200 shadow-[0_0_6px_rgba(239,68,68,0.7)] hover:border-red-400';
                      } else if (sortMode === 'order') {
                        colorClasses = 'border-amber-500/25 bg-stone-950/85 text-amber-200 hover:border-amber-400/50';
                      } else if (sortMode === 'low-high') {
                        colorClasses = 'border-cyan-500/40 bg-stone-950 text-cyan-300 hover:border-cyan-200 shadow-[0_0_3px_rgba(34,211,238,0.25)]';
                      } else {
                        colorClasses = 'border-fuchsia-500/45 bg-stone-950 text-fuchsia-300 hover:border-fuchsia-200 shadow-[0_0_4px_rgba(240,70,250,0.3)]';
                      }

                      return (
                        <span 
                          key={item.originalIdx} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const alreadySelected = selectedRollIndexes.includes(item.originalIdx);
                            if (alreadySelected) {
                              setSelectedRollIndexes(prev => prev.filter(id => id !== item.originalIdx));
                            } else {
                              setSelectedRollIndexes(prev => [...prev, item.originalIdx]);
                            }
                            playHitSound(80);
                          }}
                          onMouseEnter={() => {
                            setHoveredTooltip('scroller-item');
                            setHoveredScrollerItemAction(isSelected ? "Deselect roll" : "Select roll");
                          }}
                          onMouseLeave={() => {
                            setHoveredTooltip(null);
                            setHoveredScrollerItemAction(null);
                          }}
                          className={`inline-flex items-center justify-center w-[17px] h-[17px] min-w-[17px] rounded border text-[10px] font-mono font-bold shadow-[0_1px_3px_rgba(0,0,0,0.4)] cursor-pointer select-none transition-all ${colorClasses}`}
                        >
                          {item.val}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>

              {hoveredTooltip === 'scroller-item' && (
                <div className="absolute top-[125%] left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[99999] animate-fade-in">
                  {hoveredScrollerItemAction}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-1.5 mt-0.5 pointer-events-auto items-center justify-center w-full max-w-[145px] px-1">
            
            {/* Reroll Button (Purple) */}
            {(() => {
              const isActive = selectedRollIndexes.length > 0;
              const buttonClass = isActive
                ? "bg-gradient-to-br from-purple-700 via-purple-850 to-purple-950 border-purple-500 text-purple-100 hover:text-white cursor-grab active:cursor-grabbing hover:border-purple-400 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(168,85,247,0.4)] hover:shadow-[0_0_12px_rgba(168,85,247,0.65)]"
                : "bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 border-stone-750 text-stone-450 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_inset_0_-1px_1px_rgba(0,0,0,0.3)] cursor-not-allowed opacity-65";

              const dotClass = isActive ? "bg-purple-400/40" : "bg-stone-600/30";
              const transformStyle = isActive
                ? `translate(${rerollVisualOffset.x}px, ${rerollVisualOffset.y}px)`
                : 'none';

              return (
                <div className={`relative flex items-center justify-center ${hoveredTooltip === 'reroll' ? 'z-[100]' : 'z-10'}`}>
                  <button
                    className={`relative w-6 h-6 rounded border flex items-center justify-center pointer-events-auto select-none transition-transform duration-75 touch-none ${buttonClass}`}
                    style={{
                      transform: transformStyle,
                      zIndex: 30,
                    }}
                    onPointerDown={handleRerollPointerDown}
                    onPointerMove={handleRerollPointerMove}
                    onPointerUp={handleRerollPointerUp}
                    onPointerCancel={handleRerollPointerUp}
                    onMouseEnter={() => setHoveredTooltip('reroll')}
                    onMouseLeave={() => setHoveredTooltip(null)}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-0.5 h-0.5 rounded-full ${dotClass}`} />
                    <span className={`absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full ${dotClass}`} />
                    <span className={`absolute bottom-0.5 left-0.5 w-0.5 h-0.5 rounded-full ${dotClass}`} />
                    <span className={`absolute bottom-0.5 right-0.5 w-0.5 h-0.5 rounded-full ${dotClass}`} />
                    <span className="absolute inset-0 flex items-center justify-center font-serif text-[11px] font-black tracking-tighter leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                      {selectedRollIndexes.length}
                    </span>
                  </button>

                  {hoveredTooltip === 'reroll' && (
                    <div className="absolute top-[125%] left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[99999] animate-fade-in">
                      {selectedRollIndexes.length > 0 ? `Reroll ${selectedRollIndexes.length} Selected` : "Select dice to reroll"}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Remove Button (Red) */}
            {(() => {
              const isRemoveActive = selectedRollIndexes.length > 0;
              const removeButtonClass = isRemoveActive
                ? "bg-gradient-to-br from-red-700 via-red-850 to-red-950 border-red-500 text-red-105 hover:text-white cursor-pointer hover:border-red-400 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(0,0,0,0.4)] shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.6)] transition-all duration-150 transform hover:scale-105 active:scale-95"
                : "bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 border-stone-750 text-stone-450 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_inset_0_-1px_1px_rgba(0,0,0,0.3)] cursor-not-allowed opacity-65";

              const removeDotClass = isRemoveActive ? "bg-red-400/40" : "bg-stone-600/30";

              return (
                <div className={`relative flex items-center justify-center ${hoveredTooltip === 'remove' ? 'z-[100]' : 'z-10'}`}>
                  <button
                    onClick={() => {
                      if (!isRemoveActive) return;
                      const nextRollValues = allRollValues.filter((_, idx) => !selectedRollIndexes.includes(idx));
                      setAllRollValues(nextRollValues);
                      const nextSum = nextRollValues.reduce((acc, val) => acc + val, 0);
                      setCurrentValue(nextSum);
                      setSelectedRollIndexes([]);
                      playHitSound(80);
                    }}
                    onMouseEnter={() => setHoveredTooltip('remove')}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    className={`relative w-6 h-6 rounded border flex items-center justify-center pointer-events-auto select-none ${removeButtonClass}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-0.5 h-0.5 rounded-full ${removeDotClass}`} />
                    <span className={`absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full ${removeDotClass}`} />
                    <span className={`absolute bottom-0.5 left-0.5 w-0.5 h-0.5 rounded-full ${removeDotClass}`} />
                    <span className={`absolute bottom-0.5 right-0.5 w-0.5 h-0.5 rounded-full ${removeDotClass}`} />
                    <Minus className={`w-3 h-3 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.85)] ${isRemoveActive ? 'text-red-300' : 'text-stone-550'}`} strokeWidth={3} />
                  </button>

                  {hoveredTooltip === 'remove' && (
                    <div className="absolute top-[125%] left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[99999] animate-fade-in">
                      {isRemoveActive ? `Remove ${selectedRollIndexes.length} Selected` : "Select dice to remove"}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Add Button (Themed) */}
            {(() => {
              const addButtonClass = themeStyles.addButtonClass;
              const addDotClass = themeStyles.addDotClass;
              const transformStyle = `translate(${addVisualOffset.x}px, ${addVisualOffset.y}px)`;

              return (
                <div className={`relative flex items-center justify-center ${hoveredTooltip === 'add' ? 'z-[100]' : 'z-10'}`}>
                  <button
                    className={`relative w-6 h-6 rounded border flex items-center justify-center pointer-events-auto select-none transition-transform duration-75 touch-none ${addButtonClass}`}
                    style={{
                      transform: transformStyle,
                      zIndex: 30,
                    }}
                    onPointerDown={handleAddPointerDown}
                    onPointerMove={handleAddPointerMove}
                    onPointerUp={handleAddPointerUp}
                    onPointerCancel={handleAddPointerUp}
                    onMouseEnter={() => setHoveredTooltip('add')}
                    onMouseLeave={() => setHoveredTooltip(null)}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-0.5 h-0.5 rounded-full ${addDotClass}`} />
                    <span className={`absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full ${addDotClass}`} />
                    <span className={`absolute bottom-0.5 left-0.5 w-0.5 h-0.5 rounded-full ${addDotClass}`} />
                    <span className={`absolute bottom-0.5 right-0.5 w-0.5 h-0.5 rounded-full ${addDotClass}`} />
                    <span className="absolute inset-0 flex items-center justify-center font-serif text-[11px] font-black tracking-tighter leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                      +{addTallyCount}
                    </span>
                  </button>

                  {hoveredTooltip === 'add' && (
                    <div className="absolute top-[125%] left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[99999] animate-fade-in">
                      Add +{addTallyCount} (Click to increase, throw to roll)
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Return Button (Amber) */}
            <div className={`relative flex items-center justify-center ${hoveredTooltip === 'return' ? 'z-[100]' : 'z-10'}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isReturningToHome.current = true;
                  setIsRolling(true);
                  setHasNumber(false);
                  setShowResults(false);
                  setAllRollValues([]);
                  setSelectedRollIndexes([]);
                  setSortMode('order');
                  playHitSound(80);
                }}
                onMouseEnter={() => setHoveredTooltip('return')}
                onMouseLeave={() => setHoveredTooltip(null)}
                className="relative w-6 h-6 rounded bg-gradient-to-br from-stone-800 via-stone-900 to-amber-950/90 border border-amber-500 hover:border-amber-400 text-amber-200 shadow-[0_2px_4px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.1),_inset_0_-1px_1px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-pointer pointer-events-auto select-none transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-[0_0_8px_rgba(245,158,11,0.25)] hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              >
                <span className="absolute top-0.5 left-0.5 w-0.5 h-0.5 rounded-full bg-amber-500/30" />
                <span className="absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full bg-amber-500/30" />
                <span className="absolute bottom-0.5 left-0.5 w-0.5 h-0.5 rounded-full bg-amber-500/30" />
                <span className="absolute bottom-0.5 right-0.5 w-0.5 h-0.5 rounded-full bg-amber-500/30" />
                <RotateCcw className="w-3 h-3 text-amber-300 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.85)]" strokeWidth={3} />
              </button>

              {hoveredTooltip === 'return' && (
                <div className="absolute top-[125%] left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[99999] animate-fade-in">
                  Retrieve Dice
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {coords.x > 0 && createPortal(
        <div 
          className="fixed inset-0 pointer-events-none overflow-visible transition-all duration-300"
          style={{
            zIndex: getActiveDiceZIndex(menuBackdropActive),
          }}
        >
          {/* Global SVG Gradients for high-fidelity interactive tabletop dice renderings - NO transparency */}
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
              {/* Magma / Fiery Amber */}
              <linearGradient id="grad-active-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="100%" stopColor="#450a0a" stopOpacity="1" />
              </linearGradient>

              {/* Cosmos / Celestial Nebula */}
              <linearGradient id="grad-active-celestial" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="50%" stopColor="#4f46e5" stopOpacity="1" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </linearGradient>

              {/* Water / Deep Sea Ripple */}
              <linearGradient id="grad-active-water" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="1" />
                <stop offset="50%" stopColor="#0284c7" stopOpacity="1" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </linearGradient>

              {/* Diamond / Crimson Gemstone */}
              <linearGradient id="grad-active-ruby" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="1" />
                <stop offset="60%" stopColor="#9f1239" stopOpacity="1" />
                <stop offset="100%" stopColor="#4c0519" stopOpacity="1" />
              </linearGradient>

              {/* Emerald Crystalline */}
              <linearGradient id="grad-active-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
                <stop offset="50%" stopColor="#059669" stopOpacity="1" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Custom flaming tail */}
          <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
            {particles.map(p => (
              <circle 
                key={p.id}
                cx={coords.x + p.x}
                cy={coords.y + p.y}
                r={p.size}
                fill={p.color}
                opacity={p.opacity}
                style={{
                  filter: 'blur(1px)',
                  boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`
                }}
              />
            ))}
          </svg>

          {renderedDice.map(die => {
            const isDieTallyActive = isTallyActive && die.id === 0;
            const isDieSelected = selectedRollIndexes.includes(die.id);

            // Map themes to visual styles
            const normalDiceStyle = themeStyles.normalDiceStyle;
            const normalCornerDot = themeStyles.normalCornerDot;
            const hoverGlow = themeStyles.hoverGlow;

            // Shadow the class names locally for selected dice
            const bgBorderClass = isDieSelected
              ? "bg-red-950/95 border-red-500 text-red-200 shadow-[inset_0_0_8px_rgba(239,68,68,0.5)] hover:border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.45)]"
              : (isDieTallyActive
                  ? themeStyles.tallyStyle
                  : normalDiceStyle);

            const cornerDotClass = isDieSelected
              ? "bg-red-400/30"
              : (isDieTallyActive ? themeStyles.tallyCornerDot : normalCornerDot);

            const renderTallyBadge = isDieTallyActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-950/45 rounded-[5px] backdrop-blur-[0.5px]">
                <div className={`px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono leading-none animate-pulse ${themeStyles.tallyBadgeClass}`}>
                  x{tallyCount}
                </div>
              </div>
            );

            return (
              <React.Fragment key={die.id}>
                {/* Tabletop Physics Shadow */}
                <div 
                  id={`vtt-global-d6-shadow-${die.id}`}
                  className="fixed w-10 h-2.5 rounded-full bg-black/65 blur-[3px]"
                  style={{ 
                    left: `${coords.x - 20}px`, 
                    top: `${coords.y + 20}px`,
                    zIndex: getActiveDiceShadowZIndex(menuBackdropActive),
                  }}
                />

                {/* 3D Cube Core */}
                <div 
                  id={`vtt-global-d6-${die.id}`}
                  className={`fixed w-10 h-10 cursor-grab active:cursor-grabbing select-none touch-none animate-fade-in ${hoverGlow} ${menuBackdropActive ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  style={{
                    left: `${coords.x}px`,
                    top: `${coords.y}px`,
                    marginLeft: '-20px',
                    marginTop: '-20px',
                    transformStyle: 'preserve-3d',
                    perspective: '300px',
                    zIndex: getActiveDiceZIndex(menuBackdropActive),
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {/* FACE 1 */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ transform: 'rotateY(0deg) translateZ(19.8px)', backfaceVisibility: 'hidden', borderRadius: '6px' }}
                  >
                    {renderDieFaceSVG(diceTheme, isDieSelected, 1)}
                    {renderTallyBadge}
                  </div>

                  {/* FACE 6 */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ transform: 'rotateY(180deg) translateZ(19.8px)', backfaceVisibility: 'hidden', borderRadius: '6px' }}
                  >
                    {renderDieFaceSVG(diceTheme, isDieSelected, 6)}
                    {renderTallyBadge}
                  </div>

                  {/* FACE 2 */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ transform: 'rotateY(90deg) translateZ(19.8px)', backfaceVisibility: 'hidden', borderRadius: '6px' }}
                  >
                    {renderDieFaceSVG(diceTheme, isDieSelected, 2)}
                    {renderTallyBadge}
                  </div>

                  {/* FACE 5 */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ transform: 'rotateY(-90deg) translateZ(19.8px)', backfaceVisibility: 'hidden', borderRadius: '6px' }}
                  >
                    {renderDieFaceSVG(diceTheme, isDieSelected, 5)}
                    {renderTallyBadge}
                  </div>

                  {/* FACE 3 */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ transform: 'rotateX(-90deg) translateZ(19.8px)', backfaceVisibility: 'hidden', borderRadius: '6px' }}
                  >
                    {renderDieFaceSVG(diceTheme, isDieSelected, 3)}
                    {renderTallyBadge}
                  </div>

                  {/* FACE 4 */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ transform: 'rotateX(90deg) translateZ(19.8px)', backfaceVisibility: 'hidden', borderRadius: '6px' }}
                  >
                    {renderDieFaceSVG(diceTheme, isDieSelected, 4)}
                    {renderTallyBadge}
                  </div>

                </div>
              </React.Fragment>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// Solid design faces with NO transparency and NO dots/numbers
function renderDieFaceSVG(themeKey: string, isSelected: boolean, faceValue: number) {
  let dieFill = 'url(#grad-active-amber)';
  let stroke = 'stroke-amber-400';
  let isEmerald = false;
  let isCosmos = false;
  let isWater = false;
  let isDiamond = false;
  let isMagma = false;

  let numberColor = '#fef08a';
  let shadowColor = '#7c2d12';

  if (themeKey === 'amber') {
    dieFill = 'url(#grad-active-amber)';
    stroke = 'stroke-amber-450';
    isMagma = true;
    numberColor = '#fef08a';
    shadowColor = '#450a0a';
  } else if (themeKey === 'celestial') {
    dieFill = 'url(#grad-active-celestial)';
    stroke = 'stroke-cyan-300';
    isCosmos = true;
    numberColor = '#ecfeff';
    shadowColor = '#1e1b4b';
  } else if (themeKey === 'abyssal') {
    dieFill = 'url(#grad-active-water)';
    stroke = 'stroke-sky-400';
    isWater = true;
    numberColor = '#e0f2fe';
    shadowColor = '#0f172a';
  } else if (themeKey === 'ruby') {
    dieFill = 'url(#grad-active-ruby)';
    stroke = 'stroke-red-350';
    isDiamond = true;
    numberColor = '#ffe4e6';
    shadowColor = '#4c0519';
  } else if (themeKey === 'emerald') {
    dieFill = 'url(#grad-active-emerald)';
    stroke = 'stroke-emerald-300';
    isEmerald = true;
    numberColor = '#d1fae5';
    shadowColor = '#064e3b';
  } else {
    dieFill = 'url(#grad-active-amber)';
    stroke = 'stroke-amber-450';
    isMagma = true;
    numberColor = '#fef08a';
    shadowColor = '#450a0a';
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 select-none">
      {/* Rounded square face boundary with NO transparency */}
      <rect 
        x="2" 
        y="2" 
        width="96" 
        height="96" 
        rx="14" 
        ry="14" 
        fill={dieFill} 
        className={`${isSelected ? 'stroke-red-500' : stroke} ${isSelected ? 'stroke-[6px]' : 'stroke-[3px]'}`} 
      />
      <rect x="5" y="5" width="90" height="90" rx="11" ry="11" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.15" />

      {/* Internal Aesthetics - strictly NO dots, marks, or numbers */}
      {isMagma && (
        <>
          <path d="M 12 40 L 30 50 L 50 35 L 70 60 L 88 45" stroke="#f59e0b" strokeWidth="3.5" fill="none" opacity="0.85" strokeLinecap="round" />
          <path d="M 40 12 L 50 35 L 45 75 L 25 85" stroke="#ef4444" strokeWidth="3.5" fill="none" opacity="0.8" strokeLinecap="round" />
          <path d="M 70 60 L 65 88" stroke="#f97316" strokeWidth="2.5" fill="none" opacity="0.85" strokeLinecap="round" />
          <circle cx="35" cy="45" r="10" fill="#f59e0b" fillOpacity="0.3" filter="blur(2px)" />
          <circle cx="65" cy="55" r="12" fill="#ef4444" fillOpacity="0.3" filter="blur(2px)" />
        </>
      )}

      {isCosmos && (
        <>
          <path d="M 20,50 A 30,30 0 1,1 80,50 A 25,25 0 1,1 25,50 A 20,20 0 1,1 75,50 A 15,15 0 1,1 35,50" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="3,3" opacity="0.7" />
          <circle cx="50" cy="50" r="15" fill="#818cf8" fillOpacity="0.4" filter="blur(3px)" />
          <polygon points="53,20 55,27 62,29 55,31 53,38 51,31 44,29 51,27" fill="#fff" opacity="0.95" />
          <polygon points="45,72 47,77 52,79 47,81 45,86 43,81 38,79 43,77" fill="#22d3ee" opacity="0.95" />
        </>
      )}

      {isWater && (
        <>
          <path d="M 8 30 C 30 20, 40 40, 60 25 C 80 10, 85 30, 92 20" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.75" strokeLinecap="round" />
          <path d="M 8 50 C 25 40, 45 60, 65 45 C 75 35, 85 55, 92 45" fill="none" stroke="#0ea5e9" strokeWidth="3.5" opacity="0.85" strokeLinecap="round" />
          <path d="M 8 70 C 25 60, 35 80, 55 65 C 75 50, 85 75, 92 65" fill="none" stroke="#1d4ed8" strokeWidth="3" opacity="0.7" strokeDasharray="4,2" strokeLinecap="round" />
          <circle cx="50" cy="50" r="16" fill="#38bdf8" fillOpacity="0.35" filter="blur(3px)" />
        </>
      )}

      {isDiamond && (
        <>
          <path d="M 8 8 L 50 50 L 92 8 Z" fill="white" fillOpacity="0.15" />
          <path d="M 92 8 L 50 50 L 92 92 Z" fill="black" fillOpacity="0.2" />
          <path d="M 92 92 L 50 50 L 8 92 Z" fill="white" fillOpacity="0.2" />
          <path d="M 8 92 L 50 50 L 8 8 Z" fill="black" fillOpacity="0.28" />
          <line x1="8" y1="8" x2="92" y2="92" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
          <line x1="92" y1="8" x2="8" y2="92" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
          <line x1="50" y1="8" x2="50" y2="92" stroke="#fff" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
          <line x1="8" y1="50" x2="92" y2="50" stroke="#fff" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="12" fill="#fecdd3" fillOpacity="0.4" filter="blur(2px)" />
        </>
      )}

      {isEmerald && (
        <>
          <path d="M 50 12 L 88 34 L 88 78 L 50 88 L 12 78 L 12 34 Z" fill="none" stroke="#10b981" strokeWidth="2.5" strokeOpacity="0.85" strokeLinejoin="round" />
          <line x1="50" y1="12" x2="50" y2="88" stroke="#34d399" strokeWidth="2" strokeOpacity="0.45" />
          <line x1="12" y1="34" x2="88" y2="78" stroke="#34d399" strokeWidth="2" strokeOpacity="0.45" />
          <line x1="12" y1="78" x2="88" y2="34" stroke="#34d399" strokeWidth="2" strokeOpacity="0.45" />
          <circle cx="50" cy="50" r="14" fill="#a7f3d0" fillOpacity="0.35" filter="blur(2.5px)" />
        </>
      )}

      {/* High-fidelity complement-colored number overlay */}
      <text 
        x="50" 
        y="58" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        className="font-serif font-black tracking-tight select-none pointer-events-none"
        style={{
          fontSize: '44px',
          fill: numberColor,
          filter: `drop-shadow(0px 2.5px 3.5px ${shadowColor})`,
        }}
      >
        {faceValue}
      </text>

      {/* Selected overlay glow */}
      {isSelected && (
        <rect x="4" y="4" width="92" height="92" rx="12" ry="12" fill="none" stroke="#ef4444" strokeWidth="4" className="animate-pulse" />
      )}
    </svg>
  );
}
