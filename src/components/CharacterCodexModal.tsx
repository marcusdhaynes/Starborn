import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, X, Shield, Heart, Brain, Swords, Sparkles, 
  Zap, ShieldAlert, BookOpen, Check, Plus, RefreshCw
} from 'lucide-react';
import { safeStorage } from '../storage';
import { useTranslation } from '../99_settings/language';

interface CharacterProfile {
  id: string;
  name: string;
  isFavorite: boolean;
  createdAt: number;
}

interface CharacterCodexModalProps {
  charId: string;
  onClose: () => void;
}

export default function CharacterCodexModal({ charId, onClose }: CharacterCodexModalProps) {
  const { t } = useTranslation();

  // Load characters list
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => {
    const saved = safeStorage.getItem('setting_vtt_characters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading characters array in CharacterCodexModal:", e);
      }
    }
    return [{
      id: 'default',
      name: 'Default Hero',
      isFavorite: false,
      createdAt: 1718000000000
    }];
  });

  const editorChar = useMemo(() => {
    return characters.find(c => c.id === charId) || {
      id: charId || 'default',
      name: '',
      isFavorite: false,
      createdAt: 1718000000000
    };
  }, [characters, charId]);

  // Codex form states
  const [editorName, setEditorName] = useState('');
  const [editorClass, setEditorClass] = useState('');
  const [editorRace, setEditorRace] = useState('');
  const [editorBio, setEditorBio] = useState('');
  const [editorImage, setEditorImage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setEditorImage(result);
        if (editorChar) {
          safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_char_image`, result);
          window.dispatchEvent(new Event('tabletop-state-update'));
          window.dispatchEvent(new Event('storage'));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };
  const [editorBody, setEditorBody] = useState<number>(0);
  const [editorMind, setEditorMind] = useState<number>(0);
  const [editorWield, setEditorWield] = useState<number>(0);
  const [editorMagic, setEditorMagic] = useState<number>(0);
  const [editorHpCurrent, setEditorHpCurrent] = useState<number>(0);
  const [editorHpMax, setEditorHpMax] = useState<number>(0);

  // Dropdown stat method & sub-states
  const [statMethod, setStatMethod] = useState<'Stats' | 'Point Buy' | 'Selection' | 'Random' | 'Powerless'>('Stats');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [rolledDice, setRolledDice] = useState<{ id: number; val: number; stat: string | null }[]>([]);
  const [clickedDieId, setClickedDieId] = useState<number | null>(null);
  const [hasRerolled, setHasRerolled] = useState(false);

  const playAudioTick = () => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const playSparkleEffect = () => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      gain.connect(ctx.destination);

      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        osc.connect(gain);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.15);
      });
    } catch (e) {}
  };

  const handleMethodChange = (method: 'Stats' | 'Point Buy' | 'Selection' | 'Random' | 'Powerless') => {
    setStatMethod(method);
    setClickedDieId(null);
    setHasRerolled(false);
    setEditorBody(0);
    setEditorMind(0);
    setEditorWield(0);
    setEditorMagic(0);
    setEditorHpMax(0);
    setEditorHpCurrent(0);

    if (method === 'Selection') {
      const dice = Array.from({ length: 4 }, (_, i) => ({
        id: i,
        val: Math.floor(Math.random() * 6) + 1,
        stat: null
      }));
      setRolledDice(dice);
    } else {
      setRolledDice([]);
    }
    playAudioTick();
  };

  const handleRerollSelection = () => {
    if (hasRerolled || statMethod !== 'Selection') return;
    setHasRerolled(true);
    const dice = Array.from({ length: 4 }, (_, i) => ({
      id: i,
      val: Math.floor(Math.random() * 6) + 1,
      stat: null
    }));
    setRolledDice(dice);
    setClickedDieId(null);
    setEditorBody(0);
    setEditorMind(0);
    setEditorWield(0);
    setEditorMagic(0);
    setEditorHpMax(0);
    setEditorHpCurrent(0);
    playSparkleEffect();
  };

  const assignDie = (dieId: number, statName: string) => {
    const targetDie = rolledDice.find(d => d.id === dieId);
    if (!targetDie) return;

    const nextDice = rolledDice.map(d => {
      if (d.stat === statName) {
        return { ...d, stat: null };
      }
      if (d.id === dieId) {
        return { ...d, stat: statName };
      }
      return d;
    });

    setRolledDice(nextDice);
    setClickedDieId(null);
    playAudioTick();

    const getValForStat = (name: string) => {
      const found = nextDice.find(d => d.stat === name);
      return found ? found.val : 0;
    };

    const bodyVal = getValForStat('body');
    setEditorBody(bodyVal);
    setEditorHpMax(bodyVal * 10);
    setEditorHpCurrent(curr => Math.min(bodyVal * 10, curr));

    setEditorMind(getValForStat('mind'));
    setEditorWield(getValForStat('wield'));
    setEditorMagic(getValForStat('magic'));
  };

  const unassignDie = (dieId: number) => {
    const nextDice = rolledDice.map(d => {
      if (d.id === dieId) {
        return { ...d, stat: null };
      }
      return d;
    });

    setRolledDice(nextDice);
    setClickedDieId(null);
    playAudioTick();

    const getValForStat = (name: string) => {
      const found = nextDice.find(d => d.stat === name);
      return found ? found.val : 0;
    };

    const bodyVal = getValForStat('body');
    setEditorBody(bodyVal);
    setEditorHpMax(bodyVal * 10);
    setEditorHpCurrent(curr => Math.min(bodyVal * 10, curr));

    setEditorMind(getValForStat('mind'));
    setEditorWield(getValForStat('wield'));
    setEditorMagic(getValForStat('magic'));
  };

  const totalSpent = editorBody + editorMind + editorWield + editorMagic;
  const remainingPoints = 10 - totalSpent;

  const isFirstTime = !characters.some(c => c.id === editorChar.id);

  const isSaveDisabled = (() => {
    const isBasicInfoFilled = editorName.trim() !== "" && editorClass.trim() !== "" && editorRace.trim() !== "";
    const isBioFilled = editorBio.trim() !== "";
    
    const isStatMethodMet = (() => {
      switch (statMethod) {
        case 'Point Buy':
          return totalSpent === 10;
        case 'Selection':
          return rolledDice.length > 0 && rolledDice.every(d => d.stat !== null);
        case 'Random':
          return editorBody > 0 && editorMind > 0 && editorWield > 0 && editorMagic > 0;
        case 'Powerless':
          return true;
        case 'Stats':
        default:
          return true;
      }
    })();

    return !(isBasicInfoFilled && isStatMethodMet && isBioFilled);
  })();

  const renderStatControl = (
    name: string,
    val: number,
    setVal: (v: number) => void,
    icon: React.ReactNode,
    label: string,
    isBody: boolean = false
  ) => {
    const assignedDie = statMethod === 'Selection' ? rolledDice.find(d => d.stat === name) : null;

    return (
      <div className={`flex items-center justify-between text-[9px] h-5 px-1 rounded transition-colors ${
        statMethod === 'Selection' && clickedDieId !== null && !assignedDie
          ? "bg-amber-600/10 border border-dashed border-amber-500/30 animate-pulse"
          : ""
      }`}>
        <div className="flex items-center gap-1 text-stone-400 font-medium scale-90 origin-left">
          {icon}
          <span>{label}</span>
        </div>

        {statMethod === 'Stats' && (
          <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5">
            <button
              type="button"
              onClick={() => {
                const nextVal = Math.max(0, val - 1);
                setVal(nextVal);
                if (isBody) {
                  const nextHpMax = nextVal * 10;
                  setEditorHpMax(nextHpMax);
                  setEditorHpCurrent(curr => Math.min(nextHpMax, curr));
                }
              }}
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
            >
              -
            </button>
            <span className="w-5 text-center font-mono text-[8.5px] font-black text-amber-300">
              {val}
            </span>
            <button
              type="button"
              onClick={() => {
                const nextVal = Math.min(30, val + 1);
                setVal(nextVal);
                if (isBody) {
                  const nextHpMax = nextVal * 10;
                  setEditorHpMax(nextHpMax);
                  setEditorHpCurrent(curr => {
                    const wasFull = (val * 10 === 0) || (curr === val * 10);
                    return wasFull ? nextHpMax : Math.min(nextHpMax, curr + 10);
                  });
                }
              }}
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
            >
              +
            </button>
          </div>
        )}

        {statMethod === 'Point Buy' && (
          <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5">
            <button
              type="button"
              disabled={val <= 0}
              onClick={() => {
                const nextVal = Math.max(0, val - 1);
                setVal(nextVal);
                if (isBody) {
                  const nextHpMax = nextVal * 10;
                  setEditorHpMax(nextHpMax);
                  setEditorHpCurrent(curr => Math.min(nextHpMax, curr));
                }
                playAudioTick();
              }}
              className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] ${
                val <= 0
                  ? "text-stone-700 cursor-not-allowed"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer"
              }`}
            >
              -
            </button>
            <span className="w-5 text-center font-mono text-[8.5px] font-black text-amber-300">
              {val}
            </span>
            <button
              type="button"
              disabled={val >= 6 || remainingPoints <= 0}
              onClick={() => {
                if (remainingPoints <= 0) return;
                const nextVal = Math.min(6, val + 1);
                setVal(nextVal);
                if (isBody) {
                  const nextHpMax = nextVal * 10;
                  setEditorHpMax(nextHpMax);
                  setEditorHpCurrent(curr => {
                    const wasFull = (val * 10 === 0) || (curr === val * 10);
                    return wasFull ? nextHpMax : Math.min(nextHpMax, curr + 10);
                  });
                }
                playAudioTick();
              }}
              className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] ${
                val >= 6 || remainingPoints <= 0
                  ? "text-stone-700 cursor-not-allowed"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer"
              }`}
            >
              +
            </button>
          </div>
        )}

        {statMethod === 'Selection' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const dieIdStr = e.dataTransfer.getData("text/plain");
              const dieId = parseInt(dieIdStr, 10);
              if (!isNaN(dieId)) {
                assignDie(dieId, name);
              }
            }}
            onClick={() => {
              if (assignedDie) {
                unassignDie(assignedDie.id);
              } else if (clickedDieId !== null) {
                assignDie(clickedDieId, name);
              }
            }}
            className={`w-12 h-4.5 rounded flex items-center justify-center transition-all select-none ${
              assignedDie
                ? "bg-amber-600/10 border border-amber-500/30 text-amber-300 cursor-pointer hover:bg-amber-600/20"
                : "bg-stone-950 border border-dashed border-stone-800 text-stone-600 hover:border-amber-500/40 cursor-pointer text-[7px]"
            }`}
          >
            {assignedDie ? (
              <div className="flex items-center gap-1 font-mono text-[8.5px] font-black">
                <span className="w-3.5 h-3.5 rounded-sm bg-amber-600 text-stone-900 flex items-center justify-center text-[8px] font-bold">
                  {assignedDie.val}
                </span>
                <span className="text-[6.5px] uppercase text-amber-500">{t("Die")}</span>
              </div>
            ) : (
              <span className="font-mono text-[6.5px] opacity-60 tracking-tighter uppercase whitespace-nowrap">
                {clickedDieId !== null ? t("Place") : t("Empty")}
              </span>
            )}
          </div>
        )}

        {statMethod === 'Random' && (
          <div className="w-12 h-4.5 rounded border border-stone-800 bg-stone-950/80 flex items-center justify-center text-amber-300 font-mono text-[8.5px] font-black select-none">
            {val || "—"}
          </div>
        )}

        {statMethod === 'Powerless' && (
          <div className="w-12 h-4.5 rounded border border-stone-850 bg-stone-950/30 flex items-center justify-center text-stone-600 font-mono text-[8.5px] font-black select-none">
            0
          </div>
        )}
      </div>
    );
  };

  // Set global codex open status for dice rendering hierarchy
  useEffect(() => {
    (window as any).__vtt_codex_open = true;
    window.dispatchEvent(new Event('vtt-menu-update'));
    return () => {
      (window as any).__vtt_codex_open = false;
      window.dispatchEvent(new Event('vtt-menu-update'));
    };
  }, []);

  // Initialize fields on mount / load
  useEffect(() => {
    if (editorChar) {
      setEditorName(editorChar.name);
      setEditorClass(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_class`) || (editorChar.id === "default" ? t("Starborn Outcast") : ""));
      setEditorRace(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_race`) || (editorChar.id === "default" ? t("Aelfborn") : ""));
      setEditorBio(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_bio`) || '');
      setEditorImage(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_image`) || '');
      
      const bodyVal = parseInt(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_stat_body`) || '0', 10);
      setEditorBody(bodyVal);
      setEditorMind(parseInt(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_stat_mind`) || '0', 10));
      setEditorWield(parseInt(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_stat_wield`) || '0', 10));
      setEditorMagic(parseInt(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_stat_magic`) || '0', 10));
      
      const hpMaxVal = bodyVal * 10;
      setEditorHpMax(hpMaxVal);
      
      const hpCurrentSaved = safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_hp_current`);
      if (hpCurrentSaved !== null) {
        setEditorHpCurrent(Math.min(hpMaxVal, parseInt(hpCurrentSaved, 10)));
      } else {
        setEditorHpCurrent(hpMaxVal);
      }
    }
  }, [editorChar]);

  const handleSaveEditor = () => {
    if (!editorChar) return;
    const trimmed = editorName.trim();

    // 1. Update character list name in profiles
    const exists = characters.some(c => c.id === editorChar.id);
    let nextChars;
    if (!exists) {
      // Commit new brand character profile
      nextChars = [...characters, {
        id: editorChar.id,
        name: trimmed || t("Unnamed Hero"),
        isFavorite: false,
        createdAt: editorChar.createdAt || Date.now()
      }];
      safeStorage.setItem('setting_active_character_id', editorChar.id);
    } else {
      nextChars = characters.map(c => {
        if (c.id === editorChar.id) {
          return { ...c, name: trimmed };
        }
        return c;
      });
    }
    setCharacters(nextChars);
    safeStorage.setItem('setting_vtt_characters', JSON.stringify(nextChars));

    // 2. Multi-write statistical key-values
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_char_class`, editorClass);
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_char_race`, editorRace);
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_char_bio`, editorBio);
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_char_image`, editorImage);
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_body`, editorBody.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_mind`, editorMind.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_wield`, editorWield.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_magic`, editorMagic.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_speed`, "0");
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_endurance`, "0");
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_hp_current`, editorHpCurrent.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_hp_max`, editorHpMax.toString());

    // Dispatch global tabletop level states
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-[1.5px] flex items-center justify-center p-3 z-[9999] opacity-100 select-none">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="w-[272px] h-[444px] max-h-[96%] bg-stone-900 border border-amber-550/30 rounded-lg p-3 flex flex-col gap-2.5 shadow-[0_5px_22px_rgba(0,0,0,0.8)] overflow-y-auto text-stone-200 border-t-4 border-t-amber-500/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="text-amber-500 shrink-0" size={11} />
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-[10px] font-black uppercase tracking-wider text-amber-400 truncate">
                {editorName || t("Character Codex")}
              </span>
              <span className="text-[7px] font-mono text-stone-500 uppercase tracking-widest leading-none truncate max-w-[180px]">
                {editorClass || t("Hero")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-4.5 w-4.5 rounded border border-stone-800 bg-stone-950 flex items-center justify-center text-stone-500 hover:text-stone-300 hover:border-stone-700 cursor-pointer transition-colors"
          >
            <X size={9} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
          {/* 1. Profile Portrait & Name & Archetype Section */}
          <div className="flex items-center gap-2 bg-stone-950/40 p-1.5 rounded-md border border-stone-800/50">
            {/* Pink Circle Image Drag & Drop / Press-to-import */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsDragOver(false); 
                  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); 
                }}
                className={`relative w-[31px] h-[31px] rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 select-none overflow-hidden border border-rose-500/60 ${
                  isDragOver ? 'border-amber-400 scale-105 shadow-[0_0_12px_rgba(244,63,94,0.9)]' : 'border-rose-500/80 shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
                }`}
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ff71cd 0%, #700b97 50%, #3e065f 100%)'
                }}
                title={t("Drag & Drop or Press to Import Image")}
              >
                {editorImage ? (
                  <img 
                    src={editorImage} 
                    alt="" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-pink-100/90 hover:text-white transition-colors">
                    <Plus size={11} className="stroke-[2.5]" />
                  </div>
                )}
                
                {/* 3D Spherical shadow/bevel overlay inside circle */}
                <div className="absolute inset-0 rounded-full pointer-events-none z-[10] shadow-[inset_0_2px_5px_rgba(255,255,255,0.45),_inset_0_-2px_5px_rgba(0,0,0,0.6)]" />
                {/* Subtle sheen highlight overlay */}
                <div className="absolute inset-0 rounded-full pointer-events-none z-[11] bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-70" />
              </div>
            </div>

            {/* Name, Epithet & Race Column */}
            <div className="flex-1 min-w-0 grid grid-cols-3 gap-1">
              <div className="flex flex-col gap-0.5">
                <label className="text-[7px] font-mono font-bold uppercase tracking-wider text-stone-500 leading-none">
                  {t("Hero Name")}
                </label>
                <input
                  type="text"
                  className="w-full h-5.5 px-1 bg-stone-950 border border-stone-850 focus:border-amber-500/50 rounded text-[8px] font-sans font-bold text-stone-200 outline-none leading-none focus:outline-none focus:ring-0"
                  value={editorName}
                  onChange={(e) => setEditorName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[7px] font-mono font-bold uppercase tracking-wider text-stone-500 leading-none">
                  {t("Epithet/Mantle")}
                </label>
                <input
                  type="text"
                  className="w-full h-5.5 px-1 bg-stone-950 border border-stone-850 focus:border-amber-500/50 rounded text-[8px] font-sans font-bold text-amber-400 outline-none leading-none focus:outline-none focus:ring-0"
                  value={editorClass}
                  onChange={(e) => setEditorClass(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[7px] font-mono font-bold uppercase tracking-wider text-stone-500 leading-none">
                  {t("Race")}
                </label>
                <input
                  type="text"
                  className="w-full h-5.5 px-1 bg-stone-950 border border-stone-850 focus:border-amber-500/50 rounded text-[8px] font-sans font-bold text-teal-400 outline-none leading-none focus:outline-none focus:ring-0"
                  value={editorRace}
                  onChange={(e) => setEditorRace(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Stat Attributes Matrix Section */}
          <div className="border border-stone-800/60 bg-stone-950/40 p-1.5 rounded-md flex flex-col gap-1.5">
            <div className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-stone-500 border-b border-stone-900 pb-1.5 flex items-center justify-between gap-1 h-5.5 select-none">
              <div className="flex items-center gap-1">
                <Shield size={8.5} className="text-amber-500" />
                <span>{t("Stats")}</span>
              </div>
                            {/* Dropdown and label always remain the same width */}
              <div className="flex items-center gap-1 h-3.5 relative">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-[58px] h-3.5 bg-stone-950 border border-stone-800 rounded text-[6.5px] font-mono font-bold text-amber-500 focus:outline-none focus:ring-0 cursor-pointer flex items-center justify-between px-1.5 leading-none hover:bg-stone-900 transition-colors"
                  >
                    <span className="truncate">{t(statMethod)}</span>
                    <span className="text-[5px] text-amber-500/40 select-none ml-1">▼</span>
                  </button>

                  {isDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-[100]" 
                        onClick={() => setIsDropdownOpen(false)} 
                      />
                      <div 
                        className="absolute right-0 top-4 w-[58px] bg-stone-950 border border-stone-800 rounded shadow-xl z-[101] overflow-hidden flex flex-col py-0.2"
                      >
                        {(['Stats', 'Point Buy', 'Selection', 'Random', 'Powerless'] as const).map((method) => (
                           <button
                            key={method}
                            type="button"
                            onClick={() => {
                              handleMethodChange(method);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-center py-0.5 text-[6px] font-mono font-bold leading-none select-none cursor-pointer transition-colors ${
                              statMethod === method 
                                ? 'bg-amber-600 text-stone-950 font-black' 
                                : 'text-amber-500 hover:bg-stone-900/60'
                            }`}
                            style={{ padding: '2.5px 1px', margin: '0' }}
                          >
                            {t(method)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Shared exact width label wrapper */}
                <div className="w-[72px] h-3.5 flex items-center justify-center">
                  {statMethod === 'Stats' && (
                    <div className="w-full h-full bg-stone-950 border border-stone-800 rounded flex items-center justify-center font-mono text-[7px] font-bold text-stone-600 leading-none">
                      —
                    </div>
                  )}

                  {statMethod === 'Point Buy' && (
                    <div className="w-full h-full bg-stone-950 border border-stone-800 rounded flex items-center justify-center font-mono text-[7.5px] font-bold text-stone-300 leading-none gap-0.5">
                      <span className="text-amber-400 font-extrabold">{10 - totalSpent}</span>
                      <span className="text-[6px] text-stone-600 uppercase">PTS</span>
                    </div>
                  )}

                  {statMethod === 'Selection' && (
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dieIdStr = e.dataTransfer.getData("text/plain");
                        const dieId = parseInt(dieIdStr, 10);
                        if (!isNaN(dieId)) {
                          unassignDie(dieId);
                        }
                      }}
                      className="w-full h-full bg-stone-900 border border-stone-800 rounded flex items-center justify-end px-0.5 gap-0.5 overflow-hidden"
                      title={t("Drop dice here to unassign")}
                    >
                      {rolledDice.filter(d => d.stat === null).length === 0 && (
                        <span className="text-[5px] font-mono text-stone-600 tracking-tighter mr-auto select-none pl-0.5">EMPTY</span>
                      )}
                      
                      {rolledDice.filter(d => d.stat === null).map(die => (
                        <div
                          key={die.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", die.id.toString());
                          }}
                          onClick={() => {
                            if (clickedDieId === die.id) {
                              setClickedDieId(null);
                            } else {
                              setClickedDieId(die.id);
                            }
                          }}
                          className={`w-3 h-3 rounded-sm text-stone-950 flex items-center justify-center font-mono text-[8px] font-black cursor-grab active:cursor-grabbing transition-all ${
                            clickedDieId === die.id
                              ? "bg-amber-400 scale-110 ring-1 ring-white/50 shadow-[0_0_3px_#000]"
                              : "bg-amber-600 hover:bg-amber-500"
                          }`}
                        >
                          {die.val}
                        </div>
                      ))}

                      <button
                        type="button"
                        id="character-creation-reroll-btn"
                        disabled={hasRerolled}
                        onClick={handleRerollSelection}
                        className={`w-3 h-3 rounded-sm flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          hasRerolled
                            ? "bg-stone-800 text-stone-600 border border-stone-900 cursor-not-allowed select-none pointer-events-none"
                            : "bg-indigo-650 hover:bg-indigo-550 text-indigo-50 hover:text-white active:scale-95 border border-indigo-500/35 shadow-[0_0_3px_rgba(99,102,241,0.2)]"
                        }`}
                        title={hasRerolled ? t("Reroll used") : t("Reroll options (once)")}
                      >
                        <RefreshCw size={7} />
                      </button>
                    </div>
                  )}

                  {statMethod === 'Random' && (
                    <button
                      type="button"
                      onClick={() => {
                        const rBody = Math.floor(Math.random() * 6) + 1;
                        const rMind = Math.floor(Math.random() * 6) + 1;
                        const rWield = Math.floor(Math.random() * 6) + 1;
                        const rMagic = Math.floor(Math.random() * 6) + 1;
                        
                        setEditorBody(rBody);
                        setEditorHpMax(rBody * 10);
                        setEditorHpCurrent(curr => Math.min(rBody * 10, curr));

                        setEditorMind(rMind);
                        setEditorWield(rWield);
                        setEditorMagic(rMagic);
                        
                        playSparkleEffect();
                      }}
                      className="w-full h-full bg-indigo-950 text-indigo-300 hover:text-indigo-200 border border-indigo-900/60 rounded flex items-center justify-center font-mono text-[6.5px] font-black uppercase cursor-pointer select-none transition-all hover:bg-indigo-900 leading-none"
                    >
                      {editorBody > 0 ? t("RE-ROLL") : t("ROLL")}
                    </button>
                  )}

                  {statMethod === 'Powerless' && (
                    <div className="w-full h-full bg-stone-950 border border-stone-800 rounded flex items-center justify-center font-mono text-[7.5px] font-black text-rose-500 leading-none">
                      0
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
              {/* BODY */}
              {renderStatControl('body', editorBody, setEditorBody, <Heart size={8.5} className="text-red-500/70" />, t("Body"), true)}

              {/* MIND */}
              {renderStatControl('mind', editorMind, setEditorMind, <Brain size={8.5} className="text-blue-500/70" />, t("Mind"))}

              {/* WIELD */}
              {renderStatControl('wield', editorWield, setEditorWield, <Swords size={8.5} className="text-emerald-500/70" />, t("Wield"))}

              {/* MAGIC */}
              {renderStatControl('magic', editorMagic, setEditorMagic, <Sparkles size={8.5} className="text-purple-500/70" />, t("Magic"))}
            </div>
          </div>

          {/* 3. HP Section */}
          <div className="border border-stone-800/60 bg-stone-950/40 p-1.5 rounded-md flex flex-col gap-1">
            <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-stone-500 border-b border-stone-900 pb-0.5 flex items-center gap-1">
              <Heart size={8.5} className="text-red-500" />
              {t("Vitality & Health (HP)")}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between text-[9px] h-5">
                <span className="text-stone-400 scale-95 origin-left">{t("Current HP")}</span>
                <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorHpCurrent(p => Math.max(0, p - 1))}
                    className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono text-[8.5px] font-bold text-red-400">
                    {editorHpCurrent}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditorHpCurrent(p => Math.min(editorHpMax, p + 1))}
                    className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[9px] h-5 opacity-80">
                <span className="text-stone-400 scale-95 origin-left">{t("Max HP")}</span>
                <div className="flex items-center h-4.5 bg-stone-950/40 rounded border border-stone-850 px-2 font-mono text-[8.5px] font-bold text-stone-500 select-none">
                  <span>{editorHpMax} <span className="text-[7.5px] font-mono text-stone-605 font-normal">({editorBody} × 10)</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Biography / Historical Codex Scroll */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <BookOpen size={8.5} className="text-amber-500" />
              {t("Heroic Bio & Historical Codex")}
            </span>
            <textarea
              className="w-full h-14 p-1.5 bg-stone-950 border border-stone-800 focus:border-amber-500/50 rounded text-[8.5px] font-serif italic text-stone-300 leading-normal focus:outline-none focus:ring-0 outline-none resize-none placeholder-stone-700"
              placeholder={t("Record their cosmic origins, backstories, or memories here...")}
              value={editorBio}
              onChange={(e) => setEditorBio(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-1.5 border-t border-stone-850 pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-stone-700 hover:bg-stone-900 rounded text-[8px] font-bold text-stone-400 hover:text-stone-200 cursor-pointer transition-colors"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSaveEditor}
            disabled={isSaveDisabled}
            className={`px-3 py-1 border rounded text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 ${
              isSaveDisabled 
                ? "bg-stone-800 border-stone-850 text-stone-500 cursor-not-allowed opacity-40 shadow-none" 
                : "bg-amber-600 hover:bg-amber-500 border-amber-550/30 text-stone-950 cursor-pointer shadow-[0_0_6px_rgba(245,158,11,0.2)]"
            }`}
          >
            {isFirstTime ? (
              <>
                <Plus size={9} strokeWidth={3} />
                {t("Create")}
              </>
            ) : (
              <>
                <Check size={9} strokeWidth={3} />
                {t("Bind Codex")}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
