import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, Sword, Shield, Trash2, Hammer, 
  HelpCircle, Archive, Plus, Minus, Info, Package
} from 'lucide-react';
import { useTranslation } from '../../../99_settings/language';
import { LAYER_HIERARCHY } from '../../../layers';

export interface CustomItem {
  id: string;
  name: string;
  icon: string;
  category: 'weapons' | 'gear' | 'utility';
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  power: string;
  perditor: string;
  virtus: string;
  cost: string;
  nature: string;
  natureDropdownValue?: string;
  effect: string;
  focus: string;
  terminus: string;
  description: string;
  quantity: number;
  isArtifact?: boolean;
  isWeapon?: boolean;
  powerValue?: number;
  equipSlots?: string[];
}

interface ItemCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  playTactileSound: (freq?: number, type?: OscillatorType, duration?: number) => void;
  onForgeItem: (item: CustomItem) => void;
  itemToEdit?: CustomItem | null;
  addCombatLog: (msg: string) => void;
}

const RARITY_BUDGETS = {
  Common: 3,
  Uncommon: 5,
  Rare: 7,
  Epic: 9,
  Legendary: 12
};

const EFFECT_ARCHETYPES = {
  Offensive: ['Bane', 'Suppress', 'Consume'],
  Manipulative: ['Bestow', 'Transform', 'Bind'],
  Protective: ['Ward', 'Reveal', 'Restore']
} as const;

const POPULAR_EMOJIS = ['📦', '⚔️', '🏹', '🛡️', '🎽', '🥾', '👑', '📿', '🧪', '🎒', '🧭', '🎗️', '🔑', '📜', '💠', '🪐', '💫', '🔋'];

