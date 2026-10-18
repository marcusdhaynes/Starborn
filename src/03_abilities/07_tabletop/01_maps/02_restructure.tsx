import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Flame, 
  Scroll, 
  BookOpen, 
  Swords, 
  Backpack, 
  Plus, 
  Minus, 
  X, 
  Sword, 
  Hammer, 
  Sparkle, 
  Compass, 
  BookOpenCheck, 
  ShieldAlert, 
  Dice5,
  Target,
  Feather,
  RotateCcw,
  GlassWater,
  PartyPopper,
  Skull,
  Heart,
  Maximize2,
  Minimize2,
  Check,
  Edit3,
  Trash2,
  Moon,
  History,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import RibbonFront from '../../../01_ribbon/01_front';
import RibbonBack from '../../../01_ribbon/02_back';
import RibbonEnds from '../../../01_ribbon/03_ends';
import { gameRulesTopics, RPGTopic } from '../../../data/starborn_rpg_game';
import { playersRulesTopics } from '../../../data/starborn_rpg_players';
import { gmRulesTopics } from '../../../data/starborn_rpg_gm';
import Life from '../../../02_stats/01_life';
import StatBody from '../../../02_stats/stat_body';
import StatMind from '../../../02_stats/stat_mind';
import StatSpeed from '../../../02_stats/stat_speed';
import StatEndurance from '../../../02_stats/stat_endurance';
import StatWield from '../../../02_stats/stat_wield';
import StatMagic from '../../../02_stats/stat_magic';
import { 
  addStatXP, 
  StatType, 
  getRequiredXPForNextLevel, 
  getStatXP, 
  saveStatXP,
  STAT_DETAILS 
} from '../../../02_stats/stat_experience';
import DiceRoller from '../../99_dice';
import { safeStorage } from '../../../storage';
import { LAYER_HIERARCHY } from '../../../layers';
import SpellBuilder, { calculateCostFromBuilderState } from './03_spell_builder';
import MagicMeter from './04_magic_meter';
import ItemCreator, { CustomItem } from './05_item_creator';
import { useTranslation } from '../../../99_settings/language';

interface CombatLogItem {
  id: string;
  originalText: string;
  timestamp: string;
  shortTimestamp: string;
  type: string;
  explanation: string;
  result: string;
  note?: string;
}

interface TabletopRestructureProps {
  skullLevel: number;
  setSkullLevel: (lvl: number) => void;
  pulseActive: boolean;
  pulseTransition: any;
  threatIntensity: number;
  isMaxThreat: boolean;
  heartPositions: any[];
  dotHoverScale: number;
  dotTransition: any;
  handlePress: (seq: number | null) => void;
  onRestoreMap: () => void;
}

const getSpellAffinities = (spell: any) => {
  let schools: string[] = [];
  if (spell.builderState?.selectedSubtypes) {
    const subtypesMap = spell.builderState.selectedSubtypes;
    schools = Object.keys(subtypesMap).filter((school: string) => Array.isArray(subtypesMap[school]) && subtypesMap[school].length > 0);
  }
  
  if (schools.length === 0) {
    if (spell.name.toLowerCase().includes('shift') || spell.name.toLowerCase().includes('teleport')) {
      schools = ['Conjuration'];
    } else {
      schools = ['Evocation'];
    }
  }

  const affinities: Record<string, { effective: string[]; weak: string[] }> = {
    Conjuration: {
      effective: ['Chronomancy (Space Time Distortion)', 'Exomancy (Void shields)'],
      weak: ['Biomancy (Adaptation)', 'Veils (Invisibility Counter)']
    },
    Evocation: {
      effective: ['Biomancy (Raw energy burns organic matter)', 'Veils (Shockwaves disperse illusions)'],
      weak: ['Exomancy (Gravity voids absorb energy)', 'Chronomancy (Time-stops freeze bolts)']
    },
    Thaumaturgy: {
      effective: ['Conjuration (Hexes disrupt summoning)', 'Alchemy (Curses corrupt potions)'],
      weak: ['Enchantments (Wards block raw curses)', 'Biomancy (Natural immunity)']
    },
    Veils: {
      effective: ['Alchemy (Disguises mimic physical potions)', 'Chronomancy (Phantasms loop foresight)'],
      weak: ['Evocation (Physical blasts shatter illusions)', 'Biomancy (Pheromones bypass visual stealth)']
    },
    Enchantments: {
      effective: ['Thaumaturgy (Mind-control stops blood ritualists)', 'Chronomancy (Sleep arrests fast loops)'],
      weak: ['Conjuration (Summoned beasts ignore charm)', 'Alchemy (Anti-toxins cleanse mind-hazards)']
    },
    Alchemy: {
      effective: ['Thaumaturgy (Acids burn bone charms)', 'Enchantments (Metal armor blocks mind sleep)'],
      weak: ['Veils (Illusory double causes mis-aim)', 'Exomancy (Magnetism redirects alchemical iron)']
    },
    Exomancy: {
      effective: ['Conjuration (Gravity pulls portals shut)', 'Evocation (Atmospheric lightning overcharges fire)'],
      weak: ['Chronomancy (Speed counters heavy gravity)', 'Alchemy (Lead containers block radiation)']
    },
    Chronomancy: {
      effective: ['Evocation (Shielding in stasis)', 'Exomancy (Acceleration escapes gravity fields)'],
      weak: ['Enchantments (Charm stops the caster\'s focus)', 'Veils (Sensor loop blinds foresight)']
    },
    Biomancy: {
      effective: ['Enchantments (Feral shape-shifter breaks sleep)', 'Exomancy (Muscle density survives high Gs)'],
      weak: ['Evocation (Hellfire easily combusts wildwood)', 'Thaumaturgy (Blood rotting curses corrupt cells)']
    }
  };

  const effectiveSet = new Set<string>();
  const weakSet = new Set<string>();

  schools.forEach((sch: string) => {
    const aff = affinities[sch];
    if (aff) {
      aff.effective.forEach((x: string) => effectiveSet.add(x));
      aff.weak.forEach((x: string) => weakSet.add(x));
    }
  });

  if (effectiveSet.size === 0) {
    effectiveSet.add('Unknown Element (Minor magical influence)');
  }
  if (weakSet.size === 0) {
    weakSet.add('Standard Arcane Dispel warding');
  }

  return {
    schools,
    effective: Array.from(effectiveSet),
    weak: Array.from(weakSet)
  };
};

