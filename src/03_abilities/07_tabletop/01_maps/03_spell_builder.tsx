import React, { useState, useEffect, useRef } from 'react';
import { safeStorage } from '../../../storage';
import { LAYER_HIERARCHY } from '../../../layers';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../../../99_settings/language';
import { 
  Sparkles, 
  Plus, 
  Minus, 
  X, 
  Sparkle, 
  Dice5, 
  Activity, 
  Gauge, 
  Database, 
  Hourglass, 
  Zap, 
  Flame, 
  ShieldAlert, 
  CheckCircle,
  Settings,
  Lock,
  Archive,
  Swords,
  Feather
} from 'lucide-react';

interface SpellBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  playTactileSound: (freq?: number, type?: OscillatorType, duration?: number) => void;
  onForgeSpell: (
    name: string,
    description: string,
    power: string,
    formula: string,
    cost: number,
    diceCount: number,
    diceSize: number,
    modifier: number,
    id?: string,
    builderState?: any,
    category?: 'combat' | 'auxiliary' | 'transformative'
  ) => void;
  spellToEdit?: any;
  magicLevel: number;
  setMagicLevel: React.Dispatch<React.SetStateAction<number>> | ((lvl: number) => void);
}

const SCALE_OPTIONS = [
  { id: 'CM', index: '01', abbr: 'CM', name: 'Centimeter', size: 'Bullet', expense: 1, label: 'Centimeter' },
  { id: 'DI', index: '02', abbr: 'DI', name: 'Decimeter', size: 'Baseball', expense: 10, label: 'Decimeter' },
  { id: 'MT', index: '03', abbr: 'MT', name: 'Meter', size: 'Person', expense: 100, label: 'Meter' },
  { id: 'DA', index: '04', abbr: 'DA', name: 'Dekameter', size: 'House', expense: 1000, label: 'Dekameter' },
  { id: 'HC', index: '05', abbr: 'HC', name: 'Hectometer', size: 'City Block', expense: 10000, label: 'Hectometer' },
  { id: 'KL', index: '06', abbr: 'KL', name: 'Kilometer', size: 'City', expense: 100000, label: 'Kilometer' },
  { id: 'MG', index: '07', abbr: 'MG', name: 'Megameter', size: 'Moon', expense: 1000000, label: 'Megameter' },
  { id: 'GM', index: '08', abbr: 'GM', name: 'Gigameter', size: 'Earth', expense: 10000000, label: 'Gigameter' },
  { id: 'PM', index: '09', abbr: 'PM', name: 'Petameter', size: 'Star System', expense: 100000000, label: 'Petameter' },
  { id: 'EM', index: '10', abbr: 'EM', name: 'Exameter', size: 'Star Cluster', expense: 1000000000, label: 'Exameter' },
  { id: 'ZM', index: '11', abbr: 'ZM', name: 'Zettameter', size: 'Galaxy', expense: 10000000000, label: 'Zettameter' },
  { id: 'YM', index: '12', abbr: 'YM', name: 'Yottameter', size: 'Galaxy Cluster', expense: 100000000000, label: 'Yottameter' },
  { id: 'RM', index: '13', abbr: 'RM', name: 'Ronnameter', size: 'Universe Sector', expense: 1000000000000, label: 'Ronnameter' },
  { id: 'QM', index: '14', abbr: 'QM', name: 'Quettameter', size: 'Universe', expense: 10000000000000, label: 'Quettameter' },
];

const DURATION_OPTIONS = [
  { id: 'Action', label: 'Action', baseFactor: 12, actions: 1, expense: 1 },
  { id: 'Minute', label: 'Minute', baseFactor: 45, actions: 12, expense: 20 },
  { id: 'Hour', label: 'Hour', baseFactor: 110, actions: 720, expense: 1200 },
  { id: 'Day', label: 'Day', baseFactor: 280, actions: 17280, expense: 28800 },
  { id: 'Week', label: 'Week', baseFactor: 600, actions: 120960, expense: 201600 },
  { id: 'Month', label: 'Month', baseFactor: 1500, actions: 518400, expense: 864000 },
  { id: 'Year', label: 'Year', baseFactor: 4000, actions: 6307200, expense: 10512000 },
];

const POWER_OPTIONS = [
  { id: 'Minor', label: 'Minor (Tier I)', baseFactor: 15, diceCount: 1, diceSize: 6, modifier: 1 },
  { id: 'Moderate', label: 'Moderate (Tier II)', baseFactor: 35, diceCount: 2, diceSize: 8, modifier: 3 },
  { id: 'Major', label: 'Major (Tier III)', baseFactor: 75, diceCount: 4, diceSize: 10, modifier: 6 },
  { id: 'Extreme', label: 'Extreme (Tier IV)', baseFactor: 180, diceCount: 6, diceSize: 12, modifier: 10 },
];

const RESTRICTION_OPTIONS = [
  { id: 'Equip', bonus: 1 },
  { id: 'Interact', bonus: 1 },
  { id: 'Alter', bonus: 1 },
  { id: 'Consume', bonus: 2 },
  { id: 'Ritual', bonus: 2 },
  { id: 'Location', bonus: 2 },
  { id: 'Time', bonus: 3 },
  { id: 'Forfeit', bonus: 3 },
  { id: 'Maintain', bonus: 3 },
  { id: 'Subject', bonus: 4 },
  { id: 'Name', bonus: 5 },
];

const SCHOOLS = [
  'Conjuration',
  'Evocation',
  'Thaumaturgy',
  'Veils',
  'Enchantments',
  'Alchemy',
  'Exomancy',
  'Chronomancy',
  'Biomancy'
];

const SUBTYPES_BY_SCHOOL: Record<string, string[]> = {
  Conjuration: ['Summoning', 'Creation', 'Teleportation', 'Healing', 'Portal', 'Binding'],
  Evocation: ['Force', 'Air', 'Fire', 'Water', 'Earth', 'Plasma', 'Sound', 'Ectoplasm', 'Hellfire', 'Soulfire'],
  Thaumaturgy: ['Blessings', 'Curses', 'Hexes', 'Miracles', 'Blood Magic', 'Rituals'],
  Veils: ['Illusion', 'Invisibility', 'Disguise', 'Phantasm', 'Shadow', 'Silence'],
  Enchantments: ['Charm', 'Dominate', 'Sleep', 'Haste', 'Slow', 'Wards'],
  Alchemy: ['Transmutation', 'Potions', 'Elixirs', 'Metals', 'Acids', 'Poison'],
  Exomancy: ['Gravity', 'Magnetism', 'Celestial', 'Void', 'Cosmic', 'Lightning'],
  Chronomancy: ['Time Recall', 'Stasis', 'Foresight', 'Ageing', 'Loop', 'Acceleration'],
  Biomancy: ['Regeneration', 'Shape-shifting', 'Totems', 'Evolution', 'Pheromones', 'Parasite']
};

const RANGE_DETAILS = [
  { value: 1, key: 'X', label: 'Contact Range' },
  { value: 2, key: 'C', label: 'Close Range' },
  { value: 3, key: 'S', label: 'Short Range' },
  { value: 4, key: 'M', label: 'Medium Range' },
  { value: 5, key: 'L', label: 'Long Range' },
  { value: 6, key: 'E', label: 'Extended Range' },
  { value: 7, key: 'U', label: 'Ultra-Long Range' },
  { value: 8, key: 'B', label: 'Beyond-Horizon Range' },
  { value: 9, key: 'D', label: 'Deep Space Range' }
];

export function calculateCostFromBuilderState(bs: any): number {
  if (!bs) return 5;
  
  // 1. App Points
  const affinity = bs.affinity || 'Conjuration';
  const selectedSubtypes = bs.selectedSubtypes || {};
  const nonagonSelectedNodes = Object.keys(selectedSubtypes).filter(
    school => selectedSubtypes[school] && selectedSubtypes[school].length > 0
  );
  
  const getNonagonValue = (school: string) => {
    const topSchool = affinity === 'Affinity' ? 'Conjuration' : affinity;
    const topIndex = SCHOOLS.indexOf(topSchool);
    const schoolIndex = SCHOOLS.indexOf(school);
    if (topIndex === -1 || schoolIndex === -1) return 1;
    const k = (schoolIndex - topIndex + 9) % 9;
    const d = Math.min(k, 9 - k);
    return d + 1;
  };

  const appPointsSpent = nonagonSelectedNodes.reduce(
    (sum, s) => sum + getNonagonValue(s) * (selectedSubtypes[s] || []).length,
    0
  );

  // 2. Effect points
  const effPoints = bs.effPoints || {};
  const getSumOfPoints = (record: Record<string, number>) => {
    return Object.keys(record).reduce((sum, key) => sum + (record[key] || 0), 0);
  };
  const effPointsSum = getSumOfPoints(effPoints);
  const effCost = effPointsSum * appPointsSpent;

  // 3. Targets costs
  const targetCounts = typeof bs.targetCounts === 'number' ? bs.targetCounts : 0;
  const targetOrigin = typeof bs.targetOrigin === 'number' ? bs.targetOrigin : 0;
  const targetRange = typeof bs.targetRange === 'number' ? bs.targetRange : 0;
  const targetCost = targetCounts * targetOrigin * targetRange;

  // 4. Hold [Scale + Duration] costs
  const scalePoints = bs.scalePoints || {};
  const activeScaleIdForHold = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
  const hasScalePoints = Object.keys(scalePoints).some(k => (scalePoints[k] || 0) > 0);
  const scaleIndexForHold = hasScalePoints ? (SCALE_OPTIONS.findIndex(o => o.id === activeScaleIdForHold) + 1) : 0;
  
  const durationActive = bs.durationActive || 'Action';
  const durationPoints = bs.durationPoints || {};
  const durationValForHold = durationPoints[durationActive] !== undefined ? durationPoints[durationActive] : 0;
  
  const durationOpt = DURATION_OPTIONS.find(o => o.id === durationActive) || DURATION_OPTIONS[0];
  const scaleOptForHold = SCALE_OPTIONS.find(o => o.id === activeScaleIdForHold) || SCALE_OPTIONS[0];
  const holdCost = scaleIndexForHold > 0 
    ? scaleOptForHold.expense * durationOpt.expense * Math.max(1, durationValForHold)
    : 0;

  const holdPointsSpent = scaleIndexForHold + durationValForHold;

  // 5. Energy [Power] costs
  const powerActive = bs.powerActive || 'Minor';
  const powerPoints = bs.powerPoints || {};
  const powerCost = (powerPoints[powerActive] || 0) * 6;

  const powerPointsSpentTotal = powerPoints[powerActive] || 0;

  // 6. Total Spent Points
  const totalSpentPoints = 
    appPointsSpent + 
    effPointsSum + 
    (targetCounts + targetOrigin + targetRange) + 
    holdPointsSpent + 
    powerPointsSpentTotal;

  // 7. Raw casting total before restrictions reduction
  const rawTotalCost = appPointsSpent + effCost + targetCost + holdCost + powerCost;

  return rawTotalCost;
}

