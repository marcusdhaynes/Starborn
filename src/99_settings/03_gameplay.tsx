import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, Check, X, Pencil, Trash2, Plus, Search, 
  ArrowUp, ArrowDown, Clock, ArrowUpDown,
  Heart, Brain, Swords, Sparkles, Type,
  User, Shield, Zap, BookOpen, ShieldAlert
} from 'lucide-react';
import { safeStorage, deleteCharacterStorage } from '../storage';
import { useTranslation } from './language';

interface CharacterProfile {
  id: string;
  name: string;
  isFavorite: boolean;
  createdAt: number;
}

const DEFAULT_CHARACTER: CharacterProfile = {
  id: 'default',
  name: 'Default Hero',
  isFavorite: false,
  createdAt: 1718000000000 // Fixed base date
};

interface GameplaySettingsProps {
  autostartEditCharId?: string;
}

export default function GameplaySettings({ autostartEditCharId }: GameplaySettingsProps = {}) {
  const { t } = useTranslation();
  
  // 1. Character storage states
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => {
    const saved = safeStorage.getItem('setting_vtt_characters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading characters array:", e);
      }
    }
    return [DEFAULT_CHARACTER];
  });

  const [activeCharId, setActiveCharId] = useState<string>(() => {
    return safeStorage.getItem('setting_active_character_id') || 'default';
  });

  // 2. Dynamic Sort States - Intuitive Sort System (date, alpha, body, mind, wield, magic)
  const [sortByType, setSortByType] = useState<'date' | 'alpha' | 'body' | 'mind' | 'wield' | 'magic'>(() => {
    const saved = safeStorage.getItem('setting_vtt_sort_by_type');
    return (saved as any) || 'date';
  });

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = safeStorage.getItem('setting_vtt_sort_direction');
    return (saved as 'asc' | 'desc') || 'desc';
  });

  // Toggling favorite inclusion filter
  const [filterFavorites, setFilterFavorites] = useState<boolean>(() => {
    return safeStorage.getItem('setting_vtt_filter_favorites') === 'true';
  });

  // 3. Inline states
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [createName, setCreateName] = useState('');



  // 4. Search Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // 5. Reactive local stat trigger to reload whenever stats change
  const [statsUpdateTrigger, setStatsUpdateTrigger] = useState(0);

  // 6. Character Editor Modal State variables
  const [editorChar, setEditorChar] = useState<CharacterProfile | null>(null);
  const [editorName, setEditorName] = useState<string>('');
  const [editorClass, setEditorClass] = useState<string>('');
  const [editorRace, setEditorRace] = useState<string>('');
  const [editorBio, setEditorBio] = useState<string>('');
  const [editorBody, setEditorBody] = useState<number>(0);
  const [editorMind, setEditorMind] = useState<number>(0);
  const [editorWield, setEditorWield] = useState<number>(0);
  const [editorMagic, setEditorMagic] = useState<number>(0);
  const [editorHpCurrent, setEditorHpCurrent] = useState<number>(0);
  const [editorHpMax, setEditorHpMax] = useState<number>(0);

  // Click-and-Hold / Long Press support refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressCharIdRef = useRef<string | null>(null);
  const isLongPressActive = useRef<boolean>(false);

  // Keep state synchronized with storage
  useEffect(() => {
    safeStorage.setItem('setting_vtt_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    safeStorage.setItem('setting_active_character_id', activeCharId);
  }, [activeCharId]);

  useEffect(() => {
    safeStorage.setItem('setting_vtt_sort_by_type', sortByType);
  }, [sortByType]);

  useEffect(() => {
    safeStorage.setItem('setting_vtt_sort_direction', sortDirection);
  }, [sortDirection]);

  useEffect(() => {
    safeStorage.setItem('setting_vtt_filter_favorites', filterFavorites ? 'true' : 'false');
  }, [filterFavorites]);

  // Synchronize active character selection changes and character profiles from other components (and database)
  useEffect(() => {
    const handleSync = () => {
      const current = safeStorage.getItem('setting_active_character_id') || 'default';
      setActiveCharId(current);
      
      const savedChars = safeStorage.getItem('setting_vtt_characters');
      if (savedChars) {
        try {
          const parsed = JSON.parse(savedChars);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCharacters(parsed);
          }
        } catch (e) {}
      }
      setStatsUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('tabletop-state-update', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('tabletop-state-update', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Sync back to App component when active character changes
  const notifyChange = () => {
    window.dispatchEvent(new Event('tabletop-state-update'));
    window.dispatchEvent(new Event('storage'));
  };

  // Initialize form state when the active editor character is chosen via long-press click
  useEffect(() => {
    if (editorChar) {
      setEditorName(editorChar.name);
      setEditorClass(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_class`) || (editorChar.id === 'default' ? t('Starborn Outcast') : ''));
      setEditorRace(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_race`) || (editorChar.id === 'default' ? t('Aelfborn') : ''));
      setEditorBio(safeStorage.getItem(`vtt_char_${editorChar.id}_vtt_char_bio`) || '');
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

  // Autostart character codex editing when requested via parent prop
  useEffect(() => {
    if (autostartEditCharId) {
      const match = characters.find(c => c.id === autostartEditCharId);
      if (match) {
        setEditorChar(match);
      }
    }
  }, [autostartEditCharId, characters]);

  // Handle pointer down for click and hold timing
  const handlePointerDown = (e: React.PointerEvent, charId: string) => {
    if (e.button !== 0) return; // Only trigger for standard left mouse clicks or main touch gestures
    isLongPressActive.current = false;
    longPressCharIdRef.current = charId;
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      const targetChar = characters.find(c => c.id === charId);
      if (targetChar) {
        setEditorChar(targetChar);
        playSparkleEffect();
      }
    }, 600); // 650 milliseconds timing threshold for click and hold
  };

  // Handle pointer up - distinguishes between a short select click and a long hold press creator event
  const handlePointerUp = (e: React.PointerEvent, charId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
    } else {
      if (longPressCharIdRef.current === charId) {
        if (editingCharId !== charId) {
          handleSelectCharacter(charId);
        }
      }
    }
    longPressCharIdRef.current = null;
  };

  // Erase timers when pointer moves out of the element to prevent accidental hold triggers
  const handlePointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressCharIdRef.current = null;
  };

  // Persists edited attributes back to both character list and unique namespaced stats cells
  const handleSaveEditor = () => {
    if (!editorChar) return;
    const trimmed = editorName.trim();

    // 1. Update character list name in profiles
    const exists = characters.some(c => c.id === editorChar.id);
    let nextChars = [];
    if (!exists) {
      // Create new committed profile
      const newProfile: CharacterProfile = {
        id: editorChar.id,
        name: trimmed,
        isFavorite: false,
        createdAt: editorChar.createdAt || Date.now()
      };
      nextChars = [...characters, newProfile];
      
      // Auto active character
      safeStorage.setItem('setting_active_character_id', editorChar.id);
      setActiveCharId(editorChar.id);
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
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_body`, editorBody.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_mind`, editorMind.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_wield`, editorWield.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_magic`, editorMagic.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_speed`, "0");
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_stat_endurance`, "0");
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_hp_current`, editorHpCurrent.toString());
    safeStorage.setItem(`vtt_char_${editorChar.id}_vtt_hp_max`, editorHpMax.toString());

    // 3. Close & sound trigger
    playSparkleEffect();
    setEditorChar(null);
    setFilterFavorites(false);
    notifyChange();
  };

  const handleCancelEditor = () => {
    if (editorChar) {
      const exists = characters.some(c => c.id === editorChar.id);
      if (!exists) {
        // Discarding unsaved newly created character: clean up temporary prefilled storage keys
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_char_class`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_char_race`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_char_bio`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_stat_body`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_stat_mind`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_stat_wield`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_stat_magic`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_stat_speed`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_stat_endurance`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_hp_current`);
        safeStorage.removeItem(`vtt_char_${editorChar.id}_vtt_hp_max`);
      }
    }
    setEditorChar(null);
    playAudioTick();
  };

  // Helper to fetch custom stats namespaced for specific character ID
  const getCharStat = (charId: string, statKey: string, defaultValue: number = 0): number => {
    let finalKey = statKey;
    if (charId && charId !== 'default') {
      finalKey = `vtt_char_${charId}_${statKey}`;
    }
    const val = safeStorage.getItem(finalKey);
    return val !== null ? parseInt(val, 10) : defaultValue;
  };

  const activeChar = characters.find(c => c.id === activeCharId) || characters[0] || DEFAULT_CHARACTER;

  // Toggle favorite status on any specific character profile
  const toggleFavorite = (id: string) => {
    const nextChars = characters.map(c => {
      if (c.id === id) {
        return { ...c, isFavorite: !c.isFavorite };
      }
      return c;
    });
    setCharacters(nextChars);
    safeStorage.setItem('setting_vtt_characters', JSON.stringify(nextChars));
    playAudioTick();
  };

  // Switch to selected character profile
  const handleSelectCharacter = (id: string) => {
    safeStorage.setItem('setting_active_character_id', id);
    setActiveCharId(id);
    setEditingCharId(null);
    playAudioTick();
    notifyChange();
  };

  // Save renamed profile name
  const saveNameEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingCharId(null);
      return;
    }
    const nextChars = characters.map(c => {
      if (c.id === id) {
        return { ...c, name: trimmed };
      }
      return c;
    });
    setCharacters(nextChars);
    safeStorage.setItem('setting_vtt_characters', JSON.stringify(nextChars));
    setEditingCharId(null);
    playAudioTick();
    notifyChange();
  };

  // Create new blank character state
  const performCreate = () => {
    const trimmed = createName.trim();
    const newId = `char_${Date.now()}`;
    const newProfile: CharacterProfile = {
      id: newId,
      name: trimmed,
      isFavorite: false,
      createdAt: Date.now()
    };

    // Initialize all stats to 0, and health (which is 10 * Body) to 0
    safeStorage.setItem(`vtt_char_${newId}_vtt_char_class`, "");
    safeStorage.setItem(`vtt_char_${newId}_vtt_char_race`, "");
    safeStorage.setItem(`vtt_char_${newId}_vtt_stat_body`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_stat_mind`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_stat_wield`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_stat_magic`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_stat_speed`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_stat_endurance`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_hp_current`, "0");
    safeStorage.setItem(`vtt_char_${newId}_vtt_hp_max`, "0");
    
    // Do NOT add to characters and do NOT save to setting_vtt_characters yet!
    // Open the character creator (formerly Codex) window directly:
    setEditorChar(newProfile);
    setCreateName('');
    setIsCreatingInline(false);
    playSparkleEffect();
  };

  // Delete specific character profile with warning prompt confirmation
  const handleDeleteCharacter = (char: CharacterProfile) => {
    if (characters.length <= 1) {
      return; // Safe lock
    }
    const confirmMsg = t("Are you sure you want to delete \"{{name}}\"?\nThis will permanently wipe their item equipment, customization attributes, combat histories, journal notebooks, and magical custom spells! This action is irreversible.");
    if (!confirm(confirmMsg.replace('{{name}}', char.name))) return;

    const remaining = characters.filter(c => c.id !== char.id);
    setCharacters(remaining);
    safeStorage.setItem('setting_vtt_characters', JSON.stringify(remaining));
    
    deleteCharacterStorage(char.id);
    
    // Shift selection if we deleted the active character
    if (char.id === activeCharId) {
      const nextChar = remaining[0];
      safeStorage.setItem('setting_active_character_id', nextChar.id);
      setActiveCharId(nextChar.id);
    }

    playWipeSound();
    notifyChange();
  };

  // Tactile click sounds for arcade immersive fantasy feeling
  const playAudioTick = () => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const playSparkleEffect = () => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      gain.connect(ctx.destination);

      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        osc.connect(gain);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.18);
      });
    } catch (e) {}
  };

  const playWipeSound = () => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Perform search & sort calculations based on intuitive sort type and direction
  const sortedAndFiltered = characters
    .filter(c => {
      if (filterFavorites && !c.isFavorite) return false;
      if (searchQuery.trim() !== '') {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortByType === 'date') {
        valA = a.createdAt;
        valB = b.createdAt;
      } else if (sortByType === 'alpha') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortByType === 'body') {
        valA = getCharStat(a.id, 'vtt_stat_body', 0);
        valB = getCharStat(b.id, 'vtt_stat_body', 0);
      } else if (sortByType === 'mind') {
        valA = getCharStat(a.id, 'vtt_stat_mind', 0);
        valB = getCharStat(b.id, 'vtt_stat_mind', 0);
      } else if (sortByType === 'wield') {
        valA = getCharStat(a.id, 'vtt_stat_wield', 0);
        valB = getCharStat(b.id, 'vtt_stat_wield', 0);
      } else if (sortByType === 'magic') {
        valA = getCharStat(a.id, 'vtt_stat_magic', 0);
        valB = getCharStat(b.id, 'vtt_stat_magic', 0);
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return sortDirection === 'asc'
        ? valA - valB
        : valB - valA;
    });

  return (
    <div 
      className="w-full text-stone-250 font-sans p-0 m-0 relative flex-1 flex flex-col h-full" 
      id="starborn-character-manager-panel"
    >
      
      {/* 1. COMPACT SINGLE-ROW FILTER & SORT CONTROLS */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 px-0.5" id="vtt-character-controls-row">
        
        {/* Left Side: Favorites, Sort Type & Sort Attribute buttons */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          
          {/* Favorite Only Filter Toggle - Star symbol only */}
          <button
            type="button"
            onClick={() => {
              setFilterFavorites(!filterFavorites);
              playAudioTick();
            }}
            className={`h-6 w-6 rounded flex items-center justify-center border transition-all cursor-pointer select-none shrink-0 ${
              filterFavorites
                ? 'bg-amber-950/45 border-amber-600/35 text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                : 'bg-stone-950 border-stone-800/80 text-stone-500 hover:text-stone-300'
            }`}
            title={filterFavorites ? t("Showing Favorites Only") : t("Filter Favorites")}
          >
            <Star size={10} fill={filterFavorites ? 'currentColor' : 'none'} className={filterFavorites ? 'text-amber-400' : 'text-stone-500'} />
          </button>

          {/* Sort Type Group (Alphabetical vs Creation) */}
          <div className="flex items-center gap-0.5 bg-stone-950/45 border border-stone-800/80 p-0.5 h-6 rounded shrink-0">
            <button
              type="button"
              onClick={() => {
                setSortByType('alpha');
                playAudioTick();
              }}
              className={`h-4.5 w-4.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                sortByType === 'alpha'
                  ? 'bg-amber-950/45 text-amber-300 font-bold border border-stone-800/80'
                  : 'bg-transparent text-stone-500 hover:text-stone-300 border border-transparent'
              }`}
              title={t("Alphabetical Name Order")}
            >
              <Type size={9.5} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSortByType('date');
                playAudioTick();
              }}
              className={`h-4.5 w-4.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                sortByType === 'date'
                  ? 'bg-amber-950/45 text-amber-300 font-bold border border-stone-800/80'
                  : 'bg-transparent text-stone-500 hover:text-stone-300 border border-transparent'
              }`}
              title={t("Creation Date Order")}
            >
              <Clock size={9.5} strokeWidth={2.5} />
            </button>
          </div>

          {/* Attributes Group (Body, Mind, Wield, Magic) */}
          <div className="flex items-center gap-0.5 bg-stone-950/45 border border-stone-800/80 p-0.5 h-6 rounded shrink-0">
            {[
              { type: 'body', icon: <Heart size={9.5} strokeWidth={2.5} />, title: t('Body') },
              { type: 'mind', icon: <Brain size={9.5} strokeWidth={2.5} />, title: t('Mind') },
              { type: 'wield', icon: <Swords size={9.5} strokeWidth={2.5} />, title: t('Wield') },
              { type: 'magic', icon: <Sparkles size={9.5} strokeWidth={2.5} />, title: t('Magic') },
            ].map((attr) => {
              const isActive = sortByType === attr.type;
              return (
                <button
                  key={attr.type}
                  type="button"
                  onClick={() => {
                    setSortByType(attr.type as any);
                    playAudioTick();
                  }}
                  className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-950/45 border-stone-800/85 text-amber-300 font-bold'
                      : 'bg-transparent border-transparent text-stone-500 hover:text-stone-330'
                  }`}
                  title={attr.title}
                >
                  {attr.icon}
                </button>
              );
            })}
          </div>

          {/* Flexible Elegant Search Box */}
          <div className="flex-1 min-w-[50px] flex items-center gap-1.5 bg-stone-950/50 border border-stone-800/80 rounded px-2 h-6">
            <Search size={9.5} className="text-stone-500 shrink-0" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Filter...")}
              className="bg-transparent border-none text-[9px] font-sans text-stone-200 focus:outline-none w-full outline-none placeholder-stone-605 font-normal leading-none p-0 h-4"
              id="vtt-char-search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')} 
                className="cursor-pointer shrink-0"
                title={t("Clear")}
              >
                <X size={9.5} className="text-stone-500 hover:text-stone-300" />
              </button>
            )}
          </div>

        </div>

        {/* Right Side: Sort Direction (Ascending / Descending) */}
        <div className="flex items-center shrink-0">
          <button 
            type="button"
            onClick={() => {
              setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              playAudioTick();
            }}
            className="h-6 w-6 rounded border border-stone-800/80 bg-stone-950/50 text-stone-300 hover:text-stone-100 hover:border-stone-700 flex items-center justify-center transition-all cursor-pointer"
            title={sortDirection === 'desc' ? t("Descending") : t("Ascending")}
          >
            {sortDirection === 'asc' ? (
              <ArrowUp size={11} strokeWidth={2.5} className="text-amber-500/80" />
            ) : (
              <ArrowDown size={11} strokeWidth={2.5} className="text-amber-500/80" />
            )}
          </button>
        </div>

      </div>



      {/* 4. CHARACTERS LISTING DATABASE GRID */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto border border-stone-800/80 rounded-lg bg-stone-950/50 flex flex-col" 
        id="vtt-characters-list-table"
      >
        
        {/* Interactive Gothic Column Headers */}
        <div className="flex items-center h-8 bg-stone-950 border-b border-stone-800/80 text-[9px] font-sans font-black uppercase tracking-wider text-stone-500 sticky top-0 z-10 select-none px-2 border-l-2 border-l-transparent">
          <div className="w-4 shrink-0 flex items-center justify-center">
            <Star size={9.5} className="text-stone-500" fill="currentColor" />
          </div>
          <div className="flex-grow flex-shrink min-w-0 px-2 text-left">{t("Name")}</div>
          <div className="w-8 shrink-0 text-center flex items-center justify-center font-extrabold tracking-tighter text-[8px] text-stone-500">{t("Body")}</div>
          <div className="w-8 shrink-0 text-center flex items-center justify-center font-extrabold tracking-tighter text-[8px] text-stone-500">{t("Mind")}</div>
          <div className="w-8 shrink-0 text-center flex items-center justify-center font-extrabold tracking-tighter text-[8px] text-stone-500">{t("Wield")}</div>
          <div className="w-8 shrink-0 text-center flex items-center justify-center font-extrabold tracking-tighter text-[8px] text-stone-500">{t("Magic")}</div>
        </div>

        {/* Database Grid Rows */}
        <div className="divide-y divide-stone-900/50 overflow-y-auto flex-1">
          {sortedAndFiltered.length === 0 ? (
            <div className="py-8 px-4 text-center text-stone-600 text-[10px] italic font-medium">
              {t("No profiles match the filter criteria.")}
            </div>
          ) : (
            sortedAndFiltered.map((char) => {
              const isActive = char.id === activeCharId;
              const charBody = getCharStat(char.id, 'vtt_stat_body', 0);
              const charMind = getCharStat(char.id, 'vtt_stat_mind', 0);
              const charWield = getCharStat(char.id, 'vtt_stat_wield', 0);
              const charMagic = getCharStat(char.id, 'vtt_stat_magic', 0);
              const isEditingThis = editingCharId === char.id;

              return (
                <div
                  key={char.id}
                  id={`vtt-char-row-${char.id}`}
                  onPointerDown={(e) => {
                    if (!isEditingThis) handlePointerDown(e, char.id);
                  }}
                  onPointerUp={(e) => {
                    if (!isEditingThis) handlePointerUp(e, char.id);
                  }}
                  onPointerLeave={() => {
                    if (!isEditingThis) handlePointerLeave();
                  }}
                  onDoubleClick={() => {
                    if (!isEditingThis) {
                      setEditName(char.name);
                      setEditingCharId(char.id);
                      playAudioTick();
                    }
                  }}
                  className={`flex items-center h-7 px-2 transition-all duration-150 cursor-pointer group/row relative select-none ${
                    isActive
                      ? 'bg-amber-500/[0.08] border-l-4 border-l-amber-500 text-amber-300 font-extrabold shadow-[inset_1px_0_0_rgba(245,158,11,0.1)]'
                      : 'hover:bg-stone-900/35 border-l-4 border-l-transparent text-stone-400 hover:text-stone-100'
                  }`}
                  title={t("Double-click to rename character")}
                >
                  {/* Star Favorite Column */}
                  <div 
                    className="w-4 flex justify-center shrink-0" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFavorite(char.id)}
                      className="p-0 text-stone-600 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star 
                        size={10.5} 
                        fill={char.isFavorite ? '#f59e0b' : 'none'} 
                        className={char.isFavorite ? 'text-amber-500 shadow-sm' : 'text-stone-600'} 
                      />
                    </button>
                  </div>

                  {/* Name column / Inline editor */}
                  <div 
                    className="flex-grow flex-shrink min-w-0 px-2 text-left" 
                    onClick={(e) => {
                      if (isEditingThis) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-1.5 bg-stone-950 border border-amber-600/50 rounded px-1.5 h-5 w-full">
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveNameEdit(char.id);
                            if (e.key === 'Escape') setEditingCharId(null);
                          }}
                          className="bg-transparent border-none text-[9px] font-serif font-bold text-stone-200 focus:outline-none w-full outline-none leading-none p-0"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); saveNameEdit(char.id); }} 
                          className="text-emerald-400 p-0 cursor-pointer hover:text-emerald-300 transition-colors"
                          title={t("Save")}
                        >
                          <Check size={10} />
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setEditingCharId(null); }} 
                          className="text-stone-400 p-0 cursor-pointer hover:text-stone-200 transition-colors"
                          title={t("Cancel")}
                        >
                          <X size={10} />
                        </button>
                        <button
                          type="button"
                          disabled={characters.length <= 1}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(char); }}
                          className="text-red-500 p-0 cursor-pointer hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title={t("Delete")}
                        >
                          <Trash2 size={10} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 w-full min-w-0 justify-start">
                        <span className={`text-[10px] truncate transition-colors duration-150 ${
                          isActive 
                            ? 'font-serif text-amber-300 font-extrabold' 
                            : 'font-sans text-stone-300 group-hover/row:text-stone-100'
                        }`}>
                          {char.name || t("(Unnamed Hero)")}
                        </span>
                        {isActive && (
                          <span className="text-[6.5px] font-mono uppercase bg-amber-500/15 border border-amber-500/35 px-1 py-px rounded text-amber-400 font-black shrink-0 tracking-widest scale-90 select-none shadow-[0_0_4px_rgba(245,158,11,0.2)]">
                            {t("Active")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body score */}
                  <div className={`w-8 shrink-0 text-center flex items-center justify-center font-mono text-[9px] font-bold select-none transition-all duration-155 ${
                    isActive ? 'text-amber-400 font-black scale-105' : 'text-stone-400 group-hover/row:text-stone-200'
                  }`}>
                    {charBody}
                  </div>

                  {/* Mind score */}
                  <div className={`w-8 shrink-0 text-center flex items-center justify-center font-mono text-[9px] font-bold select-none transition-all duration-155 ${
                    isActive ? 'text-amber-400 font-black scale-105' : 'text-stone-400 group-hover/row:text-stone-200'
                  }`}>
                    {charMind}
                  </div>

                  {/* Wield score */}
                  <div className={`w-8 shrink-0 text-center flex items-center justify-center font-mono text-[9px] font-bold select-none transition-all duration-155 ${
                    isActive ? 'text-amber-400 font-black scale-105' : 'text-stone-400 group-hover/row:text-stone-200'
                  }`}>
                    {charWield}
                  </div>

                  {/* Magic score */}
                  <div className={`w-8 shrink-0 text-center flex items-center justify-center font-mono text-[9px] font-bold select-none transition-all duration-155 ${
                    isActive ? 'text-amber-400 font-black scale-105' : 'text-stone-400 group-hover/row:text-stone-200'
                  }`}>
                    {charMagic}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Floating Add Hero Button in bottom right of the container */}
      <button
        type="button"
        id="add-character-floating-btn"
        onClick={() => {
          const newId = `char_${Date.now()}`;
          window.dispatchEvent(new CustomEvent('open-character-codex', {
            detail: { charId: newId }
          }));
          playAudioTick();
        }}
        className="absolute bottom-1 right-1 z-30 h-6 w-6 rounded flex items-center justify-center border shadow-lg transition-all cursor-pointer select-none active:scale-95 bg-amber-600 hover:bg-amber-500 border-amber-500 text-stone-950 hover:shadow-amber-550/25"
        title={t("Add New Character")}
      >
        <Plus size={11} strokeWidth={3} />
      </button>

      {/* 5. GOTHIC HIGH-FIDELITY CHARACTER EDITOR / CREATION MODAL */}
      <AnimatePresence>
        {editorChar && (
          <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-[1.5px] flex items-center justify-center p-3 z-[100] animate-fadeIn select-none">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-[340px] max-h-[96%] bg-stone-900 border border-amber-550/30 rounded-lg p-3 flex flex-col gap-2.5 shadow-[0_5px_22px_rgba(0,0,0,0.8)] overflow-y-auto text-stone-200 border-t-4 border-t-amber-500/80"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 flex-shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="text-amber-500 shrink-0" size={11} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-serif text-[10px] font-black uppercase tracking-wider text-amber-400 truncate">
                      {t("Character Codex")}
                    </span>
                    <span className="text-[7px] font-mono text-stone-500 uppercase tracking-widest leading-none">
                      {t("Customizing Attributes & Bio")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEditor}
                  className="h-4.5 w-4.5 rounded border border-stone-800 bg-stone-950 flex items-center justify-center text-stone-500 hover:text-stone-300 hover:border-stone-700 cursor-pointer transition-colors"
                >
                  <X size={9} />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
                {/* 1. Name & Archetype Section */}
                <div className="grid grid-cols-3 gap-1.5 flex-shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7px]/[1] font-mono font-bold uppercase tracking-wider text-stone-500">
                      {t("Hero Name")}
                    </label>
                    <input
                      type="text"
                      className="w-full h-6 px-1 bg-stone-950 border border-stone-800 focus:border-amber-500/50 rounded text-[8px] font-sans font-bold text-stone-200 outline-none leading-none focus:outline-none focus:ring-0"
                      value={editorName}
                      onChange={(e) => setEditorName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7px]/[1] font-mono font-bold uppercase tracking-wider text-stone-500">
                      {t("Epithet/Mantle")}
                    </label>
                    <input
                      type="text"
                      className="w-full h-6 px-1 bg-stone-950 border border-stone-800 focus:border-amber-500/50 rounded text-[8px] font-sans font-bold text-amber-400 outline-none leading-none focus:outline-none focus:ring-0"
                      value={editorClass}
                      onChange={(e) => setEditorClass(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7px]/[1] font-mono font-bold uppercase tracking-wider text-stone-500">
                      {t("Race")}
                    </label>
                    <input
                      type="text"
                      className="w-full h-6 px-1 bg-stone-950 border border-stone-800 focus:border-amber-500/50 rounded text-[8px] font-sans font-bold text-teal-400 outline-none leading-none focus:outline-none focus:ring-0"
                      value={editorRace}
                      onChange={(e) => setEditorRace(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Stat Attributes Matrix Section */}
                <div className="border border-stone-800/60 bg-stone-950/40 p-1.5 rounded-md flex flex-col gap-1">
                  <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-stone-500 border-b border-stone-900 pb-0.5 flex items-center gap-1">
                    <Shield size={8.5} className="text-amber-500" />
                    {t("Attributes Scores Matrix")}
                  </span>

                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
                    {/* BODY */}
                    <div className="flex items-center justify-between text-[9px] h-5">
                      <div className="flex items-center gap-1 text-stone-400 font-medium scale-90 origin-left">
                        <Heart size={8.5} className="text-red-500/70" />
                        <span>{t("Body")}</span>
                      </div>
                      <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5 mr-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextBody = Math.max(0, editorBody - 1);
                            setEditorBody(nextBody);
                            const nextHpMax = nextBody * 10;
                            setEditorHpMax(nextHpMax);
                            setEditorHpCurrent(curr => Math.min(nextHpMax, curr));
                          }}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono text-[8.5px] font-black text-amber-300">
                          {editorBody}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextBody = Math.min(30, editorBody + 1);
                            setEditorBody(nextBody);
                            const nextHpMax = nextBody * 10;
                            setEditorHpMax(nextHpMax);
                            setEditorHpCurrent(curr => {
                              const wasFull = (editorBody * 10 === 0) || (curr === editorBody * 10);
                              return wasFull ? nextHpMax : Math.min(nextHpMax, curr + 10);
                            });
                          }}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* MIND */}
                    <div className="flex items-center justify-between text-[9px] h-5">
                      <div className="flex items-center gap-1 text-stone-400 font-medium scale-90 origin-left -ml-2">
                        <Brain size={8.5} className="text-blue-500/70" />
                        <span>{t("Mind")}</span>
                      </div>
                      <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5">
                        <button
                          type="button"
                          onClick={() => setEditorMind(p => Math.max(0, p - 1))}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono text-[8.5px] font-black text-amber-300">
                          {editorMind}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditorMind(p => Math.min(30, p + 1))}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* WIELD */}
                    <div className="flex items-center justify-between text-[9px] h-5">
                      <div className="flex items-center gap-1 text-stone-400 font-medium scale-90 origin-left">
                        <Swords size={8.5} className="text-emerald-500/70" />
                        <span>{t("Wield")}</span>
                      </div>
                      <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5 mr-2">
                        <button
                          type="button"
                          onClick={() => setEditorWield(p => Math.max(0, p - 1))}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono text-[8.5px] font-black text-amber-300">
                          {editorWield}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditorWield(p => Math.min(30, p + 1))}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* MAGIC */}
                    <div className="flex items-center justify-between text-[9px] h-5">
                      <div className="flex items-center gap-1 text-stone-400 font-medium scale-90 origin-left -ml-2">
                        <Sparkles size={8.5} className="text-purple-500/70" />
                        <span>{t("Magic")}</span>
                      </div>
                      <div className="flex items-center h-4.5 bg-stone-950 rounded border border-stone-800 px-0.5">
                        <button
                          type="button"
                          onClick={() => setEditorMagic(p => Math.max(0, p - 1))}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono text-[8.5px] font-black text-amber-300">
                          {editorMagic}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditorMagic(p => Math.min(30, p + 1))}
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900 cursor-pointer text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
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
                  onClick={handleCancelEditor}
                  className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-stone-700 hover:bg-stone-900 rounded text-[8px] font-bold text-stone-400 hover:text-stone-200 cursor-pointer transition-colors"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 border border-amber-500 text-stone-950 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer shadow-[0_0_6px_rgba(245,158,11,0.2)] transition-all flex items-center gap-0.5"
                >
                  <Check size={9} strokeWidth={3} />
                  {t("Bind Codex")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