const cleanSpellDescription = (desc: string): string => {
  if (!desc) return '';
  let flavorText = desc.trim();

  // Try to find if there is a parenthesis block of details
  // Look for any parenthesis starting with " (ML", " (Magic", " (المستوى", " (تستهدف"
  const regex = /\s*\((?:ML|Magic|Level|المستوى|تستهدف|targeting|Cost|Total|Mana|الأنواع|الإجمالي).*$/i;
  flavorText = flavorText.replace(regex, '');

  if (flavorText.includes(' (ML')) {
    flavorText = flavorText.split(' (ML')[0];
  }
  if (flavorText.includes(' (Magic')) {
    flavorText = flavorText.split(' (Magic')[0];
  }
  if (flavorText.includes(' (المستوى')) {
    flavorText = flavorText.split(' (المستوى')[0];
  }
  if (flavorText.includes(' (تستهدف')) {
    flavorText = flavorText.split(' (تستهدف')[0];
  }

  // Also remove trailing parenthesis/brackets if they contain mana or cost details due to Arabic mixed text
  if (flavorText.includes(' (')) {
    const idx = flavorText.indexOf(' (');
    const remainingPart = flavorText.substring(idx);
    if (/ML|Magic|Level|المستوى|تستهدف|targeting|Cost|Total|Mana|الإجمالي|الأنواع/i.test(remainingPart)) {
      flavorText = flavorText.substring(0, idx);
    }
  }

  if (flavorText.startsWith('Arcane forged spell (Magic Level')) {
    flavorText = 'An arcane forged spell matrix.';
  }

  return flavorText.trim();
};

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

const calculateDynamicSpellResult = (
  bs: any,
  powerActive: string,
  powerPoints: Record<string, number>,
  selectedRestrictions: (string | null)[]
) => {
  const affinity = bs?.affinity || 'Conjuration';
  const selectedSubtypes = bs?.selectedSubtypes || {};
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

  const appCost = appPointsSpent;

  // 2. Effect points
  const effPoints = bs?.effPoints || {};
  const getSumOfPoints = (record: Record<string, number>) => {
    if (!record) return 0;
    return Object.keys(record).reduce((sum, key) => sum + (record[key] || 0), 0);
  };
  const effPointsSum = getSumOfPoints(effPoints);
  const effCost = effPointsSum * appPointsSpent;

  // 3. Targets costs
  const targetCounts = bs && typeof bs.targetCounts === 'number' ? bs.targetCounts : 1;
  const targetOrigin = bs && typeof bs.targetOrigin === 'number' ? bs.targetOrigin : 1;
  const targetRange = bs && typeof bs.targetRange === 'number' ? bs.targetRange : 1;
  const targetCost = targetCounts * targetOrigin * targetRange;

  // 4. Hold [Scale + Duration] costs
  const scalePoints = bs?.scalePoints || {};
  const activeScaleIdForHold = Object.keys(scalePoints).find(k => (scalePoints[k] || 0) > 0) || 'CM';
  const hasScalePoints = Object.keys(scalePoints).some(k => (scalePoints[k] || 0) > 0);
  const scaleIndexForHold = hasScalePoints ? (SCALE_OPTIONS.findIndex(o => o.id === activeScaleIdForHold) + 1) : 0;
  
  const durationActive = bs?.durationActive || 'Action';
  const durationPoints = bs?.durationPoints || {};
  const durationValForHold = durationPoints[durationActive] !== undefined ? durationPoints[durationActive] : 0;
  
  const durationOpt = DURATION_OPTIONS.find(o => o.id === durationActive) || DURATION_OPTIONS[0];
  const scaleOptForHold = SCALE_OPTIONS.find(o => o.id === activeScaleIdForHold) || SCALE_OPTIONS[0];
  const holdCost = scaleIndexForHold > 0 
    ? scaleOptForHold.expense * durationOpt.expense * Math.max(1, durationValForHold)
    : 0;

  // 5. Energy [Power] costs
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
  const finalCost = Math.max(5, rawTotalCost - restrictionSavings);

  // Compute Dice Count, Size, Modifier based on the active power & points
  const tierPower = POWER_OPTIONS.find(o => o.id === powerActive);
  const diceCount = (tierPower?.diceCount || 1) * (powerPoints[powerActive] || 1);
  const diceSize = tierPower?.diceSize || 6;
  const baseMod = (tierPower?.modifier || 1) * (powerPoints[powerActive] || 1);

  // Scaling modifiers from other investments
  const activeScalesCount = Object.keys(scalePoints).reduce((acc, key) => acc + (scalePoints[key] || 0), 0);
  const totalTargetPoints = targetCounts + targetOrigin + targetRange;
  const modifier = baseMod + (activeScalesCount * 2) + Math.max(0, totalTargetPoints - 3);

  return {
    cost: finalCost,
    diceCount,
    diceSize,
    modifier,
    restrictionSavings,
  };
};

const sanitizeSpells = (spells: any[]): any[] => {
  if (!Array.isArray(spells)) return [];
  let changed = false;
  const sanitized = spells.map(spell => {
    let cost = spell.cost;
    let parsedCost = cost;
    
    if (spell.builderState) {
      try {
        const computed = calculateCostFromBuilderState(spell.builderState);
        if (!isNaN(computed) && computed > 0) {
          parsedCost = computed;
        }
      } catch (err) {
        console.error("Failed to recompute spell cost:", err);
      }
    } else {
      const desc = (spell.description || '').trim();
      const match = desc.match(/(?:Cost:|Total with points:)\s*(\d+)/i);
      if (match) {
        parsedCost = parseInt(match[1], 10);
      }
    }
    
    parsedCost = Math.max(5, parsedCost);

    let updatedDescription = spell.description || '';
    if (parsedCost !== cost && updatedDescription) {
      updatedDescription = updatedDescription.replace(/(Cost:\s*)\d+/gi, `$1${parsedCost}`);
      updatedDescription = updatedDescription.replace(/(Total with points:\s*)\d+/gi, `$1${parsedCost}`);
    }

    if (parsedCost !== cost || updatedDescription !== spell.description) {
      changed = true;
      return {
        ...spell,
        cost: parsedCost,
        description: updatedDescription
      };
    }
    return spell;
  });

  if (changed) {
    try {
      safeStorage.setItem('vtt_custom_spells', JSON.stringify(sanitized));
    } catch (e) {
      console.error(e);
    }
  }
  return sanitized;
};

const createLogItem = (msg: string, dateObj: Date = new Date()): CombatLogItem => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  const mm = pad(dateObj.getMonth() + 1);
  const dd = pad(dateObj.getDate());
  const hh = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  const ss = pad(dateObj.getSeconds());
  
  const timestamp = `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  const shortTimestamp = `${hh}${min}${ss}`;
  const id = Math.random().toString(36).substring(2, 9);
  
  let type = "SYSTEM";
  let explanation = msg;
  let result = "";
  
  const cleanMsg = msg.trim();
  if (cleanMsg.includes("initialized") || cleanMsg.includes("online")) {
    type = "SYSTEM";
    explanation = "System online";
    result = "ONLINE";
  } else if (cleanMsg.includes("[Level Up!]")) {
    type = "LEVEL";
    const levelMatch = cleanMsg.match(/Magic Level (\d+)/i);
    explanation = "Reached new Level";
    result = levelMatch ? `LVL ${levelMatch[1]}` : "UP";
  } else if (cleanMsg.startsWith("[Oracle]:")) {
    type = "ORACLE";
    explanation = "Oracle alignment consultation";
    const reading = cleanMsg.replace(/^\[Oracle\]:\s*/i, '').replace(/^["']|["']$/g, '');
    result = reading.length > 15 ? reading.substring(0, 12) + "..." : reading;
  } else if (cleanMsg.startsWith("[Cosmos]:")) {
    type = "COSMOS";
    explanation = "Channeled starlight";
    result = "ALIGNED";
  } else if (cleanMsg.startsWith("[Tabletop Rest]:")) {
    type = "REST";
    explanation = "Character took rest";
    const match = cleanMsg.match(/\+(\d+)\s*✨/);
    result = match ? `+${match[1]} ✨` : "RESTED";
  } else if (cleanMsg.startsWith("[Inventory]:")) {
    type = "ITEM";
    if (cleanMsg.includes("Health Potion")) {
      explanation = "Consumed Potion";
      result = "+10 HP";
    } else if (cleanMsg.includes("Elixir of Stars")) {
      explanation = "Drank Elixir";
      result = "+25 Max HP";
    } else if (cleanMsg.includes("Star Dust")) {
      explanation = "Scattered Star Dust";
      result = "+8 Shield";
    } else if (cleanMsg.includes("Companion pack")) {
      explanation = "Restocked Companion Space";
      result = "RESTOCKED";
    } else {
      explanation = cleanMsg.replace(/^\[Inventory\]:\s*/i, '');
      result = "USED";
    }
  } else if (cleanMsg.startsWith("[XP Gain]:")) {
    type = "XP";
    const amountMatch = cleanMsg.match(/XP Gain\]:\s*(\d+)/i) || cleanMsg.match(/(\d+)\s*XP/i);
    
    // Detect which attributes are mentioned
    const gainedAttrs: string[] = [];
    const lowerMsg = cleanMsg.toLowerCase();
    if (lowerMsg.includes("mind")) gainedAttrs.push("Mind");
    if (lowerMsg.includes("magic")) gainedAttrs.push("Magic");
    if (lowerMsg.includes("body")) gainedAttrs.push("Body");
    if (lowerMsg.includes("wield")) gainedAttrs.push("Wield");

    explanation = gainedAttrs.length > 0 
      ? `XP Gained (${gainedAttrs.join(', ')})` 
      : "Gained Attribute XP";
    result = amountMatch ? `+${amountMatch[1]} XP` : "+XP";
  } else {
    const rollRegex = /^(.*?):\s*Rolled\s+(\d+)[dD](\d+)([-+]\d+)?\s*->\s*(\d+)/i;
    const match = cleanMsg.match(rollRegex);
    if (match) {
      type = "ROLL";
      const name = match[1].replace(/\s*Check\s*Check/gi, ' Check').trim();
      explanation = `${name} Check`;
      result = `${match[5]}`;
    }
  }
  
  return {
    id,
    originalText: msg,
    timestamp,
    shortTimestamp,
    type,
    explanation,
    result,
  };
};

export default function TabletopRestructure({
  skullLevel,
  setSkullLevel,
  pulseActive,
  pulseTransition,
  threatIntensity,
  isMaxThreat,
  heartPositions,
  dotHoverScale,
  dotTransition,
  handlePress,
  onRestoreMap
}: TabletopRestructureProps) {
  const { t, tn } = useTranslation();

  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [activeSection, _setActiveSection] = useState<string | null>(null);
  const [starbornTab, setStarbornTab] = useState<'game' | 'players' | 'master'>('game');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Theme Sync & Hold Gestures
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (safeStorage.getItem('setting_theme_mode') as 'dark' | 'light') || 'dark';
  });

  const [accentTone, setAccentTone] = useState(() => {
    return safeStorage.getItem('setting_theme_accent') || 'pink';
  });

  const [useRestructureAlignment, setUseRestructureAlignment] = useState<boolean>(() => {
    return safeStorage.getItem('setting_restructure_alignment') === 'true';
  });

  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    return (safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical';
  });

  const [activeCharImg, setActiveCharImg] = useState<string>(() => {
    const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
    return safeStorage.getItem(`vtt_char_${activeId}_vtt_char_image`) || '';
  });

  const [statsCount, setStatsCount] = useState<4 | 6>(() => {
    const val = safeStorage.getItem('setting_stats_count');
    return val === '4' ? 4 : 6;
  });

  useEffect(() => {
    const handleUpdate = () => {
      const savedTheme = (safeStorage.getItem('setting_theme_mode') as 'dark' | 'light') || 'dark';
      setThemeMode(savedTheme);
      const savedAccent = safeStorage.getItem('setting_theme_accent') || 'pink';
      setAccentTone(savedAccent);
      const savedAlign = safeStorage.getItem('setting_restructure_alignment') === 'true';
      setUseRestructureAlignment(savedAlign);
      const savedLayout = safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal';
      if (savedLayout) {
        setLayoutOrientation(savedLayout);
      } else {
        setLayoutOrientation('vertical');
      }

      const savedStatsCount = safeStorage.getItem('setting_stats_count') === '4' ? 4 : 6;
      setStatsCount(savedStatsCount);

      const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
      setActiveCharImg(safeStorage.getItem(`vtt_char_${activeId}_vtt_char_image`) || '');

      // Synchronize character potions, resources, notes, and spells
      try {
        const pm = safeStorage.getItem('vtt_healing_potions');
        if (pm) setHealingPotions(parseInt(pm, 10));
        const el = safeStorage.getItem('vtt_elixir_life');
        if (el) setElixirLife(parseInt(el, 10));
        const sd = safeStorage.getItem('vtt_star_dust');
        if (sd) setStarDust(parseInt(sd, 10));
        const cn = safeStorage.getItem('vtt_campaign_notes');
        if (cn) setCampaignNotes(cn);
        const qs = safeStorage.getItem('vtt_quest_states');
        if (qs) setQuestStates(JSON.parse(qs));
        const cs = safeStorage.getItem('vtt_custom_spells');
        if (cs) setCustomSpells(sanitizeSpells(JSON.parse(cs)));
        
        const cl = safeStorage.getItem('vtt_combat_logs');
        if (cl) {
          try {
            const parsed = JSON.parse(cl);
            combatLogsRef.current = parsed;
            setCombatLogs(parsed);
          } catch (e) {
            console.error("Failed to parse combat logs on update:", e);
          }
        }
        
        const savedMind = safeStorage.getItem('vtt_stat_mind');
        if (savedMind) setMindScore(parseInt(savedMind, 10));
        const savedMagicScore = safeStorage.getItem('vtt_stat_magic');
        if (savedMagicScore) setMagicScore(parseInt(savedMagicScore, 10));
        setSyncStateTrigger(p => p + 1);
      } catch (e) {
        console.error("Failed to restore character info dynamically in restructure:", e);
      }
    };
    window.addEventListener('tabletop-state-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tabletop-state-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getAccentStyles = (tone: string) => {
    switch (tone) {
      case 'cyan':
        return {
          background: "radial-gradient(circle at 30% 30%, #38bdf8 0%, #0369a1 50%, #0c4a6e 100%)",
          shadowColor: "rgba(56, 189, 248, 0.5)",
          shadowGlow: "0px 0px 15px rgba(56, 189, 248, 0.45)",
          hex: "#38bdf8"
        };
      case 'gold':
        return {
          background: "radial-gradient(circle at 30% 30%, #fbbf24 0%, #b45309 50%, #78350f 100%)",
          shadowColor: "rgba(251, 191, 36, 0.5)",
          shadowGlow: "0px 0px 15px rgba(251, 191, 36, 0.45)",
          hex: "#fbbf24"
        };
      case 'green':
        return {
          background: "radial-gradient(circle at 30% 30%, #a3ff33 0%, #4d7c0f 50%, #1e293b 100%)",
          shadowColor: "rgba(163, 255, 51, 0.5)",
          shadowGlow: "0px 0px 15px rgba(163, 255, 51, 0.45)",
          hex: "#a3ff33"
        };
      case 'purple':
        return {
          background: "radial-gradient(circle at 30% 30%, #c084fc 0%, #6d28d9 50%, #4c1d95 100%)",
          shadowColor: "rgba(192, 132, 252, 0.5)",
          shadowGlow: "0px 0px 15px rgba(192, 132, 252, 0.45)",
          hex: "#c084fc"
        };
      case 'pink':
      default:
        return {
          background: "radial-gradient(circle at 30% 30%, #ff71cd 0%, #700b97 50%, #3e065f 100%)",
          shadowColor: "rgba(255, 113, 205, 0.5)",
          shadowGlow: "0px 0px 15px rgba(255, 113, 205, 0.45)",
          hex: "#ff71cd"
        };
    }
  };

  const activeAccent = getAccentStyles(accentTone);

  // Mini-menu and enlarged menu states
  const [isMenuEnlarged, setIsMenuEnlarged] = useState(false);

  // Spell Builder state and forge handler
  const [isSpellBuilderOpen, _setIsSpellBuilderOpen] = useState(false);
  const [spellToEdit, setSpellToEdit] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);
  const [heldSpellInfo, _setHeldSpellInfo] = useState<any | null>(null);

  // Temporary Energy / Restriction states for the selected/held details modal:
  const [tempPowerActive, setTempPowerActive] = useState<string>('Minor');
  const [tempPowerPoints, setTempPowerPoints] = useState<Record<string, number>>({ Minor: 1 });
  const [tempSelectedRestrictions, setTempSelectedRestrictions] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    if (heldSpellInfo) {
      const bs = heldSpellInfo.builderState || {};
      const initialPowerActive = bs.powerActive || heldSpellInfo.power || 'Minor';
      const initialPowerPoints = bs.powerPoints 
        ? { ...bs.powerPoints } 
        : { [initialPowerActive]: heldSpellInfo.diceCount || 1 };
      
      let initialRestrictions: (string | null)[] = [null, null, null];
      if (Array.isArray(bs.selectedRestrictions)) {
        initialRestrictions = [...bs.selectedRestrictions];
      } else if (heldSpellInfo.formula && heldSpellInfo.formula.includes('RESTRICT')) {
        const match = heldSpellInfo.formula.match(/RESTRICT\[(.*?)\]/);
        if (match && match[1]) {
          const parts = match[1].split('&').map((p: string) => p.trim());
          initialRestrictions = [parts[0] || null, parts[1] || null, parts[2] || null];
        }
      }

      setTempPowerActive(initialPowerActive);
      setTempPowerPoints(initialPowerPoints);
      
      const paddedRestrictions = [...initialRestrictions];
      while (paddedRestrictions.length < 3) paddedRestrictions.push(null);
      setTempSelectedRestrictions(paddedRestrictions.slice(0, 3));
    }
  }, [heldSpellInfo]);

  const spellHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spellIsHoldTriggeredRef = useRef<boolean>(false);

  const handleSpellPointerDown = (e: React.PointerEvent, spell: any) => {
    e.stopPropagation();
    spellIsHoldTriggeredRef.current = false;
    
    if (spellHoldTimeoutRef.current) clearTimeout(spellHoldTimeoutRef.current);
    
    spellHoldTimeoutRef.current = setTimeout(() => {
      spellIsHoldTriggeredRef.current = true;
      setHeldSpellInfo(spell);
      setActiveSection(null);
      playTactileSound(550, 'sawtooth', 0.1);
    }, 450); // Hold triggers after 450ms
  };

  const handleSpellPointerUp = (e: React.PointerEvent, spell: any) => {
    e.stopPropagation();
    if (spellHoldTimeoutRef.current) {
      clearTimeout(spellHoldTimeoutRef.current);
      spellHoldTimeoutRef.current = null;
    }
    
    if (!spellIsHoldTriggeredRef.current) {
      // It's a standard click! Toggle accordion inside mini menu
      if (expandedSpellId === spell.id) {
        setExpandedSpellId(null);
      } else {
        setExpandedSpellId(spell.id);
      }
      playTactileSound(400, 'sine', 0.05);
    }
    spellIsHoldTriggeredRef.current = false;
  };

  const handleSpellPointerCancel = () => {
    if (spellHoldTimeoutRef.current) {
      clearTimeout(spellHoldTimeoutRef.current);
      spellHoldTimeoutRef.current = null;
    }
    spellIsHoldTriggeredRef.current = false;
  };

  const [customSpells, setCustomSpells] = useState<{
    id: string;
    name: string;
    description: string;
    power: string;
    formula: string;
    cost: number;
    diceCount: number;
    diceSize: number;
    modifier: number;
    category?: 'combat' | 'auxiliary' | 'transformative';
    builderState?: any;
  }[]>(() => {
    const saved = safeStorage.getItem('vtt_custom_spells');
    return saved ? sanitizeSpells(JSON.parse(saved)) : [];
  });

  const [activeMagicTab, setActiveMagicTab] = useState<'all' | 'combat' | 'auxiliary' | 'transformative'>('all');

  const [magicLevel, setMagicLevel] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_magic_level');
    return saved ? parseInt(saved, 10) : 3;
  });

  const [magicXP, setMagicXP] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_magic_xp');
    return saved ? parseInt(saved, 10) : 650;
  });

  const [mindScore, setMindScore] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_stat_mind');
    return saved ? parseInt(saved, 10) : 14;
  });

  const [magicScore, setMagicScore] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_stat_magic');
    return saved ? parseInt(saved, 10) : 16;
  });

  const [activeExplainStat, _setActiveExplainStat] = useState<StatType | null>(null);
  const [resetConfirmStat, setResetConfirmStat] = useState<StatType | null>(null);

  useEffect(() => {
    setResetConfirmStat(null);
  }, [activeExplainStat]);

  useEffect(() => {
    if (resetConfirmStat) {
      const timer = setTimeout(() => {
        setResetConfirmStat(null);
      }, 5000); // 5 sec auto timeout
      return () => clearTimeout(timer);
    }
  }, [resetConfirmStat]);

  const [isHistoryOpen, _setIsHistoryOpen] = useState<boolean>(false);
  const [syncStateTrigger, setSyncStateTrigger] = useState<number>(0);

  const statHoldTimerRef = useRef<any>(null);
  const isHoldingStatRef = useRef<boolean>(false);
  const lastPointerDownTimeRef = useRef<number>(0);
  const lastRollTimeRef = useRef<number>(0);
  const combatLogsRef = useRef<CombatLogItem[]>([]);

  const handleStatPointerDown = (stat: StatType, e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger press or hold modal if we are adjusting the score or editing input
    if (target.closest('button') || target.closest('input')) {
      return;
    }
    // Prevent default touch/click behaviors like scrolling or selection on the card itself
    e.preventDefault();

    if (statHoldTimerRef.current) clearTimeout(statHoldTimerRef.current);
    isHoldingStatRef.current = false;
    lastPointerDownTimeRef.current = Date.now();
    
    statHoldTimerRef.current = setTimeout(() => {
      isHoldingStatRef.current = true;
      playTactileSound(550, 'triangle', 0.08);
      setActiveExplainStat(stat);
    }, 450); // Strict 450ms threshold for Hold
  };

  const handleStatPointerUp = (stat: StatType, e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }

    if (statHoldTimerRef.current) {
      clearTimeout(statHoldTimerRef.current);
      statHoldTimerRef.current = null;
    }
    
    const clickDuration = Date.now() - lastPointerDownTimeRef.current;
    
    // Only roll if we were NOT holding, the click duration is brief, and a down event occurred
    if (!isHoldingStatRef.current && clickDuration < 450 && lastPointerDownTimeRef.current > 0) {
      playTactileSound(460, 'sine', 0.05);
      
      const scoreSaved = safeStorage.getItem(`vtt_stat_${stat}`);
      const score = scoreSaved ? parseInt(scoreSaved, 10) : (stat === 'mind' ? 14 : stat === 'magic' ? 16 : 10);
      const modifier = Math.floor(score / 10);
      const diceQty = modifier + 1;
      
      const info = STAT_DETAILS[stat];
      const displayName = info ? info.name : stat.toUpperCase();
      
      rollFormula(`${displayName} Stat Roll`, diceQty, 6, 0, stat);
    }
    isHoldingStatRef.current = false;
    lastPointerDownTimeRef.current = 0;
  };

  const handleStatPointerLeave = () => {
    if (statHoldTimerRef.current) {
      clearTimeout(statHoldTimerRef.current);
      statHoldTimerRef.current = null;
    }
    isHoldingStatRef.current = false;
  };

  const maxMagic = magicLevel * 100;
  const [currentMagic, setCurrentMagic] = useState<number>(() => {
    const saved = safeStorage.getItem('vtt_current_magic');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? maxMagic : Math.min(parsed, maxMagic);
    }
    return maxMagic;
  });

  useEffect(() => {
    safeStorage.setItem('vtt_current_magic', currentMagic.toString());
  }, [currentMagic]);

  useEffect(() => {
    if (currentMagic > maxMagic) {
      setCurrentMagic(maxMagic);
    }
  }, [maxMagic]);

  const [showRestMenu, _setShowRestMenu] = useState(false);
  const [customPercent, setCustomPercent] = useState<number>(75);

  const setActiveSection = (val: string | null | ((prev: string | null) => string | null)) => {
    const nextVal = typeof val === 'function' ? val(activeSection) : val;
    _setActiveSection(nextVal);
    if (nextVal) {
      _setIsHistoryOpen(false);
      _setIsSpellBuilderOpen(false);
      _setHeldSpellInfo(null);
      _setActiveExplainStat(null);
      _setShowRestMenu(false);
    }
  };

  const setIsHistoryOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isHistoryOpen) : val;
    _setIsHistoryOpen(nextVal);
    if (nextVal) {
      _setActiveSection(null);
      _setIsSpellBuilderOpen(false);
      _setHeldSpellInfo(null);
      _setActiveExplainStat(null);
      _setShowRestMenu(false);
    }
  };

  const setIsSpellBuilderOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isSpellBuilderOpen) : val;
    _setIsSpellBuilderOpen(nextVal);
    if (nextVal) {
      _setActiveSection(null);
      _setIsHistoryOpen(false);
      _setHeldSpellInfo(null);
      _setActiveExplainStat(null);
      _setShowRestMenu(false);
    }
  };

  const setHeldSpellInfo = (val: any | null | ((prev: any | null) => any | null)) => {
    const nextVal = typeof val === 'function' ? val(heldSpellInfo) : val;
    _setHeldSpellInfo(nextVal);
    if (nextVal) {
      _setActiveSection(null);
      _setIsHistoryOpen(false);
      _setIsSpellBuilderOpen(false);
      _setActiveExplainStat(null);
      _setShowRestMenu(false);
    }
  };

  const setActiveExplainStat = (val: StatType | null | ((prev: StatType | null) => StatType | null)) => {
    const nextVal = typeof val === 'function' ? val(activeExplainStat) : val;
    _setActiveExplainStat(nextVal);
    if (nextVal) {
      _setActiveSection(null);
      _setIsHistoryOpen(false);
      _setIsSpellBuilderOpen(false);
      _setHeldSpellInfo(null);
      _setShowRestMenu(false);
    }
  };

  const setShowRestMenu = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(showRestMenu) : val;
    _setShowRestMenu(nextVal);
    if (nextVal) {
      _setIsHistoryOpen(false);
      _setIsSpellBuilderOpen(false);
      _setHeldSpellInfo(null);
      _setActiveExplainStat(null);
    }
  };

  const handleForgeSpell = (
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
  ) => {
    if (id) {
      const updated = customSpells.map(spell => {
        if (spell.id === id) {
          return {
            ...spell,
            name,
            description,
            power,
            formula,
            cost,
            diceCount,
            diceSize,
            modifier,
            category,
            builderState
          };
        }
        return spell;
      });
      setCustomSpells(updated);
      safeStorage.setItem('vtt_custom_spells', JSON.stringify(updated));
      addCombatLog(`[Spell Forge]: Modified custom spell "${name}".`);
    } else {
      const newSpell = {
        id: `spell_${Date.now()}`,
        name,
        description,
        power,
        formula,
        cost,
        diceCount,
        diceSize,
        modifier,
        category,
        builderState
      };
      const updated = [...customSpells, newSpell];
      setCustomSpells(updated);
      safeStorage.setItem('vtt_custom_spells', JSON.stringify(updated));
      addCombatLog(`[Spell Forge]: Crafted new custom spell "${name}" (${formula}, cost: ${cost} ✨).`);
      gainXP(50);
    }
  };

  const handleForgeItem = (item: CustomItem) => {
    const exists = customItems.some(c => c.id === item.id);
    if (exists) {
      const updated = customItems.map(c => c.id === item.id ? item : c);
      setCustomItems(updated);
      addCombatLog(`[Forge]: Re-forged matrix record for ${item.name}.`);
    } else {
      const updated = [...customItems, item];
      setCustomItems(updated);
      addCombatLog(`[Forge]: Crafted new cognitive matrix item ${item.name}.`);
    }
  };

  const handleDeleteSpell = (id: string) => {
    const spellToDelete = customSpells.find(spell => spell.id === id);
    const spellName = spellToDelete ? spellToDelete.name : "Custom Spell";
    const updated = customSpells.filter(spell => spell.id !== id);
    setCustomSpells(updated);
    safeStorage.setItem('vtt_custom_spells', JSON.stringify(updated));
    addCombatLog(`[Spell Forge]: Discarded spell "${spellName}".`);
    if (deleteConfirmId === id) {
      setDeleteConfirmId(null);
    }
  };

  // Press = Mini-menu, Hold = Full-menu pointer event refs and handlers
  const nodePressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeIsHoldTriggeredRef = useRef<boolean>(false);

  const handleNodePointerDown = (e: React.PointerEvent, sectionId: string) => {
    e.stopPropagation();
    nodeIsHoldTriggeredRef.current = false;
    
    if (nodePressTimeoutRef.current) clearTimeout(nodePressTimeoutRef.current);
    
    nodePressTimeoutRef.current = setTimeout(() => {
      nodeIsHoldTriggeredRef.current = true;
      setActiveSection(sectionId);
      setIsMenuEnlarged(true);
      playTactileSound(500, 'sawtooth', 0.08);
    }, 450); // Hold triggers after 450ms
  };

  const handleNodePointerUp = (e: React.PointerEvent, sectionId: string) => {
    e.stopPropagation();
    if (nodePressTimeoutRef.current) {
      clearTimeout(nodePressTimeoutRef.current);
      nodePressTimeoutRef.current = null;
    }
    
    if (!nodeIsHoldTriggeredRef.current) {
      if (activeSection === sectionId) {
        // Toggle behavior
        setActiveSection(null);
      } else {
        setActiveSection(sectionId);
        setIsMenuEnlarged(false);
      }
      playTactileSound(420, 'sine', 0.04);
    }
    nodeIsHoldTriggeredRef.current = false;
  };

  const handleNodePointerCancel = () => {
    if (nodePressTimeoutRef.current) {
      clearTimeout(nodePressTimeoutRef.current);
      nodePressTimeoutRef.current = null;
    }
    nodeIsHoldTriggeredRef.current = false;
  };

  // Hover label timer to make hover labels disappear after 1.5s
  const [visibleLabelId, setVisibleLabelId] = useState<string | null>(null);
  const labelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isHoverOn = safeStorage.getItem('setting_hover_text') === 'on';
    if (hoveredSection && isHoverOn) {
      setVisibleLabelId(hoveredSection);
      if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
      labelTimeoutRef.current = setTimeout(() => {
        setVisibleLabelId(null);
      }, 1500);
    } else {
      setVisibleLabelId(null);
      if (labelTimeoutRef.current) {
        clearTimeout(labelTimeoutRef.current);
        labelTimeoutRef.current = null;
      }
    }
    return () => {
      if (labelTimeoutRef.current) {
        clearTimeout(labelTimeoutRef.current);
      }
    };
  }, [hoveredSection]);

  // Tabletop pointer hold handlers for pink circle
  const [isHoldingActive, setIsHoldingActive] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const holdStartTimeRef = useRef(0);

  const startHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    isHoldingRef.current = false;
    holdStartTimeRef.current = Date.now();
    setIsHoldingActive(true);
    
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    
    longPressTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      window.dispatchEvent(new Event('open-settings-modal'));
    }, 500);
  };

  const endHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsHoldingActive(false);
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // Tap on the pink circle opens the active Character Codex
    if (!isHoldingRef.current) {
      const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
      window.dispatchEvent(new CustomEvent('open-character-codex', {
        detail: {
          charId: activeId
        }
      }));
    }
    isHoldingRef.current = false;
  };

  const cancelHold = () => {
    setIsHoldingActive(false);
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    isHoldingRef.current = false;
  };

  // Persistence States
  const [healingPotions, setHealingPotions] = useState(() => {
    const saved = safeStorage.getItem('vtt_healing_potions');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [elixirLife, setElixirLife] = useState(() => {
    const saved = safeStorage.getItem('vtt_elixir_life');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [starDust, setStarDust] = useState(() => {
    const saved = safeStorage.getItem('vtt_star_dust');
    return saved ? parseInt(saved, 10) : 2;
  });

  const [spellSlots, setSpellSlots] = useState<{ [key: string]: boolean }>({
    'L1_1': true, 'L1_2': true, 'L2_1': true, 'L2_2': false, 'L3_1': false
  });

  const [questStates, setQuestStates] = useState<{ [key: string]: boolean }>(() => {
    const saved = safeStorage.getItem('vtt_quest_states');
    return saved ? JSON.parse(saved) : {
      'solar': false,
      'abyss': false,
      'runes': true,
      'dragon': false
    };
  });

  const [campaignNotes, setCampaignNotes] = useState(() => {
    const saved = safeStorage.getItem('vtt_campaign_notes');
    return saved || 'A mysterious shadow looms over the Astral Temple. We found five cosmic anchors aligning with the points of the great pentagram...';
  });

  // Drawer states
  const [drawerRows, setDrawerRows] = useState(() => {
    const saved = safeStorage.getItem('vtt_inventory_drawer_rows');
    return saved ? parseFloat(saved) : 11;
  });
  const [preferredRows, setPreferredRows] = useState(() => {
    const saved = safeStorage.getItem('vtt_inventory_preferred_rows');
    return saved ? parseInt(saved, 10) : 11;
  });
  const [filterCategory, setFilterCategory] = useState<'all' | 'utility' | 'weapons' | 'gear'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rarity'>('name');
  const [isDrawerDragging, setIsDrawerDragging] = useState(false);
  const [selectedSilhouetteSection, setSelectedSilhouetteSection] = useState<string | null>(null);
  const [hoveredSilhouetteSection, setHoveredSilhouetteSection] = useState<string | null>(null);
  const [activeItemsTab, setActiveItemsTab] = useState<'all' | 'player' | 'inventory' | 'familiar'>('all');
  const [customItems, setCustomItems] = useState<CustomItem[]>(() => {
    const saved = safeStorage.getItem('vtt_custom_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse custom items:", e);
      }
    }
    return [];
  });
  const [isItemCreatorOpen, setIsItemCreatorOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CustomItem | null>(null);
  const [equippedGear, setEquippedGear] = useState<Record<string, string[]>>(() => {
    const saved = safeStorage.getItem('vtt_equipped_gear');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse equipped gear:", e);
      }
    }
    return {
      head: ['Circlet of Stars'],
      neckline: ['Ethereal Pendant'],
      torso: ['Phasing Cloak'],
      l_wrist: ['Chronos Bracer'],
      r_wrist: ['Starseeker Blade'],
      l_hand: [],
      r_hand: [],
      belt: [],
      pants: ['Novasteel Greaves'],
      l_ankle: ['Aether Anklet'],
      r_ankle: [],
      l_foot: ['Warp Boots'],
      r_foot: [],
      sprite: ['Spark Essence'],
      backpack: ['Astral Compass', 'Heal Potion'],
    };
  });

  const updateEquippedGear = (newGear: Record<string, string[]>) => {
    setEquippedGear(newGear);
    safeStorage.setItem('vtt_equipped_gear', JSON.stringify(newGear));
  };

  const [combatLogs, setCombatLogs] = useState<CombatLogItem[]>(() => {
    const cl = safeStorage.getItem('vtt_combat_logs');
    if (cl) {
      try {
        const parsed = JSON.parse(cl);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse combat logs from safeStorage:", e);
      }
    }
    return [
      createLogItem('Combat log initialized.'),
      createLogItem('Restructured grid system online.')
    ];
  });

  const [selectedLog, setSelectedLog] = useState<CombatLogItem | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  const [activeLoreEntry, setActiveLoreEntry] = useState<string>('behemoth');
  const [activeWeaponTab, setActiveWeaponTab] = useState<'all' | 'melee' | 'ranged'>('all');
  const [activeJournalTab, setActiveJournalTab] = useState<'tasks' | 'notes'>('tasks');
  const [oracleReading, setOracleReading] = useState<string>('Click to consult the ancient celestial spheres for wisdom...');
  const [oracleLoading, setOracleLoading] = useState<boolean>(false);
  const [pressedDir, setPressedDir] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  const handleDPadPress = (dir: 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright') => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: dir } as KeyboardEventInit));
  };

  // Joypad feature states
  const [isJoypadMode, setIsJoypadMode] = useState<boolean>(() => {
    return safeStorage.getItem('setting_default_controller') === 'joypad';
  });

  useEffect(() => {
    const handleCtrlUpdate = () => {
      setIsJoypadMode(safeStorage.getItem('setting_default_controller') === 'joypad');
    };
    window.addEventListener('tabletop-state-update', handleCtrlUpdate);
    window.addEventListener('storage', handleCtrlUpdate);
    return () => {
      window.removeEventListener('tabletop-state-update', handleCtrlUpdate);
      window.removeEventListener('storage', handleCtrlUpdate);
    };
  }, []);

  useEffect(() => {
    combatLogsRef.current = combatLogs;
    safeStorage.setItem('vtt_combat_logs', JSON.stringify(combatLogs));
  }, [combatLogs]);

  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });
  const [isJoyDragging, setIsJoyDragging] = useState<boolean>(false);

  const centerHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joyHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const joyStartPos = useRef({ x: 0, y: 0 });
  const joyCurrentOffset = useRef({ x: 0, y: 0 });
  const joyHasMovedRef = useRef<boolean>(false);

  const formatLogToSentenceCase = (log: string): string => {
    let clean = log.trim();
    
    if (clean.includes('[Level Up!]')) {
      const match = clean.match(/Magic Level (\d+)/i);
      if (match) {
        return `The character leveled up and reached Magic Level ${match[1]}.`;
      }
      return "The character leveled up successfully.";
    }
    
    if (clean.startsWith('[Oracle]:')) {
      let reading = clean.replace(/^\[Oracle\]:\s*/i, '');
      reading = reading.replace(/^["']|["']$/g, '');
      return `The oracle of spheres shared a reading: "${reading}"`;
    }
    
    if (clean.includes('[Cosmos]:')) {
      return "Raw starlight was channeled into local coordinate systems.";
    }
    
    if (clean.startsWith('[Tabletop Rest]:')) {
      const restMsg = clean.replace(/^\[Tabletop Rest\]:\s*/i, '');
      return restMsg.charAt(0).toUpperCase() + restMsg.slice(1);
    }
    
    if (clean.startsWith('[Inventory]:')) {
      const invMsg = clean.replace(/^\[Inventory\]:\s*/i, '');
      if (invMsg.includes('Consumed Health Potion')) {
        return "The caster consumed a health potion and restored 10 health points.";
      }
      if (invMsg.includes('Drank Elixir of Stars')) {
        return "The caster drank an elixir of stars, increasing max healing capacity by 25 health points.";
      }
      if (invMsg.includes('Scattered Star Dust')) {
        return "The caster scattered star dust, gaining an 8 temporary health shield.";
      }
      if (invMsg.includes('Companion pack restocked')) {
        return "The companion pack was restocked to default capacity.";
      }
      return invMsg;
    }
    
    if (clean.startsWith('[XP Gain]:')) {
      const xpMsg = clean.replace(/^\[XP Gain\]:\s*/i, '');
      return `The caster gained experience across attributes: ${xpMsg}.`;
    }
    
    const rollRegex = /^(.*?):\s*Rolled\s+(\d+)[dD](\d+)([-+]\d+)?\s*->\s*(\d+)/i;
    const match = clean.match(rollRegex);
    if (match) {
      const formulaName = match[1].replace(/\s*Check\s*Check/gi, ' Check').trim();
      const numDice = match[2];
      const numSides = match[3];
      const modifierStr = match[4] || '';
      const total = match[5];
      
      const parentheticalMatch = clean.match(/\(([^)]+)\)/);
      let breakdownPart = '';
      if (parentheticalMatch) {
         breakdownPart = ` (breakdown: ${parentheticalMatch[1]})`;
      }
      
      let sentence = `For the ${formulaName.toLowerCase()} roll, you rolled ${numDice}d${numSides}${modifierStr} and got a total of ${total}${breakdownPart}.`;
      return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
    
    if (clean.length > 0) {
      let formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
      if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
        formatted += '.';
      }
      return formatted;
    }
    
    return log;
  };

  const playTactileSound = (freq = 400, type: OscillatorType = 'sine', duration = 0.08) => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      // Ignored if sound isn't supported
    }
  };

  const dragStartY = useRef(0);
  const dragStartRows = useRef(0);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawerDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartRows.current = drawerRows;
  };

  const handleToggleExpandCollapse = () => {
    if (drawerRows > 1.2) {
      setDrawerRows(1);
      safeStorage.setItem('vtt_inventory_drawer_rows', '1');
    } else {
      const target = preferredRows > 1.2 ? preferredRows : 11;
      setDrawerRows(target);
      safeStorage.setItem('vtt_inventory_drawer_rows', target.toString());
    }
    playTactileSound(550, 'triangle', 0.08);
  };

  useEffect(() => {
    if (!isDrawerDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY.current;
      const rowsDelta = -deltaY / 30;
      const currentRows = Math.max(1, Math.min(11, dragStartRows.current + rowsDelta));
      setDrawerRows(currentRows);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY.current;
      const rowsDelta = -deltaY / 30;
      const snappedRows = Math.max(1, Math.min(11, Math.round(dragStartRows.current + rowsDelta)));
      setDrawerRows(snappedRows);
      if (snappedRows > 1) {
        setPreferredRows(snappedRows);
        safeStorage.setItem('vtt_inventory_preferred_rows', snappedRows.toString());
      }
      safeStorage.setItem('vtt_inventory_drawer_rows', snappedRows.toString());
      setIsDrawerDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const deltaY = e.touches[0].clientY - dragStartY.current;
      const rowsDelta = -deltaY / 30;
      const currentRows = Math.max(1, Math.min(11, dragStartRows.current + rowsDelta));
      setDrawerRows(currentRows);
    };

    const handleTouchEnd = () => {
      setIsDrawerDragging(false);
      setDrawerRows(prev => {
        const snapped = Math.max(1, Math.min(11, Math.round(prev)));
        if (snapped > 1) {
          setPreferredRows(snapped);
          safeStorage.setItem('vtt_inventory_preferred_rows', snapped.toString());
        }
        safeStorage.setItem('vtt_inventory_drawer_rows', snapped.toString());
        return snapped;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDrawerDragging]);

  useEffect(() => {
    return () => {
      if (centerHoldTimeoutRef.current) clearTimeout(centerHoldTimeoutRef.current);
      if (joyHoldTimeoutRef.current) clearTimeout(joyHoldTimeoutRef.current);
      if (joyIntervalRef.current) clearInterval(joyIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    (window as any).__vtt_menu_open = isSpellBuilderOpen || activeSection !== null || heldSpellInfo !== null || isItemCreatorOpen;
    window.dispatchEvent(new Event('vtt-menu-update'));
  }, [isSpellBuilderOpen, activeSection, heldSpellInfo, isItemCreatorOpen]);

  // Global instantaneous click/press elements dismissal
  useEffect(() => {
    const handleGlobalClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 1. Closest search for activeSection details panel
      if (activeSection) {
        const inActivePanel = target.closest('#active-section-menu') || target.closest('#active-section-drawer');
        const isNodeButton = target.closest('.node-interactive-trigger') || target.closest('#dpad-controller');
        if (!inActivePanel && !isNodeButton) {
          setActiveSection(null);
        }
      }

      // 2. Closest search for Spell Builder dialog
      if (isSpellBuilderOpen) {
        const inSpellBuilder = target.closest('#spell-builder-dialog');
        const isBuilderTrigger = target.closest('.spell-builder-trigger');
        if (!inSpellBuilder && !isBuilderTrigger) {
          setIsSpellBuilderOpen(false);
          setSpellToEdit(null);
        }
      }

      // 3. Closest search for Rest popup overlay
      if (showRestMenu) {
        const inRestMenu = target.closest('#rest-menu-overlay') || target.closest('[title="Rest to replenish Magic"]');
        if (!inRestMenu) {
          setShowRestMenu(false);
        }
      }
    };

    document.addEventListener('pointerdown', handleGlobalClickOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handleGlobalClickOutside, true);
    };
  }, [activeSection, isSpellBuilderOpen, showRestMenu]);

  const handleCenterDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Start hold timer on D-pad center
    if (centerHoldTimeoutRef.current) clearTimeout(centerHoldTimeoutRef.current);
    centerHoldTimeoutRef.current = setTimeout(() => {
      setIsJoypadMode(true);
      // Clean up D-pad directions
      setPressedDir(null);
      playTactileSound(420, 'triangle', 0.15);
    }, 500); // 500ms hold threshold
    
    const handleUp = () => {
      if (centerHoldTimeoutRef.current) {
        clearTimeout(centerHoldTimeoutRef.current);
        centerHoldTimeoutRef.current = null;
      }
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsJoyDragging(true);
    joyHasMovedRef.current = false;
    joyCurrentOffset.current = { x: 0, y: 0 };
    setJoyOffset({ x: 0, y: 0 });
    
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joyStartPos.current = { x: centerX, y: centerY };
    
    // Play subtle click
    playTactileSound(320, 'sine', 0.05);

    // Start hold timer for returning to D-pad
    if (joyHoldTimeoutRef.current) clearTimeout(joyHoldTimeoutRef.current);
    joyHoldTimeoutRef.current = setTimeout(() => {
      if (!joyHasMovedRef.current) {
        setIsJoypadMode(false);
        setIsJoyDragging(false);
        setJoyOffset({ x: 0, y: 0 });
        if (joyIntervalRef.current) {
          clearInterval(joyIntervalRef.current);
          joyIntervalRef.current = null;
        }
        playTactileSound(280, 'triangle', 0.2);
      }
    }, 500);
  };

  const updateJoypadMovement = (x: number, y: number) => {
    const distance = Math.hypot(x, y);
    const threshold = 5;
    
    if (distance < threshold) {
      if (joyIntervalRef.current) {
        clearInterval(joyIntervalRef.current);
        joyIntervalRef.current = null;
      }
      return;
    }
    
    let moveDir: 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright' | null = null;
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    
    if (angle >= -135 && angle < -45) {
      moveDir = 'arrowup';
    } else if (angle >= 45 && angle < 135) {
      moveDir = 'arrowdown';
    } else if (angle >= -45 && angle < 45) {
      moveDir = 'arrowright';
    } else {
      moveDir = 'arrowleft';
    }
    
    if (moveDir) {
      if (!joyIntervalRef.current) {
        handleDPadPress(moveDir);
        playTactileSound(380, 'sine', 0.04);
        joyIntervalRef.current = setInterval(() => {
          const currentAngle = Math.atan2(joyCurrentOffset.current.y, joyCurrentOffset.current.x) * 180 / Math.PI;
          const currentDistance = Math.hypot(joyCurrentOffset.current.x, joyCurrentOffset.current.y);
          if (currentDistance >= threshold) {
            let innerDir: 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright' | null = null;
            if (currentAngle >= -135 && currentAngle < -45) {
              innerDir = 'arrowup';
            } else if (currentAngle >= 45 && currentAngle < 135) {
              innerDir = 'arrowdown';
            } else if (currentAngle >= -45 && currentAngle < 45) {
              innerDir = 'arrowright';
            } else {
              innerDir = 'arrowleft';
            }
            if (innerDir) {
              handleDPadPress(innerDir);
              playTactileSound(360, 'sine', 0.03);
            }
          }
        }, 150); // frequency of repeat move steps
      }
    }
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isJoyDragging) return;
    
    const dx = e.clientX - joyStartPos.current.x;
    const dy = e.clientY - joyStartPos.current.y;
    
    const distance = Math.hypot(dx, dy);
    if (distance > 3) {
      joyHasMovedRef.current = true;
      if (joyHoldTimeoutRef.current) {
        clearTimeout(joyHoldTimeoutRef.current);
        joyHoldTimeoutRef.current = null;
      }
    }
    
    const maxRadius = 15;
    let clampedX = dx;
    let clampedY = dy;
    if (distance > maxRadius) {
      clampedX = (dx / distance) * maxRadius;
      clampedY = (dy / distance) * maxRadius;
    }
    
    joyCurrentOffset.current = { x: clampedX, y: clampedY };
    setJoyOffset({ x: clampedX, y: clampedY });
    updateJoypadMovement(clampedX, clampedY);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsJoyDragging(false);
    setJoyOffset({ x: 0, y: 0 });
    joyCurrentOffset.current = { x: 0, y: 0 };
    
    if (joyHoldTimeoutRef.current) {
      clearTimeout(joyHoldTimeoutRef.current);
      joyHoldTimeoutRef.current = null;
    }
    
    if (joyIntervalRef.current) {
      clearInterval(joyIntervalRef.current);
      joyIntervalRef.current = null;
    }
  };

  // Sync to Storage
  useEffect(() => {
    safeStorage.setItem('vtt_custom_items', JSON.stringify(customItems));
  }, [customItems]);

  useEffect(() => {
    safeStorage.setItem('vtt_healing_potions', healingPotions.toString());
  }, [healingPotions]);

  useEffect(() => {
    safeStorage.setItem('vtt_elixir_life', elixirLife.toString());
  }, [elixirLife]);

  useEffect(() => {
    safeStorage.setItem('vtt_star_dust', starDust.toString());
  }, [starDust]);

  useEffect(() => {
    safeStorage.setItem('vtt_campaign_notes', campaignNotes);
  }, [campaignNotes]);

  useEffect(() => {
    safeStorage.setItem('vtt_quest_states', JSON.stringify(questStates));
  }, [questStates]);

  const addCombatLog = (msg: string) => {
    const newItem = createLogItem(msg);
    const newLogs = [newItem, ...combatLogsRef.current].slice(0, 30);
    combatLogsRef.current = newLogs;
    safeStorage.setItem('vtt_combat_logs', JSON.stringify(newLogs));
    setCombatLogs(newLogs);
  };

  const handleUndo = (logItem: CombatLogItem) => {
    const msg = logItem.originalText;
    
    if (msg.includes("Health Potion")) {
      setHealingPotions(prev => prev + 1);
      window.dispatchEvent(new CustomEvent('vtt-hp-adjust', { detail: { amount: -10 } }));
    } else if (msg.includes("Elixir of Stars")) {
      setElixirLife(prev => prev + 1);
      window.dispatchEvent(new CustomEvent('vtt-hp-adjust', { detail: { amount: -25 } }));
    } else if (msg.includes("Star Dust")) {
      setStarDust(prev => prev + 1);
      window.dispatchEvent(new CustomEvent('vtt-hp-adjust-temp', { detail: { amount: -8 } }));
    } else if (logItem.type === 'XP') {
      const amountMatch = msg.match(/XP Gain\]:\s*(\d+)/i) || msg.match(/(\d+)\s*XP/i);
      if (amountMatch) {
        const amt = parseInt(amountMatch[1], 10);
        setMagicXP(prev => Math.max(0, prev - amt));
      }
    }
    
    setCombatLogs(prev => prev.filter(item => item.id !== logItem.id));
    playTactileSound(300, 'sawtooth', 0.15);
  };

  const handleDelete = (logId: string) => {
    setCombatLogs(prev => prev.filter(item => item.id !== logId));
    playTactileSound(350, 'sine', 0.1);
  };

  const handleSaveNote = (logId: string, noteText: string) => {
    setCombatLogs(prev => prev.map(item => {
      if (item.id === logId) {
        return { ...item, note: noteText };
      }
      return item;
    }));
    playTactileSound(600, 'sine', 0.05);
  };

  const xpRequired = magicLevel * 500;

  const gainXP = (amount: number) => {
    setMagicXP(prevXP => {
      let newXP = prevXP + amount;
      let newLevel = magicLevel;
      let currentReq = newLevel * 500;
      let leveledUp = false;
      while (newXP >= currentReq) {
        newXP -= currentReq;
        newLevel += 1;
        currentReq = newLevel * 500;
        leveledUp = true;
      }
      if (leveledUp) {
        setMagicLevel(newLevel);
        setTimeout(() => {
          playTactileSound(880, 'triangle', 0.2);
          addCombatLog(`[Level Up!]: Character reached Magic Level ${newLevel}!`);
        }, 100);
      }
      safeStorage.setItem('vtt_magic_xp', newXP.toString());
      return newXP;
    });
  };

  useEffect(() => {
    safeStorage.setItem('vtt_magic_level', magicLevel.toString());
  }, [magicLevel]);

  useEffect(() => {
    const req = magicLevel * 500;
    if (magicXP >= req) {
      const clampedXP = req - 1;
      setMagicXP(clampedXP);
      safeStorage.setItem('vtt_magic_xp', clampedXP.toString());
    }
  }, [magicLevel, magicXP]);

  // Starborn / Oracle readings generator
  const getOracleReading = () => {
    setOracleLoading(true);
    setTimeout(() => {
      const readings = [
        "The stars are aligned in your favor. A windfall of arcane energy is incoming.",
        "Beware the shifting of the cosmic clock. The gravity of the abyss grows heavy.",
        "A hidden route reveals itself in the coordinates. Proceed with shield raised.",
        "Starlight illuminates your weapon. Your next strike deals triple damage.",
        "The celestial alignment commands you to rest. Take a breather.",
        "Nebula dust currents whisper: 'A grand treasure lies beyond the North Rift.'",
        "The oracle sees a critical failure avoided. Trust your companions."
      ];
      const randomMsg = readings[Math.floor(Math.random() * readings.length)];
      setOracleReading(randomMsg);
      setOracleLoading(false);
      addCombatLog(`[Oracle]: ${randomMsg}`);
    }, 600);
  };

  // Roll helper
  const rollFormula = (
    formulaName: string, 
    numDice: number, 
    numSides: number, 
    modifier: number, 
    statContext?: StatType
  ) => {
    const now = Date.now();
    if (now - lastRollTimeRef.current < 450) {
      console.log("Blocking rapid double-roll");
      return;
    }
    lastRollTimeRef.current = now;

    let sum = 0;
    const individualRolls: number[] = [];
    for (let i = 0; i < numDice; i++) {
      const r = Math.floor(Math.random() * numSides) + 1;
      sum += r;
      individualRolls.push(r);
    }

    // Trigger the global visual dice rolling with all metadata
    window.dispatchEvent(new CustomEvent('vtt-remote-roll', { 
      detail: { 
        count: numDice, 
        sides: numSides, 
        values: individualRolls,
        formulaName: formulaName,
        statContext: statContext,
        modifier: modifier
      } 
    }));
  };

  const onRollSettled = (
    formulaName: string,
    rolls: number[],
    modifier: number,
    statContext?: StatType,
    numSides: number = 6
  ) => {
    if (!rolls || rolls.length === 0) return;

    let sum = rolls.reduce((acc, r) => acc + r, 0);
    const total = sum + modifier;
    const logStr = `${formulaName}: Rolled ${rolls.length}d${numSides}${modifier >= 0 ? '+' : ''}${modifier} -> ${total} (${rolls.join(', ')} [${sum}] + ${modifier})`;
    addCombatLog(logStr);

    // Gain XP when rolling / casting spells
    gainXP(Math.max(12, rolls.length * numSides * 2));

    // Experience for stats: based strictly on individual die roll result:
    // Roll 1, 2, 3 -> 1 Experience
    // Roll 4, 5 -> 2 Experience
    // Roll 6 -> 3 Experience
    let totalXP = 0;
    const rollDetailsLog: string[] = [];
    rolls.forEach((rawNum) => {
      const num = Number(rawNum);
      let xpEarned = 1;
      if (num === 1 || num === 2 || num === 3) {
        xpEarned = 1;
      } else if (num === 4 || num === 5) {
        xpEarned = 2;
      } else if (num >= 6) {
        xpEarned = 3;
      } else {
        xpEarned = 1;
      }
      totalXP += xpEarned;
      rollDetailsLog.push(`D${numSides} Roll [${num}] -> +${xpEarned} XP`);
    });

    if (rollDetailsLog.length > 0) {
      addCombatLog(`[Roll XP Breakdown]: ${rollDetailsLog.join(', ')}`);
    }

    const isMagicRoll = 
      statContext === 'magic' || 
      formulaName.startsWith('To Hit:') || 
      customSpells.some(s => s.name === formulaName) ||
      formulaName.includes('Energy [Dice] Matrix Drop') ||
      formulaName.includes('Energy [Dice] Matrix Roll');

    const isWieldRoll = 
      statContext === 'wield' || 
      formulaName.includes('Starseeker Blade') || 
      formulaName.includes('Cosmic Bow');

    let xpLogLines: string[] = [];
    if (isMagicRoll) {
      const resMind = addStatXP('mind', totalXP, playTactileSound);
      const resMagic = addStatXP('magic', totalXP, playTactileSound);
      xpLogLines.push(`Mind +${totalXP} XP`, `Magic +${totalXP} XP`);
      if (resMind.leveledUp) addCombatLog(resMind.msg || '');
      if (resMagic.leveledUp) addCombatLog(resMagic.msg || '');
    } else if (isWieldRoll) {
      const resBody = addStatXP('body', totalXP, playTactileSound);
      const resWield = addStatXP('wield', totalXP, playTactileSound);
      xpLogLines.push(`Body +${totalXP} XP`, `Wield +${totalXP} XP`);
      if (resBody.leveledUp) addCombatLog(resBody.msg || '');
      if (resWield.leveledUp) addCombatLog(resWield.msg || '');
    } else if (statContext) {
      const res = addStatXP(statContext, totalXP, playTactileSound);
      xpLogLines.push(`${statContext.toUpperCase()} +${totalXP} XP`);
      if (res.leveledUp) addCombatLog(res.msg || '');
    }

    if (xpLogLines.length > 0) {
      addCombatLog(`[XP Gain]: ${xpLogLines.join(', ')}`);
    }
  };

  useEffect(() => {
    const handleRollSettled = (e: Event) => {
      const customEvent = e as CustomEvent<{
        rolls: number[];
        formulaName: string;
        modifier: number;
        statContext?: StatType;
        numSides: number;
      }>;
      if (customEvent.detail) {
        const { rolls, formulaName, modifier, statContext, numSides } = customEvent.detail;
        onRollSettled(formulaName, rolls, modifier, statContext, numSides);
      }
    };
    window.addEventListener('vtt-roll-settled-event', handleRollSettled);
    return () => {
      window.removeEventListener('vtt-roll-settled-event', handleRollSettled);
    };
  }, [customSpells]);

  const castSpellAction = (spellName: string, numDice: number, numSides: number, modifier: number, cost: number) => {
    if (cost > currentMagic) {
      const failLog = `[Arcane Failure]: Cannot cast ${spellName}. Not enough magic! Requires ${cost} ✨ (Have: ${currentMagic} ✨)`;
      addCombatLog(failLog);
      return false;
    }
    setCurrentMagic(prev => Math.max(0, prev - cost));
    rollFormula(spellName, numDice, numSides, modifier);
    return true;
  };

  const handleEnergyDiceRoll = () => {
    const savedCount = safeStorage.getItem('vtt_energy_dice_count');
    const savedSize = safeStorage.getItem('vtt_energy_dice_size');
    const savedMod = safeStorage.getItem('vtt_energy_modifier');
    
    const count = savedCount ? parseInt(savedCount, 10) : 1;
    const size = savedSize ? parseInt(savedSize, 10) : 6;
    const modifier = savedMod ? parseInt(savedMod, 10) : 1;
    
    playTactileSound(440, 'triangle', 0.15);
    rollFormula('Energy [Dice] Matrix Roll', count, size, modifier);
  };

  // Node geometries and position mapping centered on a 360x360 SVG layout.
  // Circle R = 135px. Centers at (180, 180).
  const nodePositions = [
    { 
      id: 'inventory', 
      name: 'Inventory',
      icon: <Backpack className="text-amber-400 group-hover:scale-110 transition-transform duration-300" size={25} />, 
      x: 180, 
      y: 107,
      color: 'rgba(217, 119, 6, 0.16)', // Amber Glow Fill
      glowHex: '#d97706',
      polygonPoints: '180,45 210.3,138.3 149.7,138.3'
    },
    { 
      id: 'magic', 
      name: 'Magic',
      icon: <Flame className="text-purple-400 group-hover:scale-110 transition-transform duration-300" size={25} />, 
      x: 249, 
      y: 157,
      color: 'rgba(124, 58, 237, 0.16)', // Purple Glow Fill
      glowHex: '#7c3aed',
      polygonPoints: '308.4,138.3 229,195.9 210.3,138.3'
    },
    { 
      id: 'journal', 
      name: 'Journal',
      icon: <Scroll className="text-pink-400 group-hover:scale-110 transition-transform duration-300" size={23} />, 
      x: 223, 
      y: 239,
      color: 'rgba(219, 39, 119, 0.16)', // Pink Glow Fill
      glowHex: '#db2777',
      polygonPoints: '259.4,289.2 180,231.6 229,195.9'
    },
    { 
      id: 'compendium', 
      name: 'Compendium',
      icon: <BookOpen className="text-emerald-400 group-hover:scale-110 transition-transform duration-300" size={25} />, 
      x: 137, 
      y: 239,
      color: 'rgba(5, 150, 105, 0.16)', // Emerald Glow Fill
      glowHex: '#059669',
      polygonPoints: '100.6,289.2 131,195.9 180,231.6'
    },
    { 
      id: 'weapons', 
      name: 'Weapons',
      icon: <Swords className="text-amber-500 group-hover:scale-110 transition-transform duration-300" size={25} />, 
      x: 111, 
      y: 157,
      color: 'rgba(234, 88, 12, 0.16)', // Orange Glow Fill
      glowHex: '#ea580c',
      polygonPoints: '51.6,138.3 149.7,138.3 131,195.9'
    },
    { 
      id: 'starborn', 
      name: 'Starborn RPG',
      icon: <Sparkles className="text-cyan-400 animate-pulse" size={29} />, 
      x: 180, 
      y: 180, 
      isCenter: true,
      color: 'rgba(8, 145, 178, 0.16)', // Cyan Glow Fill
      glowHex: '#0891b2',
      polygonPoints: '210.3,138.3 229,195.9 180,231.6 131,195.9 149.7,138.3'
    },
  ];

  // Render contents for each unique component tab
  const renderSectionContent = (id: string) => {
    switch (id) {
      case 'inventory':
        const SILHOUETTE_SECTIONS = [
          { id: 'head', name: 'Top of the Head', x: 200, y: 32, width: 80, height: 30, soundFreq: 880, logName: 'Top of the Head' },
          { id: 'neckline', name: 'Neckline', pathD: 'M 168,143 A 29,29 0 0 1 197,114 L 283,114 A 29,29 0 0 1 312,143 Q 240,158 168,143 Z', soundFreq: 780, logName: 'Neckline' },
          { id: 'torso', name: 'Torso', pathD: 'M 168,143 Q 240,158 312,143 L 312,220 L 283,220 L 283,245 L 197,245 L 197,220 L 168,220 Z', soundFreq: 520, logName: 'Torso' },
          { id: 'l_wrist', name: 'Left Wrist', x: 168, y: 220, width: 29, height: 30, soundFreq: 650, logName: 'Left Wrist' },
          { id: 'r_wrist', name: 'Right Wrist', x: 283, y: 220, width: 29, height: 30, soundFreq: 650, logName: 'Right Wrist' },
          { id: 'l_hand', name: 'Left Hand', x: 168, y: 250, width: 29, height: 32, soundFreq: 580, logName: 'Left Hand' },
          { id: 'r_hand', name: 'Right Hand', x: 283, y: 250, width: 29, height: 32, soundFreq: 580, logName: 'Right Hand' },
          { id: 'belt', name: 'Belt', x: 197, y: 245, width: 86, height: 20, soundFreq: 460, logName: 'Belt' },
          { id: 'pants', name: 'Pants', x: 197, y: 265, width: 86, height: 140, soundFreq: 380, logName: 'Pants' },
          { id: 'l_ankle', name: 'Left Ankle', x: 204, y: 405, width: 33, height: 20, soundFreq: 340, logName: 'Left Ankle' },
          { id: 'r_ankle', name: 'Right Ankle', x: 243, y: 405, width: 33, height: 20, soundFreq: 340, logName: 'Right Ankle' },
          { id: 'l_foot', name: 'Left Foot', x: 204, y: 425, width: 33, height: 42, soundFreq: 290, logName: 'Left Foot' },
          { id: 'r_foot', name: 'Right Foot', x: 243, y: 425, width: 33, height: 42, soundFreq: 290, logName: 'Right Foot' },
          { id: 'sprite', name: 'Fairy Companion', x: 35, y: 245, width: 160, height: 222, soundFreq: 950, logName: 'Fairy Companion' },
          { id: 'backpack', name: 'Adventurers Backpack', x: 295, y: 326, width: 114, height: 136, soundFreq: 330, logName: 'Adventurer\'s Backpack' },
        ];

        return (
          <div className="absolute inset-0 flex flex-col overflow-hidden pointer-events-auto">
            {/* Outline background silhouette */}
            <div 
              className={`absolute inset-x-0 pointer-events-none flex items-end justify-center select-none overflow-hidden bg-gradient-to-b from-stone-950/10 to-amber-950/5 ${isDrawerDragging ? '' : 'transition-all duration-300'}`}
              style={{ top: '42px', bottom: `${28 + (drawerRows - 1) * 30}px` }}
            >
              <svg className="h-full w-auto max-w-none pointer-events-auto" viewBox="0 0 480 467" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'auto' }}>
                <defs>
                  <clipPath id="human-shape-clip">
                    <circle cx="240" cy="62" r="30" />
                    <path
                      d="M 168,143 
                         A 29,29 0 0 1 197,114 
                         L 283,114 
                         A 29,29 0 0 1 312,143 
                         L 312,266 
                         A 14,14 0 0 1 283,266 
                         L 283,160 
                         A 10,10 0 0 0 274,170 
                         L 274,446 
                         A 14,14 0 0 1 245,446 
                         L 245,278 
                         A 5,5 0 0 0 235,278 
                         L 235,446 
                         A 14,14 0 0 1 206,446 
                         L 206,170 
                         A 10,10 0 0 0 197,160 
                         L 197,266 
                         A 14,14 0 0 1 168,266 
                         Z"
                    />
                  </clipPath>
                  {SILHOUETTE_SECTIONS.filter(sec => sec.id !== 'sprite' && sec.id !== 'backpack').map((sec) => (
                    <clipPath key={`clip-${sec.id}`} id={`clip-${sec.id}`}>
                      {sec.pathD ? (
                        <path d={sec.pathD} />
                      ) : (
                        <rect x={sec.x} y={sec.y} width={sec.width} height={sec.height} />
                      )}
                    </clipPath>
                  ))}
                </defs>

                {/* Background references at 14% opacity */}
                <g opacity="0.14">
                  <circle cx="240" cy="62" r="30" stroke="white" strokeWidth="2.5" fill="none" />
                  <path
                    d="M 168,143 
                       A 29,29 0 0 1 197,114 
                       L 283,114 
                       A 29,29 0 0 1 312,143 
                       L 312,266 
                       A 14,14 0 0 1 283,266 
                       L 283,160 
                       A 10,10 0 0 0 274,170 
                       L 274,446 
                       A 14,14 0 0 1 245,446 
                       L 245,278 
                       A 5,5 0 0 0 235,278 
                       L 235,446 
                       A 14,14 0 0 1 206,446 
                       L 206,170 
                       A 10,10 0 0 0 197,160 
                       L 197,266 
                       A 14,14 0 0 1 168,266 
                       Z"
                    stroke="white"
                    strokeWidth="2.5"
                    fill="none"
                  />

                </g>

                {/* Dynamic and Interactive Fairy Companion */}
                {(() => {
                  const isFairyHovered = hoveredSilhouetteSection === 'sprite';
                  const isFairySelected = selectedSilhouetteSection === 'sprite';
                  const hasFairyEquipment = equippedGear['sprite'] && equippedGear['sprite'].length > 0;

                  let fairyStroke = "white";
                  let fairyFill = "rgba(255, 255, 255, 0.12)";
                  let fairyCoreFill = "rgba(255, 255, 255, 0.25)";
                  let fairySmallCircleFill = "rgba(255, 255, 255, 0.2)";
                  let fairyGroupOpacity = 0.14;

                  if (isFairySelected) {
                    fairyStroke = "#f59e0b";
                    fairyFill = "rgba(245, 158, 11, 0.35)";
                    fairyCoreFill = "rgba(245, 158, 11, 0.45)";
                    fairySmallCircleFill = "rgba(245, 158, 11, 0.3)";
                    fairyGroupOpacity = 1.0;
                  } else if (isFairyHovered) {
                    fairyStroke = "rgba(245, 158, 11, 0.85)";
                    fairyFill = "rgba(245, 158, 11, 0.16)";
                    fairyCoreFill = "rgba(245, 158, 11, 0.25)";
                    fairySmallCircleFill = "rgba(245, 158, 11, 0.18)";
                    fairyGroupOpacity = 1.0;
                  } else if (hasFairyEquipment) {
                    fairyStroke = "rgba(245, 158, 11, 0.6)";
                    fairyFill = "rgba(245, 158, 11, 0.1)";
                    fairyCoreFill = "rgba(245, 158, 11, 0.18)";
                    fairySmallCircleFill = "rgba(245, 158, 11, 0.12)";
                    fairyGroupOpacity = 0.8;
                  }

                  return (
                    <g 
                      id="fairy-companion"
                      opacity={fairyGroupOpacity}
                      className="transition-all duration-200 cursor-pointer pointer-events-auto"
                      style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => setHoveredSilhouetteSection('sprite')}
                      onMouseLeave={() => setHoveredSilhouetteSection(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextVal = selectedSilhouetteSection === 'sprite' ? null : 'sprite';
                        setSelectedSilhouetteSection(nextVal);
                        playTactileSound(950, 'sine', 0.08);

                        if (nextVal) {
                          addCombatLog(`[Target System]: Fairy Companion aura locked & structural link established.`);
                        } else {
                          addCombatLog(`[Target System]: Structural link to Fairy Companion released.`);
                        }
                      }}
                    >
                      <path 
                        d="M 103,374 C 85,340 60,305 45,275 C 35,255 42,245 52,258 C 72,285 92,335 101,371 Z" 
                        stroke={fairyStroke} 
                        strokeWidth="2.5" 
                        fill={fairyFill} 
                      />
                      <path 
                        d="M 127,374 C 145,355 170,340 188,330 C 196,325 198,332 186,340 C 168,355 145,372 129,372 Z" 
                        stroke={fairyStroke} 
                        strokeWidth="2.5" 
                        fill={fairyFill} 
                      />
                      <path 
                        d="M 102,392 C 90,397 80,402 74,402 C 68,402 70,410 76,412 C 86,415 95,410 102,402 Z" 
                        stroke={fairyStroke} 
                        strokeWidth="2.5" 
                        fill={fairyFill} 
                      />
                      <path 
                        d="M 126,394 C 134,401 140,406 146,410 C 150,412 148,416 143,415 C 135,413 128,406 124,402 Z" 
                        stroke={fairyStroke} 
                        strokeWidth="2.5" 
                        fill={fairyFill} 
                      />
                      <circle cx="115" cy="385" r="18" stroke={fairyStroke} strokeWidth="2.5" fill={fairyCoreFill} />
                      <circle cx="95" cy="420" r="7" stroke={fairyStroke} strokeWidth="2" fill={fairySmallCircleFill} />
                      <circle cx="112" cy="433" r="5" stroke={fairyStroke} strokeWidth="2" fill={fairySmallCircleFill} />
                      <circle cx="126" cy="428" r="4" stroke={fairyStroke} strokeWidth="2" fill={fairySmallCircleFill} />
                      <circle cx="118" cy="442" r="3" stroke={fairyStroke} strokeWidth="1.5" fill={fairySmallCircleFill} />
                      <circle cx="85" cy="428" r="5" stroke={fairyStroke} strokeWidth="2" fill={fairySmallCircleFill} />
                      <circle cx="80" cy="442" r="4" stroke={fairyStroke} strokeWidth="1.5" fill={fairySmallCircleFill} />
                      <circle cx="92" cy="452" r="6" stroke={fairyStroke} strokeWidth="2" fill={fairySmallCircleFill} />
                      <circle cx="84" cy="462" r="5" stroke={fairyStroke} strokeWidth="1.5" fill={fairySmallCircleFill} />
                    </g>
                  );
                })()}

                {/* Dynamic and Interactive Backpack */}
                {(() => {
                  const isBagHovered = hoveredSilhouetteSection === 'backpack';
                  const isBagSelected = selectedSilhouetteSection === 'backpack';
                  const hasBagEquipment = equippedGear['backpack'] && equippedGear['backpack'].length > 0;

                  let bagStroke = "white";
                  let bagFill = "none";
                  let bagPocketFill = "none";
                  let bagGroupOpacity = 0.14;

                  if (isBagSelected) {
                    bagStroke = "#f59e0b";
                    bagFill = "rgba(245, 158, 11, 0.35)";
                    bagPocketFill = "rgba(245, 158, 11, 0.45)";
                    bagGroupOpacity = 1.0;
                  } else if (isBagHovered) {
                    bagStroke = "rgba(245, 158, 11, 0.85)";
                    bagFill = "rgba(245, 158, 11, 0.16)";
                    bagPocketFill = "rgba(245, 158, 11, 0.22)";
                    bagGroupOpacity = 1.0;
                  } else if (hasBagEquipment) {
                    bagStroke = "rgba(245, 158, 11, 0.6)";
                    bagFill = "rgba(245, 158, 11, 0.1)";
                    bagPocketFill = "rgba(245, 158, 11, 0.15)";
                    bagGroupOpacity = 0.8;
                  }

                  return (
                    <g 
                      id="backpack"
                      opacity={bagGroupOpacity}
                      className="transition-all duration-200 cursor-pointer pointer-events-auto"
                      style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => setHoveredSilhouetteSection('backpack')}
                      onMouseLeave={() => setHoveredSilhouetteSection(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextVal = selectedSilhouetteSection === 'backpack' ? null : 'backpack';
                        setSelectedSilhouetteSection(nextVal);
                        playTactileSound(330, 'sine', 0.08);

                        if (nextVal) {
                          addCombatLog(`[Target System]: Adventurer's Backpack aura locked & structural link established.`);
                        } else {
                          addCombatLog(`[Target System]: Structural link to Adventurer's Backpack released.`);
                        }
                      }}
                    >
                      <path d="M 339,340 A 14,14 0 0 1 367,340" stroke={bagStroke} strokeWidth="2.5" fill="none" />
                      <rect x="305" y="340" width="96" height="120" rx="17" stroke={bagStroke} strokeWidth="2.5" fill={bagFill} />
                      <rect x="315" y="400" width="76" height="60" rx="7" stroke={bagStroke} strokeWidth="2.5" fill={bagPocketFill} />
                      <path d="M 315,414 L 391,414" stroke={bagStroke} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                      <rect x="297" y="386" width="10" height="50" rx="3" stroke={bagStroke} strokeWidth="2.5" fill={bagFill} />
                      <rect x="399" y="386" width="10" height="50" rx="3" stroke={bagStroke} strokeWidth="2.5" fill={bagFill} />
                    </g>
                  );
                })()}

                {/* Highlightable and Clickable segments clipped exactly to the human shape */}
                <g clipPath="url(#human-shape-clip)">
                  {SILHOUETTE_SECTIONS.filter(sec => sec.id !== 'sprite' && sec.id !== 'backpack').map((sec) => {
                    const isHovered = hoveredSilhouetteSection === sec.id;
                    const isSelected = selectedSilhouetteSection === sec.id;
                    const hasEquipment = equippedGear[sec.id] && equippedGear[sec.id].length > 0;

                    let fill = "transparent";
                    let stroke = "none";
                    let strokeWidth = "0";

                    if (isSelected) {
                      fill = "rgba(245, 158, 11, 0.35)"; // Radiant Amber
                      stroke = "#f59e0b";
                      strokeWidth = "2.5";
                    } else if (isHovered) {
                      fill = "rgba(245, 158, 11, 0.16)"; // Soft glowing aura
                      stroke = "rgba(245, 158, 11, 0.85)";
                      strokeWidth = "2.5";
                    } else if (hasEquipment) {
                      fill = "rgba(245, 158, 11, 0.1)"; // Gentle highlight
                      stroke = "rgba(245, 158, 11, 0.45)";
                      strokeWidth = "1.5";
                    }

                    if (sec.pathD) {
                      return (
                        <path
                          key={sec.id}
                          d={sec.pathD}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          className="transition-all duration-200 cursor-pointer pointer-events-auto"
                          style={{ pointerEvents: 'auto' }}
                          onMouseEnter={() => setHoveredSilhouetteSection(sec.id)}
                          onMouseLeave={() => setHoveredSilhouetteSection(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextVal = selectedSilhouetteSection === sec.id ? null : sec.id;
                            setSelectedSilhouetteSection(nextVal);
                            playTactileSound(sec.soundFreq, 'sine', 0.08);

                            if (nextVal) {
                              addCombatLog(`[Target System]: ${t(sec.logName)} aura locked & structural link established.`);
                            } else {
                              addCombatLog(`[Target System]: Structural link to ${t(sec.logName)} released.`);
                            }
                          }}
                        />
                      );
                    }

                    return (
                      <rect
                        key={sec.id}
                        x={sec.x}
                        y={sec.y}
                        width={sec.width}
                        height={sec.height}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        className="transition-all duration-200 cursor-pointer pointer-events-auto"
                        style={{ pointerEvents: 'auto' }}
                        onMouseEnter={() => setHoveredSilhouetteSection(sec.id)}
                        onMouseLeave={() => setHoveredSilhouetteSection(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextVal = selectedSilhouetteSection === sec.id ? null : sec.id;
                          setSelectedSilhouetteSection(nextVal);
                          playTactileSound(sec.soundFreq, 'sine', 0.08);

                          if (nextVal) {
                            addCombatLog(`[Target System]: ${t(sec.logName)} aura locked & structural link established.`);
                          } else {
                            addCombatLog(`[Target System]: Structural link to ${t(sec.logName)} released.`);
                          }
                        }}
                      />
                    );
                  })}
                </g>

                {/* Highlighted active outline overlays mapped exactly to the active body section */}
                {SILHOUETTE_SECTIONS.filter(sec => sec.id !== 'sprite' && sec.id !== 'backpack').map((sec) => {
                  const isHovered = hoveredSilhouetteSection === sec.id;
                  const isSelected = selectedSilhouetteSection === sec.id;
                  const hasEquipment = equippedGear[sec.id] && equippedGear[sec.id].length > 0;

                  if (!isHovered && !isSelected && !hasEquipment) return null;

                  const strokeColor = isSelected 
                    ? "#f59e0b" 
                    : isHovered 
                      ? "rgba(245, 158, 11, 0.85)" 
                      : "rgba(245, 158, 11, 0.45)";

                  return (
                    <g key={`highlight-outline-${sec.id}`} clipPath={`url(#clip-${sec.id})`}>
                      {/* We draw the original outline elements with the active highlighted color and thickness */}
                      <circle cx="240" cy="62" r="30" stroke={strokeColor} strokeWidth="2.5" fill="none" />
                      <path
                        d="M 168,143 
                           A 29,29 0 0 1 197,114 
                           L 283,114 
                           A 29,29 0 0 1 312,143 
                           L 312,266 
                           A 14,14 0 0 1 283,266 
                           L 283,160 
                           A 10,10 0 0 0 274,170 
                           L 274,446 
                           A 14,14 0 0 1 245,446 
                           L 245,278 
                           A 5,5 0 0 0 235,278 
                           L 235,446 
                           A 14,14 0 0 1 206,446 
                           L 206,170 
                           A 10,10 0 0 0 197,160 
                           L 197,266 
                           A 14,14 0 0 1 168,266 
                           Z"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        fill="none"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Gear Holographic HUD */}
              {(() => {
                const activeSecId = selectedSilhouetteSection || hoveredSilhouetteSection;
                const activeSecObj = SILHOUETTE_SECTIONS.find(s => s.id === activeSecId);
                const currentSecItems = activeSecId ? (equippedGear[activeSecId] || []) : [];

                return (
                  <div className="absolute top-4 left-4 font-mono text-[8px] text-stone-350 flex flex-col gap-1 tracking-wider leading-none select-none bg-stone-950/85 border border-amber-500/25 rounded p-2.5 min-w-[150px] shadow-[0_4px_16px_rgba(0,0,0,0.6)] pointer-events-auto">
                    <div className="flex items-center justify-between text-amber-400 border-b border-amber-500/20 pb-1 mb-1 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" />
                        <span className="tracking-widest uppercase text-[8.5px]">{t("Gear")}</span>
                      </div>
                      {activeSecId && (
                        <span className="text-[6.2px] text-stone-500 uppercase tracking-widest font-black">
                          {t(activeSecObj?.logName || '')}
                        </span>
                      )}
                    </div>

                    {activeSecId ? (
                      currentSecItems.length === 0 ? (
                        <div className="text-stone-500 italic py-1 text-[7.5px]">
                          {t("Nothing equipped.")}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 py-1">
                          {currentSecItems.map((item, idx) => (
                            <div key={item + idx} className="flex items-center justify-between gap-2.5 group text-stone-200">
                              <span className="truncate max-w-[110px] text-amber-200 font-medium">• {t(item)}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedList = [...currentSecItems];
                                  updatedList.splice(idx, 1);
                                  const updated = {
                                    ...equippedGear,
                                    [activeSecId]: updatedList
                                  };
                                  updateEquippedGear(updated);
                                  addCombatLog(`[Equipment]: Unequipped "${t(item)}" from ${t(activeSecObj?.logName || '')}.`);
                                  playTactileSound(400, 'triangle', 0.08);
                                }}
                                className="text-stone-500 hover:text-red-400 font-bold transition-colors cursor-pointer text-[7.5px] leading-none shrink-0 px-0.5"
                                title={t("Unequip")}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-stone-600 italic py-1 text-[7.2px] leading-tight max-w-[125px]">
                        {t("Click on body parts to inspect equipped items")}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Inner Drawer Area */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-stone-950/95 border-t border-amber-500/20 rounded-t-lg flex flex-col shadow-[0_-8px_20px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden text-stone-200 select-text ${isDrawerDragging ? '' : 'transition-all duration-300'}`}
              style={{
                height: `${28 + (drawerRows - 1) * 30}px`,
                maxHeight: 'calc(100% - 42px)',
              }}
            >
              {/* Condensed Drawer drag handle / control row */}
              <div 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="w-full flex items-center justify-between px-3 bg-stone-900 border-b border-white/[0.06] select-none shrink-0 cursor-row-resize h-[28px] gap-2 relative"
              >
                {/* Left side: Icon + Title */}
                <div className="flex items-center gap-1.5 shrink-0 flex-1 min-w-0">
                  <Backpack size={10} className="text-amber-500 animate-pulse shrink-0" />
                  <span className="font-serif text-[9px] font-bold uppercase tracking-wider text-amber-200 shrink-0">
                    {t("Items")}
                  </span>
                </div>

                {/* Center: Tabs in the items drawer */}
                <div className="flex justify-center shrink-0">
                  {drawerRows > 1.2 && (
                    <div className="flex gap-1.5">
                      {([
                        { id: 'all', label: 'All' },
                        { id: 'player', label: 'Player' },
                        { id: 'inventory', label: 'Inventory' },
                        { id: 'familiar', label: 'Familiar' }
                      ] as const).map(tab => (
                        <button
                          key={tab.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveItemsTab(tab.id);
                            playTactileSound(550, 'sine', 0.05);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className={`px-2 py-[2.5px] rounded text-[7.5px] font-mono uppercase transition-all cursor-pointer border ${
                            activeItemsTab === tab.id
                              ? 'bg-amber-500/25 text-amber-200 border-amber-500/30 font-bold shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                              : 'text-stone-400 hover:text-stone-200 border-transparent'
                          }`}
                        >
                          {t(tab.label)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side placeholder to keep center tabs centered */}
                <div className="flex items-center justify-end shrink-0 flex-1 min-w-0" />

                {/* Absolute-positioned Forge Item button right next to collapse/expand */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Close the item menu drawer instantly
                    setActiveSection(null);
                    setDrawerRows(1);
                    safeStorage.setItem('vtt_inventory_drawer_rows', '1');

                    // Simultaneously open item creation window in the forefront
                    setItemToEdit(null);
                    setIsItemCreatorOpen(true);
                    playTactileSound(720, 'sine', 0.08);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="absolute right-7 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-400 transition-all bg-amber-500/10 hover:bg-amber-500/20 h-5 w-5 rounded border border-amber-500/25 cursor-pointer flex items-center justify-center z-10 shadow-[0_0_6px_rgba(245,158,11,0.1)] active:scale-95"
                  title={t("Item Builder")}
                >
                  <Backpack size={12} className="text-amber-500 shrink-0" />
                </button>

                {/* Absolute-positioned collapse/expand button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpandCollapse();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-1.5 rounded border border-white/5 cursor-pointer flex items-center justify-center h-5 w-5 z-10 shadow-sm"
                  title={drawerRows > 1.2 ? t("Collapse completely") : t("Expand to preference")}
                >
                  {drawerRows > 1.2 ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                </button>
              </div>

              {/* Items list - condensed vertically */}
              <div 
                className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800"
              >
                {(() => {
                  interface UniformRow {
                    id: string;
                    identity: {
                      icon?: string;
                      iconElement?: React.ReactNode;
                      name: string;
                      subtitle?: string;
                    };
                    state: string;
                    power: string;
                    perditor: string;
                    virtus: string;
                    cost: string;
                    nature: string;
                    effect: string;
                    focus: string;
                    terminus: string;
                    equipAction?: {
                      label: string;
                      onClick: () => void;
                    } | null;
                    equip: {
                      label: string;
                      disabled?: boolean;
                      variant: 'primary' | 'danger' | 'secondary';
                      onClick: () => void;
                    } | null;
                    rarity: string;
                    isSelected?: boolean;
                    onRowClick?: () => void;
                  }

                  const playerSlots = SILHOUETTE_SECTIONS.filter(sec => sec.id !== 'sprite');
                  
                  // 1. Map Player Tab Rows
                  const playerRows: UniformRow[] = playerSlots.map((slot) => {
                    const isSelected = selectedSilhouetteSection === slot.id;
                    const slotItems = equippedGear[slot.id] || [];
                    const hasItem = slotItems.length > 0;
                    const itemName = hasItem ? slotItems[0] : '';

                    const emoji = slot.id === 'head' ? '👑' :
                                  slot.id === 'neckline' ? '📿' :
                                  slot.id === 'torso' ? '👕' :
                                  slot.id === 'l_wrist' || slot.id === 'r_wrist' ? '⌚' :
                                  slot.id === 'l_hand' || slot.id === 'r_hand' ? '⚔️' :
                                  slot.id === 'belt' ? '🎗️' :
                                  slot.id === 'pants' ? '👖' :
                                  slot.id === 'l_ankle' || slot.id === 'r_ankle' ? '🧦' :
                                  slot.id === 'l_foot' || slot.id === 'r_foot' ? '🥾' :
                                  slot.id === 'backpack' ? '🎒' : '📦';

                    let power = '—';
                    let perditor = '—';
                    let virtus = '—';
                    let cost = '—';
                    let nature = 'NONE';
                    let effect = '—';
                    let focus = '—';
                    let terminus = '—';
                    let rarity = 'Common';

                    if (hasItem) {
                      if (itemName.includes('Circlet') || itemName.includes('Stars')) {
                        power = '+3 MAG'; perditor = '+0'; virtus = '+4 WIS'; cost = 'PASSIVE'; nature = 'SPIRIT'; effect = t("Bestow"); focus = 'Self'; terminus = 'PERM'; rarity = 'Rare';
                      } else if (itemName.includes('Pendant')) {
                        power = '+1 DEF'; perditor = '+1'; virtus = '+3 CHA'; cost = '2 MP'; nature = 'SPIRIT'; effect = t("Ward"); focus = 'None'; terminus = '1 MIN'; rarity = 'Epic';
                      } else if (itemName.includes('Cloak') || itemName.includes('Phasing')) {
                        power = '+2 DEF'; perditor = '+0'; virtus = '+2 DEX'; cost = 'PASSIVE'; nature = 'PHYSICAL'; effect = t("Ward"); focus = 'None'; terminus = 'PASS'; rarity = 'Uncommon';
                      } else if (itemName.includes('Bracer') || itemName.includes('Chronos')) {
                        power = '+1 ATK'; perditor = '+2'; virtus = '+1 DEX'; cost = 'PASSIVE'; nature = 'PHYSICAL'; effect = t("Bestow"); focus = 'None'; terminus = 'PERM'; rarity = 'Legendary';
                      } else if (itemName.includes('Blade') || itemName.includes('Starseeker')) {
                        power = '1d10+4'; perditor = '+3'; virtus = '+0'; cost = 'None'; nature = 'PHYSICAL'; effect = t("Bane"); focus = 'None'; terminus = 'INST'; rarity = 'Rare';
                      } else if (itemName.includes('Bow')) {
                        power = '1d8+5'; perditor = '+2'; virtus = '+1'; cost = 'None'; nature = 'PHYSICAL'; effect = t("Bane"); focus = 'None'; terminus = 'INST'; rarity = 'Rare';
                      } else if (itemName.includes('Compass')) {
                        power = '—'; perditor = '—'; virtus = '+2 WIS'; cost = 'PASSIVE'; nature = 'SPIRIT'; effect = t("Reveal"); focus = 'None'; terminus = 'PASS'; rarity = 'Legendary';
                      } else if (itemName.includes('Anklet') || itemName.includes('Aether')) {
                        power = '+2 DEX'; perditor = '+0'; virtus = '+1 AGI'; cost = 'PASSIVE'; nature = 'SPIRIT'; effect = t("Transform"); focus = 'Self'; terminus = 'PERM'; rarity = 'Rare';
                      } else {
                        power = '+1'; perditor = '+0'; virtus = '+1'; cost = 'PASSIVE'; nature = 'SPIRIT'; effect = t("Bestow"); focus = 'None'; terminus = 'PASS'; rarity = 'Uncommon';
                      }
                    }

                    return {
                      id: `slot-${slot.id}`,
                      identity: {
                        icon: emoji,
                        name: t(slot.logName),
                        subtitle: hasItem ? itemName : t("Empty Slot")
                      },
                      state: hasItem ? 'EQUIPPED' : 'EMPTY',
                      power,
                      perditor,
                      virtus,
                      cost,
                      nature,
                      effect,
                      focus,
                      terminus,
                      rarity,
                      isSelected,
                      onRowClick: () => {
                        setSelectedSilhouetteSection(slot.id);
                        playTactileSound(slot.soundFreq, 'sine', 0.08);
                      },
                      equip: hasItem ? {
                        label: t("Clear"),
                        variant: 'danger',
                        onClick: () => {
                          updateEquippedGear({ ...equippedGear, [slot.id]: [] });
                          addCombatLog(`[Equipment]: Cleared gear in ${t(slot.logName)} slot.`);
                          playTactileSound(400, 'triangle', 0.08);
                        }
                      } : null
                    };
                  });

                  // 2. Map Familiar Tab Rows
                  const spriteItems = equippedGear['sprite'] || [];
                  const isFamiliarSelected = selectedSilhouetteSection === 'sprite';
                  const familiarRows: UniformRow[] = [];

                  // Familiar base row
                  familiarRows.push({
                    id: 'fam-companion',
                    identity: {
                      icon: '🧚',
                      name: t("Fairy Companion"),
                      subtitle: t("Spiritual Familiar")
                    },
                    state: isFamiliarSelected ? 'SELECTED' : 'ACTIVE',
                    power: '+2 HEAL',
                    perditor: '+0',
                    virtus: '+4 SPI',
                    cost: 'None',
                    nature: 'SPIR',
                    effect: t("Bestow"),
                    focus: 'Self',
                    terminus: 'PERM',
                    rarity: 'Legendary',
                    isSelected: isFamiliarSelected,
                    onRowClick: () => {
                      setSelectedSilhouetteSection('sprite');
                      playTactileSound(950, 'sine', 0.08);
                    },
                    equip: {
                      label: t("Target"),
                      variant: 'secondary',
                      onClick: () => {
                        setSelectedSilhouetteSection('sprite');
                        playTactileSound(950, 'sine', 0.08);
                      }
                    }
                  });

                  // Attached items
                  spriteItems.forEach((sprItem, idx) => {
                    familiarRows.push({
                      id: `fam-attach-${idx}`,
                      identity: {
                        icon: '✨',
                        name: sprItem,
                        subtitle: t("Familiar Attachment")
                      },
                      state: 'EQUIPPED',
                      power: '+1 SPI',
                      perditor: '+0',
                      virtus: '+1',
                      cost: 'PASSIVE',
                      nature: 'SPIRIT',
                      effect: t("Bestow"),
                      focus: 'None',
                      terminus: 'PERM',
                      rarity: 'Rare',
                      equip: {
                        label: t("Unequip"),
                        variant: 'danger',
                        onClick: () => {
                          const updated = [...spriteItems];
                          updated.splice(idx, 1);
                          updateEquippedGear({ ...equippedGear, sprite: updated });
                          addCombatLog(`[Equipment]: Unequipped "${t(sprItem)}" from Familiar.`);
                          playTactileSound(400, 'triangle', 0.08);
                        }
                      }
                    });
                  });

                  // Actions
                  familiarRows.push({
                    id: 'fam-celestial-glow',
                    identity: {
                      icon: '🔮',
                      name: t("Celestial Glow"),
                      subtitle: t("Summon action")
                    },
                    state: 'READY',
                    power: '30ft Light',
                    perditor: '+0',
                    virtus: '+1',
                    cost: '1 SP',
                    nature: 'MAGIC',
                    effect: t("Restore"),
                    focus: 'Conc',
                    terminus: '10 MIN',
                    rarity: 'Rare',
                    equip: {
                      label: t("Cast"),
                      variant: 'primary',
                      onClick: () => {
                        addCombatLog("[Familiar]: Celestial Glow cast! Lit up surrounding 30ft.");
                        playTactileSound(1100, 'sine', 0.12);
                      }
                    }
                  });

                  familiarRows.push({
                    id: 'fam-spark-spray',
                    identity: {
                      icon: '✨',
                      name: t("Spark Spray"),
                      subtitle: t("Projected action")
                    },
                    state: 'READY',
                    power: '1d4 Dazzle',
                    perditor: '+1',
                    virtus: '+0',
                    cost: '0 SP',
                    nature: 'LIGHT',
                    effect: t("Suppress"),
                    focus: 'None',
                    terminus: 'INST',
                    rarity: 'Uncommon',
                    equip: {
                      label: t("Cast"),
                      variant: 'primary',
                      onClick: () => {
                        addCombatLog("[Familiar]: Spark Spray projected! Targets dazzled.");
                        playTactileSound(950, 'sine', 0.1);
                      }
                    }
                  });

                  // 3. Map Inventory Tab Rows
                  const standardInventoryItemsList = [
                    {
                      id: 'heal_potion',
                      name: 'Heal Potion',
                      category: 'utility',
                      rarity: 'Common',
                      effect: 'Restore',
                      quantity: healingPotions,
                      icon: '🧪',
                      description: 'Standard healing brew. Restores 10 HP instantly.',
                      isCustom: false,
                      onUse: () => {
                        if (healingPotions > 0) {
                          setHealingPotions(prev => prev - 1);
                          window.dispatchEvent(new CustomEvent('vtt-hp-adjust', { detail: { amount: 10 } }));
                          addCombatLog('[Inventory]: Consumed Health Potion. Restored 10 HP.');
                          playTactileSound(650, 'sine', 0.1);
                        }
                      }
                    },
                    {
                      id: 'elixir_star',
                      name: 'Elixir Star',
                      category: 'utility',
                      rarity: 'Rare',
                      effect: 'Restore',
                      quantity: elixirLife,
                      icon: '🌟',
                      description: 'Celestial elixir derived from deep stardust particles. Heals 25 HP.',
                      isCustom: false,
                      onUse: () => {
                        if (elixirLife > 0) {
                          setElixirLife(prev => prev - 1);
                          window.dispatchEvent(new CustomEvent('vtt-hp-adjust', { detail: { amount: 25 } }));
                          addCombatLog('[Inventory]: Drank Elixir of Stars. Max healing +25 HP.');
                          playTactileSound(700, 'sine', 0.12);
                        }
                      }
                    },
                    {
                      id: 'star_dust',
                      name: 'Star Dust',
                      category: 'utility',
                      rarity: 'Uncommon',
                      effect: 'Ward',
                      quantity: starDust,
                      icon: '✨',
                      description: 'Phosphorescent dust that provides a temporary 8 HP shield barrier.',
                      isCustom: false,
                      onUse: () => {
                        if (starDust > 0) {
                          setStarDust(prev => prev - 1);
                          window.dispatchEvent(new CustomEvent('vtt-hp-adjust-temp', { detail: { amount: 8 } }));
                          addCombatLog('[Inventory]: Scattered Star Dust. +8 Temp Shield.');
                          playTactileSound(600, 'sine', 0.1);
                        }
                      }
                    },
                    {
                      id: 'blade',
                      name: 'Starseeker Blade',
                      category: 'weapons',
                      rarity: 'Rare',
                      effect: 'Bane',
                      quantity: 1,
                      iconElement: <Sword className="rotate-90 text-amber-500" size={8} />,
                      description: 'Serrated space steel broadsword. Deals 1d10+4 slashing damage.',
                      isCustom: false,
                      onUse: () => {
                        rollFormula('Starseeker Blade Slash', 1, 10, 4);
                      }
                    },
                    {
                      id: 'bow',
                      name: 'Cosmic Arch-Bow',
                      category: 'weapons',
                      rarity: 'Rare',
                      effect: 'Bane',
                      quantity: 1,
                      iconElement: <Feather className="text-orange-500" size={8} />,
                      description: 'Ethereal bows focused with radiant energy. Deals 1d8+5 radiant damage.',
                      isCustom: false,
                      onUse: () => {
                        rollFormula('Cosmic Bow Fire', 1, 8, 5);
                      }
                    },
                    {
                      id: 'cloak',
                      name: 'Phasing Cloak',
                      category: 'gear',
                      rarity: 'Uncommon',
                      effect: 'Ward',
                      quantity: 1,
                      iconElement: <ShieldAlert className="text-violet-500" size={8} />,
                      description: 'Woven from nebula threads. Phases user under direct missile fire.',
                      isCustom: false,
                      onUse: () => {
                        addCombatLog('[Inventory]: Activated Phasing Cloak. +2 Defense.');
                        playTactileSound(550, 'triangle', 0.08);
                      }
                    },
                    {
                      id: 'compass',
                      name: 'Astral Compass',
                      category: 'gear',
                      rarity: 'Legendary',
                      effect: 'Reveal',
                      quantity: 1,
                      iconElement: <Compass className="text-purple-500" size={8} />,
                      description: 'Mystical navigation dial that maps celestial anomalies instantly.',
                      isCustom: false,
                      onUse: () => {
                        addCombatLog('[Inventory]: Consulting Astral Compass. Sector scanned.');
                        playTactileSound(800, 'triangle', 0.15);
                      }
                    }
                  ];

                  const customInventoryItemsList = customItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    rarity: item.rarity,
                    effect: item.effect,
                    quantity: item.quantity || 1,
                    icon: item.icon,
                    description: item.description,
                    isCustom: true,
                    customData: item,
                    onUse: () => {
                      const pow = item.power || '';
                      if (pow.includes('d')) {
                        const rx = /(\d+)d(\d+)([+-]\d+)?/i;
                        const m = pow.match(rx);
                        if (m) {
                          rollFormula(`${item.name} (${t("Use")})`, parseInt(m[1]) || 1, parseInt(m[2]) || 6, m[3] ? parseInt(m[3]) : 0);
                        } else {
                          rollFormula(`${item.name} (${t("Use")})`, 1, 20, 0);
                        }
                      } else {
                        addCombatLog(`[Combat]: Triggered custom action for ${item.name}! Power: ${item.power}`);
                        playTactileSound(850, 'sine', 0.1);
                      }
                    }
                  }));

                  const inventoryItemsList = [
                    ...standardInventoryItemsList,
                    ...customInventoryItemsList
                  ];

                  const inventoryRows: UniformRow[] = inventoryItemsList.map((item) => {
                    let power = '—';
                    let perditor = '—';
                    let virtus = '—';
                    let cost = '—';
                    let nature = 'NONE';
                    let focus = '—';
                    let terminus = '—';

                    if (item.isCustom && item.customData) {
                      const cd = item.customData;
                      power = cd.power;
                      perditor = cd.perditor;
                      virtus = cd.virtus;
                      cost = cd.cost;
                      nature = cd.nature;
                      focus = cd.focus;
                      terminus = cd.terminus;
                    } else if (item.id === 'heal_potion') {
                      power = '+10 HP'; perditor = '+0'; virtus = '+0'; cost = '1 Pot'; nature = 'HEAL'; focus = 'None'; terminus = 'INST';
                    } else if (item.id === 'elixir_star') {
                      power = '+25 HP'; perditor = '+0'; virtus = '+2'; cost = '1 Elix'; nature = 'HEAL'; focus = 'None'; terminus = 'INST';
                    } else if (item.id === 'star_dust') {
                      power = '+8 Temp'; perditor = '+0'; virtus = '+0'; cost = '1 Dust'; nature = 'SHIELD'; focus = 'None'; terminus = 'INST';
                    } else if (item.id === 'blade') {
                      power = '1d10+4'; perditor = '+3'; virtus = '+0'; cost = 'None'; nature = 'PHYS'; focus = 'None'; terminus = 'INST';
                    } else if (item.id === 'bow') {
                      power = '1d8+5'; perditor = '+2'; virtus = '+1'; cost = 'None'; nature = 'PHYS'; focus = 'None'; terminus = 'INST';
                    } else if (item.id === 'cloak') {
                      power = '+2 DEF'; perditor = '+0'; virtus = '+2'; cost = 'PASSIVE'; nature = 'PHYS'; focus = 'None'; terminus = 'PASS';
                    } else if (item.id === 'compass') {
                      power = '—'; perditor = '—'; virtus = '+2 WIS'; cost = 'PASSIVE'; nature = 'SPIR'; focus = 'None'; terminus = 'PASS';
                    }

                    return {
                      id: `inv-${item.id}`,
                      identity: {
                        icon: item.icon,
                        iconElement: item.iconElement,
                        name: t(item.name),
                        subtitle: t(item.description)
                      },
                      state: item.quantity > 1 ? `x${item.quantity}` : (item.quantity === 1 ? 'READY' : 'EMPTY'),
                      power,
                      perditor,
                      virtus,
                      cost,
                      nature,
                      effect: t(item.effect),
                      focus,
                      terminus,
                      rarity: item.rarity,
                      editAction: (item.isCustom && item.customData) ? {
                        onClick: () => {
                          setActiveSection(null);
                          setItemToEdit(item.customData);
                          setIsItemCreatorOpen(true);
                          playTactileSound(610, 'sine', 0.08);
                        }
                      } : null,
                      deleteAction: (item.isCustom && item.customData) ? {
                        onClick: () => {
                          if (confirm(`${t("Are you sure you want to discard")} ${item.name}?`)) {
                            setCustomItems(prev => prev.filter(c => c.id !== item.id));
                            addCombatLog(`[Forge]: Discarded custom record ${item.name}.`);
                            playTactileSound(350, 'triangle', 0.15);
                          }
                        }
                      } : null,
                      equipAction: selectedSilhouetteSection ? {
                        label: t("Equip"),
                        onClick: () => {
                          const currentSlot = selectedSilhouetteSection;
                          const slotList = equippedGear[currentSlot] || [];
                          if (!slotList.includes(item.name)) {
                            const updated = {
                              ...equippedGear,
                              [currentSlot]: [...slotList, item.name]
                            };
                            updateEquippedGear(updated);
                            addCombatLog(`[Equipment]: Equipped "${t(item.name)}" to ${t(SILHOUETTE_SECTIONS.find(s => s.id === currentSlot)?.logName || '')}.`);
                            playTactileSound(600, 'triangle', 0.1);
                          } else {
                            addCombatLog(`[Equipment]: "${t(item.name)}" is already equipped in ${t(SILHOUETTE_SECTIONS.find(s => s.id === currentSlot)?.logName || '')}.`);
                          }
                        }
                      } : null,
                      equip: {
                        label: item.category === 'weapons' ? t("Roll") : t("Use"),
                        disabled: item.category === 'utility' && item.quantity === 0,
                        variant: item.category === 'weapons' ? 'primary' : 'secondary',
                        onClick: () => {
                          item.onUse();
                        }
                      }
                    };
                  });

                  // 4. Select Target Rows by Tab
                  let activeRows: UniformRow[] = [];
                  if (activeItemsTab === 'all') {
                    activeRows = [...playerRows, ...inventoryRows, ...familiarRows];
                  } else if (activeItemsTab === 'player') {
                    activeRows = playerRows;
                  } else if (activeItemsTab === 'familiar') {
                    activeRows = familiarRows;
                  } else {
                    activeRows = inventoryRows;
                  }

                  // 5. Drawer Padding empty slots - keep it perfectly consistent and high-tech
                  const targetSlots = Math.round(drawerRows) > 1.2 ? Math.max(3, Math.round(drawerRows) * 4) : 0;
                  const finalRows = [...activeRows];
                  const padDiff = targetSlots - finalRows.length;
                  for (let i = 0; i < padDiff; i++) {
                    finalRows.push({
                      id: `empty-row-${i}`,
                      isEmpty: true
                    } as any);
                  }

                  return (
                    <div className="flex flex-col h-full">
                      {selectedSilhouetteSection && activeItemsTab !== 'familiar' && (
                        <div className="bg-amber-950/20 px-3 py-1 border-b border-amber-500/10 text-amber-200 text-[6.5px] uppercase tracking-wider font-bold flex items-center justify-between shrink-0">
                          <span>🎯 {t("Selected Target Slot:")} <span className="text-amber-450 font-extrabold">{t(SILHOUETTE_SECTIONS.find(s => s.id === selectedSilhouetteSection)?.logName || '')}</span></span>
                          <span className="text-[5.8px] text-stone-500 font-mono normal-case italic">{t("Click Equip next to any item in Inventory")}</span>
                        </div>
                      )}

                      <div className="w-full flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-800">
                        <table className="w-max text-[7.2px] font-mono border-collapse select-none text-left table-auto">
                          <thead>
                            <tr className="bg-stone-900 border-b border-white/[0.04] text-stone-500 text-[6.2px] uppercase tracking-wider font-bold h-[20px] leading-tight select-none">
                              <th className="py-0.5 px-1 font-extrabold text-left whitespace-nowrap">{t("Identity")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("State")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Power")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Perditor")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Virtus")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Cost")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Nature")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-left whitespace-nowrap">{t("Effect")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Focus")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Terminus")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-center whitespace-nowrap">{t("Equip")}</th>
                              <th className="py-0.5 px-1 font-extrabold text-right whitespace-nowrap">{t("Rarity")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {finalRows.map((row: any, idx) => {
                              if (row.isEmpty) {
                                  return (
                                    <tr 
                                      key={`inv-empty-${row.id || 'r'}-${idx}`} 
                                      className="border-b border-white/[0.015] h-[20px] opacity-[0.15] select-none pointer-events-none"
                                    >
                                      <td className="py-0.5 px-1 truncate text-[6.5px] font-mono text-stone-600 uppercase tracking-widest" colSpan={12}>
                                        — {String(idx + 1).padStart(2, '0')} {t("EMPTY MATRIX BUFFER CELL")}
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr 
                                    key={`inv-row-${row.id || 'r'}-${idx}`}
                                    onClick={() => row.onRowClick && row.onRowClick()}
                                    className={`border-b border-white/[0.015] hover:bg-white/[0.015] transition-all h-[20px] leading-none ${row.isSelected ? 'bg-amber-500/[0.04] border-l-2 border-l-amber-500' : 'border-l-2 border-l-transparent'}`}
                                  >
                                    {/* Identity */}
                                    <td className="py-0.5 px-1 font-bold select-text text-stone-200" style={{ maxWidth: '140px' }}>
                                      <div className="flex items-center gap-1 truncate w-full">
                                        {row.identity.iconElement || <span className="shrink-0">{row.identity.icon}</span>}
                                        <span className="truncate">{row.identity.name}</span>
                                      </div>
                                    </td>

                                    {/* State */}
                                    <td className={`py-0.5 px-1 text-center font-bold font-mono text-[7px] whitespace-nowrap ${
                                      row.state === 'EMPTY' ? 'text-stone-650' : 
                                      row.state === 'READY' || row.state === 'ACTIVE' ? 'text-green-450' : 'text-stone-300'
                                    }`}>
                                      {row.state}
                                    </td>

                                    {/* Power */}
                                    <td className="py-0.5 px-1 text-center font-black text-amber-400 font-mono whitespace-nowrap">
                                      {row.power}
                                    </td>

                                    {/* Perditor */}
                                    <td className="py-0.5 px-1 text-center font-bold text-rose-455 font-mono whitespace-nowrap">
                                      {row.perditor}
                                    </td>

                                    {/* Virtus */}
                                    <td className="py-0.5 px-1 text-center font-bold text-emerald-400 font-mono whitespace-nowrap">
                                      {row.virtus}
                                    </td>

                                    {/* Cost */}
                                    <td className="py-0.5 px-1 text-center font-bold text-cyan-405 font-mono whitespace-nowrap">
                                      {row.cost}
                                    </td>

                                    {/* Nature */}
                                    <td className="py-0.5 px-1 text-center text-purple-400/90 font-extrabold uppercase font-mono tracking-tighter whitespace-nowrap">
                                      {row.nature}
                                    </td>

                                    {/* Effect */}
                                    <td className="py-0.5 px-1 text-left text-stone-400 italic font-sans text-[7.2px] whitespace-nowrap" title={row.effect}>
                                      {row.effect}
                                    </td>

                                    {/* Focus */}
                                    <td className="py-0.5 px-1 text-center font-bold text-amber-500/80 font-mono whitespace-nowrap">
                                      {row.focus}
                                    </td>

                                    {/* Terminus */}
                                    <td className="py-0.5 px-1 text-center font-black text-stone-450 uppercase font-mono tracking-tighter text-[6.5px] whitespace-nowrap">
                                      {row.terminus}
                                    </td>

                                    {/* Equip */}
                                    <td className="py-0.5 px-1 text-center font-mono whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-1">
                                        {row.editAction && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              row.editAction.onClick();
                                            }}
                                            className="px-1 py-0.5 text-[6.2px] font-mono uppercase bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-400/20 rounded font-black cursor-pointer leading-none transition-all active:scale-95"
                                            title={t("Edit")}
                                          >
                                            {t("Edit")}
                                          </button>
                                        )}
                                        {row.deleteAction && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              row.deleteAction.onClick();
                                            }}
                                            className="px-1 py-0.5 text-[6.2px] font-mono uppercase bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20 rounded font-black cursor-pointer leading-none transition-all active:scale-95"
                                            title={t("Trash")}
                                          >
                                            {t("Trash")}
                                          </button>
                                        )}
                                        {row.equipAction && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              row.equipAction.onClick();
                                            }}
                                            className="px-1 py-0.5 text-[6.2px] font-mono uppercase bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/20 rounded font-black cursor-pointer leading-none transition-all active:scale-95 whitespace-nowrap"
                                          >
                                            {row.equipAction.label}
                                          </button>
                                        )}
                                        {row.equip ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              row.equip.onClick();
                                            }}
                                            disabled={row.equip.disabled}
                                            className={`px-1 py-0.5 text-[6.2px] font-mono uppercase font-black rounded border transition-all active:scale-95 leading-none cursor-pointer whitespace-nowrap ${
                                              row.equip.disabled
                                                ? 'bg-stone-950 text-stone-600 border-white/5 cursor-not-allowed'
                                                : row.equip.variant === 'primary'
                                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 border-amber-400/20 shadow hover:from-amber-500 hover:to-amber-400'
                                                : row.equip.variant === 'danger'
                                                ? 'bg-red-950/40 text-red-400 hover:bg-red-900/30 border-red-500/10'
                                                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-white/10'
                                            }`}
                                          >
                                            {row.equip.label}
                                          </button>
                                        ) : (
                                          (!row.equipAction && !row.editAction && !row.deleteAction) && <span className="text-stone-700">—</span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Rarity */}
                                    <td className="py-0.5 px-1 text-right font-black font-mono whitespace-nowrap">
                                      <span className={`px-0.5 rounded text-[5.8px] tracking-wider uppercase font-extrabold whitespace-nowrap ${
                                        row.rarity === 'Legendary' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/25' :
                                        row.rarity === 'Epic' ? 'bg-purple-500/25 text-purple-350 border border-purple-500/25' :
                                        row.rarity === 'Rare' ? 'bg-sky-500/25 text-sky-350 border border-sky-500/25' :
                                        row.rarity === 'Uncommon' ? 'bg-green-500/25 text-green-350 border border-green-500/25' :
                                        'bg-stone-950 text-stone-500 border border-white/5'
                                      }`}>
                                        {row.rarity}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        );

      case 'magic':
        return (
          <div className="flex flex-col gap-1.5 select-none">
            {/* Magic Level & Cosmic XP Meter Card - condensed padding and spacing */}
            <div className="p-1 px-1.5 rounded bg-gradient-to-br from-stone-900 to-purple-950/15 border border-violet-500/15 shadow-sm flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-serif font-bold text-stone-200 leading-none">
                <button 
                  onClick={handleEnergyDiceRoll}
                  className="flex items-center gap-1 text-stone-200 hover:text-violet-300 transition-colors cursor-pointer outline-none border border-transparent hover:border-violet-500/20 hover:bg-violet-500/5 rounded px-0.5"
                  title="Roll designated Energy [Dice]"
                >
                  <Sparkles size={9} className="text-violet-400 animate-pulse" />
                  <span className="uppercase tracking-widest text-[8.5px]">{t("Magic Level:")}</span>
                </button>
                <span className="text-[#e237f5] text-[10.5px] font-mono font-black tracking-wide drop-shadow-[0_0_6px_rgba(226,55,245,0.4)]">
                  {t("LEVEL")} {magicLevel}
                </span>
              </div>
              
              {/* Cosmic pinkish-purple progress bar - reduced thickness */}
              <div className="flex flex-col gap-0.5 font-mono leading-none">
                <div className="w-full h-1 rounded-full bg-stone-950 p-[0.5px] border border-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500 shadow-[0_0_6px_rgba(217,70,239,0.5)]"
                    style={{ width: `${Math.min(100, (magicXP / xpRequired) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[7px] font-bold text-stone-400">
                  <span className="text-violet-300">XP: {magicXP}</span>
                  <span className="text-pink-300">{t("Next:")} {xpRequired} XP</span>
                </div>
              </div>
            </div>

            {/* List of spells with Create Spell button - very tiny */}
            <div className="flex items-center justify-between py-0.5 shrink-0">
              <span className="text-[8px] font-mono text-stone-400 uppercase tracking-wider">{t("Spellbook Actions:")}</span>
              <button 
                onClick={() => {
                  setIsSpellBuilderOpen(true);
                  setActiveSection(null);
                  playTactileSound(600, 'triangle', 0.1);
                }}
                className="py-0.5 px-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono uppercase tracking-wider text-[7.5px] font-bold rounded flex items-center gap-0.5 transition-all cursor-pointer shadow border border-violet-400/25 active:scale-95 spell-builder-trigger"
              >
                <Sparkles size={8} className="text-amber-400 animate-pulse" />
                {t("Create")}
              </button>
            </div>
            
            {/* Minimalist Tabs - Slash separated, inline and absolutely minimal */}
            <div className="flex gap-2.5 justify-center items-center py-0.5 border-b border-white/5 mb-1 shrink-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'combat', label: 'Combat' },
                { id: 'auxiliary', label: 'Auxiliary' },
                { id: 'transformative', label: 'Transformative' }
              ].map((tab, idx) => {
                const isActive = activeMagicTab === tab.id;
                return (
                  <React.Fragment key={tab.id}>
                    {idx > 0 && <span className="text-stone-700 text-[8px] font-mono select-none">/</span>}
                    <button
                      onClick={() => {
                        setActiveMagicTab(tab.id as any);
                        playTactileSound(500, 'sine', 0.05);
                      }}
                      className={`text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer py-0.5 ${
                        isActive 
                          ? 'text-violet-350 border-b border-violet-500/40 pb-0.5' 
                          : 'text-stone-500 hover:text-stone-300 border-b border-transparent pb-0.5'
                      }`}
                    >
                      {t(tab.label)}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Custom Forged Spells List */}
            <div className="flex flex-col gap-1 overflow-y-auto pr-0.5" style={{ maxHeight: '220px' }}>
              {(() => {
                const filteredSpells = customSpells.filter(spell => {
                  if (activeMagicTab === 'all') return true;
                  return spell.category === activeMagicTab;
                });

                if (filteredSpells.length === 0) {
                  return (
                    <div className="p-2 rounded bg-stone-900/40 border border-white/5 flex flex-col items-center justify-center text-center gap-0.5">
                      <span className="text-[9px] font-serif font-bold text-stone-400">
                        {activeMagicTab === 'all' 
                          ? t('No forged spells yet') 
                          : activeMagicTab === 'combat' 
                            ? t('No combat spells') 
                            : activeMagicTab === 'auxiliary' 
                              ? t('No auxiliary spells') 
                              : t('No transformative spells')}
                      </span>
                      <span className="text-[7.5px] text-stone-500 italic max-w-[200px]">
                        {activeMagicTab === 'all' 
                          ? t('Create custom spell using Create button.') 
                          : t('No forged spells inside this category.')}
                      </span>
                    </div>
                  );
                }

                return filteredSpells.map((spell, sIdx) => (
                  <div key={`filtered-spell-${spell.id}-${sIdx}`} className="p-1 rounded bg-stone-900 border border-violet-500/10 flex flex-col gap-0.5 shadow-sm hover:border-violet-500/25 transition-all text-[8.5px]">
                    <div className="flex items-center justify-between gap-1">
                      {/* Spell Name & Cost label */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <Sparkle size={8} className="text-violet-400 animate-pulse shrink-0" />
                          <span className="font-serif font-bold text-stone-200 truncate leading-none" title={t(spell.name)}>{t(spell.name)}</span>
                          <span className="text-[7px] font-mono whitespace-nowrap bg-violet-950/45 border border-violet-500/15 px-0.5 py-0.5 rounded leading-none shrink-0 inline-flex items-center">
                            <span className="text-violet-400">{spell.cost.toLocaleString()}</span>
                            <span className="text-white brightness-[3] grayscale contrast-[2] select-none inline-block filter ml-0.5" style={{ filter: 'grayscale(100%) brightness(300%)' }}>✨</span>
                          </span>
                        </div>
                      </div>

                      {/* Icon-only Actions: Edit, Erase, Cast */}
                      <div className="flex items-center gap-1 shrink-0">
                        {deleteConfirmId === spell.id ? (
                          <div className="flex items-center gap-0.5 bg-red-950/45 border border-red-500/25 rounded px-0.5 py-0.5 leading-none">
                            <span className="text-[7px] font-mono text-red-400 font-bold uppercase leading-none mr-0.5">{t("Erase?")}</span>
                            <button
                              onClick={() => handleDeleteSpell(spell.id)}
                              className="p-0.5 hover:bg-red-500 hover:text-stone-950 text-red-400 rounded transition-colors cursor-pointer"
                              title="Confirm Delete"
                            >
                              <Check size={8} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-0.5 hover:bg-stone-850 text-stone-400 rounded transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X size={8} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSpellToEdit(spell);
                                setIsSpellBuilderOpen(true);
                                setActiveSection(null);
                                playTactileSound(600, 'triangle', 0.1);
                              }}
                              className="p-0.5 text-stone-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/5 rounded transition-all cursor-pointer spell-builder-trigger"
                              title="Edit Spell Matrix"
                            >
                              <Edit3 size={9} />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmId(spell.id)}
                              className="p-0.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 rounded transition-all cursor-pointer"
                              title="Delete Spell"
                            >
                              <Trash2 size={9} />
                            </button>

                            <button
                              disabled={spell.cost > currentMagic}
                              onClick={() => castSpellAction(spell.name, spell.diceCount, spell.diceSize, spell.modifier, spell.cost)}
                              className={`p-0.5 rounded transition-all ${
                                spell.cost > currentMagic
                                  ? 'text-stone-600 bg-stone-950/40 border border-stone-850 cursor-not-allowed opacity-35'
                                  : 'bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 text-stone-100 hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow border border-violet-500/25'
                              }`}
                              title={spell.cost > currentMagic ? `Not enough magic! Requires ${spell.cost} ✨` : `Cast ${spell.name} (${spell.cost} ✨)`}
                            >
                              <Dice5 size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Spell Description - very small fonts */}
                    {spell.description && (
                      <span className="text-[8px] text-stone-400 italic line-clamp-2 leading-tight pl-1.5 border-l border-white/5">
                        {(() => {
                           const rawDesc = spell.builderState?.spellDesc || spell.description || '';
                           const flavorText = cleanSpellDescription(rawDesc);
                           return t(flavorText) || flavorText;
                        })()}
                      </span>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        );

      case 'weapons': {
        const weaponList = [
          {
            id: 'blade',
            name: 'Starseeker Blade',
            type: 'melee',
            damage: '1d10+4 Slash',
            icon: <Sword className="text-amber-500 rotate-95" size={11} />,
            colorClass: 'text-amber-300',
            borderColor: 'border-amber-500/20',
            description: 'Forge-tempered obsidian sword sparkling with galaxy specks. Gains advantage if target is bloodied.',
            rollText: 'Slash (1d10+4)',
            rollAction: () => rollFormula('Starseeker Blade Slash', 1, 10, 4)
          },
          {
            id: 'bow',
            name: 'Cosmic Arch-Bow',
            type: 'ranged',
            damage: '1d8+5 Radiant',
            icon: <Feather className="text-orange-500" size={11} />,
            colorClass: 'text-orange-300',
            borderColor: 'border-orange-500/20',
            description: 'Summoned energy recurve bow drawn from concentrated sunlight rays. Ignores thermal barriers.',
            rollText: 'Fire (1d8+5)',
            rollAction: () => rollFormula('Cosmic Bow Fire', 1, 8, 5)
          }
        ];

        const filteredWeapons = weaponList.filter(w => activeWeaponTab === 'all' || w.type === activeWeaponTab);

        return (
          <div className="flex flex-col gap-1.5 w-full">
            {/* Minimal weapon custom categories tabs */}
            <div className="flex gap-2.5 justify-center items-center py-0.5 border-b border-white/5 mb-1 shrink-0">
              {(['all', 'melee', 'ranged'] as const).map((tab, idx) => {
                const isActive = activeWeaponTab === tab;
                return (
                  <React.Fragment key={tab}>
                    {idx > 0 && <span className="text-stone-700 text-[8px] font-mono select-none">/</span>}
                    <button
                      onClick={() => {
                        setActiveWeaponTab(tab);
                        setExpandedRule(null);
                        playTactileSound(500, 'sine', 0.05);
                      }}
                      className={`text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer py-0.5 ${
                        isActive 
                          ? 'text-amber-350 border-b border-amber-400/40 pb-0.5' 
                          : 'text-stone-500 hover:text-stone-300 border-b border-transparent pb-0.5'
                      }`}
                    >
                      {t(tab)}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* List of weapons with Expandable details */}
            <div className="flex flex-col gap-0 pr-1">
              {filteredWeapons.map((weapon, index) => {
                const isSelected = expandedRule === weapon.id;
                const formatNumber = String(index + 1).padStart(2, '0');
                return (
                  <div key={`weapon-${weapon.id}-${index}`} className="flex flex-col border-b border-white/[0.015] py-0">
                    <div
                      onClick={() => {
                        setExpandedRule(isSelected ? null : weapon.id);
                        playTactileSound(600, 'sine', 0.04);
                      }}
                      className="group flex gap-2 text-left items-center cursor-pointer transition-all select-none py-1"
                    >
                      <span className={`text-[8px] font-mono shrink-0 select-none ${
                        isSelected ? 'text-amber-400' : 'text-stone-600 group-hover:text-stone-400'
                      }`}>
                        {formatNumber}.
                      </span>
                      <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {weapon.icon}
                          <span className={`text-[9.5px] font-serif font-semibold tracking-wide transition-colors truncate ${
                            isSelected ? weapon.colorClass : 'text-stone-300 group-hover:text-amber-200'
                          }`}>
                            {t(weapon.name)}
                          </span>
                        </div>
                        <span className="text-[7px] font-mono whitespace-nowrap bg-stone-900 border border-white/5 text-stone-400 px-1 py-0.5 rounded leading-none shrink-0 border-amber-500/10">
                          {t(weapon.damage)}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.12 }}
                        className="pl-5 pr-1 pb-1.5 pt-0.5 flex flex-col gap-1 border-l border-amber-500/25 my-0.5"
                      >
                        <span className="text-[8px] text-stone-400 leading-normal font-serif text-justify italic">
                          "{t(weapon.description)}"
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              weapon.rollAction();
                            }}
                            className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono uppercase font-bold text-[8px] tracking-wider rounded transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Dice5 size={9} /> {t(weapon.rollText)}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'journal': {
        const isTasks = activeJournalTab === 'tasks';
        return (
          <div className="flex flex-col gap-1.5 w-full h-full min-h-0">
            {/* Cozy compact slash tabs for Journal */}
            <div className="flex gap-2.5 justify-center items-center py-0.5 border-b border-white/5 mb-1 shrink-0">
              {([
                { id: 'tasks', label: 'Quest Tasks' },
                { id: 'notes', label: 'Notebook' }
              ] as const).map((tab, idx) => {
                const isActive = activeJournalTab === tab.id;
                return (
                  <React.Fragment key={tab.id}>
                    {idx > 0 && <span className="text-stone-700 text-[8px] font-mono select-none">/</span>}
                    <button
                      onClick={() => {
                        setActiveJournalTab(tab.id);
                        playTactileSound(550, 'sine', 0.05);
                      }}
                      className={`text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer py-0.5 ${
                        isActive 
                          ? 'text-pink-350 border-b border-pink-500/40 pb-0.5' 
                          : 'text-stone-500 hover:text-stone-300 border-b border-transparent pb-0.5'
                      }`}
                    >
                      {t(tab.label)}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {isTasks ? (
                <div className="flex flex-col gap-0 pr-1 select-none">
                  {[
                    { id: 'solar', label: 'Retrieve the Solar Emblem' },
                    { id: 'abyss', label: 'Seal the Abyssal Portal Rift' },
                    { id: 'dragon', label: 'Navigate around the sleeping Wyrm' }
                  ].map((quest, index) => {
                    const isChecked = questStates[quest.id];
                    const formatNumber = String(index + 1).padStart(2, '0');
                    return (
                      <div key={quest.id} className="flex items-center justify-between border-b border-white/[0.012] py-1 cursor-pointer">
                        <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setQuestStates(prev => ({ ...prev, [quest.id]: !prev[quest.id] }));
                              playTactileSound(650, 'sine', 0.04);
                            }}
                            className="w-3 h-3 rounded bg-stone-900 border-white/10 text-pink-500 focus:ring-0 cursor-pointer transition-colors"
                          />
                          <span className={`text-[8.5px] font-mono shrink-0 ${isChecked ? 'text-stone-600' : 'text-stone-500'}`}>
                            {formatNumber}.
                          </span>
                          <span className={`text-[9px] font-serif transition-all ${
                            isChecked ? 'line-through text-stone-600 font-medium' : 'text-stone-200 font-bold'
                          }`}>
                            {t(quest.label)}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col h-full gap-1 min-h-0">
                  <textarea 
                    value={campaignNotes}
                    onChange={(e) => setCampaignNotes(e.target.value)}
                    placeholder={t("Type your campaign notes here... They will save instantly.")}
                    className="w-full h-full text-[9px] leading-relaxed p-1.5 bg-stone-900/60 border border-white/5 focus:border-pink-500/40 rounded text-stone-200 outline-none resize-none select-text cursor-text font-mono"
                    style={{ scrollbarWidth: 'thin' }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'compendium': {
        const loreEntries = [
          {
            id: 'behemoth',
            name: 'Stellar Behemoth',
            cr: '14',
            hp: '185',
            def: '18',
            type: 'Celestial',
            colorClass: 'text-emerald-400 border-emerald-500/40',
            description: 'Ancient behemoth composed entirely of high-density stardust and compressed gravitation. Highly resistant to physical slashes, vulnerable to direct Void Gaze attacks.'
          },
          {
            id: 'chronos',
            name: 'Chrono-Leviathan',
            cr: '18',
            hp: '240',
            def: '20',
            type: 'Temporal',
            colorClass: 'text-pink-400 border-pink-500/40',
            description: 'Sands of time coalesce around its outer skull. It can shift initiative orders, making it crucial to roll d20 initiatives before it acts.'
          },
          {
            id: 'void',
            name: 'Void Lurker',
            cr: '8',
            hp: '85',
            def: '12',
            type: 'Abyssal',
            colorClass: 'text-purple-400 border-purple-500/40',
            description: 'A dimensional rift aberration that feasts on magical spell slots. It turns invisible inside nebula zones, requiring thermal sweeps.'
          }
        ];

        return (
          <div className="flex flex-col gap-1.5 w-full">
            {/* Cozy compact slash tabs for lore */}
            <div className="flex gap-2.5 justify-center items-center py-0.5 border-b border-white/5 mb-1 shrink-0">
              {['behemoth', 'chronos', 'void'].map((entryKey, idx) => {
                const isActive = activeLoreEntry === entryKey;
                return (
                  <React.Fragment key={entryKey}>
                    {idx > 0 && <span className="text-stone-700 text-[8px] font-mono select-none">/</span>}
                    <button
                      onClick={() => {
                        setActiveLoreEntry(entryKey);
                        setExpandedRule(null);
                        playTactileSound(500, 'sine', 0.05);
                      }}
                      className={`text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer py-0.5 ${
                        isActive 
                          ? 'text-emerald-350 border-b border-emerald-500/40 pb-0.5' 
                          : 'text-stone-500 hover:text-stone-300 border-b border-transparent pb-0.5'
                      }`}
                    >
                      {entryKey === 'behemoth' ? t('Behemoth') : entryKey === 'chronos' ? t('Sands') : t('Void')}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* List of compendium monster details */}
            <div className="flex flex-col gap-0 pr-1">
              {loreEntries.map((lore, index) => {
                if (lore.id !== activeLoreEntry) return null;
                return (
                  <div key={lore.id} className="flex flex-col py-0">
                    <div className="flex items-center justify-between border-b border-white/[0.015] py-1">
                      <span className={`text-[9.5px] font-serif font-black uppercase tracking-wider ${lore.colorClass.split(' ')[0]}`}>
                        {t(lore.name)}
                      </span>
                      <span className="text-[7px] font-mono text-stone-500">
                        {t("Threat CR:")} {lore.cr}
                      </span>
                    </div>

                    <div className="flex gap-3.5 text-[7px] font-mono text-stone-400 border-b border-white/5 py-1 mb-1.5">
                      <span>{t("HP:")} <strong className="text-stone-200">{lore.hp}</strong></span>
                      <span>{t("DEF:")} <strong className="text-stone-200">{lore.def}</strong></span>
                      <span>{t("Type:")} <strong className="text-stone-200">{t(lore.type)}</strong></span>
                    </div>

                    <p className="text-[8px] text-stone-400 leading-normal font-serif text-justify italic">
                      "{t(lore.description)}"
                    </p>

                    <div className="text-[7.5px] font-mono text-stone-600 text-center uppercase tracking-widest mt-12 select-none">
                      {t("† Scroll to unlock deeper logs †")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'starborn': {
        const activeTopics = 
          starbornTab === 'game' ? gameRulesTopics :
          starbornTab === 'players' ? playersRulesTopics :
          gmRulesTopics;

        return (
          <div className="flex flex-col gap-0 w-full">
            {/* Custom Interactive Tab Bar - almost zero top/bottom margin or padding */}
            <div className="flex gap-3 justify-center items-center py-0.5 border-b border-white/5 mb-1 shrink-0">
              {(['game', 'players', 'master'] as const).map((tab, idx) => (
                <React.Fragment key={tab}>
                  {idx > 0 && <span className="text-stone-700 text-[8px] font-mono select-none">/</span>}
                  <button
                    onClick={() => {
                      setStarbornTab(tab);
                      setExpandedRule(null);
                      playTactileSound(500, 'triangle', 0.05);
                    }}
                    className={`text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer py-0.5 ${
                      starbornTab === tab
                        ? 'text-amber-300 border-b border-amber-400/40'
                        : 'text-stone-500 hover:text-stone-300 border-b border-transparent'
                    }`}
                  >
                    {t(tab === 'game' ? 'Game' : tab === 'players' ? 'Players' : 'Game Master')}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Rules Index as Table of Contents with Inline Transitions - zero gap */}
            <div className="flex flex-col gap-0 pr-1">
              {activeTopics.map((topic: RPGTopic, index: number) => {
                const isSelected = expandedRule === topic.id;
                const formatNumber = String(index + 1).padStart(2, '0');
                return (
                  <div key={topic.id} className="flex flex-col border-b border-white/[0.015] py-0">
                    <div
                      onClick={() => {
                        setExpandedRule(isSelected ? null : topic.id);
                        playTactileSound(600, 'sine', 0.04);
                      }}
                      className="group flex gap-1.5 text-left items-center cursor-pointer transition-all select-none py-0.5"
                    >
                      <span className={`text-[8px] font-mono shrink-0 select-none ${
                        isSelected ? 'text-amber-400' : 'text-stone-600 group-hover:text-stone-400'
                      }`}>
                        {formatNumber}.
                      </span>
                      <span className={`text-[9px] font-serif font-semibold tracking-wide transition-colors ${
                        isSelected 
                          ? 'text-amber-300' 
                          : 'text-stone-300 group-hover:text-amber-200'
                      }`}>
                        {t(topic.label)}
                      </span>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.12 }}
                        className="pl-4 pr-1 pb-1.5 pt-0.5 text-[8.5px] text-stone-400 leading-normal font-serif text-justify border-l border-amber-500/20 my-0.5"
                      >
                        {t(topic.content)}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Mini-menu dedicated helper functions offering only click-to-roll options
  const renderMiniSectionContent = (id: string) => {
    switch (id) {
      case 'inventory':
        return (
          <div className="flex flex-col gap-1 w-full justify-start items-stretch">
            {/* Healing Potion Row */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-amber-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Heal Potion")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("+10 HP")} • x{healingPotions}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (healingPotions > 0) {
                    setHealingPotions((prev: number) => prev - 1);
                    window.dispatchEvent(new CustomEvent('vtt-hp-adjust', { detail: { amount: 10 } }));
                    addCombatLog('[Inventory]: Consumed Health Potion. Restored 10 HP.');
                  }
                }}
                disabled={healingPotions === 0}
                className={`px-1.5 py-0.5 text-[7px] font-mono uppercase font-bold rounded shrink-0 transition-colors ${healingPotions > 0 ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer' : 'bg-stone-850 text-stone-600 cursor-not-allowed border border-white/5'}`}
              >
                {t("Use")}
              </button>
            </div>

            {/* Elixir of Life Row */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-pink-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Elixir Star")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("+25 HP")} • x{elixirLife}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (elixirLife > 0) {
                    setElixirLife((prev: number) => prev - 1);
                    window.dispatchEvent(new CustomEvent('vtt-hp-adjust', { detail: { amount: 25 } }));
                    addCombatLog('[Inventory]: Drank Elixir of Stars. Max healing +25 HP.');
                  }
                }}
                disabled={elixirLife === 0}
                className={`px-1.5 py-0.5 text-[7px] font-mono uppercase font-bold rounded shrink-0 transition-colors ${elixirLife > 0 ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer' : 'bg-stone-850 text-stone-600 cursor-not-allowed border border-white/5'}`}
              >
                {t("Use")}
              </button>
            </div>

            {/* Star Dust Row */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-cyan-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Star Dust")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("+8 Temp HP")} • x{starDust}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (starDust > 0) {
                    setStarDust((prev: number) => prev - 1);
                    window.dispatchEvent(new CustomEvent('vtt-hp-adjust-temp', { detail: { amount: 8 } }));
                    addCombatLog('[Inventory]: Scattered Star Dust. +8 Temp Shield.');
                  }
                }}
                disabled={starDust === 0}
                className={`px-1.5 py-0.5 text-[7px] font-mono uppercase font-bold rounded shrink-0 transition-colors ${starDust > 0 ? 'bg-cyan-500 hover:bg-cyan-400 text-stone-950 cursor-pointer' : 'bg-stone-850 text-stone-600 cursor-not-allowed border border-white/5'}`}
              >
                {t("Use")}
              </button>
            </div>
          </div>
        );

      case 'magic':
        return (
          <div className="flex flex-col gap-1 w-full justify-start items-stretch">
            {/* Minimalist Tab selector inside the mini menu */}
            <div className="grid grid-cols-4 gap-0.5 bg-stone-900/40 p-0.5 rounded border border-white/5 mb-1 h-5 shrink-0 select-none">
              {[
                { id: 'all', title: 'All magic', icon: <Sparkles size={7.5} /> },
                { id: 'combat', title: 'Combat', icon: <Swords size={7.5} /> },
                { id: 'auxiliary', title: 'Auxiliary', icon: <Feather size={7.5} strokeWidth={2.5} /> },
                { id: 'transformative', title: 'Transformative', icon: <Sparkle size={7.5} /> }
              ].map(tab => {
                const isActive = activeMagicTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMagicTab(tab.id as any);
                      playTactileSound(440, 'sine', 0.03);
                    }}
                    className={`flex items-center justify-center rounded transition-all cursor-pointer select-none h-full border ${
                      isActive 
                        ? 'bg-violet-600/25 text-violet-300 border-violet-500/20 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                        : 'bg-transparent text-stone-500 border-transparent hover:text-stone-300 hover:bg-white/5'
                    }`}
                    title={t(tab.title)}
                  >
                    {tab.icon}
                  </button>
                );
              })}
            </div>

            {/* User Custom Forged Spells */}
            {(() => {
              const filteredSpells = customSpells.filter(spell => {
                if (activeMagicTab === 'all') return true;
                return spell.category === activeMagicTab;
              });

              if (filteredSpells.length === 0) {
                return (
                  <span className="text-[8px] text-stone-500 italic text-center py-3 bg-stone-900/20 border border-white/5 rounded p-2">
                    {activeMagicTab === 'all' 
                      ? t('No forged spells yet') 
                      : activeMagicTab === 'combat' 
                        ? t('No combat spells') 
                        : activeMagicTab === 'auxiliary' 
                          ? t('No auxiliary spells') 
                          : t('No transformative spells')}
                  </span>
                );
              }

              return filteredSpells.map((spell, idx) => {
                const isExpanded = expandedSpellId === spell.id;
                const dCount = typeof spell.diceCount === 'number' ? spell.diceCount : 1;
                const dSize = typeof spell.diceSize === 'number' ? spell.diceSize : 6;
                const dMod = typeof spell.modifier === 'number' ? spell.modifier : 0;
                
                return (
                  <div 
                    key={`magic-spell-${spell.id}-${idx}`} 
                    className={`flex flex-col rounded transition-all duration-200 text-left relative overflow-hidden select-none cursor-pointer ${
                      isExpanded 
                        ? 'p-1.5 bg-stone-900 border border-violet-500/40 bg-gradient-to-b from-stone-900 to-stone-950/90 shadow-[0_4px_12px_rgba(139,92,246,0.1)]' 
                        : 'py-0.5 px-1 border border-transparent bg-transparent hover:bg-stone-900/50 hover:border-white/5'
                    }`}
                    onPointerDown={(e) => handleSpellPointerDown(e, spell)}
                    onPointerUp={(e) => handleSpellPointerUp(e, spell)}
                    onPointerCancel={handleSpellPointerCancel}
                    onPointerLeave={handleSpellPointerCancel}
                  >
                    <div className="flex items-center justify-between select-none gap-1">
                      <div className="flex flex-col justify-center min-w-0 pr-1 pointer-events-none">
                        <span className="text-[9px] font-bold font-serif text-stone-200 block truncate leading-none select-none">{t(spell.name)}</span>
                        {isExpanded && (
                          <span className="text-[7.5px] font-mono text-violet-400/80 block truncate leading-none mt-0.5">
                            d{dSize || 6}{dMod !== 0 ? `${dMod >= 0 ? '+' : ''}${dMod}` : ''} • {spell.cost} ✨
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center shrink-0 gap-1">
                        {/* Spell Attack / Hit Roll Button */}
                        {(() => {
                          const mindBonus = Math.floor(mindScore / 10);
                          const magicBonus = Math.floor(magicScore / 10);
                          const xDice = mindBonus + magicBonus + 1;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playTactileSound(600, 'triangle', 0.05);
                                rollFormula(`To Hit: ${spell.name}`, xDice, 6, 0);
                              }}
                              className="h-[20px] w-[20px] p-0 flex items-center justify-center rounded transition-all shrink-0 border bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-stone-100 border-emerald-500/25 hover:scale-[1.05] active:scale-[0.95] cursor-pointer"
                              title={`Roll to Hit: ${spell.name} (${xDice}d6)`}
                            >
                              <Target size={13} className="text-white" />
                            </button>
                          );
                        })()}

                        {/* Cast Spell Button */}
                        <button
                          disabled={spell.cost > currentMagic}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (spell.cost > currentMagic) return;
                            playTactileSound(520, 'sine', 0.05);
                            const diceCount = typeof spell.diceCount === 'number' ? spell.diceCount : 1;
                            const diceSize = typeof spell.diceSize === 'number' ? spell.diceSize : 6;
                            const modifier = typeof spell.modifier === 'number' ? spell.modifier : 0;
                            castSpellAction(spell.name, diceCount, diceSize, modifier, spell.cost);
                          }}
                          className={`h-[20px] w-[20px] p-0 flex items-center justify-center rounded transition-all shrink-0 border ${
                            spell.cost > currentMagic
                              ? 'text-stone-655 bg-stone-950/40 border-stone-900 cursor-not-allowed opacity-35 animate-none'
                              : 'bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 text-stone-100 border-violet-500/25 hover:scale-[1.05] active:scale-[0.95] cursor-pointer'
                          }`}
                          title={spell.cost > currentMagic ? `Not enough magic! Requires ${spell.cost} ✨` : `Cast ${spell.name} (${spell.cost} ✨)`}
                        >
                          <Dice5 size={13} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex flex-col gap-1 transition-all select-text pointer-events-auto">
                        <span className="text-[8.5px] text-stone-400 italic leading-tight">
                          {(() => {
                            const rawDesc = spell.builderState?.spellDesc || spell.description || '';
                            const flavorText = cleanSpellDescription(rawDesc);
                            return t(flavorText) || flavorText;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        );

      case 'weapons':
        return (
          <div className="flex flex-col gap-1 w-full justify-start items-stretch">
            {/* Melee attack */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-amber-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Starseeker")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("1d10+4 Dmg")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  rollFormula('Starseeker Blade Slash', 1, 10, 4);
                }}
                className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono uppercase font-bold text-[7px] rounded tracking-wider shrink-0 cursor-pointer transition-all"
              >
                {t("Use")}
              </button>
            </div>

            {/* Ranged attack */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-orange-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Astral Bow")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("1d8+5 Dmg")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  rollFormula('Cosmic Bow Fire', 1, 8, 5);
                }}
                className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white font-mono uppercase font-bold text-[7px] rounded tracking-wider shrink-0 cursor-pointer transition-all"
              >
                {t("Use")}
              </button>
            </div>
          </div>
        );

      case 'journal':
        return (
          <div className="flex flex-col gap-1 w-full justify-start items-stretch overflow-y-auto scrollbar-none">
            {/* Solar Emblem */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-stone-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className={`text-[9px] font-bold font-serif block truncate whitespace-nowrap mb-0.5 leading-none ${questStates['solar'] ? 'line-through text-stone-600' : 'text-stone-200'}`}>
                  {t("Solar Emblem")}
                </span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("Main Quest")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuEnlarged(true);
                  setActiveSection('journal');
                }}
                className="px-1.5 py-0.5 text-[7px] font-mono uppercase bg-stone-850 hover:bg-stone-800 text-stone-300 font-bold rounded shrink-0 transition-colors border border-white/5 cursor-pointer"
              >
                {t("Open")}
              </button>
            </div>

            {/* Abyssal Portal */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 shadow-inner hover:border-stone-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className={`text-[9px] font-bold font-serif block truncate whitespace-nowrap mb-0.5 leading-none ${questStates['abyss'] ? 'line-through text-stone-600' : 'text-stone-200'}`}>
                  {t("Abyssal Portal")}
                </span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("Side Quest")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuEnlarged(true);
                  setActiveSection('journal');
                }}
                className="px-1.5 py-0.5 text-[7px] font-mono uppercase bg-stone-850 hover:bg-stone-800 text-stone-300 font-bold rounded shrink-0 transition-colors border border-white/5 cursor-pointer"
              >
                {t("Open")}
              </button>
            </div>
          </div>
        );

      case 'compendium':
        return (
          <div className="flex flex-col gap-1 w-full justify-start items-stretch">
            {/* Behemoth Initiative */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 hover:border-emerald-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Behemoth")}</span>
                <span className="text-[7px] font-mono text-emerald-400/80 block truncate whitespace-nowrap leading-none">{t("CR 12")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuEnlarged(true);
                  setActiveSection('compendium');
                }}
                className="px-1.5 py-0.5 text-[7px] font-mono uppercase bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded cursor-pointer transition-colors"
              >
                {t("Open")}
              </button>
            </div>

            {/* Leviathan Initiative */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 hover:border-pink-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-bold font-serif text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Leviathan")}</span>
                <span className="text-[7px] font-mono text-pink-400/85 block truncate whitespace-nowrap leading-none">{t("CR 18")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuEnlarged(true);
                  setActiveSection('compendium');
                }}
                className="px-1.5 py-0.5 text-[7px] font-mono uppercase bg-pink-600 hover:bg-pink-500 text-white font-bold rounded cursor-pointer transition-colors"
              >
                {t("Open")}
              </button>
            </div>
          </div>
        );

      case 'starborn':
        return (
          <div className="flex flex-col gap-1 w-full justify-start items-stretch">
            {/* Channel Novaburst */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 hover:border-cyan-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-serif font-bold text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Novaburst")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("+3 Temp HP Shield")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  addCombatLog('[Cosmos]: Raw starlight channeled into local coordinate systems!');
                  window.dispatchEvent(new CustomEvent('vtt-hp-adjust-temp', { detail: { amount: 3 } }));
                }}
                className="px-1.5 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-mono uppercase font-bold text-[7px] rounded cursor-pointer transition-colors"
              >
                {t("Use")}
              </button>
            </div>

            {/* Summon Oracle Warning */}
            <div className="flex items-center justify-between p-1 rounded bg-stone-900/80 border border-white/5 hover:border-cyan-500/10 transition-colors">
              <div className="flex flex-col justify-center min-w-0 pr-1.5">
                <span className="text-[9px] font-serif font-bold text-stone-200 block truncate whitespace-nowrap mb-0.5 leading-none">{t("Spheres")}</span>
                <span className="text-[7px] font-mono text-stone-400 block truncate whitespace-nowrap leading-none">{t("Cosmic Warning")}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  getOracleReading();
                }}
                disabled={oracleLoading}
                className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 hover:text-cyan-200 font-mono uppercase font-bold text-[7px] rounded cursor-pointer border border-cyan-500/10 inline-flex items-center justify-center transition-colors font-semibold"
              >
                {oracleLoading ? t('Wait') : t('Use')}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
      style={{
        zIndex: (activeSection || isSpellBuilderOpen || heldSpellInfo || isItemCreatorOpen) ? LAYER_HIERARCHY.SPELL_BUILDER_POPUP : 10
      }}
    >
      
      {/* ==========================================
          1. THE FIVE-POINT PENTACLE PORTAL CHART (SMALL STAR)
          ========================================== */}
      <div 
        className="absolute z-20 pointer-events-none select-none w-[270px] h-[270px] origin-bottom-right"
        style={{
          right: '0px',
          bottom: '0px',
          transform: 'scale(0.379167)',
        }}
      >
        
        {/* SVG Decorative Summoning Circle + Glowing Star Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="45 45 270 270">
          <defs>
            <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(234, 179, 8, 0.12)" />
              <stop offset="65%" stopColor="rgba(124, 58, 237, 0.03)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            
            <linearGradient id="pentLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#db2777" stopOpacity="0.75" />
              <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>
            
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Golden Backdrop Glow */}
          <circle cx="180" cy="180" r="140" fill="url(#portalGlow)" className="pointer-events-none" />

          {/* BACKGROUND INTERACTIVE PATTERNS:
              Each triangle arm and the center pentagon drawn as polygons with fill capabilities.
              These correspond exactly to our nodes, lighting up beautiful glowing neon borders and fills!
          */}
          {nodePositions.map(pos => (
            <g key={`poly-group-${pos.id}`}>
              {/* Charcoal Black Base Fill */}
              <polygon 
                points={pos.polygonPoints} 
                fill={themeMode === 'light' ? "#faf9f5" : "#12131a"} 
                className="pointer-events-none transition-colors duration-500"
              />
              {/* Interactive Colored/Glowing Overlay */}
              <polygon 
                points={pos.polygonPoints} 
                className="transition-all duration-300 cursor-pointer pointer-events-auto node-interactive-trigger"
                fill={hoveredSection === pos.id || activeSection === pos.id ? pos.color : "transparent"}
                stroke={hoveredSection === pos.id || activeSection === pos.id ? pos.glowHex : "transparent"}
                strokeWidth={hoveredSection === pos.id || activeSection === pos.id ? "2.5" : "0"}
                filter={(hoveredSection === pos.id || activeSection === pos.id) ? "url(#glow)" : undefined}
                onMouseEnter={() => setHoveredSection(pos.id)}
                onMouseLeave={() => setHoveredSection(null)}
                onPointerDown={(e) => handleNodePointerDown(e, pos.id)}
                onPointerUp={(e) => handleNodePointerUp(e, pos.id)}
                onPointerCancel={handleNodePointerCancel}
                onPointerLeave={handleNodePointerCancel}
                onClick={(e) => e.stopPropagation()}
              />
            </g>
          ))}

          {/* Rotating Outer Ring (Like runic guides) */}
          <motion.circle 
            cx="180" 
            cy="180" 
            r="128" 
            fill="none" 
            stroke={themeMode === 'light' ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)"} 
            strokeWidth="0.75" 
            strokeDasharray="4 8" 
            className="pointer-events-none transition-colors duration-500"
            animate={{ rotate: -360 }}
            transition={{ ease: "linear", duration: 90, repeat: Infinity }}
            style={{ originX: "180px", originY: "180px" }}
          />

          {/* Bold Outer Circle - Exact geometry from image.png to provide rustic, heavy boundary */}
          <circle 
            cx="180" 
            cy="180" 
            r="135" 
            fill="none" 
            stroke={themeMode === 'light' ? "#e4e2d8" : "#12131a"} 
            strokeWidth="12" 
            className="pointer-events-none transition-colors duration-500"
          />
          <circle 
            cx="180" 
            cy="180" 
            r="135" 
            fill="none" 
            stroke={themeMode === 'light' ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.85)"} 
            strokeWidth="2.5" 
            className="pointer-events-none transition-colors duration-500"
          />

          {/* Underlay Bold Intersecting Star lines matching image.png perfectly */}
          <path 
            d="M 180 45 L 259.4 289.2 L 51.6 138.3 L 308.4 138.3 L 100.6 289.2 Z" 
            fill="none" 
            stroke={themeMode === 'light' ? "#e4e2d8" : "#12131a"} 
            strokeWidth="11" 
            strokeLinejoin="miter" 
            strokeMiterlimit="10"
            className="pointer-events-none transition-colors duration-500"
          />

          {/* Glowing colorful starlight gradient path overlaid on top of the black star geometry */}
          <motion.path 
            d="M 180 45 L 259.4 289.2 L 51.6 138.3 L 308.4 138.3 L 100.6 289.2 Z" 
            fill="none" 
            stroke="url(#pentLine)" 
            strokeWidth="2.5" 
            strokeLinejoin="miter" 
            strokeMiterlimit="10"
            className="pointer-events-none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
        </svg>

        {/* Floating Node Icons overlay on top of SVG points matching the exact coordinates of star points.
            Clicking these sets the active section, same as clicking the SVG polygons.
        */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {nodePositions.map((pos) => (
            <div
              key={pos.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto node-interactive-trigger"
              style={{
                left: `${pos.x - 45}px`,
                top: `${pos.y - 45}px`,
              }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: (activeSection === pos.id || hoveredSection === pos.id) ? 1.25 : 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 125, damping: 15, delay: pos.isCenter ? 0.2 : 0.05 * nodePositions.indexOf(pos) }}
                className={`group cursor-pointer flex flex-col items-center justify-center transition-all duration-300 ${
                  pos.isCenter
                    ? 'w-16 h-16 z-40'
                    : 'w-14 h-14 z-30'
                }`}
                onPointerDown={(e) => handleNodePointerDown(e, pos.id)}
                onPointerUp={(e) => handleNodePointerUp(e, pos.id)}
                onPointerCancel={handleNodePointerCancel}
                onPointerLeave={handleNodePointerCancel}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setHoveredSection(pos.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                {/* Icon representation */}
                <div className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.85)] filter transition-all duration-300">
                  {pos.icon}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          2. GAMEBOY-STYLE D-PAD CONTROLLER (BOTTOM LEFT - Touching Corner Perfectly)
          ========================================== */}
      <div 
        id="dpad-controller"
        className="absolute bottom-0 left-0 z-30 pointer-events-auto select-none flex items-center justify-center"
        style={{
          width: '102.375px',
          height: '102.375px',
        }}
      >
        {!isJoypadMode ? (
          <div className={`relative w-full h-full rounded-full border shadow-inner flex items-center justify-center overflow-hidden transition-colors duration-350 ${
            themeMode === 'light' 
              ? 'bg-[#fcfbf9] border-stone-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),_0_1px_1px_rgba(0,0,0,0.02)]' 
              : 'bg-stone-900 border-stone-800 shadow-[inset_0_3px_6px_rgba(0,0,0,0.85),_0_1px_1px_rgba(255,255,255,0.06)]'
          }`}>
            {/* Circular inner bezel track representing Gameboy socket */}
            <div className={`absolute inset-0.5 rounded-full border pointer-events-none transition-colors duration-350 ${
              themeMode === 'light' ? 'border-stone-200 bg-[#f7f5f0]/45' : 'border-transparent bg-stone-900/45'
            }`} />

            {/* D-Pad cross */}
            <div className="relative w-full h-full">
              {/* Center block and Dimple pivot recess */}
              <div 
                onPointerDown={handleCenterDown}
                className={`absolute left-[38px] top-[38px] w-[26px] h-[26px] z-10 cursor-pointer flex items-center justify-center shadow-inner rounded-full border transition-colors duration-350 ${
                  themeMode === 'light'
                    ? 'bg-[#eae8df] hover:bg-[#dfddb2] border-[#cbc9bd]'
                    : 'bg-[#1a1b1e] hover:bg-stone-850 active:bg-stone-950 border border-stone-800'
                }`}
                title="Hold center to turn into Joypad"
              >
                <div className={`w-[14px] h-[14px] rounded-full border transition-colors duration-350 ${
                  themeMode === 'light'
                    ? 'bg-[#faf9f5] border-stone-300'
                    : 'bg-stone-900 border-stone-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]'
                }`} />
              </div>

              {/* UP button */}
              <button
                onMouseDown={() => { setPressedDir('up'); handleDPadPress('arrowup'); }}
                onMouseUp={() => setPressedDir(null)}
                onMouseLeave={() => { if (pressedDir === 'up') setPressedDir(null); }}
                onTouchStart={(e) => { e.preventDefault(); setPressedDir('up'); handleDPadPress('arrowup'); }}
                onTouchEnd={() => setPressedDir(null)}
                className={`absolute top-0 left-[38px] w-[26px] h-[38px] flex items-center justify-center rounded-t-[4px] border-t border-x cursor-pointer select-none transition-all duration-150 ${
                  pressedDir === 'up'
                    ? 'bg-stone-950 text-amber-500 shadow-inner translate-y-[1px]'
                    : themeMode === 'light'
                      ? 'bg-[#eae8df] hover:bg-[#dfddd4] border-stone-300/80 text-stone-600'
                      : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-[#3e3f42]'
                } ${themeMode === 'light' ? 'shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'shadow-[0_1.5px_3px_rgba(0,0,0,0.6)]'}`}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-current opacity-80" />
              </button>

              {/* DOWN button */}
              <button
                onMouseDown={() => { setPressedDir('down'); handleDPadPress('arrowdown'); }}
                onMouseUp={() => setPressedDir(null)}
                onMouseLeave={() => { if (pressedDir === 'down') setPressedDir(null); }}
                onTouchStart={(e) => { e.preventDefault(); setPressedDir('down'); handleDPadPress('arrowdown'); }}
                onTouchEnd={() => setPressedDir(null)}
                className={`absolute bottom-0 left-[38px] w-[26px] h-[38px] flex items-center justify-center rounded-b-[4px] border-b border-x cursor-pointer select-none transition-all duration-150 ${
                  pressedDir === 'down'
                    ? 'bg-stone-950 text-amber-500 shadow-inner -translate-y-[1px]'
                    : themeMode === 'light'
                      ? 'bg-[#eae8df] hover:bg-[#dfddd4] border-stone-300/80 text-stone-600'
                      : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-[#3e3f42]'
                } ${themeMode === 'light' ? 'shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'shadow-[0_1.5px_3px_rgba(0,0,0,0.6)]'}`}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-current opacity-80" />
              </button>

              {/* LEFT button */}
              <button
                onMouseDown={() => { setPressedDir('left'); handleDPadPress('arrowleft'); }}
                onMouseUp={() => setPressedDir(null)}
                onMouseLeave={() => { if (pressedDir === 'left') setPressedDir(null); }}
                onTouchStart={(e) => { e.preventDefault(); setPressedDir('left'); handleDPadPress('arrowleft'); }}
                onTouchEnd={() => setPressedDir(null)}
                className={`absolute left-0 top-[38px] w-[38px] h-[26px] flex items-center justify-center rounded-l-[4px] border-l border-y cursor-pointer select-none transition-all duration-150 ${
                  pressedDir === 'left'
                    ? 'bg-stone-950 text-amber-500 shadow-inner translate-x-[1px]'
                    : themeMode === 'light'
                      ? 'bg-[#eae8df] hover:bg-[#dfddd4] border-stone-300/80 text-stone-600'
                      : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-[#3e3f42]'
                } ${themeMode === 'light' ? 'shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'shadow-[0_1.5px_3px_rgba(0,0,0,0.6)]'}`}
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[5px] border-r-current opacity-80" />
              </button>

              {/* RIGHT button */}
              <button
                onMouseDown={() => { setPressedDir('right'); handleDPadPress('arrowright'); }}
                onMouseUp={() => setPressedDir(null)}
                onMouseLeave={() => { if (pressedDir === 'right') setPressedDir(null); }}
                onTouchStart={(e) => { e.preventDefault(); setPressedDir('right'); handleDPadPress('arrowright'); }}
                onTouchEnd={() => setPressedDir(null)}
                className={`absolute right-0 top-[38px] w-[38px] h-[26px] flex items-center justify-center rounded-r-[4px] border-r border-y cursor-pointer select-none transition-all duration-150 ${
                  pressedDir === 'right'
                    ? 'bg-stone-950 text-amber-500 shadow-inner -translate-x-[1px]'
                    : themeMode === 'light'
                      ? 'bg-[#eae8df] hover:bg-[#dfddd4] border-stone-300/80 text-stone-600'
                      : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-[#3e3f42]'
                } ${themeMode === 'light' ? 'shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'shadow-[0_1.5px_3px_rgba(0,0,0,0.6)]'}`}
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[5px] border-l-current opacity-80" />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
            {/* Visual boundary track / Joypad Base */}
            <div 
              onPointerDown={handleJoyDown}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyUp}
              onPointerCancel={handleJoyUp}
              className={`relative rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150 touch-none ${
                themeMode === 'light'
                  ? 'bg-[#fcfbf9] border-stone-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
                  : 'bg-black border-stone-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.95)]'
              }`}
              style={{
                width: '32px',
                height: '32px',
              }}
              title="Drag to navigate / Hold center to turn into D-Pad"
            >
              {/* Lighter circle outline within base */}
              <div className={`absolute inset-1 rounded-full border pointer-events-none ${
                themeMode === 'light' ? 'border-stone-200' : 'border-stone-800/80'
              }`} />
              
              {/* Draggable thumbstick knob */}
              <div 
                className={`absolute w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-transform duration-75 ${
                  themeMode === 'light'
                    ? 'bg-[#eae8df] border-stone-300 shadow-[0_2px_4px_rgba(0,0,0,0.1)]'
                    : 'bg-stone-900 border-stone-600 shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                }`}
                style={{
                  transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)`,
                }}
              >
                {/* Lighter circle outline within the thumbstick */}
                <div className={`w-[8px] h-[8px] rounded-full border ${
                  themeMode === 'light' ? 'border-stone-200 bg-[#faf9f5]' : 'border-stone-400/85 bg-black'
                }`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          2. GENERAL DICE CONTROLL PANEL (BOTTOM CENTER - Above Return Button)
          ========================================== */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 overflow-visible select-none scale-[0.82] origin-bottom transition-all duration-300 ${
          (activeSection || isSpellBuilderOpen || isItemCreatorOpen) ? 'z-[50] pointer-events-none opacity-40' : 'z-[200] pointer-events-auto'
        }`}
        style={{ bottom: '54.65px' }}
      >
        <DiceRoller />
      </div>

      {/* ==========================================
          3. COMPASS LIFE HUD BADGE & SYMMETRICAL STAT WINGS
          ========================================== */}
      <div 
        className="absolute z-[120] pointer-events-auto select-none flex items-center justify-center gap-1.5 md:gap-2.5"
        style={(layoutOrientation === 'vertical' || useRestructureAlignment) ? {
          left: '50%',
          transform: 'translateX(-50%) scale(0.82)',
          top: '102px'
        } : {
          right: '5.76px',
          top: '4.92px',
          transform: 'scale(0.82)',
          transformOrigin: 'top right'
        }}
      >
        {/* Left Wing Stats: BODY, MIND, SPEED */}
        <div className="flex items-center gap-1 md:gap-1.5">
          {statsCount === 6 ? (
            <>
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-52px)' }}
                onPointerDown={(e) => handleStatPointerDown('body', e)}
                onPointerUp={(e) => handleStatPointerUp('body', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatBody colorTheme="body" />
              </div>
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-52px)' }}
                onPointerDown={(e) => handleStatPointerDown('mind', e)}
                onPointerUp={(e) => handleStatPointerUp('mind', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatMind colorTheme="mind" />
              </div>
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-36px)' }}
                onPointerDown={(e) => handleStatPointerDown('speed', e)}
                onPointerUp={(e) => handleStatPointerUp('speed', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatSpeed />
              </div>
            </>
          ) : (
            <>
              {/* Body is at where Mind is (middle, translateY -52px) styled as mind */}
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-52px)' }}
                onPointerDown={(e) => handleStatPointerDown('body', e)}
                onPointerUp={(e) => handleStatPointerUp('body', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatBody colorTheme="mind" />
              </div>
              {/* Mind is at where Speed is (innermost, translateY -36px) styled as speed */}
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-36px)' }}
                onPointerDown={(e) => handleStatPointerDown('mind', e)}
                onPointerUp={(e) => handleStatPointerUp('mind', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatMind colorTheme="speed" />
              </div>
            </>
          )}
        </div>

        {/* Central Life Badge */}
        <div className="transition-transform duration-300 hover:scale-105">
          <Life noPadding={true} />
        </div>

        {/* Right Wing Stats: ENDURE, WIELD, MAGIC */}
        <div className="flex items-center gap-1 md:gap-1.5">
          {statsCount === 6 ? (
            <>
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-36px)' }}
                onPointerDown={(e) => handleStatPointerDown('endurance', e)}
                onPointerUp={(e) => handleStatPointerUp('endurance', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatEndurance />
              </div>
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-52px)' }}
                onPointerDown={(e) => handleStatPointerDown('wield', e)}
                onPointerUp={(e) => handleStatPointerUp('wield', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatWield colorTheme="wield" />
              </div>
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-52px)' }}
                onPointerDown={(e) => handleStatPointerDown('magic', e)}
                onPointerUp={(e) => handleStatPointerUp('magic', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatMagic colorTheme="magic" />
              </div>
            </>
          ) : (
            <>
              {/* Wield is at where Endure is (innermost, translateY -36px) styled as endurance */}
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-36px)' }}
                onPointerDown={(e) => handleStatPointerDown('wield', e)}
                onPointerUp={(e) => handleStatPointerUp('wield', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatWield colorTheme="endurance" />
              </div>
              {/* Magic is at where Wield is (middle, translateY -52px) styled as wield */}
              <div 
                className="transition-transform duration-200 hover:scale-105 active:scale-95 relative cursor-pointer touch-none select-none" 
                style={{ transform: 'translateY(-52px)' }}
                onPointerDown={(e) => handleStatPointerDown('magic', e)}
                onPointerUp={(e) => handleStatPointerUp('magic', e)}
                onPointerLeave={handleStatPointerLeave}
                onPointerCancel={handleStatPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
              >
                <StatMagic colorTheme="wield" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==========================================
          4. ARCHE-RIBBON STATE CONTROLLER (SCALED BY 30% AND FLUSHED TO TOP-LEFT)
          ==========================================
          If alignment alignment is swapped on visuals toggle, displays centered top in reconstruction block too */}
      <div 
        className="absolute z-[100] flex items-center justify-center transition-all duration-300 pointer-events-none select-none"
        style={(layoutOrientation === 'vertical' || useRestructureAlignment) ? {
          top: '1.2%',
          left: '50%',
          transform: 'translateX(-50%) scale(0.84)',
          width: '320px',
          height: '96px',
        } : {
          top: '6px',
          left: '6px',
          width: '320px',
          height: '96px',
          transform: 'scale(0.84)',
          transformOrigin: 'top left'
        }}
      >
        <div className="relative flex items-center justify-center pointer-events-auto h-[88px] w-[88px]">
          {/* Back parts */}
          <RibbonEnds />
          <RibbonBack />

          {/* Outer Ring */}
          <motion.div 
            className="w-[88px] h-[88px] rounded-full border-2 shadow-[0_0_20px_rgba(0,210,255,0.3)] cosmic-blue-fill flex items-center justify-center relative z-[20]"
            animate={
              skullLevel === 0
                ? { borderColor: "rgba(255, 255, 255, 1)", boxShadow: "0 0 20px rgba(0,210,255,0.3)" }
                : isMaxThreat
                ? {
                    borderColor: `rgba(255, ${255 - 250 * threatIntensity}, ${255 - 250 * threatIntensity}, 1)`,
                    boxShadow: `0 0 60px rgba(255, 10, 10, ${0.95 * threatIntensity})`
                  }
                : !pulseActive
                ? { 
                    borderColor: `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 1)`,
                    boxShadow: `0 0 20px rgba(220, 20, 20, ${0.3 * threatIntensity})`
                  }
                : {
                    borderColor: [
                      `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 0.85)`,
                      `rgba(255, ${255 - 250 * threatIntensity}, ${255 - 250 * threatIntensity}, 1)`,
                      `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 0.85)`,
                      `rgba(255, ${255 - 250 * threatIntensity}, ${255 - 250 * threatIntensity}, 1)`,
                      `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 0.85)`,
                    ],
                    boxShadow: [
                      `0 0 ${10 + 10 * threatIntensity}px rgba(220, 10, 10, ${0.1 * threatIntensity})`,
                      `0 0 ${25 + 35 * threatIntensity}px rgba(255, 10, 10, ${0.9 * threatIntensity})`,
                      `0 0 ${10 + 10 * threatIntensity}px rgba(220, 10, 10, ${0.1 * threatIntensity})`,
                      `0 0 ${25 + 35 * threatIntensity}px rgba(255, 10, 10, ${0.9 * threatIntensity})`,
                      `0 0 ${10 + 10 * threatIntensity}px rgba(220, 10, 10, ${0.1 * threatIntensity})`,
                    ]
                  }
            }
            transition={
              skullLevel === 0
                ? { duration: 0.5 }
                : isMaxThreat || !pulseActive
                ? { duration: 1.0 }
                : pulseTransition
            }
          >
            {heartPositions.map((item) => {
              const isSkull = item.seq !== null && item.seq <= skullLevel;
              
              return (
                <motion.div 
                  key={item.id}
                  className={`absolute ${item.pos} z-[100] cursor-pointer flex items-center justify-center`}
                  animate={{
                    x: isSkull ? item.skullOffset.x : 0,
                    y: isSkull ? item.skullOffset.y : 0
                  }}
                  whileHover={{ scale: dotHoverScale }}
                  whileTap={{ scale: dotHoverScale }}
                  transition={dotTransition}
                  onClick={() => handlePress(item.seq)}
                >
                  <AnimatePresence mode="wait">
                    {isSkull ? (
                      <motion.div
                        key="skull"
                        initial={{ scale: 0, rotate: -90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 90, opacity: 0 }}
                      >
                        <Skull 
                          size={22} 
                          className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]" 
                          fill="url(#skullGradient)"
                          strokeWidth={2}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={item.id === '12:00' ? "flame animate-pulse" : "heart"}
                        initial={{ scale: 0, rotate: 90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: -90, opacity: 0 }}
                      >
                        {item.id === '12:00' ? (
                          <Flame 
                            size={21} 
                            className="text-white fill-current stroke-black/60 drop-shadow-[0_0_8px_rgba(255,80,0,0.85)] drop-shadow-[0_0_12px_rgba(0,0,0,0.8)] filter" 
                            fill="url(#nebulaGradient)"
                            strokeWidth={1.5}
                          />
                        ) : (
                          <Heart 
                            size={17} 
                            className="text-white fill-current stroke-black/60 drop-shadow-[0_0_5px_rgba(163,255,51,0.5)] drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] filter" 
                            fill="url(#nebulaGradient)"
                            strokeWidth={1.5}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Inner Pink Circle */}
            <motion.div 
              className="w-20 h-20 rounded-full border-2 cursor-pointer transition-all duration-300 relative z-[30] pointer-events-auto overflow-hidden flex items-center justify-center"
              style={{ background: activeAccent.background }}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={cancelHold}
              animate={
                isHoldingActive
                  ? {
                      scale: 0.9,
                      borderColor: "#ffffff",
                      boxShadow: `0 0 35px ${activeAccent.shadowColor}, inset 0 0 20px rgba(255, 255, 255, 0.45)`,
                    }
                  : skullLevel === 0
                  ? { scale: 1.0, borderColor: "rgba(255, 255, 255, 1)", boxShadow: activeAccent.shadowGlow }
                  : isMaxThreat
                  ? {
                      scale: 1.0,
                      borderColor: `rgba(255, ${255 - 250 * threatIntensity}, ${255 - 250 * threatIntensity}, 1)`,
                      boxShadow: `0 0 45px rgba(255, 10, 10, ${0.9 * threatIntensity})`
                    }
                  : !pulseActive
                  ? { 
                      scale: 1.0,
                      borderColor: `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 1)`,
                      boxShadow: `0 0 15px rgba(220, 20, 20, ${0.3 * threatIntensity})`
                    }
                  : {
                      scale: 1.0,
                      borderColor: [
                        `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 0.85)`,
                        `rgba(255, ${255 - 250 * threatIntensity}, ${255 - 250 * threatIntensity}, 1)`,
                        `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 0.85)`,
                        `rgba(255, ${255 - 250 * threatIntensity}, ${255 - 250 * threatIntensity}, 1)`,
                        `rgba(255, ${255 - 110 * threatIntensity}, ${255 - 110 * threatIntensity}, 0.85)`,
                      ],
                      boxShadow: [
                        `0 0 ${8 + 8 * threatIntensity}px rgba(220, 10, 10, ${0.1 * threatIntensity})`,
                        `0 0 ${20 + 25 * threatIntensity}px rgba(255, 10, 10, ${0.9 * threatIntensity})`,
                        `0 0 ${8 + 8 * threatIntensity}px rgba(220, 10, 10, ${0.1 * threatIntensity})`,
                        `0 0 ${20 + 25 * threatIntensity}px rgba(255, 10, 10, ${0.9 * threatIntensity})`,
                        `0 0 ${8 + 8 * threatIntensity}px rgba(220, 10, 10, ${0.1 * threatIntensity})`,
                      ]
                    }
              }
              transition={
                isHoldingActive
                  ? { type: 'spring', stiffness: 300, damping: 15 }
                  : skullLevel === 0
                  ? { duration: 0.5 }
                  : isMaxThreat || !pulseActive
                  ? { duration: 1.0 }
                  : pulseTransition
              }
            >
              {activeCharImg ? (
                <img 
                  src={activeCharImg} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full pointer-events-none"
                />
              ) : null}
              {/* Real-time 3D Spherical bevel / edge shading overlays */}
              <div className="absolute inset-0 rounded-full pointer-events-none z-[10] shadow-[inset_0_4px_12px_rgba(255,255,255,0.45),_inset_0_-4px_12px_rgba(0,0,0,0.6)]" />
              <div className="absolute inset-0 rounded-full pointer-events-none z-[11] bg-gradient-to-tr from-transparent via-white/10 to-white/25 opacity-60" />
            </motion.div>

            {/* Front overlay cover */}
            <RibbonFront />
          </motion.div>
        </div>
      </div>

      {/* ==========================================
          5. ROOT RETRIEVE MAP ACTION TRIGGER (FULLY TOUCHING THE BOTTOM)
          ========================================== */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-[130] pointer-events-auto">
        <button
          onClick={onRestoreMap}
          className="px-2 py-1 text-amber-400 hover:text-white text-[8px] font-serif font-bold uppercase tracking-widest transition-all cursor-pointer border-t border-x border-amber-500/30 hover:border-amber-400/50 rounded-t-md bg-stone-950/95 hover:bg-stone-900/90 leading-none whitespace-nowrap shadow-[0_-2px_10px_rgba(234,179,8,0.1)] hover:shadow-[0_-2px_15px_rgba(234,179,8,0.25)]"
        >
          {t("Retrieve Map")}
        </button>
      </div>

      {/* ==========================================
          6. INTERACTIVE CUSTOM RPG COMPANION DETAILS PANEL (CONDITIONAL MINI OR FULL SLIDE-OVER)
          ========================================== */}
      <AnimatePresence>
        {activeSection && (
          isMenuEnlarged ? (
            <motion.div
              id="active-section-menu"
              key="full-menu"
              initial={{ x: '-50%', y: '-45%', scale: 0.95, opacity: 0 }}
              animate={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
              exit={{ x: '-50%', y: '-45%', scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 23 }}
              className={`absolute top-1/2 left-1/2 w-[480px] max-w-[95vw] h-[560px] max-h-[85vh] bg-stone-950/95 border border-amber-500/20 rounded-xl p-4 flex flex-col shadow-[0_10px_35px_rgba(0,0,0,0.85)] pointer-events-auto overflow-hidden text-stone-200 select-text ${
                ['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) ? '!py-1 !px-3' : ''
              }`}
              style={{
                zIndex: LAYER_HIERARCHY.COMPACT_SECTION_MENU,
              }}
            >
              {/* Gloss Highlight line */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

              {/* Header */}
              <div className={`flex items-center justify-between ${
                ['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) 
                  ? 'pb-1.5 border-b border-white/5 mb-1' 
                  : 'pb-2 border-b border-white/10 mb-3.5'
              }`}>
                <div className="flex items-center gap-2">
                  {(() => {
                    const activeNode = nodePositions.find(p => p.id === activeSection);
                    if (!activeNode) return null;
                    if (activeSection === 'starborn') {
                      return React.cloneElement(activeNode.icon, { size: 16 });
                    }
                    return activeNode.icon;
                  })()}
                  <span className="font-serif text-xs font-bold uppercase tracking-widest text-amber-200">
                    {activeSection === 'starborn' ? t("Starborn RPG") :
                     activeSection === 'magic' ? t("Magic") :
                     activeSection === 'weapons' ? t("Weapons") :
                     activeSection === 'compendium' ? t("Compendium") :
                     activeSection === 'journal' ? t("Journal") :
                     activeSection === 'inventory' ? t("Items") :
                     t((nodePositions.find(p => p.id === activeSection)?.name || "") + " Details")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setIsMenuEnlarged(false)}
                    className="text-stone-400 hover:text-white transition-colors text-[9px] font-mono uppercase bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer border border-white/5 flex items-center gap-1"
                    title="Contract to Mini-Menu"
                  >
                    <Minimize2 size={9} /> {t("Mini")}
                  </button>
                  <button 
                    onClick={() => setActiveSection(null)}
                    className="text-stone-400 hover:text-white transition-colors text-[9px] font-mono uppercase bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer border border-white/5"
                  >
                    {t("Close")}
                  </button>
                </div>
              </div>

              {/* Central Modular Custom Body Content */}
              <div className={`flex-1 overflow-y-auto pr-1 flex flex-col scrollbar-thin ${
                ['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) ? 'gap-0' : 'gap-3'
              }`}>
                {renderSectionContent(activeSection)}
              </div>

              {/* Combat Roll/Event Mini Log Console attached at the bottom of the card */}
              <div className={`${
                ['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) 
                  ? 'mt-1 border-t border-white/5 pt-1.5 flex flex-col gap-0' 
                  : 'mt-4 border-t border-white/5 pt-3 flex flex-col gap-1.5 h-24'
              }`}>
                <div className="flex items-center justify-between">
                  {!['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) && (
                    <span className="text-[7.5px] font-mono uppercase tracking-widest text-stone-500 block">Tabletop Action Logs:</span>
                  )}
                  {['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) && (
                    <div className="w-full flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          _setIsHistoryOpen(true);
                          playTactileSound(550, 'triangle', 0.08);
                        }}
                        className="text-cyan-400 hover:text-white transition-all bg-cyan-600/10 hover:bg-cyan-600/30 px-1.5 py-0.5 rounded border border-cyan-500/25 active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow-[0_2px_8px_rgba(6,182,212,0.15)] text-[7.5px] font-mono uppercase tracking-wider"
                        title={
                          activeSection === 'magic' ? t("View Magic Action History") : 
                          activeSection === 'starborn' ? t("View Starborn Action History") : 
                          activeSection === 'weapons' ? t("View Weapon Action History") :
                          activeSection === 'compendium' ? t("View Compendium Action History") :
                          t("View Journal Action History")
                        }
                      >
                        <History size={10} className="text-cyan-400" />
                        <span>{t("History")}</span>
                      </button>
                    </div>
                  )}
                </div>
                {!['starborn', 'magic', 'weapons', 'compendium', 'journal', 'inventory'].includes(activeSection) && (
                  <div 
                    className="flex-1 overflow-y-auto bg-stone-900/55 rounded p-1.5 border border-white/5 flex flex-col gap-1 text-[8px] font-mono"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {combatLogs.map((log, index) => {
                      const parsed = typeof log === 'string' ? createLogItem(log) : log;
                      return (
                        <div key={parsed.id || index} className={`whitespace-normal leading-normal ${index === 0 ? 'text-amber-400/95' : 'text-stone-500'}`}>
                          [{parsed.shortTimestamp}] {parsed.originalText}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              id="active-section-menu"
              key="mini-menu"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 23 }}
              className="absolute bg-stone-950/96 border border-stone-800 hover:border-violet-500/30 rounded-xl p-2 flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.95)] hover:shadow-[0_12px_45px_rgba(139,92,246,0.08)] pointer-events-auto overflow-hidden text-stone-200 select-text transition-all duration-300"
              style={{
                right: '0px',
                bottom: '102.375px', // Directly above the pentagram (270*0.379167)
                top: '38%',          // Increased height dynamically by setting top to 38% instead of 50%
                width: '153.5625px', // 50% wider than the pentagram width (102.375 * 1.5)
                zIndex: LAYER_HIERARCHY.COMPACT_SECTION_MENU,
              }}
            >
              {/* Gloss Highlight line */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-90" />

              {/* Compressed stack-based header designed for compact layout */}
              <div className="flex flex-col gap-0.5 border-b border-white/5 mb-1 py-0 px-1 bg-stone-900/15 rounded">
                <div className="flex items-center justify-between gap-1 w-full relative h-7">
                  {/* Top-left: Expand Button */}
                  <button 
                     onClick={() => setIsMenuEnlarged(true)}
                    className="text-stone-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-0 rounded border border-white/5 cursor-pointer flex items-center justify-center h-[20px] w-[20px]"
                    title="Expand Menu"
                  >
                    <Maximize2 size={13} />
                  </button>

                  {/* Center: Icon and Name of Section */}
                  <div className="flex items-center justify-center gap-1 min-w-0 flex-1 px-1 h-7">
                    {nodePositions.find(p => p.id === activeSection)?.icon && 
                      React.cloneElement(nodePositions.find(p => p.id === activeSection)!.icon, { size: 10 })
                    }
                    <span className="font-serif text-[7px] font-bold uppercase tracking-wider text-amber-200 truncate leading-none">
                       {t(nodePositions.find(p => p.id === activeSection)?.name || "")}
                    </span>
                  </div>

                  {/* Top-right: Close Button as "X" */}
                  <button 
                    onClick={() => setActiveSection(null)}
                    className="text-stone-400 hover:text-red-400 transition-all bg-white/5 hover:bg-white/10 p-0 rounded border border-white/5 cursor-pointer flex items-center justify-center h-[20px] w-[20px]"
                    title="Close Menu"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Magic Meter placement replacing the old button row */}
                <MagicMeter 
                  currentMagic={currentMagic}
                  maxMagic={maxMagic}
                />
              </div>

              {/* Central Modular Click-to-Roll list elements */}
              <div 
                className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-stone-850 scrollbar-track-transparent mt-0.5"
                style={{ scrollbarWidth: 'none' }}
              >
                {renderMiniSectionContent(activeSection)}
              </div>

              {/* Dedicated Footer Space for clean Rest Button execution */}
              <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between shrink-0 h-7 select-none">
                <span className="text-[7px] font-mono text-stone-500 uppercase tracking-widest">
                  {activeSection === 'magic' ? t("Rest Panel") : activeSection === 'starborn' ? t("Starborn History") : t("Status Ready")}
                </span>
                
                {activeSection === 'magic' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRestMenu(prev => !prev);
                    }}
                    className="text-emerald-400 hover:text-white transition-all bg-emerald-600/10 hover:bg-emerald-600/30 p-0 rounded border border-emerald-500/25 active:scale-95 flex items-center justify-center h-[20px] w-[20px] cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.15)]"
                    title="Rest to replenish Magic"
                  >
                    <Moon size={13} className="text-emerald-400" />
                  </button>
                )}

                {activeSection === 'starborn' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHistoryOpen(true);
                      playTactileSound(550, 'triangle', 0.08);
                    }}
                    className="text-cyan-400 hover:text-white transition-all bg-cyan-600/10 hover:bg-cyan-600/30 p-0 rounded border border-cyan-500/25 active:scale-95 flex items-center justify-center h-[20px] w-[20px] cursor-pointer shadow-[0_2px_8px_rgba(6,182,212,0.15)]"
                    title="View Starborn Action History"
                  >
                    <History size={13} className="text-cyan-400" />
                  </button>
                )}
              </div>

              {/* Popover / Overlay Rest Options Dialog */}
              {activeSection === 'magic' && showRestMenu && (
                <div 
                  id="rest-menu-overlay"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRestMenu(false);
                  }}
                  className="absolute bottom-1.5 left-1.5 right-1.5 bg-stone-950 border border-emerald-500/35 rounded-lg p-1 flex items-center justify-center gap-1 z-[130] text-[7.5px] font-mono shadow-[0_4px_16px_rgba(0,0,0,0.85)] cursor-pointer"
                  title="Click empty space to close"
                >
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="w-[32px] bg-stone-900 border border-emerald-500/20 hover:border-emerald-500/40 focus-within:border-emerald-500/50 transition-all h-5 rounded flex items-center overflow-hidden shrink-0"
                  >
                    <input
                      type="text"
                      value={customPercent === 0 ? '' : tn(customPercent)}
                      onChange={(e) => {
                        const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
                        const val = parseInt(normalized.replace(/\D/g, ''), 10);
                        setCustomPercent(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                      }}
                      className="w-[18px] bg-transparent text-center text-emerald-350 font-bold font-mono outline-none border-none p-0 h-full text-[7px]"
                      title="Custom rest percentage"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const amount = Math.round((customPercent / 100) * maxMagic);
                        setCurrentMagic(prev => Math.min(maxMagic, prev + amount));
                        playTactileSound(600, 'sine', 0.15);
                        addCombatLog(`[Tabletop Rest]: Caster takes a rest, replenishing magic pool by ${customPercent}% (+${amount} ✨).`);
                        setShowRestMenu(false);
                      }}
                      className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/25 active:bg-emerald-500/40 text-emerald-400 font-extrabold flex items-center justify-center h-full border-l border-emerald-500/20 hover:text-white transition-colors cursor-pointer text-[7px]"
                      title="Restore custom percentage"
                    >
                      %
                    </button>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const amount = Math.round((25 / 100) * maxMagic);
                      setCurrentMagic(prev => Math.min(maxMagic, prev + amount));
                      playTactileSound(600, 'sine', 0.15);
                      addCombatLog(`[Tabletop Rest]: Caster takes a rest, replenishing magic pool by 25% (+${amount} ✨).`);
                      setShowRestMenu(false);
                    }}
                    className="flex-1 bg-stone-900/90 border border-emerald-500/15 hover:border-emerald-500/40 hover:bg-emerald-950/30 text-emerald-350 transition-all h-5 rounded cursor-pointer text-[7px] font-bold flex items-center justify-center leading-none"
                    title="Restore 25% of magic pool"
                  >
                    1/4
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const amount = Math.round((50 / 100) * maxMagic);
                      setCurrentMagic(prev => Math.min(maxMagic, prev + amount));
                      playTactileSound(600, 'sine', 0.15);
                      addCombatLog(`[Tabletop Rest]: Caster takes a rest, replenishing magic pool by 50% (+${amount} ✨).`);
                      setShowRestMenu(false);
                    }}
                    className="flex-1 bg-stone-900/90 border border-emerald-500/15 hover:border-emerald-500/40 hover:bg-emerald-950/30 text-emerald-350 transition-all h-5 rounded cursor-pointer text-[7px] font-bold flex items-center justify-center leading-none"
                    title="Restore 50% of magic pool"
                  >
                    1/2
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const amount = maxMagic;
                      setCurrentMagic(maxMagic);
                      playTactileSound(600, 'sine', 0.15);
                      addCombatLog(`[Tabletop Rest]: Caster takes a rest, fully replenishing magic pool (+${amount} ✨).`);
                      setShowRestMenu(false);
                    }}
                    className="flex-1 bg-emerald-950/40 border border-emerald-500/35 hover:bg-emerald-500/35 text-emerald-100 transition-all h-5 rounded cursor-pointer text-[7px] font-black flex items-center justify-center leading-none"
                    title="Fully restore magic pool"
                  >
                    {t("FULL")}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRestMenu(false);
                      playTactileSound(400, 'sine', 0.05);
                    }}
                    className="h-5 w-5 bg-stone-900 border border-white/10 hover:border-white/30 text-stone-400 hover:text-white rounded flex items-center justify-center cursor-pointer transition-all shrink-0"
                    title="Close"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* ==========================================
          GLOBAL FLOATING HIGH-PRIORITY HOVER LABELS
          (Avoids scale distortion, parent boundaries and remains unblockable)
          ========================================== */}
      <AnimatePresence>
        {visibleLabelId && (() => {
          const pos = nodePositions.find(p => p.id === visibleLabelId);
          if (!pos) return null;
          const s = 0.379167;
          // Calculate exact center screen-space coordinate from bottom-right corner
          const rPx = (315 - pos.x) * s;
          const bPx = (315 - pos.y) * s;
          return (
            <motion.div
              key={`global-node-label-${pos.id}`}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="absolute pointer-events-none bg-stone-950/95 border border-amber-500/35 px-2.5 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.85)] text-[9px] font-mono uppercase tracking-widest text-amber-400/90 whitespace-nowrap z-[999999]"
              style={{
                left: `calc(100% - ${rPx}px)`,
                top: `calc(100% - ${bPx}px + 14px)`,
                x: "-50%",
              }}
            >
              {t(pos.name)}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <SpellBuilder 
        isOpen={isSpellBuilderOpen}
        onClose={() => {
          setIsSpellBuilderOpen(false);
          setSpellToEdit(null);
        }}
        playTactileSound={playTactileSound}
        onForgeSpell={handleForgeSpell}
        spellToEdit={spellToEdit}
        magicLevel={magicLevel}
        setMagicLevel={setMagicLevel}
      />

      <ItemCreator
        isOpen={isItemCreatorOpen}
        onClose={() => {
          setIsItemCreatorOpen(false);
          setItemToEdit(null);
        }}
        playTactileSound={playTactileSound}
        onForgeItem={handleForgeItem}
        itemToEdit={itemToEdit}
        addCombatLog={addCombatLog}
      />

      {/* Spell Held Info Modal */}
      <AnimatePresence>
        {heldSpellInfo && (() => {
          const affInfo = getSpellAffinities(heldSpellInfo);
          const bs = heldSpellInfo.builderState || {
            affinity: affInfo.schools[0] || 'Evocation',
            selectedSubtypes: heldSpellInfo.builderState?.selectedSubtypes || { Evocation: ['Force'] },
            effPoints: heldSpellInfo.builderState?.effPoints || { burst: 1 },
            targetCounts: heldSpellInfo.builderState?.targetCounts || heldSpellInfo.diceCount || 1,
            targetOrigin: heldSpellInfo.builderState?.targetOrigin || 1,
            targetRange: heldSpellInfo.builderState?.targetRange || 1,
            scalePoints: heldSpellInfo.builderState?.scalePoints || { CM: 1 },
            durationActive: heldSpellInfo.builderState?.durationActive || 'Action',
            durationPoints: heldSpellInfo.builderState?.durationPoints || { Action: 1 },
            powerActive: tempPowerActive,
            powerPoints: tempPowerPoints,
            selectedRestrictions: tempSelectedRestrictions
          };

          const dynResult = calculateDynamicSpellResult(bs, tempPowerActive, tempPowerPoints, tempSelectedRestrictions);
          const finalCost = dynResult.cost;
          const finalDiceCount = dynResult.diceCount;
          const finalDiceSize = dynResult.diceSize;
          const finalModifier = dynResult.modifier;
          const currentSavings = dynResult.restrictionSavings;

          const displayCategory = heldSpellInfo.category === 'combat' 
            ? 'Combat' 
            : heldSpellInfo.category === 'auxiliary' 
              ? 'Auxiliary' 
              : 'Transformation';

          const categoryStyle = heldSpellInfo.category === 'combat'
            ? 'border-rose-500/30 bg-rose-500/5 text-rose-400'
            : heldSpellInfo.category === 'auxiliary'
              ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400'
              : 'border-purple-500/30 bg-purple-500/5 text-purple-400';

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 cursor-default select-text"
              onClick={() => setHeldSpellInfo(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-sm bg-stone-900 border border-violet-500/30 rounded-xl p-3 overflow-hidden text-stone-200 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600" />
                
                {/* Title Bar area - Compact & All on One Line */}
                <div className="flex justify-between items-center mb-2 pt-0.5 border-b border-white/5 pb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles size={11} className="text-amber-400 shrink-0" />
                    <h4 className="text-xs font-serif font-bold text-violet-300 truncate leading-none">
                      {heldSpellInfo.name}
                    </h4>
                    <span className={`text-[7px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border leading-none shrink-0 ${categoryStyle}`}>
                      {displayCategory}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono font-bold bg-violet-950/40 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded leading-none shrink-0">
                      {finalCost} Magic
                    </span>

                    <button
                      onClick={() => {
                        setSpellToEdit(heldSpellInfo);
                        setIsSpellBuilderOpen(true);
                        setHeldSpellInfo(null);
                        playTactileSound(600, 'triangle', 0.1);
                      }}
                      className="p-1 px-1.5 text-stone-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/5 rounded transition-all cursor-pointer flex items-center justify-center h-5 w-5 spell-builder-trigger"
                      title="Edit Spell Matrix"
                    >
                      <Edit3 size={10} />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${heldSpellInfo.name}?`)) {
                          handleDeleteSpell(heldSpellInfo.id);
                          setHeldSpellInfo(null);
                          playTactileSound(300, 'sawtooth', 0.15);
                        }
                      }}
                      className="p-1 px-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 rounded transition-all cursor-pointer flex items-center justify-center h-5 w-5"
                      title="Delete Spell"
                    >
                      <Trash2 size={10} />
                    </button>

                    <button
                      onClick={() => {
                        setHeldSpellInfo(null);
                        playTactileSound(400, 'sine', 0.05);
                      }}
                      className="p-1 px-1.5 text-stone-400 hover:text-white hover:bg-white/10 border border-white/5 rounded transition-all cursor-pointer flex items-center justify-center h-5 w-5"
                      title="Close"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
                {/* Sub-scroll Container for Body details */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none pr-0.5 pb-1 text-[10px]">
                  
                  {/* Description Section */}
                  <div className="bg-stone-950/40 rounded-lg p-2 border border-white/5 font-mono">
                    <span className="text-[7px] font-bold text-stone-500 uppercase tracking-widest block mb-0.5">{t("Description")}</span>
                    <p className="text-[9.5px] text-stone-300 italic leading-snug">
                      {(() => {
                        const rawDesc = heldSpellInfo.builderState?.spellDesc || heldSpellInfo.description || '';
                        const flavorText = cleanSpellDescription(rawDesc);
                        return t(flavorText) || t('An arcane forged spell matrix.');
                      })()}
                    </p>
                  </div>

                  {/* SPELL MATRIX INTERFACE (Smaller display-only visualizer) */}
                  <div className="border border-white/5 bg-stone-950/15 rounded-lg p-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-0.5 text-[7px] font-mono uppercase">
                      <span className="font-bold text-violet-300 tracking-widest">
                        {t("Spell Build")}
                      </span>
                      <span className="text-stone-500">
                        {t("Level")} {bs.magicLevel !== undefined ? bs.magicLevel : 1} {t("Source")}
                      </span>
                    </div>

                    {/* Matrix Parameters Grid */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono">
                      {/* Application */}
                      <div className="flex flex-col">
                        <span className="text-[6.5px] text-stone-500 uppercase font-black">{t("1. Application")}</span>
                        <div className="text-stone-350 leading-tight">
                          {Object.keys(bs.selectedSubtypes || {}).map(school => {
                            const subs = bs.selectedSubtypes[school];
                            if (!subs || subs.length === 0) return null;
                            return (
                              <div key={school} className="truncate">
                                <span className="text-violet-400 capitalize">{t(school)}</span>: {subs.map((s: string) => t(s)).join(', ')}
                              </div>
                            );
                          }).filter(Boolean).length > 0 ? Object.keys(bs.selectedSubtypes || {}).map(school => {
                            const subs = bs.selectedSubtypes[school];
                            if (!subs || subs.length === 0) return null;
                            return (
                              <div key={`app-school-${school}`} className="truncate">
                                <span className="text-violet-400 capitalize">{t(school)}</span>: {subs.map((s: string) => t(s)).join(', ')}
                              </div>
                            );
                          }) : <span className="text-stone-500">{t("None Specified")}</span>}
                        </div>
                      </div>

                      {/* Effect */}
                      <div className="flex flex-col">
                        <span className="text-[6.5px] text-stone-500 uppercase font-black">{t("2. Effect")}</span>
                        <div className="text-stone-350 truncate">
                          {(() => {
                            const activeKeys = Object.keys(bs.effPoints || {}).filter(k => (bs.effPoints[k] || 0) > 0);
                            if (activeKeys.length === 0) return <span className="text-stone-500">{t("None Specified")}</span>;
                            return activeKeys.map((k, idx) => {
                              const formattedKey = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
                              return (
                                <span key={k} className="mr-1 inline-block">
                                  {t(formattedKey)}{idx < activeKeys.length - 1 ? ',' : ''}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Targeting */}
                      <div className="flex flex-col border-t border-white/5 pt-1">
                        <span className="text-[6.5px] text-stone-500 uppercase font-black">{t("3. Targeting")}</span>
                        <div className="text-stone-350 flex flex-col gap-0.5">
                          {(() => {
                            const rangeOpt = RANGE_DETAILS.find(r => r.value === bs.targetRange) || RANGE_DETAILS[0];
                            return (
                              <>
                                <div>{t("Count")}: {bs.targetCounts || 1}</div>
                                <div>{t("Origin")}: {bs.targetOrigin || 1}</div>
                                <div>{t("Range")}: {t(rangeOpt.label)}</div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Hold scale/duration */}
                      <div className="flex flex-col border-t border-white/5 pt-1">
                        <span className="text-[6.5px] text-stone-500 uppercase font-black">{t("4. Hold & Duration")}</span>
                        <div className="text-stone-355 flex flex-col gap-0.5">
                          {(() => {
                            const scaleId = Object.keys(bs.scalePoints || {}).find(k => (bs.scalePoints[k] || 0) > 0) || 'CM';
                            const scaleOpt = SCALE_OPTIONS.find(o => o.id === scaleId) || SCALE_OPTIONS[0];
                            return (
                              <>
                                <div>{t("Scale")}: {t(scaleOpt.name)}</div>
                                <div className="truncate">{t("Duration")}: {t(bs.durationActive || 'Action')}</div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Energy */}
                      <div className="flex flex-col border-t border-white/5 pt-1">
                        <span className="text-[6.5px] text-stone-500 uppercase font-black">{t("5. Energy")}</span>
                        <div className="text-stone-350 truncate">
                          {finalDiceCount} {t("Dice")}
                        </div>
                      </div>

                      {/* Restrictions */}
                      <div className="flex flex-col border-t border-white/5 pt-1">
                        <span className="text-[6.5px] text-stone-500 uppercase font-black">{t("6. Restrictions")}</span>
                        <div className="text-stone-350 truncate">
                          {tempSelectedRestrictions.filter(Boolean).length > 0
                            ? tempSelectedRestrictions.filter(Boolean).map(restId => {
                                const restOpt = RESTRICTION_OPTIONS.find(o => o.id === restId);
                                const bp = restOpt ? restOpt.bonus : 0;
                                return `${t(restId)} [${bp}]`;
                              }).join(', ')
                            : t('None Specified')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weaknesses and Strengths Section - Side by Side Column Grid */}
                  <div className="grid grid-cols-2 gap-1.5 p-2 bg-violet-950/10 border border-violet-500/10 rounded-lg text-[7.5px]">
                    {/* Effective against */}
                    <div className="min-w-0">
                      <span className="text-[7px] font-mono font-black text-emerald-400 uppercase tracking-widest flex items-center gap-0.5">
                        <Check size={8} /> {t("EFFECTIVE")}
                      </span>
                      <span className="text-stone-400 text-[6.5px] block truncate font-mono uppercase">{t("Vs Core Elements")}</span>
                      <ul className="list-disc pl-2 text-stone-300 leading-tight mt-0.5 space-y-0.5">
                        {affInfo.effective.map((eff, i) => (
                          <li key={i} className="truncate">{t(eff)}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Weak against */}
                    <div className="border-l border-white/5 pl-1.5 min-w-0">
                      <span className="text-[7px] font-mono font-black text-rose-400 uppercase tracking-widest flex items-center gap-0.5">
                        <X size={8} /> {t("WEAK")}
                      </span>
                      <span className="text-stone-400 text-[6.5px] block truncate font-mono uppercase">{t("Opposed matrices")}</span>
                      <ul className="list-disc pl-2 text-stone-300 leading-tight mt-0.5 space-y-0.5">
                        {affInfo.weak.map((wk, i) => (
                          <li key={i} className="truncate">{t(wk)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>

                {/* Actions / Cast Matrix Button group */}
                <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1.5 shrink-0 gap-2">
                  
                  {/* Compact Energy Increment Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[7px] font-mono text-stone-400 uppercase font-bold">{t("Energy")}:</span>
                    <div className="flex items-center bg-stone-950 border border-white/10 rounded overflow-hidden h-5.5 font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = tempPowerPoints[tempPowerActive] || 1;
                          if (currentVal > 1) {
                            setTempPowerPoints(prev => ({
                              ...prev,
                              [tempPowerActive]: currentVal - 1
                            }));
                            playTactileSound(420, 'sine', 0.05);
                          }
                        }}
                        className="px-1.5 h-full hover:bg-stone-850 text-stone-400 hover:text-white transition-colors cursor-pointer border-r border-white/5 flex items-center justify-center text-[8px]"
                      >
                        <Minus size={6} />
                      </button>

                      <input
                        type="text"
                        value={tn(tempPowerPoints[tempPowerActive] || 1)}
                        onChange={(e) => {
                          const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
                          let parsed = parseInt(normalized.replace(/\D/g, ''), 10);
                          if (isNaN(parsed) || parsed < 1) parsed = 1;
                          setTempPowerPoints(prev => ({
                            ...prev,
                            [tempPowerActive]: Math.min(100, parsed)
                          }));
                        }}
                        className="w-5 text-center bg-transparent text-[8.5px] font-bold text-stone-250 border-none p-0 focus:outline-none focus:ring-0"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = tempPowerPoints[tempPowerActive] || 1;
                          if (currentVal < 100) {
                            setTempPowerPoints(prev => ({
                              ...prev,
                              [tempPowerActive]: currentVal + 1
                            }));
                            playTactileSound(620, 'sine', 0.05);
                          }
                        }}
                        className="px-1.5 h-full hover:bg-stone-850 text-stone-400 hover:text-white transition-colors cursor-pointer border-l border-white/5 flex items-center justify-center text-[8px]"
                      >
                        <Plus size={6} />
                      </button>
                    </div>
                  </div>

                  {/* Cast Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        rollFormula(heldSpellInfo.name + " (" + t("Free") + ")", finalDiceCount, finalDiceSize, finalModifier);
                        setHeldSpellInfo(null);
                        playTactileSound(750, 'sine', 0.1);
                      }}
                      className="px-2.5 py-1 bg-stone-850 hover:bg-stone-800 hover:text-white transition-all text-stone-300 font-mono text-[8.5px] font-black uppercase rounded cursor-pointer border border-white/10 shrink-0"
                    >
                      {t("Free Cast")}
                    </button>

                    <button
                      disabled={finalCost > currentMagic}
                      onClick={() => {
                        const castSuccessful = castSpellAction(heldSpellInfo.name, finalDiceCount, finalDiceSize, finalModifier, finalCost);
                        if (castSuccessful) {
                          setHeldSpellInfo(null);
                        }
                      }}
                      className={`px-3.5 py-1 font-mono uppercase tracking-wider text-[8.5px] font-black rounded transition-all shadow-md shrink-0 ${
                        finalCost > currentMagic
                          ? 'opacity-40 bg-stone-800 text-stone-600 border border-stone-850 cursor-not-allowed'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white cursor-pointer hover:scale-102 active:scale-98'
                      }`}
                    >
                      {finalCost > currentMagic ? t('Insufficient') : t('Cast Spell')}
                    </button>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ----------------------------------------------------
          STAT EXTRA EXPLANATION & PROGRESS MODAL WRAPPER
          ---------------------------------------------------- */}
      <AnimatePresence>
        {activeExplainStat && (() => {
          const info = STAT_DETAILS[activeExplainStat];
          if (!info) return null;

          // Retrieve latest score and XP in real-time
          const scoreSaved = safeStorage.getItem(`vtt_stat_${activeExplainStat}`);
          const parsedScore = scoreSaved !== null ? parseInt(scoreSaved, 10) : NaN;
          const score = !isNaN(parsedScore) ? parsedScore : (activeExplainStat === 'mind' ? 14 : activeExplainStat === 'magic' ? 16 : 10);
          const currentXP = getStatXP(activeExplainStat);
          const requiredXP = getRequiredXPForNextLevel(score);
          const remainingXP = Math.max(0, requiredXP - currentXP);
          const modifier = Math.floor(score / 10);

          return (
            <motion.div
              id="stat-explain-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
              onClick={() => setActiveExplainStat(null)}
            >
              <motion.div
                id="stat-explain-modal-card"
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-[340px] rounded-lg bg-[#0c0a09] border border-stone-800 text-stone-100 flex flex-col overflow-hidden relative shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Antique corner brackets decor */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-stone-700 pointer-events-none" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-stone-700 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-stone-700 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-stone-700 pointer-events-none" />

                {/* Main Color Stripe Accent */}
                <div className="h-[3px] w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

                {/* Header */}
                <div className="p-4 pb-3 flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-stone-900/40 to-transparent">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold font-serif uppercase tracking-wider text-stone-100">
                      {info.name}
                    </span>
                    {resetConfirmStat === activeExplainStat ? (
                      <span className="text-[9px] font-mono font-black text-red-500 animate-pulse tracking-wider">
                        {t("CONFIRM RESET: CLICK RESET AGAIN")}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-black text-amber-500 tracking-wider">
                        SCORE: {score} • MOD: {modifier >= 0 ? '+' : ''}{modifier}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (resetConfirmStat === activeExplainStat) {
                          safeStorage.setItem(`vtt_stat_${activeExplainStat}`, "0");
                          saveStatXP(activeExplainStat, 0);
                          window.dispatchEvent(new Event('tabletop-state-update'));
                          setResetConfirmStat(null);
                          playTactileSound(150, 'sawtooth', 0.25);
                        } else {
                          setResetConfirmStat(activeExplainStat);
                          playTactileSound(200, 'sine', 0.15);
                        }
                      }}
                      title={resetConfirmStat === activeExplainStat ? t("Confirm Reset to Level 0, Exp 0") : t("Reset Stat to Level 0, Exp 0")}
                      style={{
                        outline: 'none',
                        boxShadow: resetConfirmStat === activeExplainStat 
                          ? '0 0 10px rgba(239, 68, 68, 0.45), inset 0 0 4px rgba(239, 68, 68, 0.3)' 
                          : 'none',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                        resetConfirmStat === activeExplainStat
                          ? "bg-red-950/85 text-red-100 border-red-500 hover:bg-red-900/90 active:scale-95"
                          : "hover:bg-red-950/45 hover:text-red-400 border-transparent hover:border-red-900/40 text-stone-400 active:scale-95"
                      }`}
                    >
                      <RotateCcw 
                        size={14} 
                        style={{
                          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                        className={resetConfirmStat === activeExplainStat ? "rotate-[-180deg] text-red-400 scale-110" : ""}
                      />
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveExplainStat(null);
                        playTactileSound(440, 'sine', 0.05);
                      }}
                      className="p-1.5 rounded-full hover:bg-stone-900 border border-transparent hover:border-white/5 text-stone-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[300px] scrollbar-none text-left">
                  <p className="text-[10px] text-stone-300 leading-relaxed italic">
                    {info.description}
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-mono text-stone-500 uppercase tracking-widest">{t("Stat Affinities & Features")}</span>
                    <ul className="flex flex-col gap-1 pl-1">
                      {info.features.map((feature, i) => (
                        <li key={i} className="text-[9.5px] text-stone-400 leading-normal flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5 shrink-0">✦</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Meter Progress Bar (Structured similar to the magic meter but filling) */}
                  <div className="flex flex-col border-t border-white/5 pt-3.5 mt-0.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-mono text-stone-500 uppercase tracking-widest">{t("Experience Bar")}</span>
                      <span className="text-[9.5px] font-mono font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                        {t("LEVEL")} {score}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 font-mono">
                      <div className="w-full h-1.5 rounded-full bg-stone-950 p-[1px] border border-white/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                          style={{ width: `${Math.min(100, (currentXP / requiredXP) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[7.5px] font-bold text-stone-500">
                        <span className="text-amber-300 flex items-center gap-1">
                          XP: 
                          <input
                            type="text"
                            value={tn(currentXP)}
                            onChange={(e) => {
                              const normalized = e.target.value.replace(/[٠-٩]/g, (w) => String(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].indexOf(w)));
                              const val = parseInt(normalized.replace(/\D/g, ''));
                              const cleaned = isNaN(val) ? 0 : val;
                              saveStatXP(activeExplainStat, cleaned);
                              window.dispatchEvent(new Event('tabletop-state-update'));
                            }}
                            className="w-10 select-text cursor-text bg-stone-900/60 hover:bg-stone-900 border border-amber-500/10 focus:border-amber-500/40 focus:bg-stone-950 rounded text-center text-amber-300 focus:outline-none font-bold text-[7.5px] py-0 px-0.5 font-mono"
                          />
                          / {tn(requiredXP)} XP
                        </span>
                        <span className="text-stone-400">{remainingXP === 0 ? t("MAXED") : `${tn(remainingXP)} ${t("remains")}`}</span>
                      </div>
                      <div className="flex justify-between items-center text-[7.5px] font-mono mt-1 border-t border-white/5 pt-1.5 text-stone-500">
                        <span>{t("Formula")}: <span className="text-amber-500 font-bold">Next Level = Level {score} + 1</span></span>
                        <span className="text-amber-400/85">+{getRequiredXPForNextLevel(score + 1)} Max XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer and Interactive Roll option */}
                <div className="p-4 pt-2.5 pb-4.5 bg-stone-950/60 border-t border-white/5 flex flex-col items-stretch">
                  <button
                    onClick={() => {
                      playTactileSound(600, 'triangle', 0.1);
                      rollFormula(`${info.name} Check`, modifier + 1, 6, 0, activeExplainStat);
                    }}
                    className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-mono uppercase font-black text-[9px] rounded tracking-wider shadow-lg border border-amber-500/20 active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Dice5 size={12} className="text-stone-950 stroke-[3]" />
                    <span>{t("Roll Stat Check")} ({modifier + 1}D6)</span>
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ----------------------------------------------------
          STARBORN ACTION HISTORY DIALOG / MODAL WRAPPER
          ---------------------------------------------------- */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            id="starborn-history-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
            onClick={() => setIsHistoryOpen(false)}
          >
            <motion.div
              id="starborn-history-modal-card"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-[340px] h-[460px] rounded-lg bg-[#0c0a09] border border-stone-800 text-stone-100 flex flex-col overflow-hidden relative shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Antique corner brackets decor */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-stone-700 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-stone-700 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-stone-700 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-stone-700 pointer-events-none" />

              {/* Main Color Stripe Accent */}
              <div className="h-[3px] w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

              {/* Header */}
              <div className="p-4 pb-3 flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-stone-900/40 to-transparent">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-cyan-400" />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold font-serif uppercase tracking-wider text-stone-100">
                      {t("Starborn History")}
                    </span>
                    <span className="text-[9px] font-mono font-black text-cyan-400 tracking-wider">
                      {t("CHRONICLE OF ACTIONS")}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setIsHistoryOpen(false);
                    playTactileSound(440, 'sine', 0.05);
                  }}
                  className="p-1.5 rounded-full hover:bg-stone-900 border border-transparent hover:border-white/5 text-stone-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="p-2.5 flex-1 flex flex-col gap-1.5 overflow-y-auto scrollbar-thin text-left">
                {combatLogs.length === 0 ? (
                  <p className="text-[10px] text-stone-500 leading-relaxed italic text-center py-4">
                    {t("No actions recorded in this chronicle yet.")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {combatLogs.map((log, index) => {
                      const parsed = typeof log === 'string' ? createLogItem(log) : log;
                      return (
                        <div 
                          key={parsed.id || index} 
                          onClick={() => {
                            setSelectedLog(parsed);
                            setEditingNoteText(parsed.note || '');
                            playTactileSound(550, 'triangle', 0.08);
                          }}
                          className={`py-0.5 px-2 rounded-sm bg-stone-900/40 hover:bg-stone-850/60 border border-white/5 hover:border-cyan-500/20 flex items-center justify-between gap-1.5 cursor-pointer transition-all active:scale-[0.99] select-none ${index === 0 ? 'bg-cyan-950/20 border-cyan-500/30 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/10' : ''}`}
                        >
                          <p className="text-[9px] text-stone-200 truncate flex-1 flex items-center m-0 p-0 leading-none gap-1.5 overflow-hidden">
                            <span className="text-[6.5px] font-mono font-black text-cyan-400 bg-cyan-950/30 px-1 py-0.5 rounded-sm border border-cyan-800/15 shrink-0 inline-flex items-center justify-center min-w-[45px] text-center uppercase tracking-wider h-[14px]">
                               {parsed.type}
                            </span>
                            <span className="border-l border-white/10 h-2.5 shrink-0" />
                            <span className="truncate text-stone-300 font-sans text-[8.5px] flex-1 text-left min-w-0">
                              {parsed.explanation}
                              {parsed.note && (
                                <span className="text-[7px] text-cyan-400 font-mono ml-1 px-1 bg-cyan-950/20 rounded-sm border border-cyan-500/10 shrink-0">
                                  📝 {parsed.note}
                                </span>
                              )}
                            </span>
                            {parsed.result && (
                              <span className="text-[8.5px] font-mono text-emerald-400 font-black shrink-0 ml-1">
                                | {parsed.result}
                              </span>
                            )}
                          </p>
                          <span className="text-[7.5px] font-mono text-stone-500 shrink-0 select-none tracking-tight">
                            {parsed.shortTimestamp}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 pt-2.5 pb-4.5 bg-stone-950/60 border-t border-white/5 flex flex-col items-stretch">
                <button
                  onClick={() => {
                    setIsHistoryOpen(false);
                    playTactileSound(440, 'sine', 0.05);
                  }}
                  className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-stone-950 font-mono uppercase font-black text-[9px] rounded tracking-wider shadow-lg border border-cyan-500/20 active:scale-97 transition-all cursor-pointer flex items-center justify-center"
                >
                  <span>{t("Close Chronicles")}</span>
                </button>
              </div>

              {/* Slide-up detailed overlay and control drawer */}
              <AnimatePresence>
                {selectedLog && (
                  <motion.div
                    initial={{ opacity: 0, y: "100%" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    className="absolute inset-x-0 bottom-0 top-[12%] bg-stone-950 border-t border-stone-800 flex flex-col gap-2.5 font-sans text-left z-50 text-stone-100 p-4 overflow-y-auto scrollbar-thin"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-white/5 pb-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[7.5px] font-mono text-cyan-400 font-bold uppercase tracking-widest">{t("Action Details")}</span>
                        <span className="text-[9px] font-mono text-stone-400">{selectedLog.timestamp}</span>
                      </div>
                      <button
                        onClick={() => setSelectedLog(null)}
                        className="p-1 rounded hover:bg-stone-900 border border-transparent hover:border-white/5 text-stone-400 hover:text-white transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Explanation */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[7.5px] font-mono text-stone-500 font-bold uppercase tracking-wider">{t("Full Explanation:")}</span>
                      <div className="p-2.5 rounded bg-stone-900/40 border border-white/5 text-[10.5px] text-stone-200 leading-relaxed font-sans select-text whitespace-pre-wrap max-h-[85px] overflow-y-auto scrollbar-thin">
                        {formatLogToSentenceCase(selectedLog.originalText)}
                      </div>
                    </div>

                    {/* Note Annotation */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-[7.5px] font-mono text-stone-500 font-bold uppercase tracking-wider">{t("Annotations:")}</label>
                      <input
                        type="text"
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 focus:border-cyan-500/50 rounded px-2 py-1 text-[10px] text-stone-100 focus:outline-none transition-all placeholder:text-stone-600"
                        placeholder={t("Add a custom action note...")}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveNote(selectedLog.id, editingNoteText);
                            setSelectedLog(null);
                          }
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          handleSaveNote(selectedLog.id, editingNoteText);
                          setSelectedLog(null);
                        }}
                        className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-mono font-black text-[8.5px] rounded tracking-wider shadow-md active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>{t("SAVE")}</span>
                      </button>

                      <button
                        onClick={() => {
                          handleUndo(selectedLog);
                          setSelectedLog(null);
                        }}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-mono font-black text-[8.5px] rounded tracking-wider shadow-md active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-1"
                        title="Undo this state change and remove log"
                      >
                        <span>{t("UNDO")}</span>
                      </button>

                      <button
                        onClick={() => {
                          handleDelete(selectedLog.id);
                          setSelectedLog(null);
                        }}
                        className="px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-450 hover:text-rose-400 font-mono font-black text-[8.5px] rounded tracking-wide shadow-md border border-rose-500/20 active:scale-97 transition-all cursor-pointer flex items-center justify-center"
                        title="Delete log permanently"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