export default function SpellBuilder({ 
  isOpen, 
  onClose, 
  playTactileSound, 
  onForgeSpell, 
  spellToEdit,
  magicLevel,
  setMagicLevel
}: SpellBuilderProps) {
  const { t, tn } = useTranslation();
  const [spellName, setSpellName] = useState<string>('');
  const [spellDesc, setSpellDesc] = useState<string>('');
  const [category, setCategory] = useState<'combat' | 'auxiliary' | 'transformative'>('combat');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        if (window.innerWidth >= 1024) {
          textareaRef.current.style.height = '';
        } else {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.max(72, textareaRef.current.scrollHeight)}px`;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [spellDesc]);

  // Sync state with spellToEdit
  useEffect(() => {
    if (isOpen) {
      if (spellToEdit) {
        setCategory(spellToEdit.category || 'combat');
        if (spellToEdit.builderState) {
          const bs = spellToEdit.builderState;
          setSpellName(spellToEdit.name || '');
          setSpellDesc(bs.spellDesc !== undefined ? bs.spellDesc : (spellToEdit.description || ''));
          if (bs.magicLevel !== undefined) setMagicLevel(bs.magicLevel);
          if (bs.affinity !== undefined) {
            setAffinity(bs.affinity);
            const topSchool = bs.affinity === 'Affinity' ? 'Conjuration' : bs.affinity;
            const activeIdx = SCHOOLS.indexOf(topSchool);
            if (activeIdx !== -1) {
              setPrevTopIndex(activeIdx);
              setNonagonRotation(-activeIdx * 40);
            }
          }
          if (bs.selectedSubtypes !== undefined) setSelectedSubtypes(bs.selectedSubtypes);
          if (bs.effPoints !== undefined) setEffPoints(bs.effPoints);
          if (bs.targetCounts !== undefined) setTargetCounts(bs.targetCounts);
          if (bs.targetOrigin !== undefined) setTargetOrigin(bs.targetOrigin);
          if (bs.targetRange !== undefined) setTargetRange(bs.targetRange);
          if (bs.scalePoints !== undefined) setScalePoints(bs.scalePoints);
          if (bs.durationActive !== undefined) setDurationActive(bs.durationActive);
          if (bs.durationPoints !== undefined) setDurationPoints(bs.durationPoints);
          if (bs.powerActive !== undefined) setPowerActive(bs.powerActive);
          if (bs.powerPoints !== undefined) setPowerPoints(bs.powerPoints);
          if (bs.selectedRestrictions !== undefined) setSelectedRestrictions(bs.selectedRestrictions);
        }
      } else {
        // Reset to defaults
        setSpellName('');
        setSpellDesc('');
        setCategory('combat');
        const savedAffinity = safeStorage.getItem('vtt_spell_affinity') || 'Affinity';
        setAffinity(savedAffinity);
        const topSchool = savedAffinity === 'Affinity' ? 'Conjuration' : savedAffinity;
        const activeIdx = SCHOOLS.indexOf(topSchool);
        if (activeIdx !== -1) {
          setPrevTopIndex(activeIdx);
          setNonagonRotation(-activeIdx * 40);
        } else {
          setPrevTopIndex(0);
          setNonagonRotation(0);
        }
        setSelectedSubtypes({});
        setEffPoints({
          burst: 0,
          homing: 0,
          attach: 0,
          react: 0,
        });
        setTargetCounts(0);
        setTargetOrigin(0);
        setTargetRange(0);
        setScalePoints({
          CM: 0, DI: 0, MT: 0, DA: 0, HC: 0, KL: 0, MG: 0, GM: 0, TM: 0, PM: 0, EM: 0, ZM: 0, YM: 0, RM: 0, QM: 0
        });
        setDurationActive('Action');
        setDurationPoints({
          Action: 0, Minute: 0, Hour: 0, Day: 0, Week: 0, Month: 0, Year: 0
        });
        setPowerActive('Minor');
        setPowerPoints({
          Minor: 0, Moderate: 0, Major: 0, Extreme: 0
        });
        setSelectedRestrictions([
          null, null, null
        ]);
      }
    }
  }, [isOpen, spellToEdit]);

  // --- Dynamic Layout Affinity State ---
  const [affinity, setAffinity] = useState<string>(() => {
    return safeStorage.getItem('vtt_spell_affinity') || 'Affinity';
  });
  const [nonagonRotation, setNonagonRotation] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_spell_affinity') || 'Affinity';
    const topSchool = saved === 'Affinity' ? 'Conjuration' : saved;
    const activeIdx = SCHOOLS.indexOf(topSchool);
    if (activeIdx !== -1) {
      return -activeIdx * 40;
    }
    return 0;
  });
  const [prevTopIndex, setPrevTopIndex] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_spell_affinity') || 'Affinity';
    const topSchool = saved === 'Affinity' ? 'Conjuration' : saved;
    const activeIdx = SCHOOLS.indexOf(topSchool);
    if (activeIdx !== -1) {
      return activeIdx;
    }
    return 0;
  });

  // --- Selected Sub-types & Sub-type Selector Window state ---
  const [selectedSubtypes, setSelectedSubtypes] = useState<Record<string, string[]>>({});
  const nonagonSelectedNodes = Object.keys(selectedSubtypes).filter(
    (school) => (selectedSubtypes[school] || []).length > 0
  );
  const [subtypeSelectSchool, setSubtypeSelectSchool] = useState<string | null>(null);
  const [isRangeSelectOpen, setIsRangeSelectOpen] = useState<boolean>(false);
  const [isScaleSelectOpen, setIsScaleSelectOpen] = useState<boolean>(false);

  const getSubtypeColorTheme = (school: string | null) => {
    if (!school) return { glowColor: 'rgba(168, 85, 247, 0.4)', textColor: 'text-[#a855f7]', borderColor: 'border-[#a855f7]/30', hoverBorder: 'hover:border-[#a855f7]/60', activeBg: 'bg-[#a855f7]/15', accentBtn: 'bg-[#a855f7]/25 text-white border-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.3)]' };
    const details = getNonagonDetails(school);
    let glowColor = 'rgba(168, 85, 247, 0.4)'; 
    let textColor = 'text-[#a855f7]';
    let borderColor = 'border-[#a855f7]/30';
    let hoverBorder = 'hover:border-[#a855f7]/60';
    let activeBg = 'bg-[#a855f7]/15';
    let accentBtn = 'bg-[#a855f7]/25 text-white border-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.3)]';
    
    if (details.colorName === 'Blue') {
      glowColor = 'rgba(59, 130, 246, 0.4)';
      textColor = 'text-blue-400';
      borderColor = 'border-blue-500/20';
      hoverBorder = 'hover:border-blue-500/50';
      activeBg = 'bg-blue-950/20';
      accentBtn = 'bg-blue-500/25 text-blue-200 border-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.3)]';
    } else if (details.colorName === 'Green') {
      glowColor = 'rgba(16, 185, 129, 0.4)';
      textColor = 'text-emerald-400';
      borderColor = 'border-emerald-500/20';
      hoverBorder = 'hover:border-emerald-500/50';
      activeBg = 'bg-emerald-950/20';
      accentBtn = 'bg-emerald-500/25 text-emerald-200 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    } else if (details.colorName === 'Yellow') {
      glowColor = 'rgba(245, 158, 11, 0.4)';
      textColor = 'text-amber-400';
      borderColor = 'border-amber-400/20';
      hoverBorder = 'hover:border-amber-400/50';
      activeBg = 'bg-amber-950/20';
      accentBtn = 'bg-amber-400/25 text-amber-200 border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    } else if (details.colorName === 'Orange') {
      glowColor = 'rgba(249, 115, 22, 0.4)';
      textColor = 'text-orange-400';
      borderColor = 'border-orange-500/20';
      hoverBorder = 'hover:border-orange-500/50';
      activeBg = 'bg-orange-950/20';
      accentBtn = 'bg-orange-500/25 text-orange-200 border-orange-500/60 shadow-[0_0_8px_rgba(249,115,22,0.3)]';
    } else if (details.colorName === 'Red') {
      glowColor = 'rgba(244, 63, 94, 0.4)';
      textColor = 'text-rose-400';
      borderColor = 'border-rose-500/20';
      hoverBorder = 'hover:border-rose-500/50';
      activeBg = 'bg-rose-950/20';
      accentBtn = 'bg-rose-500/25 text-rose-200 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
    }

    return { glowColor, textColor, borderColor, hoverBorder, activeBg, accentBtn };
  };

  const handleToggleSubtype = (school: string, sub: string) => {
    const isCurrentlySelected = (selectedSubtypes[school] || []).includes(sub);

    setSelectedSubtypes(prev => {
      const list = prev[school] || [];
      const updated = list.includes(sub)
        ? list.filter(item => item !== sub)
        : [...list, sub];
      return { ...prev, [school]: updated };
    });

    if (!isCurrentlySelected) {
      playTactileSound(750, 'sine', 0.05);
    } else {
      playTactileSound(480, 'sine', 0.04);
    }
  };

  // --- nonagon support logic ---
  const getNonagonValue = (school: string) => {
    const topSchool = affinity === 'Affinity' ? 'Conjuration' : affinity;
    const topIndex = SCHOOLS.indexOf(topSchool);
    const schoolIndex = SCHOOLS.indexOf(school);
    if (topIndex === -1 || schoolIndex === -1) return 1;
    const k = (schoolIndex - topIndex + 9) % 9;
    const d = Math.min(k, 9 - k);
    return d + 1;
  };

  const getNonagonDetails = (school: string) => {
    const topSchool = affinity === 'Affinity' ? 'Conjuration' : affinity;
    const topIndex = SCHOOLS.indexOf(topSchool);
    const schoolIndex = SCHOOLS.indexOf(school);
    
    const fallback = {
      value: 1,
      colorName: 'Blue',
      selectedClass: 'border-blue-500/75 bg-blue-950/40 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.4)] font-bold',
      unselectedClass: 'border-blue-500/20 bg-blue-950/5 text-blue-400/65 hover:text-blue-300 hover:border-blue-500/45 hover:bg-blue-950/15',
      dotBg: 'bg-blue-400',
      dotUnselectedBg: 'bg-blue-500/25',
      k: 0
    };

    if (topIndex === -1 || schoolIndex === -1) {
      return fallback;
    }

    const k = (schoolIndex - topIndex + 9) % 9;
    const d = Math.min(k, 9 - k);
    const value = d + 1;

    let colorName = '';
    let selectedClass = '';
    let unselectedClass = '';
    let dotBg = '';
    let dotUnselectedBg = '';

    if (value === 1) {
      colorName = 'Blue';
      selectedClass = 'border-blue-500/75 bg-blue-950/40 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.4)] font-bold';
      unselectedClass = 'border-blue-500/20 bg-blue-950/5 text-blue-400/65 hover:text-blue-300 hover:border-blue-500/45 hover:bg-blue-950/15';
      dotBg = 'bg-blue-400';
      dotUnselectedBg = 'bg-blue-500/25';
    } else if (value === 2) {
      colorName = 'Green';
      selectedClass = 'border-emerald-500/75 bg-emerald-950/40 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)] font-bold';
      unselectedClass = 'border-emerald-500/20 bg-emerald-950/5 text-emerald-400/65 hover:text-emerald-300 hover:border-emerald-500/45 hover:bg-emerald-950/15';
      dotBg = 'bg-emerald-400';
      dotUnselectedBg = 'bg-emerald-500/25';
    } else if (value === 3) {
      colorName = 'Yellow';
      selectedClass = 'border-amber-400/75 bg-amber-950/35 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)] font-bold';
      unselectedClass = 'border-amber-400/20 bg-amber-950/5 text-amber-400/65 hover:text-amber-300 hover:border-amber-400/45 hover:bg-amber-950/15';
      dotBg = 'bg-amber-400';
      dotUnselectedBg = 'bg-amber-500/25';
    } else if (value === 4) {
      colorName = 'Orange';
      selectedClass = 'border-orange-500/75 bg-orange-950/35 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.4)] font-bold';
      unselectedClass = 'border-orange-500/25 bg-orange-950/5 text-orange-400/65 hover:text-orange-300 hover:border-orange-500/45 hover:bg-orange-950/15';
      dotBg = 'bg-orange-400';
      dotUnselectedBg = 'bg-orange-500/25';
    } else {
      colorName = 'Red';
      selectedClass = 'border-rose-500/75 bg-rose-950/35 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.4)] font-bold';
      unselectedClass = 'border-rose-500/20 bg-rose-950/5 text-rose-400/65 hover:text-rose-300 hover:border-rose-500/45 hover:bg-rose-950/15';
      dotBg = 'bg-rose-400';
      dotUnselectedBg = 'bg-rose-500/25';
    }

    return { value, colorName, selectedClass, unselectedClass, dotBg, dotUnselectedBg, k };
  };

  const handleToggleNonagonNode = (school: string) => {
    if (affinity === 'Affinity') return;
    setSubtypeSelectSchool(school);
    playTactileSound(600, 'sine', 0.05);
  };

  const handleAffinityChange = (newVal: string) => {
    setAffinity(newVal);
    safeStorage.setItem('vtt_spell_affinity', newVal);
    const topSchool = newVal === 'Affinity' ? 'Conjuration' : newVal;
    setSelectedSubtypes({});
    playTactileSound(520, 'sine', 0.05);

    // Compute shortest-path rotation for steady/same-speed/consistent rotation
    const newTopIndex = SCHOOLS.indexOf(topSchool);
    if (newTopIndex !== -1) {
      const indexDiff = newTopIndex - prevTopIndex;
      let normalizedDiff = indexDiff;
      if (normalizedDiff > 4.5) normalizedDiff -= 9;
      if (normalizedDiff < -4.5) normalizedDiff += 9;

      const degChange = -normalizedDiff * 40; // 360 / 9 = 40 deg
      const targetRotation = nonagonRotation + degChange;
      setNonagonRotation(targetRotation);
      setPrevTopIndex(newTopIndex);
    }
  };

  // --- Custom Tooltip system matching the Pentacle hover labels ---
  const [tooltipData, setTooltipData] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, text: string) => {
    const isHoverOn = safeStorage.getItem('setting_hover_text') === 'on';
    if (!isHoverOn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 6,
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  useEffect(() => {
    if (!isOpen) {
      setTooltipData(null);
    }
  }, [isOpen]);

  // --- Category point values (0 if unselected, >= 1 if active) ---
  
  // Section 2: Effect (Multi-select)
  const [effPoints, setEffPoints] = useState<Record<string, number>>({
    burst: 0,
    homing: 0,
    attach: 0,
    react: 0,
  });

  // Sections 3, 4, 5: Target configurations (Counts, Origin, Range) - directly numeric with manual inputs
  const [targetCounts, setTargetCounts] = useState<number>(0);
  const [targetOrigin, setTargetOrigin] = useState<number>(0);
  const [targetRange, setTargetRange] = useState<number>(0);

  // Section 6: Hold [Scale] (Single-select selection)
  const [scalePoints, setScalePoints] = useState<Record<string, number>>({
    CM: 0, DI: 0, MT: 0, DA: 0, HC: 0, KL: 0, MG: 0, GM: 0, TM: 0, PM: 0, EM: 0, ZM: 0, YM: 0, RM: 0, QM: 0
  });

  // Section 7: Hold [Duration] (Rotary dropdown selector)
  const [durationActive, setDurationActive] = useState<string>('Action');
  const [durationPoints, setDurationPoints] = useState<Record<string, number>>({
    Action: 0, Minute: 0, Hour: 0, Day: 0, Week: 0, Month: 0, Year: 0
  });
  const [durationDropdownOpen, setDurationDropdownOpen] = useState<boolean>(false);

  // Section 8: Energy [Power] (Single-select radio)
  const [powerActive, setPowerActive] = useState<string>('Minor');
  const [powerPoints, setPowerPoints] = useState<Record<string, number>>({
    Minor: 0, Moderate: 0, Major: 0, Extreme: 0
  });
  const [powerDropdownOpen, setPowerDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const tierPower = POWER_OPTIONS.find(o => o.id === powerActive);
    const dCount = (tierPower?.diceCount || 1) * (powerPoints[powerActive] || 1);
    const dSize = tierPower?.diceSize || 6;
    const baseMod = (tierPower?.modifier || 1) * (powerPoints[powerActive] || 1);
    safeStorage.setItem('vtt_energy_dice_count', dCount.toString());
    safeStorage.setItem('vtt_energy_dice_size', dSize.toString());
    safeStorage.setItem('vtt_energy_modifier', baseMod.toString());
  }, [powerActive, powerPoints]);

  // Section 9: Restrictions (3 boxes dropdown-based)
  const [selectedRestrictions, setSelectedRestrictions] = useState<(string | null)[]>([
    null, null, null
  ]);
  const [openRestrictIdx, setOpenRestrictIdx] = useState<number | null>(null);

  // --- Dynamic Magic Point Limit logic ---
  // Player begins at level 1 with exactly 9 points.
  // For each additional level past 1, user can invest 1 more point anywhere.
  const selectedRestrictionsBonus = selectedRestrictions.reduce((sum, id) => {
    if (!id) return sum;
    const opt = RESTRICTION_OPTIONS.find(o => o.id === id);
    return sum + (opt ? opt.bonus : 0);
  }, 0);

  const totalAvailablePoints = 9 + (magicLevel - 1) + selectedRestrictionsBonus;

  const getSumOfPoints = (record: Record<string, number>) => {
    return Object.keys(record).reduce((sum, key) => sum + (record[key] || 0), 0);
  };

  const appPointsSpent = nonagonSelectedNodes.reduce(
    (sum, s) => sum + getNonagonValue(s) * (selectedSubtypes[s] || []).length,
    0
  );

  const appSubtypesCount = (Object.values(selectedSubtypes) as string[][]).flat().length;

  const activeScaleIdForHold = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
  const hasScalePoints = Object.keys(scalePoints).some(k => (scalePoints[k] || 0) > 0);
  const scaleIndexForHold = hasScalePoints ? (SCALE_OPTIONS.findIndex(o => o.id === activeScaleIdForHold) + 1) : 0;
  const durationValForHold = durationPoints[durationActive] !== undefined ? durationPoints[durationActive] : 0;
  const holdPointsSpent = scaleIndexForHold + durationValForHold;

  const powerPointsSpentTotal = powerPoints[powerActive] || 0;

  const totalSpentPoints = 
    appPointsSpent + 
    getSumOfPoints(effPoints) + 
    (targetCounts + targetOrigin + targetRange) + 
    holdPointsSpent + 
    powerPointsSpentTotal;

  const remainingPoints = totalAvailablePoints - totalSpentPoints;

  // --- Section validation (minimum 1 point spent in each section) ---
  const isSection1Valid = appPointsSpent >= 1;
  const isSection2Valid = getSumOfPoints(effPoints) >= 1;
  const isSection3Valid = targetCounts >= 1;
  const isSection4Valid = targetOrigin >= 1;
  const isSection5Valid = targetRange >= 1;
  const isSection6Valid = getSumOfPoints(scalePoints) >= 1;
  const isSection7Valid = getSumOfPoints(durationPoints) >= 1;
  const isSection8Valid = powerPointsSpentTotal >= 1;
  const isSection9Valid = selectedRestrictions.some(val => val !== null);

  const eachSectionHasAtLeastOneSelected =
    isSection1Valid &&
    isSection2Valid &&
    isSection3Valid &&
    isSection4Valid &&
    isSection5Valid &&
    isSection6Valid &&
    isSection7Valid &&
    isSection8Valid &&
    isSection9Valid;

  const isSpellStable = eachSectionHasAtLeastOneSelected && totalSpentPoints <= totalAvailablePoints;

  // --- COST CALCULATIONS ---
  // Application costs
  const appCost = appPointsSpent;

  // Effect costs
  const effCost = getSumOfPoints(effPoints) * appPointsSpent;

  // Targets costs
  const targetCost = targetCounts * targetOrigin * targetRange;

  // Hold [Scale + Duration] costs (product of scale factor 2^x and hold duration val)
  const durationOpt = DURATION_OPTIONS.find(o => o.id === durationActive) || DURATION_OPTIONS[0];
  const scaleOptForHold = SCALE_OPTIONS.find(o => o.id === activeScaleIdForHold) || SCALE_OPTIONS[0];
  const holdCost = scaleIndexForHold > 0 
    ? scaleOptForHold.expense * durationOpt.expense * Math.max(1, durationValForHold)
    : 0;

  // Energy [Power] costs
  const powerCost = (powerPoints[powerActive] || 0) * 6;

  // Raw casting total before restrictions reduction
  const rawTotalCost = appCost + effCost + targetCost + holdCost + powerCost;

  // Restrictions reduction (makes spell cheaper)
  const restrictionSavings = selectedRestrictions.reduce((sum, key) => {
    if (!key) return sum;
    const opt = RESTRICTION_OPTIONS.find(o => o.id === key);
    return sum + (opt ? opt.bonus * 20 : 0);
  }, 0);

  // Final modified cost clamped to minimum of 5
  const modifiedCost = Math.max(5, rawTotalCost - restrictionSavings);

  // Dynamic formula builder text
  const liveFormula = () => {
    const activeApps = nonagonSelectedNodes.map(school => `${school.toUpperCase()}(v${getNonagonValue(school)})`).join('+');
    const activeEffs = (['burst', 'homing', 'attach', 'react'] as const).filter(key => (effPoints[key] || 0) > 0).map(key => `${key.toUpperCase()}(x${effPoints[key]})`).join('+');
    const activeScales = Object.keys(scalePoints).filter(key => (scalePoints[key] || 0) > 0).map(key => `${key}(x${scalePoints[key]})`).join('+');
    const restricts = selectedRestrictions.filter(Boolean).join('&');

    return `APP[${activeApps || 'ø'}] ❖ EFF[${activeEffs || 'ø'}] ❖ TRG[${targetCounts}/${targetOrigin}/${targetRange}] ❖ HOLD[S:${activeScales || 'ø'} | D:${durationActive}(x${durationPoints[durationActive] !== undefined ? durationPoints[durationActive] : 0})] ❖ PWR[${powerActive}(x${powerPoints[powerActive] !== undefined ? powerPoints[powerActive] : 0})] ❖ RESTRICT[${restricts || 'ø'}]`;
  };

  // --- ACTIONS & MUTATORS ---

  // Safety checks helper for point boundaries
  const changePoint = (
    currentVal: number,
    inc: boolean,
    setMinToZero: boolean = true
  ): number => {
    const minVal = setMinToZero ? 0 : 1;
    if (inc) {
      playTactileSound(620, 'sine', 0.05);
      return currentVal + 1;
    } else {
      if (currentVal > minVal) {
        playTactileSound(420, 'sine', 0.05);
        return currentVal - 1;
      }
      return currentVal;
    }
  };

  // Section 2: Effect toggle or value increment
  const handleEffPointsNum = (key: string, inc: boolean) => {
    const updatedPoints = changePoint(effPoints[key], inc);
    setEffPoints(prev => ({
      ...prev,
      [key]: updatedPoints,
    }));
  };

  // Helper to compute target product delta
  // Helper to compute target points delta based on sum
  const getTargetPointsDelta = (key: 'counts' | 'origin' | 'range', newVal: number) => {
    const currentVal = key === 'counts' ? targetCounts : key === 'origin' ? targetOrigin : targetRange;
    return newVal - currentVal;
  };

  // Helper to compute hold points delta
  const getHoldPointsDelta = (proposedScaleId: string, proposedDurationVal: number) => {
    const currentScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
    const currentScaleIdx = SCALE_OPTIONS.findIndex(o => o.id === currentScaleId) + 1;
    const currentDurationVal = durationPoints[durationActive] || 1;
    const currentHoldPoints = currentScaleIdx + currentDurationVal;

    const proposedScaleIdx = SCALE_OPTIONS.findIndex(o => o.id === proposedScaleId) + 1;
    const proposedHoldPoints = proposedScaleIdx + proposedDurationVal;

    return proposedHoldPoints - currentHoldPoints;
  };

  // Section 3/4/5: Target options with product-based validation
  const handleTargetPointsNum = (key: 'counts' | 'origin' | 'range', inc: boolean) => {
    const currentVal = key === 'counts' ? targetCounts : key === 'origin' ? targetOrigin : targetRange;
    if (inc) {
      const newVal = currentVal + 1;
      playTactileSound(620, 'sine', 0.05);
      if (key === 'counts') setTargetCounts(newVal);
      else if (key === 'origin') setTargetOrigin(newVal);
      else if (key === 'range') setTargetRange(newVal);
    } else {
      if (currentVal > 0) {
        const newVal = currentVal - 1;
        playTactileSound(420, 'sine', 0.05);
        if (key === 'counts') setTargetCounts(newVal);
        else if (key === 'origin') setTargetOrigin(newVal);
        else if (key === 'range') setTargetRange(newVal);
      }
    }
  };

  // Manual Numeric input handler
  const handleManualTargetInput = (key: 'counts' | 'origin' | 'range', text: string) => {
    const normalized = text.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
    const clean = normalized.replace(/[^0-9]/g, '');
    if (!clean) {
      if (key === 'counts') setTargetCounts(0);
      else if (key === 'origin') setTargetOrigin(0);
      else if (key === 'range') setTargetRange(0);
      return;
    }
    const val = parseInt(clean, 10);
    const finalVal = isNaN(val) ? 0 : Math.max(0, val);
    
    playTactileSound(550, 'sine', 0.05);
    if (key === 'counts') setTargetCounts(finalVal);
    else if (key === 'origin') setTargetOrigin(finalVal);
    else if (key === 'range') setTargetRange(finalVal);
  };

  const handleSelectRangeOption = (val: number) => {
    setTargetRange(val);
    playTactileSound(650, 'sine', 0.05);
  };

  // Section 6: Hold [Scale] step selection (Minus / Plus buttons)
  const handleScaleCycle = (inc: boolean) => {
    const hasActive = Object.keys(scalePoints).some(k => (scalePoints[k] || 0) > 0);
    if (!hasActive) {
      if (inc) {
        const targetId = 'CM';
        setScalePoints(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => { next[k] = 0; });
          next[targetId] = 1;
          return next;
        });
        playTactileSound(650, 'sine', 0.05);
      }
      return;
    }

    const activeScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
    const currentIdx = SCALE_OPTIONS.findIndex(o => o.id === activeScaleId);
    let nextIdx = inc ? currentIdx + 1 : currentIdx - 1;
    
    if (nextIdx < 0) {
      setScalePoints(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = 0; });
        return next;
      });
      playTactileSound(420, 'sine', 0.05);
      return;
    }
    if (nextIdx >= SCALE_OPTIONS.length) nextIdx = SCALE_OPTIONS.length - 1;
    
    const targetId = SCALE_OPTIONS[nextIdx].id;
    
    setScalePoints(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = 0; });
      next[targetId] = 1;
      return next;
    });
    playTactileSound(650, 'sine', 0.05);
  };

  const handleManualScaleInput = (text: string) => {
    const normalized = text.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
    let clean = normalized.replace(/[^0-9]/g, '');
    if (!clean || clean === '0') {
      setScalePoints(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = 0; });
        return next;
      });
      playTactileSound(555, 'sine', 0.05);
      return;
    }
    let val = parseInt(clean, 10);
    if (isNaN(val)) return;
    if (val < 1) val = 1;
    if (val > SCALE_OPTIONS.length) val = SCALE_OPTIONS.length;
    
    const targetId = SCALE_OPTIONS[val - 1]?.id;
    if (targetId) {
      setScalePoints(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = 0; });
        next[targetId] = 1;
        return next;
      });
      playTactileSound(650, 'sine', 0.05);
    }
  };

  // Section 7: Hold [Duration] (Only one can be selected)
  const handleDurationSelectAndPoints = (key: string, inc: boolean) => {
    // If not active, clicking it sets it active at 1 duration (moving points from old duration active)
    if (durationActive !== key) {
      playTactileSound(700, 'triangle', 0.06);
      setDurationActive(key);
      setDurationPoints({
        Action: 0, Minute: 0, Hour: 0, Day: 0, Week: 0, Month: 0, Year: 0,
        [key]: 1
      });
    } else {
      const currentVal = durationPoints[key] || 0;
      if (inc) {
        const newVal = currentVal + 1;
        setDurationPoints(prev => ({
          Action: 0, Minute: 0, Hour: 0, Day: 0, Week: 0, Month: 0, Year: 0,
          [key]: newVal
        }));
        playTactileSound(620, 'sine', 0.05);
      } else {
        if (currentVal > 0) {
          const newVal = currentVal - 1;
          setDurationPoints(prev => ({
            Action: 0, Minute: 0, Hour: 0, Day: 0, Week: 0, Month: 0, Year: 0,
            [key]: newVal
          }));
          playTactileSound(420, 'sine', 0.05);
        }
      }
    }
  };

  // Section 8: Energy [Power] (Only one can be selected)
  const handlePowerSelectAndPoints = (key: string, inc: boolean) => {
    if (powerActive !== key) {
      playTactileSound(750, 'triangle', 0.06);
      setPowerActive(key);
      setPowerPoints({
        Minor: 0, Moderate: 0, Major: 0, Extreme: 0,
        [key]: 1
      });
    } else {
      const currentVal = powerPoints[key] || 0;
      if (inc) {
        const nextVal = currentVal + 1;
        playTactileSound(620, 'sine', 0.05);
        setPowerPoints(prev => ({
          Minor: 0, Moderate: 0, Major: 0, Extreme: 0,
          [key]: nextVal
        }));
      } else {
        if (currentVal > 0) {
          const prevVal = currentVal - 1;
          playTactileSound(420, 'sine', 0.05);
          setPowerPoints(prev => ({
            Minor: 0, Moderate: 0, Major: 0, Extreme: 0,
            [key]: prevVal
          }));
        } else {
          playTactileSound(220, 'sawtooth', 0.1);
        }
      }
    }
  };



  const handleForge = () => {
    if (!isSpellStable) {
      playTactileSound(180, 'sawtooth', 0.25);
      return;
    }

    const tierPower = POWER_OPTIONS.find(o => o.id === powerActive);
    const dCount = (tierPower?.diceCount || 1) * (powerPoints[powerActive] || 1);
    const dSize = tierPower?.diceSize || 6;
    const baseMod = (tierPower?.modifier || 1) * (powerPoints[powerActive] || 1);

    // Scaling modifiers from other investments
    const activeScalesCount = Object.keys(scalePoints).reduce((acc, key) => acc + (scalePoints[key] || 0), 0);
    const totalTargetPoints = targetCounts + targetOrigin + targetRange;
    const computedModifier = baseMod + (activeScalesCount * 2) + Math.max(0, totalTargetPoints - 3);

    const activeSubtypesList = nonagonSelectedNodes.flatMap(school => selectedSubtypes[school] || []);

    const subTypesStr = activeSubtypesList.length > 0
      ? ` Sub-types: ${activeSubtypesList.join(', ')}.`
      : '';

    const finalTotalCost = rawTotalCost;

    const finalDescription = spellDesc.trim()
      ? `${spellDesc.trim()} (ML ${magicLevel}, targeting ${targetCounts} node(s) over range ${targetRange}.${subTypesStr} Cost: ${finalTotalCost} Mana)`
      : `Arcane forged spell (Magic Level ${magicLevel}). Emulsplays customized matrix targeting ${targetCounts} node(s) over range ${targetRange}.${subTypesStr} Sum of costs is ${rawTotalCost} Mana.`;

    const builderState = {
      spellName,
      spellDesc,
      magicLevel,
      affinity,
      selectedSubtypes,
      effPoints,
      targetCounts,
      targetOrigin,
      targetRange,
      scalePoints,
      durationActive,
      durationPoints,
      powerActive,
      powerPoints,
      selectedRestrictions,
      category
    };

    onForgeSpell(
      spellName || 'Custom Hex',
      finalDescription,
      powerActive,
      liveFormula(),
      finalTotalCost,
      dCount,
      dSize,
      computedModifier,
      spellToEdit?.id,
      builderState,
      category
    );

    // Victory sound chord sweep!
    playTactileSound(440, 'sine', 0.1);
    setTimeout(() => playTactileSound(554, 'sine', 0.1), 80);
    setTimeout(() => playTactileSound(659, 'sine', 0.1), 160);
    setTimeout(() => playTactileSound(880, 'sine', 0.3), 240);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="spell-builder-dialog"
      className="absolute inset-x-2 inset-y-8 md:inset-x-4 md:inset-y-10 bg-stone-950/98 backdrop-blur-md border border-stone-800 rounded-xl p-2.5 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden font-sans text-stone-200 select-none"
      style={{ zIndex: LAYER_HIERARCHY.SPELL_BUILDER_POPUP }}
    >
      
      {/* GLOW BAR */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] transition-colors duration-500 ${isSpellStable ? 'bg-cyan-500' : 'bg-red-600'}`} />

      {/* WINDOW HEADER */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/5 shrink-0 gap-3 px-0.5">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Sparkles size={14} className="text-[#a855f7]" />
          <span className="font-serif font-black text-xs uppercase tracking-widest text-stone-100">{t("Spell Builder")}</span>
        </div>

        {/* Header Controls aligned right */}
        <div className="flex items-center gap-2">
          {/* Close Button */}
          <button 
            onClick={onClose}
            onMouseEnter={(e) => handleMouseEnter(e, "Close Spell Builder")}
            onMouseLeave={handleMouseLeave}
            className="text-stone-400 hover:text-red-400 h-6 w-6 rounded bg-stone-900 hover:bg-stone-800 transition-all cursor-pointer hover:rotate-90 shrink-0 flex items-center justify-center"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* METADATA BAR / CONTROLS (Magic Level and Spell Name below) */}
      <div className="flex items-center justify-between gap-2 py-1 border-b border-white/5 shrink-0 select-none px-0.5">
        {/* Magic Level and Spent Pool Box */}
        <div className="flex items-center gap-2 w-full md:w-[calc(50%-4px)] shrink-0 min-w-0">
          {/* Magic Level Box - Styled as a small counter box with - and + */}
          <div 
            className={`flex items-center h-6 gap-1.5 transition-all duration-300 border px-2 rounded-md ${
              magicLevel > 1 
                ? 'bg-amber-950/15 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.06)]' 
                : 'bg-stone-950/40 border-white/5'
            }`}
            onMouseEnter={(e) => handleMouseEnter(e, `Caster Magic Level: ML ${magicLevel}`)}
            onMouseLeave={handleMouseLeave}
          >
            <span className={`text-[9px] font-mono uppercase tracking-wider transition-colors duration-200 font-bold leading-none ${
              magicLevel > 1 ? 'text-amber-400 font-black' : 'text-stone-500'
            }`}>{t("Magic Level:")}</span>
            <div className="flex items-center justify-between bg-stone-900/80 border border-white/5 rounded px-1 h-[16px] gap-1.5 select-none">
              <button 
                onClick={() => {
                  if (magicLevel > 1) {
                    setMagicLevel(p => p - 1);
                    playTactileSound(480, 'sine', 0.05);
                  }
                }}
                onMouseEnter={(e) => handleMouseEnter(e, "Decrease spell matrix size")}
                onMouseLeave={handleMouseLeave}
                className="text-[9px] text-stone-400 hover:text-white font-mono font-bold hover:scale-110 transition-all leading-none px-0.5 cursor-pointer flex items-center justify-center h-full"
              >
                -
              </button>
              <span className="text-[9px] font-mono font-bold text-amber-400 min-w-[10px] text-center leading-none flex items-center justify-center h-full">{magicLevel}</span>
              <button 
                onClick={() => {
                  setMagicLevel(p => p + 1);
                  playTactileSound(540, 'sine', 0.05);
                }}
                onMouseEnter={(e) => handleMouseEnter(e, "Increase spell matrix size")}
                onMouseLeave={handleMouseLeave}
                className="text-[9px] text-stone-400 hover:text-white font-mono font-bold hover:scale-110 transition-all leading-none px-0.5 cursor-pointer flex items-center justify-center h-full"
              >
                +
              </button>
            </div>
          </div>

          {/* Magic Pool Spent Status Indicator */}
          <div 
            className="flex items-center h-6 gap-1.5 px-2 rounded bg-stone-950/60 border border-white/5 select-none shrink-0"
            onMouseEnter={(e) => handleMouseEnter(e, `Points distributed: ${totalSpentPoints} of ${totalAvailablePoints} units`)}
            onMouseLeave={handleMouseLeave}
          >
            <Activity size={10} className={totalSpentPoints > totalAvailablePoints ? 'text-red-500 animate-pulse' : totalSpentPoints === totalAvailablePoints ? 'text-cyan-400' : 'text-amber-400'} />
            <span className={`font-mono text-[9.5px] font-black tracking-wide px-1.5 py-0.5 rounded transition-all duration-300 ${
              totalSpentPoints > totalAvailablePoints 
                ? 'text-rose-400 bg-rose-950/40 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.25)] animate-pulse' 
                : totalSpentPoints === totalAvailablePoints 
                ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.25)] font-extrabold' 
                : 'text-amber-400 bg-amber-950/20 border border-amber-500/20 shadow-[0_0_6px_rgba(245,158,11,0.05)]'
            }`}>
              {totalSpentPoints}/{totalAvailablePoints}
            </span>
            <span className="text-[7.5px] uppercase tracking-wider text-stone-500 font-bold leading-none">{t("Spent")}</span>
          </div>

          {/* Affinity Dropdown */}
          <div className="relative flex items-center flex-1 min-w-0">
            <select
              value={affinity}
              onChange={(e) => handleAffinityChange(e.target.value)}
              onMouseEnter={(e) => handleMouseEnter(e, "Select magical alignment school")}
              onMouseLeave={handleMouseLeave}
              className="bg-stone-900 border border-white/10 rounded px-2 h-6 text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400 hover:border-amber-500/40 hover:bg-stone-850 focus:outline-none cursor-pointer leading-tight flex items-center w-full min-w-0"
            >
              <option value="Affinity" className="bg-stone-950 text-stone-400">{t("Affinity")}</option>
              {SCHOOLS.map(sc => (
                <option key={sc} value={sc} className="bg-stone-950 text-stone-200">{t(sc)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Formula Displays */}
        <div 
          className="hidden lg:flex items-center h-6 flex-1 min-w-0 bg-stone-950/70 py-0.5 px-2 rounded border border-white/5 text-[8.5px] font-mono text-stone-400 truncate"
          onMouseEnter={(e) => handleMouseEnter(e, "Dynamic Mystic Core Syntax Formula")}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1.5 truncate w-full">
            <span className="text-[6.5px] uppercase tracking-widest text-[#a855f7]/70 font-bold shrink-0 leading-none">{t("Live String:")}</span>
            <span className="truncate select-all text-stone-300 font-mono leading-none">{liveFormula()}</span>
          </div>
        </div>
      </div>

      {/* CATEGORIES WORKSPACE & CONTROLS GRID */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-0.5 pb-1.5 lg:pb-1 flex flex-col lg:grid lg:grid-cols-2 gap-2 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Section 1: Application */}
        <div className="p-2.5 sm:p-3 lg:p-1 lg:py-0.5 bg-stone-900/30 border border-white/5 rounded-lg flex flex-col gap-1.5 lg:gap-0.5 relative transition-all duration-300 overflow-visible h-fit min-h-0 pb-1.5 sm:pb-5 lg:pb-1 lg:col-span-1 lg:h-full shrink-0">
            <div className={`absolute top-0 bottom-0 left-0 w-[2px] transition-colors ${isSection1Valid ? 'bg-[#a855f7]' : 'bg-red-600/60'}`} />
            <div className="flex justify-between items-center px-1 shrink-0">
              <span className="text-[9px] lg:text-[8px] font-mono font-bold uppercase tracking-wider text-[#a855f7] flex items-center gap-1">
                <Sparkle size={10} className="lg:w-2 lg:h-2" /> {t("1. Application")}
              </span>
              <div className="flex items-center gap-1.5 lg:gap-1">
                <span className={`text-[8.5px] lg:text-[7px] font-mono transition-colors duration-200 ${appSubtypesCount > 0 ? 'text-[#a855f7] font-bold' : 'text-stone-500'}`}>
                  {appSubtypesCount} {t("Points")}
                </span>
                <span className="text-[8px] lg:text-[7px] font-mono text-stone-600">/</span>
                <span className={`text-[8.5px] lg:text-[7px] font-mono transition-colors duration-200 ${appCost > 0 ? 'text-[#a855f7] font-bold' : 'text-stone-500'}`}>
                  {appCost} {t("Cost")}
                </span>
              </div>
            </div>

            {/* --- THE NONAGON VIEW --- */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 w-full overflow-visible lg:my-auto mt-1.5 mb-2 sm:my-6 sm:mb-8">
              <div className="relative w-full aspect-square max-w-[250px] sm:max-w-[270px] lg:max-w-[310px] xl:max-w-[340px] mx-auto flex items-center justify-center p-0.5 overflow-visible select-none lg:scale-[1.26] xl:scale-[1.33]">
                {/* Rotatable Inner container */}
                <div 
                  style={{
                    transform: `rotate(${nonagonRotation}deg)`,
                    transition: 'transform 500ms linear',
                  }}
                  className="absolute inset-0 w-full h-full overflow-visible flex items-center justify-center pointer-events-none"
                >
                  {/* 1. Low Opacity Background SVG containing Connecting Polygon + Radial Spokes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none animate-spin-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    {/* Glowing core drop shadow polygon for magical depth */}
                    <polygon
                      points={Array.from({ length: 9 }).map((_, k) => {
                        const angle = -Math.PI / 2 + (k * 2 * Math.PI) / 9;
                        const x = 50 + 42 * Math.cos(angle);
                        const y = 50 + 42 * Math.sin(angle);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="rgba(12, 10, 9, 0.45)"
                      stroke="rgba(168, 85, 247, 0.15)"
                      strokeWidth="0.4"
                    />
                    {/* Spokes radiating outer vertices */}
                    {Array.from({ length: 9 }).map((_, k) => {
                      const angle = -Math.PI / 2 + (k * 2 * Math.PI) / 9;
                      const x = 50 + 42 * Math.cos(angle);
                      const y = 50 + 42 * Math.sin(angle);
                      return (
                        <line
                          key={k}
                          x1="50"
                          y1="50"
                          x2={x}
                          y2={y}
                          stroke="rgba(255, 255, 255, 0.05)"
                          strokeWidth="0.25"
                        />
                      );
                    })}
                  </svg>

                  {/* 3. Interactive Badge Nodes at Vertices (Statically placed relative to rotatable container) */}
                  {SCHOOLS.map((school, idx) => {
                    const details = getNonagonDetails(school);
                    const isSelected = nonagonSelectedNodes.includes(school);
                    
                    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 9;
                    const leftPct = 50 + 42 * Math.cos(angle);
                    const topPct = 50 + 42 * Math.sin(angle);

                    return (
                      <button
                        key={school}
                        onClick={() => handleToggleNonagonNode(school)}
                        onMouseEnter={(e) => handleMouseEnter(e, `Cost: ${details.value}`)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          transform: `translate(-50%, -50%) rotate(${-nonagonRotation}deg)`,
                          transition: 'transform 500ms linear',
                        }}
                        className={`absolute px-1.5 py-0.5 rounded border flex items-center justify-center pointer-events-auto z-20 ${
                          affinity === 'Affinity'
                            ? 'border-stone-850 bg-stone-950/20 text-stone-600 cursor-not-allowed opacity-40'
                            : isSelected 
                              ? `${details.selectedClass} cursor-pointer` 
                              : `${details.unselectedClass} cursor-pointer`
                        }`}
                      >
                        <span className="font-mono text-[7px] leading-none tracking-tight font-bold whitespace-nowrap">
                          {affinity === 'Affinity' ? `${details.value}. ?` : `${details.value}. ${t(school)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Absolute Center Medallion (Placed outside rotatable div so it stays upright & steady) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-stone-900/95 border border-amber-500/15 shadow-[0_0_12px_rgba(251,191,36,0.06)] flex flex-col items-center justify-center pointer-events-none select-none z-10">
                  <span className="text-[5px] font-mono text-stone-500 uppercase tracking-widest leading-none">{t('CORE')}</span>
                  <span className="text-[7.5px] font-serif font-black text-amber-400 tracking-normal leading-normal mt-0.5 text-center px-0.5 min-w-0 max-w-full truncate">
                    {affinity === 'Affinity' ? t('AFF?') : t(affinity)}
                  </span>
                  <span className="text-[5px] font-mono text-stone-500 uppercase tracking-widest leading-none">{t('V02')}</span>
                </div>
              </div>
            </div>

            {/* Active Subtypes Visual Chips List below Nonagon */}
            {(Object.values(selectedSubtypes) as string[][]).flat().length > 0 && (
              <div className="mt-2 lg:mt-0 lg:absolute lg:bottom-1 lg:inset-x-0 flex flex-wrap gap-1 justify-center max-h-[44px] lg:max-h-[30px] overflow-y-auto px-1 z-10 select-none">
                {(Object.entries(selectedSubtypes) as [string, string[]][]).map(([school, list]) => {
                  if (!list || list.length === 0) return null;
                  const theme = getSubtypeColorTheme(school);
                  return list.map(sub => (
                    <span 
                      key={`${school}-${sub}`} 
                      className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${theme.borderColor} ${theme.textColor} bg-stone-950/80 font-bold tracking-tight shadow-[0_1px_4px_rgba(0,0,0,0.4)]`}
                    >
                      {sub}
                    </span>
                  ));
                })}
              </div>
            )}

            {/* SUB-TYPES OVERLAY PANEL WINDOW */}
            <AnimatePresence>
              {subtypeSelectSchool && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-[15%] right-[15%] top-[5%] bottom-[5%] bg-stone-950/98 border border-white/10 rounded-lg p-2 flex flex-col z-[150] shadow-[0_8px_30px_rgba(0,0,0,0.95)]"
                  style={{
                    boxShadow: `0 4px 20px ${getSubtypeColorTheme(subtypeSelectSchool).glowColor}`,
                  }}
                >
                  {/* Outer glow accent bar */}
                  <div className={`absolute top-0 inset-x-0 h-[2px] rounded-t-lg bg-current ${getSubtypeColorTheme(subtypeSelectSchool).textColor}`} />

                  {/* Header */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 select-none shrink-0">
                    <div className="flex flex-col">
                      <span className="text-[7.5px] font-mono uppercase tracking-widest text-stone-500 font-bold">{t("SCHOOL SUB-TYPES")}</span>
                      <span className={`text-[11px] font-serif font-black uppercase tracking-wider ${getSubtypeColorTheme(subtypeSelectSchool).textColor}`}>
                        {t(subtypeSelectSchool)}
                      </span>
                    </div>
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setSubtypeSelectSchool(null);
                        playTactileSound(420, 'sine', 0.05);
                      }}
                      className="text-stone-500 hover:text-white transition-colors cursor-pointer w-4 h-4 rounded hover:bg-white/5 flex items-center justify-center animate-none"
                    >
                      <X size={10} />
                    </button>
                  </div>

                  {/* Single Column List of Subtypes */}
                  <div className="flex-1 overflow-y-auto mb-1.5 pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex flex-col gap-1">
                      {(SUBTYPES_BY_SCHOOL[subtypeSelectSchool] || []).map((sub, idx) => {
                        const isSelected = (selectedSubtypes[subtypeSelectSchool] || []).includes(sub);
                        const theme = getSubtypeColorTheme(subtypeSelectSchool);
                        return (
                          <button
                            key={`builder-subtype-${subtypeSelectSchool}-${sub}-${idx}`}
                            onClick={() => handleToggleSubtype(subtypeSelectSchool, sub)}
                            className={`px-2 py-1 rounded text-[8px] font-mono text-left uppercase font-bold transition-all border outline-none cursor-pointer flex justify-between items-center ${
                              isSelected 
                                ? theme.accentBtn
                                : `bg-stone-900/30 text-stone-400 ${theme.borderColor} ${theme.hoverBorder} hover:text-stone-200 hover:bg-stone-900/65`
                            }`}
                          >
                            <span>{t(sub)}</span>
                            {isSelected && <span className="text-[6.5px]">●</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer control */}
                  <div className="border-t border-white/5 pt-1.5 flex items-center justify-between shrink-0">
                    <span className="text-[7.5px] text-stone-500 font-mono font-bold uppercase">
                      {(selectedSubtypes[subtypeSelectSchool] || []).length} {t("SELECTED")}
                    </span>
                    <button
                      onClick={() => {
                        setSubtypeSelectSchool(null);
                        playTactileSound(650, 'sine', 0.05);
                      }}
                      className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-extrabold cursor-pointer transition-all border ${getSubtypeColorTheme(subtypeSelectSchool).accentBtn}`}
                    >
                      {t("DONE")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        {/* Column 2 Stack */}
        <div className="lg:col-span-1 flex flex-col gap-1 lg:gap-0.5 min-h-0 lg:h-full justify-start overflow-visible shrink-0">

          {/* Section 2: Effect */}
          <div className="p-2.5 sm:p-3 lg:p-1 lg:py-0.5 bg-stone-900/30 border border-white/5 rounded-lg flex flex-col gap-1.5 lg:gap-0.5 relative overflow-visible h-fit min-h-0 pb-3 sm:pb-4 lg:pb-0.5">
            <div className={`absolute top-0 bottom-0 left-0 w-[2px] transition-colors ${isSection2Valid ? 'bg-cyan-500' : 'bg-red-600/60'}`} />
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] lg:text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Flame size={10} className="lg:w-2.5 lg:h-2.5" /> {t("2. Effect")}
              </span>
              <div className="flex items-center gap-1.5 lg:gap-1">
                <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${getSumOfPoints(effPoints) > 0 ? 'text-cyan-400 font-bold' : 'text-stone-500'}`}>
                  {getSumOfPoints(effPoints)} {t("Points")}
                </span>
                <span className="text-[8px] lg:text-[7.5px] font-mono text-stone-600">/</span>
                <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${effCost > 0 ? 'text-cyan-400 font-bold' : 'text-stone-500'}`}>
                  {effCost} {t("Cost")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 lg:gap-0.5">
              {(['burst', 'homing', 'attach', 'react'] as const).map(key => {
                const points = effPoints[key] || 0;
                const isActive = points > 0;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isActive) {
                        setEffPoints(prev => ({ ...prev, [key]: 0 }));
                        playTactileSound(450, 'sine', 0.03);
                      } else {
                        setEffPoints(prev => ({ ...prev, [key]: 1 }));
                        playTactileSound(650, 'sine', 0.03);
                      }
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, `Toggle effect output: ${key.toUpperCase()}`)}
                    onMouseLeave={handleMouseLeave}
                    className={`flex items-center justify-center px-2 py-0.5 lg:py-0 lg:px-1 rounded bg-stone-950/40 border text-[8.5px] lg:text-[7.5px] font-mono uppercase cursor-pointer select-none transition-all duration-200 ${
                      isActive 
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-bold' 
                        : 'border-white/5 text-stone-400 hover:border-white/10 hover:text-stone-200 hover:bg-stone-900/40'
                    }`}
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ROW 2: Sections 3, 4, 5 (Targeting Controls - with typing & manual box inputs) */}
          <div className="p-1.5 lg:p-1 lg:py-0.5 bg-stone-900/30 border border-white/5 rounded-lg flex flex-col gap-1 lg:gap-0.5 relative shrink-0">
          <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-amber-500/80 rounded" />
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] lg:text-[8px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Gauge size={10} className="lg:w-2.5 lg:h-2.5" /> {t("3-5. Targeting Vectors")}
            </span>
            <div className="flex items-center gap-1.5 lg:gap-1">
              <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${(targetCounts + targetOrigin + targetRange) > 3 ? 'text-amber-400 font-bold' : 'text-stone-500'}`}>
                {(targetCounts + targetOrigin + targetRange)} {t("Points")}
              </span>
              <span className="text-[8px] lg:text-[7.5px] font-mono text-stone-600">/</span>
              <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${targetCost > 1 ? 'text-amber-400 font-bold' : 'text-stone-500'}`}>
                {targetCost} {t("Cost")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 lg:gap-0.5">
            {/* Target Counts */}
            <div 
              className="flex flex-col gap-0.5 lg:gap-0 p-1 lg:p-0.5 bg-stone-950/40 rounded border border-white/5"
              onMouseEnter={(e) => handleMouseEnter(e, "Determine quantity of targets within the mystic weave")}
              onMouseLeave={handleMouseLeave}
            >
              <span className="text-[7px] lg:text-[6.5px] font-mono text-stone-500 uppercase tracking-wide text-center">{t("Target [Counts]")}</span>
              <div className="flex items-center justify-center gap-1 lg:gap-0.5">
                <button 
                  onClick={() => handleTargetPointsNum('counts', false)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Decrease Target Counts focus")}
                  onMouseLeave={handleMouseLeave}
                  className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                >
                  <Minus size={8} className="lg:scale-75" />
                </button>
                {/* MANUAL NUMBER INPUT */}
                <input 
                  type="text"
                  pattern="[0-9]*"
                  value={targetCounts}
                  onChange={(e) => handleManualTargetInput('counts', e.target.value)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Input manual Target Counts value")}
                  onMouseLeave={handleMouseLeave}
                  className="w-10 lg:w-7 bg-stone-900 border border-white/10 rounded px-1 py-0.5 lg:py-0 text-center text-[10px] lg:text-[8px] font-mono font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <button 
                  onClick={() => handleTargetPointsNum('counts', true)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Increase Target Counts focus")}
                  onMouseLeave={handleMouseLeave}
                  className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                >
                  <Plus size={8} className="lg:scale-75" />
                </button>
              </div>
            </div>

            {/* Target Origin */}
            <div 
              className="flex flex-col gap-0.5 lg:gap-0 p-1 lg:p-0.5 bg-stone-950/40 rounded border border-white/5"
              onMouseEnter={(e) => handleMouseEnter(e, "Define origin vector coordinates for center of effect")}
              onMouseLeave={handleMouseLeave}
            >
              <span className="text-[7px] lg:text-[6.5px] font-mono text-stone-500 uppercase tracking-wide text-center">{t("Target [Origin]")}</span>
              <div className="flex items-center justify-center gap-1 lg:gap-0.5">
                <button 
                  onClick={() => handleTargetPointsNum('origin', false)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Decrease Target Origin focus")}
                  onMouseLeave={handleMouseLeave}
                  className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                >
                  <Minus size={8} className="lg:scale-75" />
                </button>
                {/* MANUAL NUMBER INPUT */}
                <input 
                  type="text"
                  pattern="[0-9]*"
                  value={targetOrigin}
                  onChange={(e) => handleManualTargetInput('origin', e.target.value)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Input manual Target Origin value")}
                  onMouseLeave={handleMouseLeave}
                  className="w-10 lg:w-7 bg-stone-900 border border-white/10 rounded px-1 py-0.5 lg:py-0 text-center text-[10px] lg:text-[8px] font-mono font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <button 
                  onClick={() => handleTargetPointsNum('origin', true)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Increase Target Origin focus")}
                  onMouseLeave={handleMouseLeave}
                  className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                >
                  <Plus size={8} className="lg:scale-75" />
                </button>
              </div>
            </div>

            {/* Target Range */}
            <div 
              className="flex flex-col gap-0.5 lg:gap-0 p-1 lg:p-0.5 bg-stone-950/40 rounded border border-white/5 relative"
              onMouseEnter={(e) => handleMouseEnter(e, "Regulate the projection range bounds of the spell effect")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => {
                  if (affinity !== 'Affinity') {
                    setIsRangeSelectOpen(true);
                    playTactileSound(600, 'sine', 0.05);
                  }
                }}
                className={`text-[7px] lg:text-[6.2px] lg:py-0 font-mono uppercase tracking-widest text-center select-none transition-colors border border-dashed font-bold rounded py-0.5 w-full outline-none ${
                  affinity === 'Affinity'
                    ? 'text-stone-600 border-stone-800 bg-stone-900/10 cursor-not-allowed'
                    : 'text-amber-500/90 hover:text-amber-300 border-amber-500/20 hover:border-amber-500/60 bg-amber-950/10 hover:bg-amber-950/20 cursor-pointer'
                }`}
              >
                {t("Target [Range] ✦")}
              </button>
              <div className="flex items-center justify-center gap-1 lg:gap-0.5">
                <button 
                  onClick={() => handleTargetPointsNum('range', false)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Decrease Target Range focus")}
                  onMouseLeave={handleMouseLeave}
                  className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                >
                  <Minus size={8} className="lg:scale-75" />
                </button>
                {/* MANUAL NUMBER INPUT */}
                <input 
                  type="text"
                  pattern="[0-9]*"
                  value={targetRange}
                  onChange={(e) => handleManualTargetInput('range', e.target.value)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Input manual Target Range value")}
                  onMouseLeave={handleMouseLeave}
                  className="w-10 lg:w-7 bg-stone-900 border border-white/10 rounded px-1 py-0.5 lg:py-0 text-center text-[10px] lg:text-[8px] font-mono font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <button 
                  onClick={() => handleTargetPointsNum('range', true)}
                  onMouseEnter={(e) => handleMouseEnter(e, "Increase Target Range focus")}
                  onMouseLeave={handleMouseLeave}
                  className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                >
                  <Plus size={8} className="lg:scale-75" />
                </button>
              </div>
            </div>
          </div>
        </div>

          {/* ROW 3: Sections 6, 7 (Hold) */}
          <div className={`p-1.5 lg:p-1 lg:py-0.5 bg-stone-900/30 border border-white/5 rounded-lg flex flex-col gap-1 lg:gap-0.5 relative shrink-0 transition-all duration-300 ${durationDropdownOpen ? 'z-[60]' : 'z-10'}`}>
          <div className={`absolute top-0 bottom-0 left-0 w-[2px] transition-colors ${isSection6Valid && isSection7Valid ? 'bg-rose-500/80' : 'bg-red-600/60'}`} />
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] lg:text-[8px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <Hourglass size={10} className="lg:w-2.5 lg:h-2.5" /> {t("6-7. Hold")}
            </span>
            <div className="flex items-center gap-1.5 lg:gap-1">
              <span className="text-[7.5px] lg:text-[7px] font-mono text-stone-500">
                {(() => {
                  const activeScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
                  const activeScaleOpt = SCALE_OPTIONS.find(o => o.id === activeScaleId) || SCALE_OPTIONS[0];
                  return `S:${activeScaleOpt.abbr} D:${durationActive}`;
                })()}
              </span>
              <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${holdPointsSpent > 1 ? 'text-rose-400 font-bold' : 'text-stone-500'}`}>
                {holdPointsSpent} {t("Points")}
              </span>
              <span className="text-[8px] lg:text-[7.5px] font-mono text-stone-600">/</span>
              <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${holdCost > 0 ? 'text-rose-400 font-bold' : 'text-stone-500'}`}>
                {holdCost} {t("Cost")}
              </span>
            </div>
          </div>

            <div className="grid grid-cols-2 gap-1.5 lg:gap-0.5">
              {/* Hold [Scale] */}
              <div 
                className="flex flex-col gap-0.5 lg:gap-0 p-1 lg:p-0.5 bg-stone-950/40 rounded border border-white/5 relative"
                onMouseEnter={(e) => handleMouseEnter(e, "Temporal bounds of holding cosmic/space-time scale magnification")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => {
                    if (affinity !== 'Affinity') {
                      setIsScaleSelectOpen(true);
                      playTactileSound(600, 'sine', 0.05);
                    }
                  }}
                  className={`text-[7.5px] lg:text-[6.5px] lg:py-0 font-mono uppercase tracking-widest text-center select-none transition-colors border border-dashed font-bold rounded py-0.5 w-full outline-none ${
                    affinity === 'Affinity'
                      ? 'text-stone-600 border-stone-800 bg-stone-900/10 cursor-not-allowed'
                      : 'text-rose-500/90 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/60 bg-rose-950/10 hover:bg-rose-950/20 cursor-pointer'
                  }`}
                >
                  {t("Hold [Scale] ✦")}
                </button>
                <div className="flex items-center justify-center gap-1 lg:gap-0.5">
                  <button 
                    onClick={() => handleScaleCycle(false)}
                    onMouseEnter={(e) => handleMouseEnter(e, "Decrease Scale Magnitude focus")}
                    onMouseLeave={handleMouseLeave}
                    className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                  >
                    <Minus size={8} className="lg:scale-75" />
                  </button>
                  {/* MANUAL INDEX INPUT */}
                  <input 
                    type="text"
                    pattern="[0-9]*"
                    value={(() => {
                      const hasActive = Object.keys(scalePoints).some(k => (scalePoints[k] || 0) > 0);
                      if (!hasActive) return '0';
                      const activeScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
                      const activeScaleIndexNum = SCALE_OPTIONS.findIndex(o => o.id === activeScaleId) + 1;
                      return String(activeScaleIndexNum);
                    })()}
                    onChange={(e) => handleManualScaleInput(e.target.value)}
                    onMouseEnter={(e) => {
                      const activeScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
                      const activeScaleOpt = SCALE_OPTIONS.find(o => o.id === activeScaleId) || SCALE_OPTIONS[0];
                      handleMouseEnter(e, `Input manual scale index (1-${SCALE_OPTIONS.length}). Active: ${activeScaleOpt.abbr}`);
                    }}
                    onMouseLeave={handleMouseLeave}
                    className="w-10 lg:w-7 bg-stone-900 border border-white/10 rounded px-1 py-0.5 lg:py-0 text-center text-[10px] lg:text-[8px] font-mono font-bold text-rose-200 focus:outline-none focus:border-rose-400"
                  />
                  <button 
                    onClick={() => handleScaleCycle(true)}
                    onMouseEnter={(e) => handleMouseEnter(e, "Increase Scale Magnitude focus")}
                    onMouseLeave={handleMouseLeave}
                    className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                  >
                    <Plus size={8} className="lg:scale-75" />
                  </button>
                </div>
              </div>

              {/* Hold [Duration] */}
              <div 
                className="flex flex-col gap-0.5 lg:gap-0 p-1 lg:p-0.5 bg-stone-950/40 rounded border border-white/5 relative select-none"
                onMouseEnter={(e) => handleMouseEnter(e, "Temporal calibration of spell active duration")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => {
                    if (affinity !== 'Affinity') {
                      setDurationDropdownOpen(prev => !prev);
                      playTactileSound(550, 'sine', 0.05);
                    }
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, `Select duration slot (Current: ${durationActive})`)}
                  onMouseLeave={handleMouseLeave}
                  className={`text-[7.5px] lg:text-[6.5px] lg:py-0 font-mono uppercase tracking-widest text-center select-none transition-colors border border-dashed font-bold rounded py-0.5 w-full outline-none truncate ${
                    affinity === 'Affinity'
                      ? 'text-stone-600 border-stone-800 bg-stone-900/10 cursor-not-allowed'
                      : 'text-rose-500/90 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/60 bg-rose-950/10 hover:bg-rose-950/20 cursor-pointer'
                  }`}
                >
                  {t("Hold [Duration] ✦")}
                </button>
                
                <div className="flex items-center justify-center gap-1 lg:gap-0.5">
                  <button 
                    onClick={() => handleDurationSelectAndPoints(durationActive, false)}
                    onMouseEnter={(e) => handleMouseEnter(e, "Decrease duration magnitude scale")}
                    onMouseLeave={handleMouseLeave}
                    className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                  >
                    <Minus size={8} className="lg:scale-75" />
                  </button>
                  {/* MANUAL POINTS INPUT */}
                  <input 
                    type="text"
                    pattern="[0-9]*"
                    value={tn(durationPoints[durationActive] || 0)}
                    onChange={(e) => {
                      const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
                      const clean = normalized.replace(/[^0-9]/g, '');
                      if (!clean) return;
                      const parsed = parseInt(clean, 10);
                      if (!isNaN(parsed)) {
                        const targetVal = Math.max(1, parsed);
                        setDurationPoints(prev => ({
                          Action: 0, Minute: 0, Hour: 0, Day: 0, Week: 0, Month: 0, Year: 0,
                          [durationActive]: targetVal
                        }));
                      }
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, `Input manual duration points. Active type: ${durationActive}`)}
                    onMouseLeave={handleMouseLeave}
                    className="w-10 lg:w-7 bg-stone-900 border border-white/10 rounded px-1 py-0.5 lg:py-0 text-center text-[10px] lg:text-[8px] font-mono font-bold text-rose-200 focus:outline-none focus:border-rose-400"
                  />
                  <button 
                    onClick={() => handleDurationSelectAndPoints(durationActive, true)}
                    onMouseEnter={(e) => handleMouseEnter(e, "Increase duration magnitude scale")}
                    onMouseLeave={handleMouseLeave}
                    className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                  >
                    <Plus size={8} className="lg:scale-75" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 8 (Energy Calibration) */}
          <div className={`p-1.5 lg:p-1 lg:py-0.5 bg-stone-900/30 border border-white/5 rounded-lg flex flex-col gap-1 lg:gap-0.5 relative shrink-0 transition-all duration-300 ${powerDropdownOpen ? 'z-[60]' : 'z-10'}`}>
            <div className={`absolute top-0 bottom-0 left-0 w-[2px] transition-colors ${isSection8Valid ? 'bg-red-500/80' : 'bg-red-600/60'}`} />
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] lg:text-[8px] font-mono font-bold uppercase tracking-wider text-red-500 flex items-center gap-1 truncate">
                <Zap size={10} className="lg:w-2.5 lg:h-2.5" /> {t("8. Energy")}
              </span>
              <div className="flex items-center gap-1.5 lg:gap-1 flex-shrink-0">
                <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${(powerPoints[powerActive] || 0) > 0 ? 'text-red-400 font-bold' : 'text-stone-500'}`}>
                  {powerPoints[powerActive] || 0} {t("Points")}
                </span>
                <span className="text-[8px] lg:text-[7.5px] font-mono text-stone-600">/</span>
                <span className={`text-[8px] lg:text-[7.5px] font-mono transition-colors duration-200 ${powerCost > 0 ? 'text-red-400 font-bold' : 'text-stone-500'}`}>
                  {powerCost} {t("Cost")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 lg:gap-0.5">
              <div 
                className="flex flex-col gap-0.5 lg:gap-0 p-1 lg:p-0.5 bg-stone-950/40 rounded border border-white/5 relative select-none"
                onMouseEnter={(e) => handleMouseEnter(e, "Determine internal energy potency of the active matrix in dice")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => {
                    if (affinity !== 'Affinity') {
                      setPowerDropdownOpen(prev => !prev);
                      playTactileSound(600, 'sine', 0.05);
                    }
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, `Select potency tier (Current: ${powerActive})`)}
                  onMouseLeave={handleMouseLeave}
                  className={`text-[7.5px] lg:text-[6.5px] lg:py-0 font-mono uppercase tracking-widest text-center select-none transition-colors border border-dashed font-bold rounded py-0.5 w-full outline-none truncate ${
                    affinity === 'Affinity'
                      ? 'text-stone-600 border-stone-800 bg-stone-900/10 cursor-not-allowed'
                      : 'text-red-500/90 hover:text-red-300 border-red-500/20 hover:border-red-500/60 bg-red-950/10 hover:bg-red-950/20 cursor-pointer'
                  }`}
                >
                  {t("Energy [Dice] ✦")}
                </button>

                <div className="flex items-center justify-center gap-1 lg:gap-0.5">
                  <button 
                    onClick={() => handlePowerSelectAndPoints(powerActive, false)}
                    onMouseEnter={(e) => handleMouseEnter(e, "Decrease spell effect active raw dice")}
                    onMouseLeave={handleMouseLeave}
                    className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                  >
                    <Minus size={8} className="lg:scale-75" />
                  </button>
                  {/* MANUAL POINTS INPUT */}
                  <input 
                    type="text"
                    pattern="[0-9]*"
                    value={tn(powerPoints[powerActive] || 0)}
                    onChange={(e) => {
                      const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
                      const clean = normalized.replace(/[^0-9]/g, '');
                      if (!clean) {
                        setPowerPoints(prev => ({
                          Minor: 0, Moderate: 0, Major: 0, Extreme: 0,
                          [powerActive]: 0
                        }));
                        return;
                      }
                      const parsed = parseInt(clean, 10);
                      if (!isNaN(parsed)) {
                        setPowerPoints(prev => ({
                          Minor: 0, Moderate: 0, Major: 0, Extreme: 0,
                          [powerActive]: parsed
                        }));
                      }
                    }}
                    onBlur={() => {
                      const currentVal = powerPoints[powerActive] || 0;
                      if (currentVal < 1) {
                        setPowerPoints(prev => ({
                          Minor: 0, Moderate: 0, Major: 0, Extreme: 0,
                          [powerActive]: 1
                        }));
                      }
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, `Input manual potency points. Active tier: ${powerActive}`)}
                    onMouseLeave={handleMouseLeave}
                    className="w-10 lg:w-7 bg-stone-900 border border-white/10 rounded px-1 py-0.5 lg:py-0 text-center text-[10px] lg:text-[8px] font-mono font-bold text-red-200 focus:outline-none focus:border-red-400"
                  />
                  <button 
                    onClick={() => handlePowerSelectAndPoints(powerActive, true)}
                    onMouseEnter={(e) => handleMouseEnter(e, "Increase spell effect active raw dice")}
                    onMouseLeave={handleMouseLeave}
                    className="w-[18px] h-[18px] lg:w-4 lg:h-4 flex items-center justify-center rounded bg-stone-900 text-stone-400 hover:text-white cursor-pointer hover:bg-stone-800"
                  >
                    <Plus size={8} className="lg:scale-75" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 5: S9 Restrictions (Cheaper spells / negative offset) - Redesigned into three dropdown slots */}
          <div 
            className={`p-1.5 lg:p-1 lg:py-0.5 bg-stone-900/30 rounded-lg flex flex-col gap-1.5 lg:gap-0.5 relative shrink-0 transition-all duration-300 border ${
              openRestrictIdx !== null ? 'z-[60]' : 'z-10'
            } ${
              isSection9Valid 
                ? 'border-[#a855f7]/25 bg-[#a855f7]/[0.03] shadow-[0_0_12px_rgba(168,85,247,0.03)]' 
                : 'border-white/5'
            }`}
          onMouseEnter={(e) => handleMouseEnter(e, "Impose active limitations to gain casting rebate and increase magic points pool")}
          onMouseLeave={handleMouseLeave}
        >
          <div className={`absolute top-0 bottom-0 left-0 w-[2px] transition-colors ${isSection9Valid ? 'bg-[#a855f7]/60' : 'bg-red-600/60'}`} />
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] lg:text-[8px] font-mono font-bold uppercase tracking-wider text-[#a855f7] flex items-center gap-1">
              <ShieldAlert size={10} className="text-[#a855f7] lg:w-2.5 lg:h-2.5" /> {t("9. Restrictions")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 lg:gap-0.5">
            {selectedRestrictions.map((activeId, idx) => {
              const isOpen = openRestrictIdx === idx;
              const activeOpt = activeId ? RESTRICTION_OPTIONS.find(o => o.id === activeId) : null;

              return (
                <div key={idx} className="relative flex flex-col">
                  {/* Dropdown Backdrop to close if clicked outside */}
                  {isOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setOpenRestrictIdx(null)} 
                    />
                  )}
                  
                  {/* Selector Button & Clear Button Container */}
                  <div className="flex items-center gap-1 lg:gap-0.5 relative z-10">
                    <button
                      onClick={() => {
                        if (affinity !== 'Affinity') {
                          setOpenRestrictIdx(isOpen ? null : idx);
                          playTactileSound(550, 'sine', 0.05);
                        }
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, activeId ? `Change restriction ${idx + 1}: ${activeId}` : `Select restriction ${idx + 1}`)}
                      onMouseLeave={handleMouseLeave}
                      className={`flex-1 text-left px-2 py-1 lg:px-1 lg:py-0.5 text-[8.5px] lg:text-[7px] font-mono font-bold uppercase transition-all rounded flex items-center justify-between outline-none border ${
                        affinity === 'Affinity'
                          ? 'text-stone-600 border-stone-850 bg-stone-900/10 cursor-not-allowed'
                          : activeId 
                            ? 'text-purple-300 bg-purple-950/15 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-950/25 cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.05)]' 
                            : 'text-stone-400 border-stone-800 hover:border-stone-700 bg-stone-900/40 hover:bg-stone-900/60 cursor-pointer border-dashed'
                      }`}
                    >
                      <span className="truncate mr-1">{activeId ? t(activeId) : t('Restrict')}</span>
                      {activeOpt && (
                        <span className="text-[8.5px] lg:text-[7.5px] font-mono text-purple-400 font-extrabold ml-1 shrink-0">
                          +{activeOpt.bonus}
                        </span>
                      )}
                    </button>

                    {/* Quick Clear Button */}
                    {activeId && affinity !== 'Affinity' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRestrictions(prev => {
                            const next = [...prev];
                            next[idx] = null;
                            return next;
                          });
                          playTactileSound(400, 'sine', 0.04);
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, "Clear this restriction")}
                        onMouseLeave={handleMouseLeave}
                        className="w-[18px] h-[18px] lg:w-3.5 lg:h-3.5 shrink-0 flex items-center justify-center rounded bg-stone-900 hover:bg-stone-800 text-stone-500 hover:text-rose-400 transition-colors cursor-pointer border border-white/5"
                      >
                        <span className="text-[10px] lg:text-[9px] font-sans leading-none">&times;</span>
                      </button>
                    )}
                  </div>

                  {/* Dropdown Options Drawer */}
                  {isOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-stone-950 border border-white/10 rounded-md shadow-2xl z-50 py-1 max-h-48 overflow-y-auto">
                      {/* "Clear / None" selection */}
                      <button
                        onClick={() => {
                          setSelectedRestrictions(prev => {
                            const next = [...prev];
                            next[idx] = null;
                            return next;
                          });
                          setOpenRestrictIdx(null);
                          playTactileSound(400, 'sine', 0.04);
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, "Clear restriction")}
                        onMouseLeave={handleMouseLeave}
                        className={`w-full text-left px-2.5 py-1 text-[8.5px] font-mono uppercase transition-colors border-l border-transparent ${
                          activeId === null 
                            ? 'text-purple-400 bg-purple-950/20 font-bold' 
                            : 'text-stone-500 hover:bg-stone-900 hover:text-stone-300'
                        }`}
                      >
                        {t("Restriction")}
                      </button>

                      {RESTRICTION_OPTIONS.map((opt) => {
                        const isAlreadySelectedByOther = selectedRestrictions.some((val, i) => i !== idx && val === opt.id);
                        const isSelectedThis = activeId === opt.id;

                        return (
                          <button
                            key={opt.id}
                            disabled={isAlreadySelectedByOther}
                            onClick={() => {
                              setSelectedRestrictions(prev => {
                                const next = [...prev];
                                next[idx] = opt.id;
                                return next;
                              });
                              setOpenRestrictIdx(null);
                              playTactileSound(650, 'sine', 0.05);
                            }}
                            onMouseEnter={(e) => handleMouseEnter(e, isAlreadySelectedByOther ? `${opt.id} is already selected in another slot` : `Impose restriction: ${opt.id} (+${opt.bonus} Pool)`)}
                            onMouseLeave={handleMouseLeave}
                            className={`w-full text-left px-2.5 py-1 text-[8.5px] font-mono uppercase transition-colors flex items-center justify-between border-l ${
                              isAlreadySelectedByOther
                                ? 'text-stone-750 bg-stone-950/40 opacity-40 cursor-not-allowed border-transparent'
                                : isSelectedThis
                                  ? 'text-purple-400 bg-purple-950/25 border-purple-500/80 font-bold shadow-[inset_1px_0_0_0_rgba(168,85,247,0.4)]'
                                  : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200 border-transparent hover:border-purple-500/20'
                            }`}
                          >
                            <span className={isSelectedThis ? 'text-purple-300' : isAlreadySelectedByOther ? 'text-stone-600 line-through' : ''}>
                              {t(opt.id)}
                            </span>
                            <span className={`${
                              isSelectedThis 
                                ? 'text-purple-300 font-extrabold' 
                                : isAlreadySelectedByOther
                                  ? 'text-stone-600'
                                  : 'text-stone-500 font-bold'
                            } text-[8px] font-mono`}>
                              +{opt.bonus}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER ROW: SPELL CONFIG & ARCHIVE PANEL */}
        <div 
          className="p-1.5 lg:p-1 lg:py-1 bg-stone-900/30 border border-white/5 rounded-lg flex flex-col gap-1.5 lg:gap-1 relative shrink-0 lg:flex-1 lg:min-h-0 lg:h-auto mt-1.5 lg:mt-0 overflow-visible justify-between"
          onMouseEnter={(e) => handleMouseEnter(e, "Finalize spell configuration name and flavor text to save to your spell archives")}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-[#a855f7]/40 rounded-l" />

          {/* Left Side: Spell Identity Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-col lg:flex-1 lg:min-h-0 gap-1.5 lg:gap-1 w-full shrink-0">
            {/* Name Input */}
            <div className="flex flex-col gap-0.5 min-w-0 lg:shrink-0">
              <span className="text-[7.5px] lg:text-[6.5px] font-mono font-bold uppercase tracking-wider text-[#a855f7]">{t("Spell Name")}</span>
              <input
                type="text"
                value={t(spellName)}
                onChange={(e) => setSpellName(e.target.value)}
                placeholder={t("e.g. Ignis Vortex")}
                onMouseEnter={(e) => handleMouseEnter(e, "Give your customized spell a unique name")}
                onMouseLeave={handleMouseLeave}
                className="bg-stone-900/60 border border-white/5 focus:border-[#a855f7]/40 focus:bg-stone-900 rounded px-2 py-0.5 text-[9px] font-mono text-[#a855f7] placeholder-stone-600 outline-none w-full transition-all focus:shadow-[0_0_8px_rgba(168,85,247,0.1)]"
              />
            </div>

            {/* Category Selector */}
            <div className="flex flex-col gap-0.5 min-w-0 lg:shrink-0">
              <span className="text-[7.5px] lg:text-[6.5px] font-mono font-bold uppercase tracking-wider text-violet-400">{t("Sphere / Category")}</span>
              <div className="grid grid-cols-3 gap-1 bg-stone-900/40 border border-white/5 p-0.5 rounded-md h-6">
                {[
                  { id: 'combat', label: 'Combat', icon: <Swords size={9} /> },
                  { id: 'auxiliary', label: 'Auxiliary', icon: <Feather size={9} /> },
                  { id: 'transformative', label: 'Transformative', icon: <Sparkle size={9} /> }
                ].map(cat => {
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id as any);
                        playTactileSound(480 + (cat.id === 'combat' ? 20 : cat.id === 'auxiliary' ? 40 : 60), 'sine', 0.05);
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, `Set category as ${cat.label} Magic`)}
                      onMouseLeave={handleMouseLeave}
                      className={`flex items-center justify-center gap-1.5 rounded text-[8px] font-mono transition-all uppercase tracking-wider border cursor-pointer select-none h-full px-1 ${
                        isActive 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold border-violet-400/30 shadow-[0_1px_4px_rgba(139,92,246,0.2)]' 
                          : 'bg-transparent text-stone-500 hover:text-stone-300 border-transparent hover:bg-stone-900/50'
                      }`}
                    >
                      {cat.icon}
                      <span className="hidden sm:inline lg:hidden xl:inline">{t(cat.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spell Flavor Text Input */}
            <div className="flex flex-col gap-0.5 min-w-0 lg:flex-1 lg:min-h-0">
              <span className="text-[7.5px] lg:text-[6.5px] font-mono font-bold uppercase tracking-wider text-stone-500">{t("Flavor Text")}</span>
              <textarea
                ref={textareaRef}
                rows={1}
                value={t(spellDesc)}
                onChange={(e) => setSpellDesc(e.target.value)}
                placeholder={t("A swirling vortex of mystic...")}
                onMouseEnter={(e) => handleMouseEnter(e, "Imbue your magic with epic roleplay flavor description")}
                onMouseLeave={handleMouseLeave}
                className="bg-stone-900/60 border border-white/5 focus:border-[#a855f7]/40 focus:bg-stone-900 rounded px-2 py-0.5 text-[9px] text-stone-300 placeholder-stone-600 outline-none w-full transition-all focus:shadow-[0_0_8px_rgba(168,85,247,0.1)] resize-none overflow-y-hidden lg:overflow-y-auto h-[72px] min-h-[72px] lg:h-full lg:flex-1 lg:min-h-[18px] leading-normal"
              />
            </div>
          </div>

          {/* Right Side: Cost Summary & Action */}
          <div className="flex items-center justify-between gap-2.5 w-full shrink-0 border-t border-white/5 pt-1 mt-1 lg:mt-auto">
            {/* Compact Cost Readout (Expense only, left aligned) */}
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <div 
                className="flex flex-col items-start cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, `Expense = the combined expenses of every section from 1 through 8 — App: ${appCost}✨, Effect: ${effCost}✨, Target: ${targetCost}✨, Hold: ${holdCost}✨, Power: ${powerCost}✨ (Total: ${rawTotalCost}✨)`)}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-stone-500 uppercase text-[6px] tracking-wider leading-none text-left">{t("Expense")}</span>
                <span id="spell-builder-expense-display" className="font-extrabold text-[#c084fc] text-[9.5px] mt-0.5 drop-shadow-[0_0_6px_rgba(168,85,247,0.3)] transition-all text-left whitespace-nowrap flex items-center gap-0.5">
                  <span>{tn(rawTotalCost.toLocaleString())}</span>
                  <span className="text-white brightness-[3] grayscale contrast-[2] select-none inline-block filter ml-0.5" style={{ filter: 'grayscale(100%) brightness(300%)' }}>✨</span>
                </span>
              </div>
            </div>

            {/* Action Trigger button */}
            <button
              onClick={handleForge}
              disabled={!isSpellStable}
              onMouseEnter={(e) => handleMouseEnter(e, isSpellStable ? "Archive and save this epic spell matrix" : `Requires spent points (${totalSpentPoints}) to be <= pool limit (${totalAvailablePoints})`)}
              onMouseLeave={handleMouseLeave}
              className={`px-2 py-1 font-serif font-black text-[9px] uppercase tracking-widest rounded transition-all duration-300 select-none ${
                isSpellStable 
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-stone-950 font-black cursor-pointer shadow-[0_2px_10px_rgba(168,85,247,0.25)] hover:scale-[1.03] active:scale-[0.97]' 
                  : 'bg-stone-900 text-stone-600 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <Archive size={10} className={`${isSpellStable ? 'text-stone-950 animate-pulse' : 'text-stone-600'} shrink-0 inline mr-1`} />
              <span>{spellToEdit ? t('Update') : t('Archive')}</span>
            </button>
          </div>
        </div>

      </div>

    </div>

      {/* TARGET RANGE OVERLAY PANEL WINDOW */}
      <AnimatePresence>
        {isRangeSelectOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-[5%] right-[5%] md:left-[15%] md:right-[15%] top-1/2 -translate-y-1/2 bg-stone-950 border border-amber-500/30 rounded-lg p-2.5 flex flex-col z-[250] shadow-[0_12px_44px_rgba(0,0,0,0.95)]"
            style={{
              height: '240px',
              boxShadow: `0 8px 30px rgba(245, 158, 11, 0.25)`,
            }}
          >
            {/* Outer glow accent bar */}
            <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-lg bg-amber-500" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 select-none shrink-0">
              <div className="flex flex-col">
                <span className="text-[11px] font-serif font-black uppercase tracking-wider text-amber-400">
                  {t("Target Range [1-9]")}
                </span>
                <span className="text-[7.5px] font-mono text-stone-500 mt-0.5">
                  {t("Choose how far you wish the spell to travel.")}
                </span>
              </div>
              {/* Close button */}
              <button
                onClick={() => {
                  setIsRangeSelectOpen(false);
                  playTactileSound(420, 'sine', 0.05);
                }}
                className="text-stone-500 hover:text-white transition-colors cursor-pointer w-4 h-4 rounded hover:bg-white/5 flex items-center justify-center outline-none"
              >
                <X size={10} />
              </button>
            </div>

            {/* Single Column List of Ranges */}
            <div className="flex-1 overflow-y-auto mb-1.5 pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex flex-col gap-1">
                {RANGE_DETAILS.map(opt => {
                  const isSelected = targetRange === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        handleSelectRangeOption(opt.value);
                        setIsRangeSelectOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded text-[8.5px] font-mono text-left uppercase font-bold transition-all border outline-none cursor-pointer flex justify-between items-center ${
                        isSelected 
                          ? 'bg-amber-500/20 text-white border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                          : 'bg-stone-900/30 text-stone-400 border-white/5 hover:border-amber-500/40 hover:text-stone-200 hover:bg-stone-900/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-amber-500 font-extrabold">{opt.value}</span>
                        <span className="text-stone-500">[{opt.key}]</span>
                        <span className="text-stone-200 font-medium">{t(opt.label)}</span>
                      </span>
                      {isSelected && <span className="text-[6.5px] text-amber-500 animate-pulse">●</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer control */}
            <div className="border-t border-white/5 pt-1.5 flex items-center justify-between shrink-0">
              <span className="text-[7.5px] text-stone-500 font-mono font-bold uppercase w-full text-center">
                {t("CURRENT VALUE:")} {targetRange} ({t(RANGE_DETAILS.find(r => r.value === targetRange)?.label || 'CUSTOM')})
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOLD SCALE OVERLAY PANEL WINDOW */}
      <AnimatePresence>
        {isScaleSelectOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-[3%] right-[3%] md:left-[8%] md:right-[8%] top-1/2 -translate-y-1/2 bg-stone-950 border border-rose-500/30 rounded-lg p-2.5 flex flex-col z-[250] shadow-[0_12px_44px_rgba(0,0,0,0.95)]"
            style={{
              height: '340px',
              maxHeight: '90vh',
              boxShadow: `0 8px 30px rgba(244, 63, 94, 0.25)`,
            }}
          >
            {/* Outer glow accent bar */}
            <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-lg bg-rose-500" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 select-none shrink-0">
              <div className="flex flex-col">
                <span className="text-[7.5px] font-mono uppercase tracking-widest text-stone-500 font-bold">{t("SELECT SPATIAL BOUNDS")}</span>
                <span className="text-[11px] font-serif font-black uppercase tracking-wider text-rose-400">
                  {t("Hold Scale Magnitude [01-14]")}
                </span>
              </div>
              {/* Close button */}
              <button
                onClick={() => {
                  setIsScaleSelectOpen(false);
                  playTactileSound(420, 'sine', 0.05);
                }}
                className="text-stone-500 hover:text-white transition-colors cursor-pointer w-4 h-4 rounded hover:bg-white/5 flex items-center justify-center outline-none"
              >
                <X size={10} />
              </button>
            </div>

            {/* Scale List Grid */}
            <div className="flex-1 overflow-y-auto mb-1.5 mt-1 pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
              {/* Sticky Table Header Row for perfect column alignment */}
              <div className="sticky top-0 z-10 grid grid-cols-[0.9rem_0.9rem_4.2rem_5.4rem_1fr] gap-1 px-2 py-1.5 bg-stone-950 border-b border-white/5 text-[7px] font-mono text-stone-500 uppercase tracking-widest font-bold select-none mb-1">
                <span>##</span>
                <span>XX</span>
                <span>{t("SCALE")}</span>
                <span>{t("EXAMPLE")}</span>
                <span className="text-right">{t("EXPENSE")}</span>
              </div>

              <div className="flex flex-col gap-1 flex-nowrap">
                {SCALE_OPTIONS.map(opt => {
                  const activeScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
                  const isSelected = activeScaleId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setScalePoints(prev => {
                          const next = { ...prev };
                          Object.keys(next).forEach(k => { next[k] = 0; });
                          next[opt.id] = 1;
                          return next;
                        });
                        setIsScaleSelectOpen(false);
                        playTactileSound(650, 'sine', 0.05);
                      }}
                      className={`grid grid-cols-[0.9rem_0.9rem_4.2rem_5.4rem_1fr] gap-1 px-2 py-1.5 rounded text-[7.5px] font-mono text-left uppercase font-bold transition-all border outline-none cursor-pointer items-center ${
                        isSelected 
                          ? 'bg-rose-500/20 text-white border-rose-500 shadow-[0_0_8px_rgba(244, 63, 94, 0.25)]'
                          : 'bg-stone-900/30 text-stone-400 border-white/5 hover:border-rose-500/40 hover:text-stone-200 hover:bg-stone-900/60'
                      }`}
                    >
                      <span className="text-rose-500 font-extrabold">{tn(opt.index)}</span>
                      <span className="font-bold text-stone-300">{opt.abbr}</span>
                      <span className="font-semibold text-stone-100 whitespace-nowrap">{t(opt.name)}</span>
                      <span className="text-stone-500 whitespace-nowrap">{t(opt.size)}</span>
                      <span className="text-right text-rose-300 font-extrabold whitespace-nowrap">{tn(opt.expense.toLocaleString())}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer control */}
            <div className="border-t border-white/5 pt-1.5 flex items-center justify-between shrink-0">
              <span className="text-[7.5px] text-stone-500 font-mono font-bold uppercase w-full text-center">
                {(() => {
                  const activeScaleId = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
                  const activeScaleOpt = SCALE_OPTIONS.find(o => o.id === activeScaleId) || SCALE_OPTIONS[0];
                  return `${t("CURRENT VALUE:")} ${tn(activeScaleOpt.index)} - ${t(activeScaleOpt.name)} (${t(activeScaleOpt.size)}) ~ ${tn(activeScaleOpt.expense.toLocaleString())} ${t("EXPENSE")}`;
                })()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOLD DURATION OVERLAY PANEL WINDOW */}
      <AnimatePresence>
        {durationDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-[5%] right-[5%] md:left-[15%] md:right-[15%] top-1/2 -translate-y-1/2 bg-stone-950 border border-rose-500/30 rounded-lg p-2.5 flex flex-col z-[250] shadow-[0_12px_44px_rgba(0,0,0,0.95)]"
            style={{
              height: '340px',
              maxHeight: '90vh',
              boxShadow: `0 8px 30px rgba(244, 63, 94, 0.25)`,
            }}
          >
            {/* Outer glow accent bar */}
            <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-lg bg-rose-500" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 select-none shrink-0">
               <div className="flex flex-col">
                <span className="text-[7.5px] font-mono uppercase tracking-widest text-stone-500 font-bold">{t("SELECT TEMPORAL BOUNDS")}</span>
                <span className="text-[11px] font-serif font-black uppercase tracking-wider text-rose-400">
                  {t("Hold Duration Unit")}
                </span>
              </div>
              {/* Close button */}
              <button
                onClick={() => {
                  setDurationDropdownOpen(false);
                  playTactileSound(420, 'sine', 0.05);
                }}
                className="text-stone-500 hover:text-white transition-colors cursor-pointer w-4 h-4 rounded hover:bg-white/5 flex items-center justify-center outline-none"
              >
                <X size={10} />
              </button>
            </div>

            {/* Duration List Grid */}
            <div className="flex-1 overflow-y-auto mb-1.5 mt-1 pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
              {/* Sticky Table Header Row for perfect column alignment */}
              <div className="sticky top-0 z-10 grid grid-cols-[2.5rem_1fr_4.5rem] gap-1.5 px-2.5 py-1.5 bg-stone-950 border-b border-white/5 text-[7.5px] font-mono text-stone-500 uppercase tracking-widest font-bold select-none mb-1">
                <span>{t("INDEX")}</span>
                <span>{t("DURATION UNIT")}</span>
                <span className="text-right">{t("EXPENSE")}</span>
              </div>

              <div className="flex flex-col gap-1 flex-nowrap">
                {DURATION_OPTIONS.map((opt, idx) => {
                  const isSelected = durationActive === opt.id;
                  const padZero2 = (num: number) => num.toString().padStart(2, '0');
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        handleDurationSelectAndPoints(opt.id, true);
                        setDurationDropdownOpen(false);
                        playTactileSound(650, 'sine', 0.05);
                      }}
                      className={`grid grid-cols-[2.5rem_1fr_4.5rem] gap-1.5 px-2.5 py-1.5 rounded text-[8px] font-mono text-left uppercase font-bold transition-all border outline-none cursor-pointer items-center ${
                        isSelected 
                          ? 'bg-rose-500/20 text-white border-rose-500 shadow-[0_0_8px_rgba(244, 63, 94, 0.25)]'
                          : 'bg-stone-900/30 text-stone-400 border-white/5 hover:border-rose-500/40 hover:text-stone-200 hover:bg-stone-900/60'
                      }`}
                    >
                      <span className="text-rose-500 font-extrabold">{tn(padZero2(idx + 1))}</span>
                      <span className="font-bold text-stone-300">{t(opt.label)}</span>
                      <span className="text-right text-rose-300 font-extrabold whitespace-nowrap">{tn(opt.expense.toLocaleString())}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer control */}
            <div className="border-t border-white/5 pt-1.5 flex items-center justify-between shrink-0">
              <span className="text-[7.5px] text-stone-500 font-mono font-bold uppercase w-full text-center">
                {(() => {
                  const idx = DURATION_OPTIONS.findIndex(o => o.id === durationActive);
                  const opt = DURATION_OPTIONS[idx] || DURATION_OPTIONS[0];
                  return `${t("CURRENT VALUE:")} ${t(opt.label)} (${tn(opt.expense.toLocaleString())} ${t("EXPENSE")})`;
                })()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENERGY DICE OVERLAY PANEL WINDOW */}
      <AnimatePresence>
        {powerDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-[5%] right-[5%] md:left-[15%] md:right-[15%] top-1/2 -translate-y-1/2 bg-stone-950 border border-red-500/30 rounded-lg p-2.5 flex flex-col z-[250] shadow-[0_12px_44px_rgba(0,0,0,0.95)]"
            style={{
              height: '340px',
              maxHeight: '90vh',
              boxShadow: `0 8px 30px rgba(239, 68, 68, 0.25)`,
            }}
          >
            {/* Outer glow accent bar */}
            <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-lg bg-red-500" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 select-none shrink-0">
              <div className="flex flex-col">
                <span className="text-[7.5px] font-mono uppercase tracking-widest text-stone-500 font-bold">{t("SELECT ENERGY POTENCY")}</span>
                <span className="text-[11px] font-serif font-black uppercase tracking-wider text-red-400">
                  {t("Energy Potency [Dice]")}
                </span>
              </div>
              {/* Close button */}
              <button
                onClick={() => {
                  setPowerDropdownOpen(false);
                  playTactileSound(420, 'sine', 0.05);
                }}
                className="text-stone-500 hover:text-white transition-colors cursor-pointer w-4 h-4 rounded hover:bg-white/5 flex items-center justify-center outline-none"
              >
                <X size={10} />
              </button>
            </div>

            {/* Dice Table List */}
            <div className="flex-1 overflow-y-auto mb-1.5 mt-1 pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
              {/* Sticky Table Header Row for perfect column alignment */}
              <div className="sticky top-0 z-10 grid grid-cols-2 gap-1.5 px-2.5 py-1.5 bg-stone-950 border-b border-white/5 text-[7.5px] font-mono text-stone-500 uppercase tracking-widest font-bold select-none mb-1">
                <span>{t("DICE")}</span>
                <span className="text-right">{t("POINTS")}</span>
              </div>

              <div className="flex flex-col gap-1.5 flex-nowrap">
                {(() => {
                  const padZero3 = (num: number) => num.toString().padStart(3, '0');
                  const activeDiceCount = powerPoints[powerActive] || 0;
                  const nextDiceNum = activeDiceCount + 1;

                  return (
                    <>
                      {/* Active Dice list */}
                      {Array.from({ length: activeDiceCount }, (_, i) => {
                        const diceNum = i + 1;
                        const isLastActive = diceNum === activeDiceCount;

                        return (
                          <div
                            key={`active-dice-${diceNum}`}
                            className="flex items-stretch justify-between rounded text-[8px] font-mono uppercase font-bold transition-all border border-white/5 bg-stone-900/30 text-stone-400 hover:border-red-500/40 hover:text-stone-200 h-[28px] overflow-hidden"
                          >
                            <div className="flex-1 flex items-center justify-between pl-2.5 pr-3">
                              <span className="font-semibold text-stone-300">{t("Dice")} {padZero3(diceNum)}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-stone-600 font-normal">|</span>
                                <span className="text-red-300 font-extrabold tracking-wider">{padZero3(diceNum)}</span>
                              </div>
                            </div>

                            {isLastActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePowerSelectAndPoints(powerActive, false);
                                }}
                                className="bg-stone-950 hover:bg-stone-850 text-stone-400 hover:text-red-400 border-l border-white/10 px-3 transition-all cursor-pointer select-none text-[7.5px] font-bold h-full flex items-center justify-center whitespace-nowrap active:scale-95"
                              >
                                {t("Remove")}
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Next Dice item (with [Add] Option) */}
                      <div
                        key={`next-dice-${nextDiceNum}`}
                        className="flex items-stretch justify-between rounded text-[8px] font-mono uppercase font-bold transition-all border border-white/5 bg-stone-900/10 text-stone-500 hover:border-red-500/20 h-[28px] overflow-hidden"
                      >
                        <div className="flex-1 flex items-center justify-between pl-2.5 pr-3">
                          <span className="font-semibold text-stone-500 font-medium">{t("Dice")} {padZero3(nextDiceNum)}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-stone-700 font-normal">|</span>
                            <span className="text-red-400/50 font-extrabold tracking-wider">{padZero3(nextDiceNum)}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePowerSelectAndPoints(powerActive, true);
                          }}
                          className="bg-red-950/40 hover:bg-red-900/40 text-red-300 hover:text-white border-l border-white/10 px-3 transition-all cursor-pointer select-none text-[7.5px] font-black h-full flex items-center justify-center whitespace-nowrap active:scale-95"
                        >
                          {t("Add")}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          GLOBAL FLOATING HOVER LABELS
          (Avoids scale distortion, parent boundaries and remains unblockable)
          ========================================== */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            key="spell-builder-floating-tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="fixed pointer-events-none bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[999999] -translate-x-1/2 -translate-y-full"
            style={{
              left: `${tooltipData.x}px`,
              top: `${tooltipData.y}px`,
            }}
          >
            {tooltipData.text}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