export default function ItemCreator({
  isOpen,
  onClose,
  playTactileSound,
  onForgeItem,
  itemToEdit,
  addCombatLog
}: ItemCreatorProps) {
  const { t } = useTranslation();

  // Basic Form States
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [category, setCategory] = useState<'weapons' | 'gear' | 'utility'>('weapons');
  const [rarity, setRarity] = useState<'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'>('Common');
  const [selectedEmoji, setSelectedEmoji] = useState('📦');

  // State flags for Artifact / Weapon
  const [isArtifact, setIsArtifact] = useState<boolean>(false);
  const [isWeapon, setIsWeapon] = useState<boolean>(false);

  // Stats Mechanics
  const [powerType, setPowerType] = useState<'damage' | 'stat' | 'empty'>('damage');
  const [diceCount, setDiceCount] = useState(1);
  const [diceSize, setDiceSize] = useState(8);
  const [powerModifier, setPowerModifier] = useState(3);
  const [powerValue, setPowerValue] = useState<number>(3);
  const [powerStatBonusType, setPowerStatBonusType] = useState<string>('DEF');
  const [powerStatBonusValue, setPowerStatBonusValue] = useState<number>(2);

  const [perditorLevel, setPerditorLevel] = useState<number>(1);
  const [virtusStat, setVirtusStat] = useState<string>('WIS');
  const [virtusValue, setVirtusValue] = useState<number>(2);
  const [hasVirtus, setHasVirtus] = useState<boolean>(true);
  const [selectedVirtusStats, setSelectedVirtusStats] = useState<string[]>([]);
  const [selectedAnimaStats, setSelectedAnimaStats] = useState<string[]>([]);
  const [selectedEquipSlots, setSelectedEquipSlots] = useState<string[]>([]);
  
  // Visibility for Effects rows
  const [showOffensiveSub, setShowOffensiveSub] = useState<boolean>(false);
  const [showManipulativeSub, setShowManipulativeSub] = useState<boolean>(false);
  const [showProtectiveSub, setShowProtectiveSub] = useState<boolean>(false);

  // Visibility for Virtus rows
  const [showMortalSub, setShowMortalSub] = useState<boolean>(false);
  const [showMetaphysicalSub, setShowMetaphysicalSub] = useState<boolean>(false);
  const [showImmortalSub, setShowImmortalSub] = useState<boolean>(false);

  const offensiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manipulativeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const protectiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mortalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const metaphysicalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const immortalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startOffensiveTimer = () => {
    if (offensiveTimerRef.current) {
      clearTimeout(offensiveTimerRef.current);
    }
    offensiveTimerRef.current = setTimeout(() => {
      setShowOffensiveSub(false);
    }, 10000);
  };

  const startManipulativeTimer = () => {
    if (manipulativeTimerRef.current) {
      clearTimeout(manipulativeTimerRef.current);
    }
    manipulativeTimerRef.current = setTimeout(() => {
      setShowManipulativeSub(false);
    }, 10000);
  };

  const startProtectiveTimer = () => {
    if (protectiveTimerRef.current) {
      clearTimeout(protectiveTimerRef.current);
    }
    protectiveTimerRef.current = setTimeout(() => {
      setShowProtectiveSub(false);
    }, 10000);
  };

  const startMortalTimer = () => {
    if (mortalTimerRef.current) {
      clearTimeout(mortalTimerRef.current);
    }
    mortalTimerRef.current = setTimeout(() => {
      setShowMortalSub(false);
    }, 10000);
  };

  const startMetaphysicalTimer = () => {
    if (metaphysicalTimerRef.current) {
      clearTimeout(metaphysicalTimerRef.current);
    }
    metaphysicalTimerRef.current = setTimeout(() => {
      setShowMetaphysicalSub(false);
    }, 10000);
  };

  const startImmortalTimer = () => {
    if (immortalTimerRef.current) {
      clearTimeout(immortalTimerRef.current);
    }
    immortalTimerRef.current = setTimeout(() => {
      setShowImmortalSub(false);
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (offensiveTimerRef.current) clearTimeout(offensiveTimerRef.current);
      if (manipulativeTimerRef.current) clearTimeout(manipulativeTimerRef.current);
      if (protectiveTimerRef.current) clearTimeout(protectiveTimerRef.current);
      if (mortalTimerRef.current) clearTimeout(mortalTimerRef.current);
      if (metaphysicalTimerRef.current) clearTimeout(metaphysicalTimerRef.current);
      if (immortalTimerRef.current) clearTimeout(immortalTimerRef.current);
    };
  }, []);

  // Cost
  const [costValue, setCostValue] = useState<number>(0);
  const [costType, setCostType] = useState<'None' | 'MP' | 'SP' | 'PASSIVE' | 'Pot' | 'Elix'>('None');

  // Nature
  const [nature, setNature] = useState<string>('PHYSICAL');

  // Focus & Duration (Terminus)
  const [focus, setFocus] = useState<string>('None');
  const [terminus, setTerminus] = useState<string>('INST');

  // Archetype Effect Settings
  const [selectedArchetype, setSelectedArchetype] = useState<'Offensive' | 'Manipulative' | 'Protective'>('Offensive');
  const [selectedEffect, setSelectedEffect] = useState<string>('Bane');

  // Tooltip tracking
  const [hoveredGuide, setHoveredGuide] = useState<string | null>(null);

  // Nature Dropdown filled state
  const [natureDropdownValue, setNatureDropdownValue] = useState<string>('-----');

  // Sync state when editing
  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setItemName(itemToEdit.name || '');
        setItemDesc(itemToEdit.description || '');
        setCategory(itemToEdit.category || 'weapons');
        setRarity(itemToEdit.rarity || 'Common');
        setSelectedEmoji(itemToEdit.icon || '📦');

        setIsArtifact(!!itemToEdit.isArtifact);
        setIsWeapon(!!itemToEdit.isWeapon);

        // Parse Power
        const pow = itemToEdit.power || '—';
        const parsedVal = parseInt(pow.replace(/[^\d-]/g, ''));
        setPowerValue(itemToEdit.powerValue !== undefined ? itemToEdit.powerValue : (isNaN(parsedVal) ? 3 : parsedVal));
        if (pow === '—') {
          setPowerType('empty');
        } else if (pow.includes('d')) {
          setPowerType('damage');
          const regex = /(\d+)d(\d+)([+-]\d+)?/i;
          const match = pow.match(regex);
          if (match) {
            setDiceCount(parseInt(match[1]) || 1);
            setDiceSize(parseInt(match[2]) || 8);
            setPowerModifier(match[3] ? parseInt(match[3]) : 0);
          }
        } else {
          setPowerType('stat');
          const parts = pow.split(' ');
          if (parts.length >= 2) {
            setPowerStatBonusValue(parseInt(parts[0]) || 2);
            setPowerStatBonusType(parts[1] || 'DEF');
          }
        }

        // Parse Perditor
        const perd = itemToEdit.perditor || '—';
        if (perd === '—' || perd === '+0') {
          setPerditorLevel(1);
        } else {
          const cleanPerd = perd.replace('x', '').replace('+', '').trim();
          setPerditorLevel(parseInt(cleanPerd) || 1);
        }

        // Parse Virtus & Anima
        const virt = itemToEdit.virtus || '—';
        if (virt === '—' || virt === '+0') {
          setSelectedVirtusStats([]);
          setSelectedAnimaStats([]);
        } else {
          const cleanVirt = virt.replace(/[+0-9\s]/g, '');
          const stats = cleanVirt.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          
          const validVirtusOptions = ['WIZARDS', 'VAMPIRES', 'WEREWOLVES', 'CURSED', 'FAE', 'SPIRITS', 'REANIMATED', 'DIVINE', 'OUTSIDERS'];
          const matchedVirtusStats = stats
            .filter(s => validVirtusOptions.includes(s))
            .map(s => {
              const mapping: Record<string, string> = {
                'WIZARDS': 'Wizards', 'VAMPIRES': 'Vampires', 'WEREWOLVES': 'Werewolves',
                'CURSED': 'Cursed', 'FAE': 'Fae', 'SPIRITS': 'Spirits',
                'REANIMATED': 'Reanimated', 'DIVINE': 'Divine', 'OUTSIDERS': 'Outsiders'
              };
              return mapping[s] || s;
            });
          setSelectedVirtusStats(matchedVirtusStats);

          const validAnimaOptions = ['BLOOD', 'PAIN', 'TIME', 'OATH', 'FAITH', 'MEMORY', 'WILL', 'SOUL', 'LIFE'];
          const matchedAnimaStats = stats
            .filter(s => validAnimaOptions.includes(s))
            .map(s => {
              const mapping: Record<string, string> = {
                'BLOOD': 'Blood', 'PAIN': 'Pain', 'TIME': 'Time', 'OATH': 'Oath',
                'FAITH': 'Faith', 'MEMORY': 'Memory', 'WILL': 'Will', 'SOUL': 'Soul', 'LIFE': 'Life'
              };
              return mapping[s] || s;
            });
          setSelectedAnimaStats(matchedAnimaStats);
        }

        // Parse Cost
        const costStr = itemToEdit.cost || '—';
        if (costStr === '—' || costStr === 'None') {
          setCostType('None');
          setCostValue(0);
        } else if (costStr === 'PASSIVE') {
          setCostType('PASSIVE');
          setCostValue(0);
        } else {
          const count = parseInt(costStr) || 1;
          setCostValue(count);
          if (costStr.toLowerCase().includes('mp')) setCostType('MP');
          else if (costStr.toLowerCase().includes('sp')) setCostType('SP');
          else if (costStr.toLowerCase().includes('pot')) setCostType('Pot');
          else if (costStr.toLowerCase().includes('elix')) setCostType('Elix');
        }

        setNature(itemToEdit.nature || 'PHYSICAL');
        setNatureDropdownValue(itemToEdit.natureDropdownValue || '-----');

        // Parse Effect
        const eff = itemToEdit.effect || 'Bane';
        setSelectedEffect(eff);
        if (EFFECT_ARCHETYPES.Offensive.includes(eff as any)) {
          setSelectedArchetype('Offensive');
        } else if (EFFECT_ARCHETYPES.Manipulative.includes(eff as any)) {
          setSelectedArchetype('Manipulative');
        } else if (EFFECT_ARCHETYPES.Protective.includes(eff as any)) {
          setSelectedArchetype('Protective');
        }

        setFocus(itemToEdit.focus || 'None');
        setTerminus(itemToEdit.terminus || 'INST');
        setSelectedEquipSlots(itemToEdit.equipSlots || []);
      } else {
        // Reset defaults
        setItemName('');
        setItemDesc('');
        setCategory('weapons');
        setRarity('Common');
        setSelectedEmoji('📦');
        setIsArtifact(false);
        setIsWeapon(false);
        setPowerType('damage');
        setDiceCount(1);
        setDiceSize(8);
        setPowerModifier(3);
        setPowerValue(3);
        setPowerStatBonusType('DEF');
        setPowerStatBonusValue(2);
        setPerditorLevel(1);
        setVirtusStat('WIS');
        setVirtusValue(2);
        setHasVirtus(true);
        setSelectedVirtusStats([]);
        setSelectedAnimaStats([]);
        setSelectedEquipSlots([]);
        setCostType('None');
        setCostValue(0);
        setNature('PHYSICAL');
        setNatureDropdownValue('-----');
        setFocus('None');
        setTerminus('INST');
        setSelectedArchetype('Offensive');
        setSelectedEffect('Bane');

        setShowOffensiveSub(false);
        setShowManipulativeSub(false);
        setShowProtectiveSub(false);
        if (offensiveTimerRef.current) clearTimeout(offensiveTimerRef.current);
        if (manipulativeTimerRef.current) clearTimeout(manipulativeTimerRef.current);
        if (protectiveTimerRef.current) clearTimeout(protectiveTimerRef.current);

        setShowMortalSub(false);
        setShowMetaphysicalSub(false);
        setShowImmortalSub(false);
        if (mortalTimerRef.current) clearTimeout(mortalTimerRef.current);
        if (metaphysicalTimerRef.current) clearTimeout(metaphysicalTimerRef.current);
        if (immortalTimerRef.current) clearTimeout(immortalTimerRef.current);
      }
    }
  }, [isOpen, itemToEdit]);

  const toggleVirtusStat = (stat: string) => {
    if (selectedVirtusStats.includes(stat)) {
      setSelectedVirtusStats(selectedVirtusStats.filter(s => s !== stat));
    } else {
      setSelectedVirtusStats([...selectedVirtusStats, stat]);
    }
    playTactileSound(550, 'sine', 0.04);
  };

  const setVirtusLevelZero = () => {
    setVirtusStat('None');
    setVirtusValue(0);
  };

  // Dynamic Item Points Calculations
  const calculatePointsSpent = (): number => {
    let pts = 0;

    // Power points
    if (powerType === 'damage') {
      pts += diceCount * (diceSize >= 12 ? 3 : diceSize >= 8 ? 2 : 1);
      pts += Math.floor(powerModifier / 2);
    } else if (powerType === 'stat') {
      pts += Math.max(1, powerStatBonusValue);
    }

    // Perditor level (+1 per level)
    pts += Math.max(0, perditorLevel);

    // Virtus modifier
    if (selectedVirtusStats.length > 0) {
      pts += selectedVirtusStats.length;
    }

    // Anima modifier
    if (selectedAnimaStats.length > 0) {
      pts += selectedAnimaStats.length;
    }

    // Terminus (Duration) factor
    if (terminus === 'PASS' || terminus === 'PERM') {
      pts += 2;
    } else if (terminus === '1 MIN' || terminus === '10 MIN') {
      pts += 1;
    }

    // Cost refund/fee
    if (costType === 'None') {
      pts += 1; // Zero cost needs slightly more effort to balance
    } else if (costType === 'PASSIVE') {
      pts += 2; // Passive uptime cost
    } else if (costType === 'MP' || costType === 'SP') {
      // High costs refund points!
      if (costValue >= 3) pts -= 2;
      else if (costValue >= 1) pts -= 1;
    }

    // Focus refund
    if (focus === 'Conc' || focus === 'Self') {
      pts -= 1; // Restriction refunds 1 budget point
    }

    return Math.max(1, pts);
  };

  const totalSpentPoints = calculatePointsSpent();
  const totalAvailablePoints = RARITY_BUDGETS[rarity];
  const isItemStable = true;

  // Sync archetype with its active default effect
  const handleArchetypeChange = (arch: 'Offensive' | 'Manipulative' | 'Protective') => {
    setSelectedArchetype(arch);
    const firstOption = EFFECT_ARCHETYPES[arch][0];
    setSelectedEffect(firstOption);
    playTactileSound(480, 'sine', 0.05);
  };

  const handleForge = () => {
    if (!itemName.trim()) {
      alert(t("Please provide a name for this magical matrix node."));
      return;
    }

    // Construct power string
    let finalPower = '—';
    if (powerType === 'damage') {
      const modStr = powerModifier > 0 ? `+${powerModifier}` : powerModifier < 0 ? `${powerModifier}` : '';
      finalPower = `${diceCount}d${diceSize}${modStr}`;
    } else if (powerType === 'stat') {
      finalPower = `+${powerStatBonusValue} ${powerStatBonusType}`;
    }

    // Construct cost string
    let finalCost = '—';
    if (costType === 'PASSIVE') finalCost = 'PASSIVE';
    else if (costType === 'None') finalCost = 'None';
    else if (costType === 'MP') finalCost = `${costValue} MP`;
    else if (costType === 'SP') finalCost = `${costValue} SP`;
    else if (costType === 'Pot') finalCost = `${costValue} Pot`;
    else if (costType === 'Elix') finalCost = `${costValue} Elix`;

    const finalCategory = isWeapon ? 'weapons' : isArtifact ? 'gear' : 'utility';

    const forgedItem: CustomItem = {
      id: itemToEdit?.id || `custom-item-${Date.now()}`,
      name: itemName,
      icon: selectedEmoji,
      category: finalCategory,
      rarity,
      power: finalPower,
      perditor: perditorLevel > 0 ? `x${perditorLevel}` : '—',
      virtus: [...selectedVirtusStats, ...selectedAnimaStats].length === 0 ? '—' : [...selectedVirtusStats, ...selectedAnimaStats].join(', '),
      cost: finalCost,
      nature: nature,
      natureDropdownValue: natureDropdownValue,
      effect: selectedEffect,
      focus: focus === '—' ? 'None' : focus,
      terminus,
      description: itemDesc || `${rarity} celestial ${finalCategory} crafted with high-fidelity resin.`,
      quantity: itemToEdit?.quantity || 1,
      isArtifact,
      isWeapon,
      powerValue,
      equipSlots: selectedEquipSlots
    };

    onForgeItem(forgedItem);
    playTactileSound(820, 'triangle', 0.25);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-x-2 inset-y-8 md:inset-x-4 md:inset-y-10 bg-stone-950/98 backdrop-blur-md border-t-2 border-t-amber-500 border-x border-b border-stone-800 rounded-xl p-2.5 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.95)] overflow-hidden font-sans text-stone-200 select-none"
      style={{ zIndex: LAYER_HIERARCHY.SPELL_BUILDER_POPUP + 10 }}
    >
      {/* WINDOW HEADER */}
      <header className="flex items-center justify-between pb-1.5 border-b border-white/5 shrink-0 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center shrink-0">
            <Package size={12} className="text-amber-500 animate-bounce" />
          </div>
          <span className="font-serif font-black text-xs uppercase tracking-widest text-stone-100">
            {itemToEdit ? `${t("Item Builder")} (${t("Edit")})` : t("Item Builder")}
          </span>
        </div>
        <button 
          onClick={() => {
            playTactileSound(400, 'sine', 0.05);
            onClose();
          }}
          className="text-stone-400 hover:text-rose-400 h-5 w-5 rounded bg-stone-900 hover:bg-stone-850 hover:rotate-90 transition-all flex items-center justify-center cursor-pointer border border-white/5"
        >
          <X size={12} />
        </button>
      </header>

      {/* CONDENSED HERO ROW FOR GENERAL INFO */}
      <div className="flex gap-[1px] mt-2 leading-none shrink-0 select-none items-stretch">
        
        {/* Section 1: Identity */}
        <div className="flex-1 flex flex-col gap-1 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg min-w-0 justify-center">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">
            {t("Identity")}
          </span>
          <input 
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Dawnstrider Greaves"
            className="bg-stone-950 border border-white/10 rounded px-2 text-[9px] font-medium text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 h-5 w-full"
          />
        </div>

        {/* Section 2: State (separate container) */}
        <div className="flex flex-col gap-1 shrink-0 w-24 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-center">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">{t("State")}</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setIsArtifact(!isArtifact);
                playTactileSound(550, 'sine', 0.05);
              }}
              className={`flex-1 h-5 rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap ${
                isArtifact 
                  ? 'bg-amber-600/25 text-white border-amber-500/40 font-bold shadow-[0_0_4px_rgba(245,158,11,0.15)]' 
                  : 'bg-transparent text-white border-white/5 font-medium'
              }`}
            >
              {t("Artifact")}
            </button>
            <button
              onClick={() => {
                setIsWeapon(!isWeapon);
                playTactileSound(550, 'sine', 0.05);
              }}
              className={`flex-1 h-5 rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap ${
                isWeapon 
                  ? 'bg-amber-600/25 text-white border-amber-500/40 font-bold shadow-[0_0_4px_rgba(245,158,11,0.15)]' 
                  : 'bg-transparent text-white border-white/5 font-medium'
              }`}
            >
              {t("Weapon")}
            </button>
          </div>
        </div>

        {/* Section 3: Nature (separate container) */}
        <div className="flex flex-col gap-1 shrink-0 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-center w-[110px] relative">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">
            {t("Nature")}
          </span>
          <select
            value={natureDropdownValue}
            onChange={(e) => {
              setNatureDropdownValue(e.target.value);
              playTactileSound(580, 'sine', 0.05);
            }}
            className="bg-stone-950 border border-white/10 rounded h-5 px-1 text-[8.5px] font-mono font-bold text-transparent focus:outline-none w-full cursor-pointer leading-none appearance-none text-center relative z-10"
            style={{ color: 'transparent' }}
          >
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="-----">-----</option>
            <option disabled className="text-white/70 font-bold bg-stone-950" style={{ textAlign: 'left' }} value="Existential">Existential</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Divine">- Divine</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Corruptive">- Corruptive</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Living">- Living</option>
            <option disabled className="text-white/70 font-bold bg-stone-950" style={{ textAlign: 'left' }} value="Cognitive">Cognitive</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Sentient">- Sentient</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Influential">- Influential</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Veiled">- Veiled</option>
            <option disabled className="text-white/70 font-bold bg-stone-950" style={{ textAlign: 'left' }} value="Structural">Structural</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Bound">- Bound</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Reactive">- Reactive</option>
            <option style={{ color: '#f5f5f4', backgroundColor: '#0c0a09', textAlign: 'left' }} value="- Foci">- Foci</option>
          </select>
          <div className="absolute bottom-[6px] left-[6px] right-[6px] h-5 flex items-center justify-center text-[8.5px] font-mono font-bold text-white pointer-events-none z-20">
            {natureDropdownValue.startsWith('- ') ? natureDropdownValue.slice(2) : natureDropdownValue}
          </div>
        </div>

      </div>

      {/* SECOND HERO ROW: EQUIP (OWN ROW, SPLIT TO MATCH VIRTUS & POWER/PERDITOR EXACTLY IN WIDTH) */}
      <div className="flex gap-[1px] mt-1 leading-none shrink-0 select-none items-stretch">
        
        {/* Section 1: Equip */}
        <div className="flex-1 flex flex-col gap-1 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-center">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">
            {t("Equip")}
          </span>
          <div className="grid grid-cols-3 gap-[3px]">
            {[
              { type: 'single', name: 'Head' },
              { type: 'single', name: 'Collar' },
              { type: 'single', name: 'Torso' },
              { type: 'split', name: 'Wrist', leftName: 'Wrist [L]', rightName: 'Wrist [R]' },
              { type: 'split', name: 'Hand', leftName: 'Hand [L]', rightName: 'Hand [R]' },
              { type: 'single', name: 'Belt' },
              { type: 'single', name: 'Legs' },
              { type: 'split', name: 'Ankle', leftName: 'Ankle [L]', rightName: 'Ankle [R]' },
              { type: 'split', name: 'Foot', leftName: 'Foot [L]', rightName: 'Foot [R]' }
            ].map((slot, sIdx) => {
              if (slot.type === 'single') {
                const isSelected = selectedEquipSlots.includes(slot.name);
                return (
                  <button
                    key={`equip-slot-${slot.name}-${sIdx}`}
                    type="button"
                    onClick={() => {
                      if (selectedEquipSlots.includes(slot.name)) {
                        setSelectedEquipSlots(selectedEquipSlots.filter(s => s !== slot.name));
                      } else {
                        setSelectedEquipSlots([...selectedEquipSlots, slot.name]);
                      }
                      playTactileSound(550, 'sine', 0.04);
                    }}
                    className={`h-5 rounded border text-[6.5px] sm:text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                      isSelected 
                        ? 'bg-amber-600/25 text-white border-amber-500/40 font-bold shadow-[0_0_4px_rgba(245,158,11,0.15)]' 
                        : 'bg-transparent text-white border-white/5 font-medium'
                    }`}
                  >
                    {slot.name}
                  </button>
                );
              } else {
                const isLeftSelected = selectedEquipSlots.includes(slot.leftName!);
                const isRightSelected = selectedEquipSlots.includes(slot.rightName!);
                return (
                  <div key={`equip-split-${slot.name}-${sIdx}`} className="h-5 flex items-center rounded border border-white/5 bg-stone-950/20 overflow-hidden text-[7px] font-mono uppercase">
                    <button
                      type="button"
                      onClick={() => {
                        if (isLeftSelected) {
                          setSelectedEquipSlots(selectedEquipSlots.filter(s => s !== slot.leftName));
                        } else {
                          setSelectedEquipSlots([...selectedEquipSlots, slot.leftName!]);
                        }
                        playTactileSound(550, 'sine', 0.04);
                      }}
                      className={`h-full w-4 flex items-center justify-center border-r border-white/5 hover:text-stone-100 hover:bg-stone-800/50 transition-colors cursor-pointer text-[6.5px] ${
                        isLeftSelected ? 'bg-amber-600/25 text-white font-bold shadow-[inset_0_0_4px_rgba(245,158,11,0.15)]' : 'text-white'
                      }`}
                    >
                      L
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const bothSelected = isLeftSelected && isRightSelected;
                        if (bothSelected) {
                          setSelectedEquipSlots(selectedEquipSlots.filter(s => s !== slot.leftName && s !== slot.rightName));
                        } else {
                          const updated = [...selectedEquipSlots];
                          if (!updated.includes(slot.leftName!)) updated.push(slot.leftName!);
                          if (!updated.includes(slot.rightName!)) updated.push(slot.rightName!);
                          setSelectedEquipSlots(updated);
                        }
                        playTactileSound(550, 'sine', 0.04);
                      }}
                      className={`flex-1 h-full text-center text-[6.5px] sm:text-[7px] font-mono uppercase px-0.5 whitespace-nowrap overflow-hidden transition-colors cursor-pointer ${
                        isLeftSelected && isRightSelected
                          ? 'text-white font-bold bg-amber-600/25 hover:bg-amber-600/35 border-x border-amber-500/30'
                          : 'text-white hover:bg-stone-800/30'
                      }`}
                    >
                      {slot.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isRightSelected) {
                          setSelectedEquipSlots(selectedEquipSlots.filter(s => s !== slot.rightName));
                        } else {
                          setSelectedEquipSlots([...selectedEquipSlots, slot.rightName!]);
                        }
                        playTactileSound(550, 'sine', 0.04);
                      }}
                      className={`h-full w-4 flex items-center justify-center border-l border-white/5 hover:text-stone-100 hover:bg-stone-800/50 transition-colors cursor-pointer text-[6.5px] ${
                        isRightSelected ? 'bg-amber-600/25 text-white font-bold shadow-[inset_0_0_4px_rgba(245,158,11,0.15)]' : 'text-white'
                      }`}
                    >
                      R
                    </button>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Section 2: Companion/Capacity */}
        <div className="w-[110px] shrink-0 flex flex-col gap-1 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-center">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">
            {t("Misc")}
          </span>
          <div className="flex flex-col gap-[3px] h-full justify-stretch">
            {['Familiar', 'Bag'].map((slot, mIdx) => {
              const isSelected = selectedEquipSlots.includes(slot);
              return (
                <button
                  key={`misc-slot-${slot}-${mIdx}`}
                  type="button"
                  onClick={() => {
                    if (selectedEquipSlots.includes(slot)) {
                      setSelectedEquipSlots(selectedEquipSlots.filter(s => s !== slot));
                    } else {
                      setSelectedEquipSlots([...selectedEquipSlots, slot]);
                    }
                    playTactileSound(550, 'sine', 0.04);
                  }}
                  className={`flex-1 rounded border text-[7.5px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                    isSelected 
                      ? 'bg-amber-600/25 text-white border-amber-500/40 font-bold shadow-[0_0_4px_rgba(245,158,11,0.15)]' 
                      : 'bg-transparent text-white border-white/5 font-medium'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* THIRD HERO ROW: VIRTUS, POWER & PERDITOR */}
      <div className="flex gap-[1px] mt-1 leading-none shrink-0 select-none items-stretch">

        {/* Section 2: Virtus */}
        <div className="flex-1 flex flex-col gap-1.5 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-start">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">
            {t("Virtus")}
          </span>
          
          <div className="flex flex-col gap-1.5">
            {/* Category 1: Mortal */}
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                {(!showMortalSub && !['Wizards', 'Vampires', 'Werewolves'].some(stat => selectedVirtusStats.includes(stat))) ? (
                  <motion.button
                    key="btn-mortal"
                    id="virtus-btn-mortal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowMortalSub(true);
                      startMortalTimer();
                      playTactileSound(520, 'sine', 0.04);
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center rounded border border-rose-600/35 bg-rose-950/20 text-white hover:bg-rose-900/30 hover:border-rose-500/40 transition-all cursor-pointer font-mono text-[7.5px] uppercase tracking-wider font-extrabold shadow-[0_0_6px_rgba(244,63,94,0.15)]"
                  >
                    {t("Mortal")}
                  </motion.button>
                ) : (
                  <motion.div
                    key="sub-mortal"
                    id="virtus-grid-mortal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-3 gap-[3px] h-full w-full"
                  >
                    {['Wizards', 'Vampires', 'Werewolves'].map((stat, idx) => {
                      const isSelected = selectedVirtusStats.includes(stat);
                      return (
                        <button
                          key={`mortal-opt-${stat}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (selectedVirtusStats.includes(stat)) {
                              setSelectedVirtusStats(selectedVirtusStats.filter(s => s !== stat));
                            } else {
                              setSelectedVirtusStats([...selectedVirtusStats, stat]);
                            }
                            startMortalTimer();
                            playTactileSound(600, 'sine', 0.03);
                          }}
                          className={`h-full rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                            isSelected 
                              ? 'bg-rose-600/25 text-white border-rose-500/40 font-bold shadow-[0_0_4px_rgba(244,63,94,0.15)]' 
                              : 'bg-stone-950/20 text-white border-white/5 hover:border-rose-500/20 font-medium'
                          }`}
                        >
                          {t(stat)}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category 2: Metaphysical */}
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                {(!showMetaphysicalSub && !['Cursed', 'Fae', 'Spirits'].some(stat => selectedVirtusStats.includes(stat))) ? (
                  <motion.button
                    key="btn-metaphysical"
                    id="virtus-btn-metaphysical"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowMetaphysicalSub(true);
                      startMetaphysicalTimer();
                      playTactileSound(540, 'sine', 0.04);
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center rounded border border-cyan-600/35 bg-cyan-950/20 text-white hover:bg-cyan-900/30 hover:border-cyan-500/40 transition-all cursor-pointer font-mono text-[7.5px] uppercase tracking-wider font-extrabold shadow-[0_0_6px_rgba(6,182,212,0.15)]"
                  >
                    {t("Metaphysical")}
                  </motion.button>
                ) : (
                  <motion.div
                    key="sub-metaphysical"
                    id="virtus-grid-metaphysical"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-3 gap-[3px] h-full w-full"
                  >
                    {['Cursed', 'Fae', 'Spirits'].map((stat, idx) => {
                      const isSelected = selectedVirtusStats.includes(stat);
                      return (
                        <button
                          key={`metaphysical-opt-${stat}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (selectedVirtusStats.includes(stat)) {
                              setSelectedVirtusStats(selectedVirtusStats.filter(s => s !== stat));
                            } else {
                              setSelectedVirtusStats([...selectedVirtusStats, stat]);
                            }
                            startMetaphysicalTimer();
                            playTactileSound(620, 'sine', 0.03);
                          }}
                          className={`h-full rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                            isSelected 
                              ? 'bg-cyan-600/25 text-white border-cyan-500/40 font-bold shadow-[0_0_4px_rgba(6,182,212,0.15)]' 
                              : 'bg-stone-950/20 text-white border-white/5 hover:border-cyan-500/20 font-medium'
                          }`}
                        >
                          {t(stat)}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category 3: Immortal */}
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                {(!showImmortalSub && !['Reanimated', 'Divine', 'Outsiders'].some(stat => selectedVirtusStats.includes(stat))) ? (
                  <motion.button
                    key="btn-immortal"
                    id="virtus-btn-immortal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowImmortalSub(true);
                      startImmortalTimer();
                      playTactileSound(560, 'sine', 0.04);
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center rounded border border-amber-600/35 bg-amber-950/20 text-white hover:bg-amber-900/30 hover:border-amber-500/40 transition-all cursor-pointer font-mono text-[7.5px] uppercase tracking-wider font-extrabold shadow-[0_0_6px_rgba(245,158,11,0.15)]"
                  >
                    {t("Immortal")}
                  </motion.button>
                ) : (
                  <motion.div
                    key="sub-immortal"
                    id="virtus-grid-immortal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-3 gap-[3px] h-full w-full"
                  >
                    {['Reanimated', 'Divine', 'Outsiders'].map((stat, idx) => {
                      const isSelected = selectedVirtusStats.includes(stat);
                      return (
                        <button
                          key={`immortal-opt-${stat}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (selectedVirtusStats.includes(stat)) {
                              setSelectedVirtusStats(selectedVirtusStats.filter(s => s !== stat));
                            } else {
                              setSelectedVirtusStats([...selectedVirtusStats, stat]);
                            }
                            startImmortalTimer();
                            playTactileSound(640, 'sine', 0.03);
                          }}
                          className={`h-full rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                            isSelected 
                              ? 'bg-amber-600/25 text-white border-amber-500/40 font-bold shadow-[0_0_4px_rgba(245,158,11,0.15)]' 
                              : 'bg-stone-950/20 text-white border-white/5 hover:border-amber-500/20 font-medium'
                          }`}
                        >
                          {t(stat)}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Section 3: Power & Perditor */}
        <div className="w-[110px] shrink-0 flex flex-col gap-1 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-center">
          {/* Power Number Box */}
          <div className="flex flex-col gap-0.5 mb-1">
            <span className="text-[6px] font-mono font-black uppercase text-white tracking-wider">
              {t("Power")}
            </span>
            <div className="flex gap-0.5 items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPowerValue(prev => Math.max(0, prev - 1));
                  playTactileSound(550, 'sine', 0.03);
                }}
                className="h-[18px] w-[18px] hover:bg-stone-850 rounded border border-white/10 text-[9px] font-bold font-mono text-stone-300 flex items-center justify-center cursor-pointer bg-stone-950/80 transition-colors"
               >
                -
              </button>
              <div className="bg-stone-950 border border-white/10 rounded h-[18px] flex-1 flex items-center justify-center text-[8px] font-mono font-bold text-stone-100">
                {powerValue}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPowerValue(prev => Math.min(99, prev + 1));
                  playTactileSound(610, 'sine', 0.03);
                }}
                className="h-[18px] w-[18px] hover:bg-stone-850 rounded border border-white/10 text-[9px] font-bold font-mono text-stone-300 flex items-center justify-center cursor-pointer bg-stone-950/80 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Perditor Number Box */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[6px] font-mono font-black uppercase text-white tracking-wider">
              {t("Perditor")}
            </span>
            <div className="flex gap-0.5 items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPerditorLevel(prev => Math.max(1, prev - 1));
                  playTactileSound(550, 'sine', 0.03);
                }}
                className="h-[18px] w-[18px] hover:bg-stone-850 rounded border border-white/10 text-[9px] font-bold font-mono text-stone-300 flex items-center justify-center cursor-pointer bg-stone-950/80 transition-colors"
              >
                -
              </button>
              <div className="bg-stone-950 border border-white/10 rounded h-[18px] flex-1 flex items-center justify-center text-[8px] font-mono font-bold text-stone-100">
                x{perditorLevel}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPerditorLevel(prev => Math.min(10, prev + 1));
                  playTactileSound(610, 'sine', 0.03);
                }}
                className="h-[18px] w-[18px] hover:bg-stone-850 rounded border border-white/10 text-[9px] font-bold font-mono text-stone-300 flex items-center justify-center cursor-pointer bg-stone-950/80 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* FOURTH HERO ROW: EFFECTS */}
      <div className="flex gap-[1px] mt-1 leading-none shrink-0 select-none items-stretch">
        
        {/* Section: Effects */}
        <div className="flex-1 flex flex-col gap-1.5 bg-stone-900/30 border border-white/[0.03] p-1.5 rounded-lg justify-start">
          <span className="text-[6.5px] font-mono font-black uppercase text-white tracking-wider">
            {t("Effects")}
          </span>
          
          <div className="flex flex-col gap-1.5">
            {/* Category 1: Offensive */}
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                {(!showOffensiveSub && !['Blood', 'Pain', 'Time'].some(stat => selectedAnimaStats.includes(stat))) ? (
                  <motion.button
                    key="btn-offensive"
                    id="effects-btn-offensive"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowOffensiveSub(true);
                      startOffensiveTimer();
                      playTactileSound(520, 'sine', 0.04);
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center rounded border border-rose-600/30 bg-rose-950/20 text-white hover:bg-rose-900/30 hover:border-rose-500/40 transition-all cursor-pointer font-mono text-[7.5px] uppercase tracking-wider font-extrabold shadow-[0_0_6px_rgba(244,63,94,0.15)]"
                  >
                    {t("Offensive")}
                  </motion.button>
                ) : (
                  <motion.div
                    key="sub-offensive"
                    id="effects-grid-offensive"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-3 gap-[3px] h-full w-full"
                  >
                    {['Blood', 'Pain', 'Time'].map((stat, idx) => {
                      const isSelected = selectedAnimaStats.includes(stat);
                      return (
                        <button
                          key={`offensive-opt-${stat}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (selectedAnimaStats.includes(stat)) {
                              setSelectedAnimaStats(selectedAnimaStats.filter(s => s !== stat));
                            } else {
                              setSelectedAnimaStats([...selectedAnimaStats, stat]);
                            }
                            startOffensiveTimer();
                            playTactileSound(600, 'sine', 0.03);
                          }}
                          className={`h-full rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                            isSelected 
                              ? 'bg-rose-600/25 text-white border-rose-500/40 font-bold shadow-[0_0_4px_rgba(244,63,94,0.15)]' 
                              : 'bg-stone-950/20 text-white border-white/5 hover:border-rose-500/20 font-medium'
                          }`}
                        >
                          {t(stat)}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category 2: Manipulative */}
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                {(!showManipulativeSub && !['Oath', 'Faith', 'Memory'].some(stat => selectedAnimaStats.includes(stat))) ? (
                  <motion.button
                    key="btn-manipulative"
                    id="effects-btn-manipulative"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowManipulativeSub(true);
                      startManipulativeTimer();
                      playTactileSound(540, 'sine', 0.04);
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center rounded border border-purple-600/30 bg-purple-950/20 text-white hover:bg-purple-900/30 hover:border-purple-500/40 transition-all cursor-pointer font-mono text-[7.5px] uppercase tracking-wider font-extrabold shadow-[0_0_6px_rgba(168,85,247,0.15)]"
                  >
                    {t("Manipulative")}
                  </motion.button>
                ) : (
                  <motion.div
                    key="sub-manipulative"
                    id="effects-grid-manipulative"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-3 gap-[3px] h-full w-full"
                  >
                    {['Oath', 'Faith', 'Memory'].map((stat, idx) => {
                      const isSelected = selectedAnimaStats.includes(stat);
                      return (
                        <button
                          key={`manipulative-opt-${stat}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (selectedAnimaStats.includes(stat)) {
                              setSelectedAnimaStats(selectedAnimaStats.filter(s => s !== stat));
                            } else {
                              setSelectedAnimaStats([...selectedAnimaStats, stat]);
                            }
                            startManipulativeTimer();
                            playTactileSound(620, 'sine', 0.03);
                          }}
                          className={`h-full rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                            isSelected 
                              ? 'bg-purple-600/25 text-white border-purple-500/40 font-bold shadow-[0_0_4px_rgba(168,85,247,0.15)]' 
                              : 'bg-stone-950/20 text-white border-white/5 hover:border-purple-500/20 font-medium'
                          }`}
                        >
                          {t(stat)}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category 3: Protective */}
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                {(!showProtectiveSub && !['Will', 'Soul', 'Life'].some(stat => selectedAnimaStats.includes(stat))) ? (
                  <motion.button
                    key="btn-protective"
                    id="effects-btn-protective"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowProtectiveSub(true);
                      startProtectiveTimer();
                      playTactileSound(560, 'sine', 0.04);
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center rounded border border-emerald-600/30 bg-emerald-950/20 text-white hover:bg-emerald-900/30 hover:border-emerald-500/40 transition-all cursor-pointer font-mono text-[7.5px] uppercase tracking-wider font-extrabold shadow-[0_0_6px_rgba(16,185,129,0.15)]"
                  >
                    {t("Protective")}
                  </motion.button>
                ) : (
                  <motion.div
                    key="sub-protective"
                    id="effects-grid-protective"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-3 gap-[3px] h-full w-full"
                  >
                    {['Will', 'Soul', 'Life'].map((stat, idx) => {
                      const isSelected = selectedAnimaStats.includes(stat);
                      return (
                        <button
                          key={`protective-opt-${stat}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (selectedAnimaStats.includes(stat)) {
                              setSelectedAnimaStats(selectedAnimaStats.filter(s => s !== stat));
                            } else {
                              setSelectedAnimaStats([...selectedAnimaStats, stat]);
                            }
                            startProtectiveTimer();
                            playTactileSound(640, 'sine', 0.03);
                          }}
                          className={`h-full rounded border text-[7px] font-mono uppercase transition-all cursor-pointer px-1 flex items-center justify-center whitespace-nowrap leading-none ${
                            isSelected 
                              ? 'bg-emerald-600/25 text-white border-emerald-500/40 font-bold shadow-[0_0_4px_rgba(16,185,129,0.15)]' 
                              : 'bg-stone-950/20 text-white border-white/5 hover:border-emerald-500/20 font-medium'
                          }`}
                        >
                          {t(stat)}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Balance Spacer matching Power/Perditor width */}
        <div className="w-[110px] shrink-0 flex flex-col gap-1 bg-stone-900/10 border border-white/[0.015] p-1.5 rounded-lg items-center justify-center text-white font-mono text-[7px] tracking-widest uppercase">
          {t("Matrix")}
        </div>

      </div>

      {/* CORE CONFIGURING BENTO GRID PANEL */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 overflow-y-auto scrollbar-thin select-none pr-0.5">
        
        {/* LEFT PANEL COLUMN */}
        <div className="flex flex-col gap-2 min-w-0">
          
          {/* Section: Cost & Rarity */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg flex flex-col gap-2 relative overflow-visible">
            <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
              {t("1. Operation resource Cost & Rarity")}
            </span>
            
            <div className="flex flex-col gap-1 mt-0.5">
              <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Cost")}</span>
              <div className="flex gap-1.5 items-center">
                <select
                  value={costType}
                  onChange={(e) => {
                    setCostType(e.target.value as any);
                    playTactileSound(580, 'sine', 0.05);
                  }}
                  className="bg-stone-950 border border-white/10 rounded h-6 px-1 text-[8.5px] font-mono font-bold text-white focus:outline-none flex-1"
                >
                  {['None', 'MP', 'SP', 'PASSIVE', 'Pot', 'Elix'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                {['MP', 'SP', 'Pot', 'Elix'].includes(costType) ? (
                  <div className="flex items-center h-6 justify-between bg-stone-950 rounded border border-white/10 w-24 px-1 shrink-0">
                    <button
                      onClick={() => {
                        setCostValue(prev => Math.max(1, prev - 1));
                        playTactileSound(550, 'sine', 0.03);
                      }}
                      className="hover:bg-white/15 h-4 w-4 flex items-center justify-center text-xs font-bold font-mono text-white select-none rounded animate-none cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-cyan-400 font-mono text-[9px] font-bold leading-none">{costValue}</span>
                    <button
                      onClick={() => {
                        setCostValue(prev => Math.min(10, prev + 1));
                        playTactileSound(610, 'sine', 0.03);
                      }}
                      className="hover:bg-white/15 h-4 w-4 flex items-center justify-center text-xs font-bold font-mono text-white select-none rounded animate-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="h-6 px-2 bg-stone-950 rounded border border-white/5 flex items-center justify-center text-[7px] text-white/40 font-mono tracking-widest uppercase shrink-0">
                    —
                  </div>
                )}
              </div>
            </div>

            {/* Rarity Grading row inside Section 1 */}
            <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/[0.03]">
              <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Rarity Grading / Points Budget")}</span>
              <div className="flex gap-1 w-full">
                {([
                  { id: 'Common', label: 'Common (3pts)', style: 'border-stone-800 text-white bg-stone-950/20 hover:text-white' },
                  { id: 'Uncommon', label: 'Uncommon (5pts)', style: 'border-stone-800/80 text-white bg-stone-950/20 hover:text-white' },
                  { id: 'Rare', label: 'Rare (7pts)', style: 'border-cyan-900/30 text-cyan-400/85 bg-cyan-950/10 hover:text-cyan-300' },
                  { id: 'Epic', label: 'Epic (9pts)', style: 'border-purple-900/30 text-purple-400/85 bg-purple-950/10 hover:text-purple-300' },
                  { id: 'Legendary', label: 'Legendary (12pts)', style: 'border-amber-900/45 text-amber-400/85 bg-amber-950/15 hover:text-amber-300' }
                ] as const).map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setRarity(tier.id);
                      playTactileSound(600, 'sine', 0.05);
                    }}
                    title={tier.id}
                    className={`flex-1 py-1 rounded border text-[7.5px] font-mono uppercase font-black transition-all cursor-pointer ${
                      rarity === tier.id 
                        ? 'bg-amber-500/20 text-white border-amber-500/50 scale-102 font-extrabold shadow-[0_0_6px_rgba(245,158,11,0.15)]' 
                        : tier.style
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Virtus & Perditor */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg grid grid-cols-2 gap-2 relative">
            {/* Virtus Section */}
            <div className="flex flex-col gap-1 pr-1">
              <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
                {t("Virtus")}
              </span>
              <span className="text-[6.5px] font-mono text-white uppercase tracking-widest mb-1">
                {t("Active Stats")}
              </span>
              <div className="flex flex-wrap gap-1">
                {['Wizards', 'Vampires', 'Werewolves', 'Cursed', 'Fae', 'Spirits', 'Reanimated', 'Divine', 'Outsiders'].map((stat, idx) => {
                  const isSelected = selectedVirtusStats.includes(stat);
                  
                  // Dynamically color code based on category
                  let activeClass = 'bg-amber-600/25 text-white border-amber-500/40 shadow-[0_0_6px_rgba(245,158,11,0.15)]';
                  let hoverBorderClass = 'hover:border-amber-500/20';
                  if (['Wizards', 'Vampires', 'Werewolves'].includes(stat)) {
                    activeClass = 'bg-rose-600/25 text-white border-rose-500/40 shadow-[0_0_6px_rgba(244,63,94,0.15)]';
                    hoverBorderClass = 'hover:border-rose-500/20';
                  } else if (['Cursed', 'Fae', 'Spirits'].includes(stat)) {
                    activeClass = 'bg-cyan-600/25 text-white border-cyan-500/40 shadow-[0_0_6px_rgba(6,182,212,0.15)]';
                    hoverBorderClass = 'hover:border-cyan-500/20';
                  }

                  return (
                    <button
                      key={`active-virtus-stat-${stat}-${idx}`}
                      onClick={() => toggleVirtusStat(stat)}
                      className={`px-1.5 py-1 rounded border text-[7.5px] font-mono uppercase font-bold transition-all cursor-pointer ${
                        isSelected
                          ? `${activeClass} font-black`
                          : `bg-stone-950/20 text-white border-white/5 ${hoverBorderClass}`
                      }`}
                    >
                      {stat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Perditor Section */}
            <div className="flex flex-col gap-1 border-l border-white/5 pl-2">
              <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
                {t("Perditor")}
              </span>
              <span className="text-[6.5px] font-mono text-white uppercase tracking-widest mb-1">
                {t("Multiplier")}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 bg-stone-950 p-1 border border-white/5 rounded justify-between w-full">
                <button
                  onClick={() => {
                    setPerditorLevel(prev => Math.max(1, prev - 1));
                    playTactileSound(550, 'sine', 0.03);
                  }}
                  className="h-5 w-5 hover:bg-white/10 flex items-center justify-center text-xs font-bold font-mono text-white select-none rounded cursor-pointer animate-none"
                >
                  -
                </button>
                <span className="text-rose-455 font-mono text-xs font-black">
                  x{perditorLevel}
                </span>
                <button
                  onClick={() => {
                    setPerditorLevel(prev => Math.min(10, prev + 1));
                    playTactileSound(610, 'sine', 0.03);
                  }}
                  className="h-5 w-5 hover:bg-white/10 flex items-center justify-center text-xs font-bold font-mono text-white select-none rounded cursor-pointer animate-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Section: Effects */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg flex flex-col gap-1.5 relative">
            <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
              {t("Effects")}
            </span>
            <span className="text-[6.5px] font-mono text-white uppercase tracking-widest mb-1">
              {t("Active Domains")}
            </span>
            <div className="flex flex-wrap gap-1">
              {['Blood', 'Pain', 'Time', 'Oath', 'Faith', 'Memory', 'Will', 'Soul', 'Life'].map((stat, idx) => {
                const isSelected = selectedAnimaStats.includes(stat);
                
                // Dynamically color code based on category
                let activeClass = 'bg-purple-600/25 text-white border-purple-500/40 shadow-[0_0_6px_rgba(168,85,247,0.15)]';
                let hoverBorderClass = 'hover:border-purple-500/20';
                if (['Blood', 'Pain', 'Time'].includes(stat)) {
                  activeClass = 'bg-rose-600/25 text-white border-rose-500/40 shadow-[0_0_6px_rgba(244,63,94,0.15)]';
                  hoverBorderClass = 'hover:border-rose-500/20';
                } else if (['Will', 'Soul', 'Life'].includes(stat)) {
                  activeClass = 'bg-emerald-600/25 text-white border-emerald-500/40 shadow-[0_0_6px_rgba(16,185,129,0.15)]';
                  hoverBorderClass = 'hover:border-emerald-500/20';
                }

                return (
                  <button
                    key={`active-anima-stat-${stat}-${idx}`}
                    onClick={() => {
                      if (selectedAnimaStats.includes(stat)) {
                        setSelectedAnimaStats(selectedAnimaStats.filter(s => s !== stat));
                      } else {
                        setSelectedAnimaStats([...selectedAnimaStats, stat]);
                      }
                      playTactileSound(600, 'sine', 0.03);
                    }}
                    className={`px-1.5 py-1 rounded border text-[7.5px] font-mono uppercase font-bold transition-all cursor-pointer ${
                      isSelected
                        ? `${activeClass} font-black`
                        : `bg-stone-950/20 text-white border-white/5 ${hoverBorderClass}`
                    }`}
                  >
                    {t(stat)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Lore Narrative */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg flex flex-col gap-1.5 relative">
            <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
              {t("3. Holographic Narrative Lore")}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Historical Context & Records")}</span>
              <textarea
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder={t("A mysterious relic or weapon from forgotten times...")}
                rows={4}
                className="bg-stone-950 border border-white/10 rounded p-1.5 text-[8.5px] font-medium text-white placeholder-white/20 focus:outline-none focus:border-amber-500 w-full resize-none leading-relaxed italic"
              />
            </div>
          </div>

        </div>

        {/* RIGHT PANEL COLUMN */}
        <div className="flex flex-col gap-2 min-w-0">
          
          {/* Section: Celestial Power Rating */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg flex flex-col gap-2 relative">
            <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
              {t("2. Celestial Power Rating")}
            </span>

            {/* Power Type selection */}
            <div className="flex gap-1">
              {[
                { id: 'damage', label: 'Attack Dice Formula' },
                { id: 'stat', label: 'Stat / Defense Increment' },
                { id: 'empty', label: 'Empty Signature (—)' }
              ].map(pType => (
                <button
                  key={pType.id}
                  onClick={() => {
                    setPowerType(pType.id as any);
                    playTactileSound(520, 'sine', 0.05);
                  }}
                  className={`flex-1 py-1 rounded border text-[7px] font-mono uppercase font-extrabold transition-all cursor-pointer ${
                    powerType === pType.id 
                      ? 'bg-amber-500/20 text-white border-amber-500/50 shadow-sm' 
                      : 'bg-stone-950/20 text-white border-white/5'
                  }`}
                >
                  {t(pType.label)}
                </button>
              ))}
            </div>

            {/* Dynamic UI depending on selection */}
            {powerType === 'damage' && (
              <div className="bg-stone-950 p-2 border border-white/5 rounded grid grid-cols-3 gap-2">
                {/* Dice Count */}
                <div className="flex flex-col gap-1">
                  <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Dice count")}</span>
                  <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded border border-white/5 justify-between">
                    <button
                      onClick={() => {
                        setDiceCount(prev => Math.max(1, prev - 1));
                        playTactileSound(550, 'sine', 0.03);
                      }}
                      className="h-5 w-5 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer font-bold font-mono text-xs text-white"
                    >
                      -
                    </button>
                    <span className="text-white font-mono text-xs font-bold leading-none">{diceCount}</span>
                    <button
                      onClick={() => {
                        setDiceCount(prev => Math.min(6, prev + 1));
                        playTactileSound(610, 'sine', 0.03);
                      }}
                      className="h-5 w-5 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer font-bold font-mono text-xs text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Dice Size */}
                <div className="flex flex-col gap-1">
                  <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Dice Size")}</span>
                  <select
                    value={diceSize}
                    onChange={(e) => {
                      setDiceSize(parseInt(e.target.value) || 6);
                      playTactileSound(580, 'sine', 0.05);
                    }}
                    className="bg-stone-900 border border-white/5 rounded h-6 px-1 text-xs font-mono font-bold text-white focus:outline-none w-full"
                  >
                    {[4, 6, 8, 10, 12, 20, 100].map(s => (
                      <option key={s} value={s}>d{s}</option>
                    ))}
                  </select>
                </div>

                {/* Modifier */}
                <div className="flex flex-col gap-1">
                  <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Damage Modifier")}</span>
                  <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded border border-white/5 justify-between">
                    <button
                      onClick={() => {
                        setPowerModifier(prev => Math.max(-5, prev - 1));
                        playTactileSound(550, 'sine', 0.03);
                      }}
                      className="h-5 w-5 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer font-bold font-mono text-xs text-white"
                    >
                      -
                    </button>
                    <span className="text-white font-mono text-xs font-bold leading-none">+{powerModifier}</span>
                    <button
                      onClick={() => {
                        setPowerModifier(prev => Math.min(20, prev + 1));
                        playTactileSound(610, 'sine', 0.03);
                      }}
                      className="h-5 w-5 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer font-bold font-mono text-xs text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {powerType === 'stat' && (
              <div className="bg-stone-950 p-2 border border-white/5 rounded grid grid-cols-2 gap-2">
                {/* Bonus value */}
                <div className="flex flex-col gap-1">
                  <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Numerical Bonus")}</span>
                  <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded border border-white/5 justify-between">
                    <button
                      onClick={() => {
                        setPowerStatBonusValue(prev => Math.max(1, prev - 1));
                        playTactileSound(550, 'sine', 0.03);
                      }}
                      className="h-5 w-5 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer font-bold font-mono text-xs text-white"
                    >
                      -
                    </button>
                    <span className="text-white font-mono text-xs font-bold leading-none">+{powerStatBonusValue}</span>
                    <button
                      onClick={() => {
                        setPowerStatBonusValue(prev => Math.min(10, prev + 1));
                        playTactileSound(610, 'sine', 0.03);
                      }}
                      className="h-5 w-5 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer font-bold font-mono text-xs text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Stat category/type */}
                <div className="flex flex-col gap-1">
                  <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Combat Stat")}</span>
                  <select
                    value={powerStatBonusType}
                    onChange={(e) => {
                      setPowerStatBonusType(e.target.value);
                      playTactileSound(580, 'sine', 0.05);
                    }}
                    className="bg-stone-900 border border-white/5 rounded h-6 px-1 text-xs font-mono font-bold text-white focus:outline-none w-full"
                  >
                    {['DEF', 'ATK', 'MAG', 'HP', 'SPEED', 'INIT'].map(stat => (
                      <option key={stat} value={stat}>+{stat}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {powerType === 'empty' && (
              <div className="bg-stone-950 px-2 py-3 border border-white/5 rounded text-center text-[7.5px] font-mono text-white/50 uppercase tracking-widest">
                — {t("Cognitive output signature suppressed. Displays on layout as '—'")}
              </div>
            )}
          </div>

          {/* Section: Aspect Nature & Archetype Effect */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg flex flex-col gap-2 relative">
            <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
              {t("4. Aspect Alignment & Effect archetype")}
            </span>

            {/* Nature Drop / Select buttons */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Power Nature Aspect")}</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {['PHYSICAL', 'SPIRIT', 'HEAL', 'SHIELD', 'LIGHT', 'NONE'].map((nat, idx) => (
                  <button
                    key={`item-nature-${nat}-${idx}`}
                    onClick={() => {
                      setNature(nat);
                      playTactileSound(520, 'sine', 0.04);
                    }}
                    className={`py-1 rounded border text-[7px] font-mono uppercase font-bold text-center transition-all cursor-pointer ${
                      nature === nat 
                        ? 'bg-purple-600/20 text-white border-purple-500/50 font-black' 
                        : 'bg-stone-950/20 text-white border-white/5'
                    }`}
                  >
                    {nat}
                  </button>
                ))}
              </div>
            </div>

            {/* Effect archetype grid */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Effect Archetype Group")}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {Object.keys(EFFECT_ARCHETYPES).map((arch, idx) => (
                  <button
                    key={`item-archetype-${arch}-${idx}`}
                    onClick={() => handleArchetypeChange(arch as any)}
                    className={`py-1 rounded border text-[7.5px] font-mono uppercase font-black transition-all cursor-pointer ${
                      selectedArchetype === arch 
                        ? 'bg-amber-500/20 text-white border-amber-500/50 shadow-sm' 
                        : 'bg-stone-950/20 text-white border-white/5'
                    }`}
                  >
                    {t(arch)}
                  </button>
                ))}
              </div>

              {/* Archetype options lists */}
              <div className="bg-stone-950 p-1.5 border border-white/5 rounded flex gap-1.5 flex-wrap justify-center sm:justify-start">
                {EFFECT_ARCHETYPES[selectedArchetype].map((opt, idx) => (
                  <button
                    key={`item-effect-opt-${opt}-${idx}`}
                    onClick={() => {
                      setSelectedEffect(opt);
                      playTactileSound(610, 'sine', 0.05);
                    }}
                    className={`px-2.5 py-1 rounded text-[7.5px] font-mono uppercase font-extrabold tracking-wider transition-all cursor-pointer border ${
                      selectedEffect === opt 
                        ? 'bg-purple-650 text-white border-purple-500/50 font-black shadow-[0_0_8px_rgba(168,85,247,0.15)]' 
                        : 'bg-stone-950/20 text-white border-transparent'
                    }`}
                  >
                    — {t(opt)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Focus, Terminus Settings */}
          <div className="bg-stone-900/10 border border-white/[0.04] p-2 rounded-lg flex flex-col gap-2 relative select-none">
            <span className="text-[7.5px] font-mono font-extrabold uppercase text-white tracking-wider">
              {t("5. Focus Requirement & Terminus Duration")}
            </span>

            {/* Focus & Terminus Row */}
            <div className="grid grid-cols-2 gap-2 mt-0.5">
              <div className="flex flex-col gap-1">
                <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Focus Requirement")}</span>
                <select
                  value={focus}
                  onChange={(e) => {
                    setFocus(e.target.value);
                    playTactileSound(580, 'sine', 0.05);
                  }}
                  className="bg-stone-950 border border-white/10 rounded h-6 px-1 text-[8.5px] font-mono font-bold text-white focus:outline-none w-full"
                >
                  {['None', 'Self', 'Conc', '—'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6.5px] font-mono text-white uppercase tracking-widest">{t("Terminus Duration")}</span>
                <select
                  value={terminus}
                  onChange={(e) => {
                    setTerminus(e.target.value);
                    playTactileSound(580, 'sine', 0.05);
                  }}
                  className="bg-stone-950 border border-white/10 rounded h-6 px-1 text-[8.5px] font-mono font-bold text-white focus:outline-none w-full"
                >
                  {['INST', 'PASS', 'PERM', '1 MIN', '10 MIN'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* WINDOW FOOTER */}
      <footer className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-end shrink-0 select-none px-0.5">
        <button
          onClick={handleForge}
          className="px-6 py-2 text-[10px] text-stone-950 font-serif font-black uppercase tracking-widest rounded bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:from-amber-400 hover:to-amber-500 cursor-pointer transition-all active:scale-95 flex items-center"
        >
          {t("Build")}
        </button>
      </footer>

    </div>
  );
}
