/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Skull, Flame, Eye, EyeOff } from 'lucide-react';
import RibbonFront from './01_ribbon/01_front';
import RibbonBack from './01_ribbon/02_back';
import RibbonEnds from './01_ribbon/03_ends';
import Life from './02_stats/01_life';
import AbilitiesSections from './03_abilities/01_sections';
import TabletopRestructure from './03_abilities/07_tabletop/01_maps/02_restructure';
import { safeStorage } from './storage';
import SettingsWindow from './99_settings/01_settings';
import { useTranslation } from './99_settings/language';
import CharacterCodexModal from './components/CharacterCodexModal';

export default function App() {
  const { lang } = useTranslation();
  const [isEverythingHidden, setIsEverythingHidden] = useState(false);
  const [skullLevel, setSkullLevel] = useState(0);
  const [pulseActive, setPulseActive] = useState(false);
  const [ripples, setRipples] = useState<{ id: number }[]>([]);
  const dotTransition = { type: 'spring', stiffness: 400, damping: 17 };
  const dotHoverScale = 2;

  // Ingenious RPG settings states
  const [showSettings, setShowSettings] = useState(false);
  const [settingsProps, setSettingsProps] = useState<{ initialTab?: 'frontend' | 'backend' | 'physics'; autostartEditCharId?: string } | null>(null);
  const [activeCodexCharId, setActiveCodexCharId] = useState<string | null>(null);
  const [activeCharId, setActiveCharId] = useState(() => {
    return safeStorage.getItem('setting_active_character_id') || 'default';
  });
  const [activeCharImg, setActiveCharImg] = useState<string>(() => {
    const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
    return safeStorage.getItem(`vtt_char_${activeId}_vtt_char_image`) || '';
  });
  const [useRestructureAlignment, setUseRestructureAlignment] = useState<boolean>(() => {
    return safeStorage.getItem('setting_restructure_alignment') === 'true';
  });
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    return (safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal') || 'vertical';
  });
  const [accentTone, setAccentTone] = useState(() => {
    return safeStorage.getItem('setting_theme_accent') || 'pink';
  });

  const [isAnyMenuOpen, setIsAnyMenuOpen] = useState(false);

  // Dynamic global Arabic/Eastern translation effect for all visible numbers
  useEffect(() => {
    if (lang !== 'ar') return;

    const convertDigits = (str: string) => {
      return str.replace(/[0-9]/g, (char) => {
        return ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'][char.charCodeAt(0) - 48];
      });
    };

    const walkAndTranslate = (root: Node) => {
      if (root.nodeType === Node.ELEMENT_NODE) {
        const tagName = (root as Element).tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style' || tagName === 'textarea' || tagName === 'input') {
          return;
        }
      }

      if (root.nodeType === Node.TEXT_NODE) {
        const original = root.nodeValue || '';
        const converted = convertDigits(original);
        if (original !== converted) {
          root.nodeValue = converted;
        }
        return;
      }

      let child = root.firstChild;
      while (child) {
        walkAndTranslate(child);
        child = child.nextSibling;
      }
    };

    // Parse pre-rendered nodes
    walkAndTranslate(document.body);

    const observer = new MutationObserver((mutations) => {
      observer.disconnect();

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            walkAndTranslate(node);
          });
        } else if (mutation.type === 'characterData') {
          const node = mutation.target;
          const original = node.nodeValue || '';
          const converted = convertDigits(original);
          if (original !== converted) {
            node.nodeValue = converted;
          }
        }
      }

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [lang]);

  useEffect(() => {
    (window as any).__vtt_settings_open = showSettings;
    window.dispatchEvent(new Event('vtt-menu-update'));
  }, [showSettings]);

  useEffect(() => {
    const checkState = () => {
      const isOpen = !!(window as any).__vtt_menu_open || !!(window as any).__vtt_settings_open || !!(window as any).__vtt_codex_open;
      setIsAnyMenuOpen(isOpen);
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('vtt-menu-open', isOpen);
      }
    };
    window.addEventListener('vtt-menu-update', checkState);
    checkState();
    return () => {
      window.removeEventListener('vtt-menu-update', checkState);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('vtt-menu-open');
      }
    };
  }, []);

  useEffect(() => {
    const syncActiveChar = () => {
      const current = safeStorage.getItem('setting_active_character_id') || 'default';
      setActiveCharId(current);
      setActiveCharImg(safeStorage.getItem(`vtt_char_${current}_vtt_char_image`) || '');
    };
    window.addEventListener('tabletop-state-update', syncActiveChar);
    window.addEventListener('storage', syncActiveChar);
    return () => {
      window.removeEventListener('tabletop-state-update', syncActiveChar);
      window.removeEventListener('storage', syncActiveChar);
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
  const [isHoldingActive, setIsHoldingActive] = useState(false);

  // Audio synthesizer player for settings click
  const playSettingsClickSound = (freq = 520, duration = 0.08, type: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine') => {
    try {
      if (safeStorage.getItem('setting_sfx_enabled') === 'false') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = type;
      const parsedSfxVolume = parseFloat(safeStorage.getItem('setting_sfx_volume') || '1');
      const vol = 0.1 * parsedSfxVolume;
      if (vol <= 0) return;

      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (type === 'sawtooth' || type === 'triangle') {
        osc.frequency.exponentialRampToValueAtTime(freq / 2, audioCtx.currentTime + duration);
      }
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration + 0.02);
    } catch (e) {
      // Audio autoplay restrictions
    }
  };

  // Handle pointer Down/Up events to distinguish simple tap vs deep hold
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
      setSettingsProps(null); // Clear custom props so long press opens standard visuals tab
      setShowSettings(true);
      playSettingsClickSound(480, 0.12, 'sawtooth');
    }, 500); // 500ms long press limit
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
      setActiveCodexCharId(activeCharId);
      playSettingsClickSound(580, 0.08, 'sine');
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

  // Synchronized tabletop states
  const [isThrown, setIsThrown] = useState(() => safeStorage.getItem('tabletop_is_thrown') === 'true');
  const [bgOpacity, setBgOpacity] = useState(() => {
    const saved = safeStorage.getItem('tabletop_app_opacity');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [avatarPos, setAvatarPos] = useState(() => {
    const savedX = safeStorage.getItem('tabletop_avatar_x');
    const savedY = safeStorage.getItem('tabletop_avatar_y');
    return {
      x: savedX ? parseInt(savedX, 10) : 1200,
      y: savedY ? parseInt(savedY, 10) : 1200
    };
  });

  const [dropPoint, setDropPoint] = useState(() => {
    const savedX = safeStorage.getItem('tabletop_drop_pixel_x');
    const savedY = safeStorage.getItem('tabletop_drop_pixel_y');
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      x: savedX ? parseFloat(savedX) : winW * 0.83,
      y: savedY ? parseFloat(savedY) : winH * 0.53
    };
  });

  // Keep state synced up from window and storage events
  useEffect(() => {
    const handleUpdate = () => {
      setIsThrown(safeStorage.getItem('tabletop_is_thrown') === 'true');
      const opacitySaved = safeStorage.getItem('tabletop_app_opacity');
      setBgOpacity(opacitySaved ? parseInt(opacitySaved, 10) : 100);
      
      const savedX = safeStorage.getItem('tabletop_avatar_x');
      const savedY = safeStorage.getItem('tabletop_avatar_y');
      setAvatarPos({
        x: savedX ? parseInt(savedX, 10) : 1200,
        y: savedY ? parseInt(savedY, 10) : 1200
      });

      const savedDropX = safeStorage.getItem('tabletop_drop_pixel_x');
      const savedDropY = safeStorage.getItem('tabletop_drop_pixel_y');
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      setDropPoint({
        x: savedDropX ? parseFloat(savedDropX) : winW * 0.83,
        y: savedDropY ? parseFloat(savedDropY) : winH * 0.53
      });

      const savedLayout = safeStorage.getItem('setting_layout_orientation') as 'vertical' | 'horizontal';
      if (savedLayout) {
        setLayoutOrientation(savedLayout);
      } else {
        setLayoutOrientation('vertical');
      }

      const savedAlign = safeStorage.getItem('setting_restructure_alignment') === 'true';
      setUseRestructureAlignment(savedAlign);

      const savedAccent = safeStorage.getItem('setting_theme_accent') || 'pink';
      setAccentTone(savedAccent);

      const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
      setActiveCharId(activeId);
      setActiveCharImg(safeStorage.getItem(`vtt_char_${activeId}_vtt_char_image`) || '');
    };

    const handleOpenSettings = (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.initialTab) {
        setSettingsProps({
          initialTab: customEvent.detail.initialTab,
          autostartEditCharId: customEvent.detail.autostartEditCharId
        });
      } else {
        setSettingsProps(null);
      }
      setShowSettings(true);
    };

    const handleOpenCharacterCodex = (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.charId) {
        setActiveCodexCharId(customEvent.detail.charId);
      } else {
        const activeId = safeStorage.getItem('setting_active_character_id') || 'default';
        setActiveCodexCharId(activeId);
      }
    };

    window.addEventListener('tabletop-state-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('open-settings-modal', handleOpenSettings);
    window.addEventListener('open-character-codex', handleOpenCharacterCodex);
    return () => {
      window.removeEventListener('tabletop-state-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('open-settings-modal', handleOpenSettings);
      window.removeEventListener('open-character-codex', handleOpenCharacterCodex);
    };
  }, []);

  // Ref to track last layout parameters to trigger instant snapping on visual settings change
  const lastLayoutRef = useRef({ layoutOrientation, useRestructureAlignment });

  // Instant Screen Resize and Orientation Change Handler
  // (Disables transitions/animations during resize/orientation event duration so elements fit instantly)
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      document.body.classList.add('resizing', 'no-transitions');
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.classList.remove('resizing', 'no-transitions');
      }, 350);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimer);
      document.body.classList.remove('resizing', 'no-transitions');
    };
  }, []);

  // Track layout parameter changes to snap instantly on setting/dashboard changes
  useEffect(() => {
    if (
      lastLayoutRef.current.layoutOrientation !== layoutOrientation ||
      lastLayoutRef.current.useRestructureAlignment !== useRestructureAlignment
    ) {
      document.body.classList.add('resizing', 'no-transitions');
      const timer = setTimeout(() => {
        document.body.classList.remove('resizing', 'no-transitions');
      }, 350);
      lastLayoutRef.current = { layoutOrientation, useRestructureAlignment };
      return () => clearTimeout(timer);
    }
  }, [layoutOrientation, useRestructureAlignment]);

  // Keyboard controls for Gameboy-like walking avatar character
  useEffect(() => {
    if (!isThrown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      setAvatarPos(prev => {
        let step = parseInt(safeStorage.getItem('tabletop_active_map_gridSize') || '50', 10);
        if (step < 10) step = 50;

        let newX = prev.x;
        let newY = prev.y;

        const key = e.key.toLowerCase();
        if (key === 'arrowup' || key === 'w') {
          newY -= step;
        } else if (key === 'arrowdown' || key === 's') {
          newY += step;
        } else if (key === 'arrowleft' || key === 'a') {
          newX -= step;
        } else if (key === 'arrowright' || key === 'd') {
          newX += step;
        } else {
          return prev;
        }

        newX = Math.max(50, Math.min(2350, newX));
        newY = Math.max(50, Math.min(2350, newY));

        setTimeout(() => {
          safeStorage.setItem('tabletop_avatar_x', newX.toString());
          safeStorage.setItem('tabletop_avatar_y', newY.toString());
          window.dispatchEvent(new Event('tabletop-state-update'));
        }, 0);

        return { x: newX, y: newY };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThrown]);

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const dropPercentX = Math.round((dropPoint.x / (winW || 1)) * 100);
  const dropPercentY = Math.round((dropPoint.y / (winH || 1)) * 100);

  const activeMapImg = isThrown ? (safeStorage.getItem('tabletop_active_map_imageUrl') || '') : '';
  const activeMapGridSize = parseInt(safeStorage.getItem('tabletop_active_map_gridSize') || '50', 10);
  const activeMapGridOpacity = parseFloat(safeStorage.getItem('tabletop_active_map_gridOpacity') || '0.4');
  const activeMapGridOffsetX = parseInt(safeStorage.getItem('tabletop_active_map_gridOffsetX') || '0', 10);
  const activeMapGridOffsetY = parseInt(safeStorage.getItem('tabletop_active_map_gridOffsetY') || '0', 10);

  const handleMapClick = (e: React.MouseEvent) => {
    // Translate screen click pixels to 2400x2400 background coordinate space
    const clickX = e.clientX - (window.innerWidth / 2) + avatarPos.x;
    const clickY = e.clientY - (window.innerHeight / 2) + avatarPos.y;

    const cleanX = Math.max(50, Math.min(2350, clickX));
    const cleanY = Math.max(50, Math.min(2350, clickY));

    // Snap to grid
    const snappedX = Math.round((cleanX - activeMapGridOffsetX) / activeMapGridSize) * activeMapGridSize + activeMapGridOffsetX;
    const snappedY = Math.round((cleanY - activeMapGridOffsetY) / activeMapGridSize) * activeMapGridSize + activeMapGridOffsetY;

    setAvatarPos({ x: snappedX, y: snappedY });
    safeStorage.setItem('tabletop_avatar_x', snappedX.toString());
    safeStorage.setItem('tabletop_avatar_y', snappedY.toString());
    window.dispatchEvent(new Event('tabletop-state-update'));
  };

  const headerFadeStyle = isThrown ? { opacity: bgOpacity / 100, pointerEvents: bgOpacity === 0 ? 'none' as const : 'auto' as const } : undefined;

  const isMaxThreat = skullLevel >= 6;
  const getThreatIntensity = (lvl: number) => {
    switch (lvl) {
      case 0: return 0;
      case 1: return 0.35;
      case 2: return 0.48;
      case 3: return 0.62;
      case 4: return 0.75;
      case 5: return 0.88;
      default: return 1.0;
    }
  };
  const threatIntensity = getThreatIntensity(skullLevel);

  const pulseDuration = 1.1;
  const pulseTimes = [0, 0.22, 0.42, 0.62, 1];
  const pulseTransition = {
    duration: pulseDuration,
    ease: "easeInOut",
    times: pulseTimes,
    repeat: Infinity,
  };

  useEffect(() => {
    if (skullLevel > 0) {
      // Transition from solid outline into heartbeat pulse after 1.2s
      const timer = setTimeout(() => {
        setPulseActive(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setPulseActive(false);
    }
  }, [skullLevel > 0]);

  useEffect(() => {
    if (isMaxThreat) {
      document.body.classList.add('max-threat');
    } else {
      document.body.classList.remove('max-threat');
    }
    return () => {
      document.body.classList.remove('max-threat');
    };
  }, [isMaxThreat]);

  const heartPositions = [
    { id: '9:00', pos: "left-[-8px] top-1/2 -translate-y-1/2", seq: 1, skullOffset: { x: -3, y: 0 } },
    { id: '10:00', pos: "top-[14px] left-[-2px]", seq: 2, skullOffset: { x: -4.3, y: -2.5 } },
    { id: '11:00', pos: "top-[1px] left-[10px]", seq: 3, skullOffset: { x: -2.5, y: -4.3 } },
    { id: '12:00', pos: "top-[-10px] left-1/2 -translate-x-1/2", seq: null, skullOffset: { x: 0, y: -3 } },
    { id: '1:00', pos: "top-[1px] right-[10px]", seq: 4, skullOffset: { x: 2.5, y: -4.3 } },
    { id: '2:00', pos: "top-[14px] right-[-2px]", seq: 5, skullOffset: { x: 4.3, y: -2.5 } },
    { id: '3:00', pos: "right-[-8px] top-1/2 -translate-y-1/2", seq: 6, skullOffset: { x: 3, y: 0 } },
  ];

  const triggerRipple = () => {
    const ripId = Date.now();
    setRipples((prev) => [...prev, { id: ripId }]);
    setSkullLevel(0);
  };

  const handlePress = (seq: number | null) => {
    if (seq !== null) {
      if (seq <= skullLevel) {
        // If clicking a skull, reverse it and all following skulls back to hearts
        setSkullLevel(seq - 1);
      } else {
        // Advance forward to include this one
        setSkullLevel(seq);
      }
    } else {
      triggerRipple();
    }
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen relative overflow-hidden transition-all duration-[1500ms] ${
      isMaxThreat ? "grayscale" : ""
    }`}>
      <div className="cosmic-bg" />
      
      {/* Stellar yellow-and-green radial ripples */}
      <div 
        className="fixed inset-0 pointer-events-none z-[400] overflow-hidden"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 100%)"
        }}
      >
        <AnimatePresence>
          {ripples.map((rip) => (
            <React.Fragment key={rip.id}>
              {/* Shockwave Ring 1 (Sharp primary ring component) */}
              <motion.div
                initial={{ opacity: 1, scale: 0 }}
                animate={{ opacity: 0, scale: 8.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: [0.1, 0.75, 0.25, 1] }}
                onAnimationComplete={() => {
                  setRipples((prev) => prev.filter((r) => r.id !== rip.id));
                }}
                className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 border-[12px] border-[#a3ff33]"
                style={{
                  left: "50%",
                  top: "32px",
                  width: "300px",
                  height: "300px",
                  boxShadow: "0 0 60px #a3ff33, inset 0 0 40px #f3ff33, 0 0 120px #33ff57",
                  background: "radial-gradient(circle, rgba(243, 255, 51, 0.18) 0%, rgba(51, 255, 87, 0.04) 75%, transparent 100%)",
                }}
              />
              {/* Shockwave Ring 2 (Softer trailing halo) */}
              <motion.div
                initial={{ opacity: 0.8, scale: 0 }}
                animate={{ opacity: 0, scale: 10 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.15, 0.8, 0.3, 1], delay: 0.06 }}
                className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 border-[6px] border-[#eafc28]"
                style={{
                  left: "50%",
                  top: "32px",
                  width: "260px",
                  height: "260px",
                  boxShadow: "0 0 40px #eafc28, inset 0 0 20px #a3ff33, 0 0 80px #33ff57",
                  background: "transparent"
                }}
              />
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Red Ambient Cosmic Space Background (Pulses synced with heartbeat) */}
      <AnimatePresence>
        {skullLevel > 0 && (
          <motion.div
            key="red-cosmic-bg"
            className="fixed inset-0 pointer-events-none z-[-1.5]"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 30%, rgba(180, 0, 10, 0.75) 0%, transparent 75%), radial-gradient(circle at 20% 70%, rgba(130, 0, 5, 0.65) 0%, transparent 75%)"
            }}
            initial={{ opacity: 0 }}
            animate={
              isMaxThreat
                ? {
                    opacity: 0.9 * threatIntensity
                  }
                : !pulseActive
                ? {
                    opacity: 0.45 * threatIntensity
                  }
                : {
                    opacity: [
                      0.3 * threatIntensity,
                      1.0 * threatIntensity,
                      0.3 * threatIntensity,
                      1.0 * threatIntensity,
                      0.3 * threatIntensity
                    ]
                  }
            }
            exit={{ 
              opacity: 0,
              transition: { duration: 0.5, ease: "easeOut" }
            }}
            transition={
              isMaxThreat || !pulseActive
                ? { duration: 1.0, ease: "easeOut" }
                : pulseTransition
            }
          />
        )}
      </AnimatePresence>
      <div className="starry-bg" />
      
      {/* Dynamic Blood-Red Heartbeat Pulse Vignette Overlay */}
      <AnimatePresence>
        {skullLevel > 0 && (
          <motion.div
            key="blood-red-threat-overlay"
            className="absolute inset-0 pointer-events-none z-[5]"
            initial={{ 
              opacity: 0, 
              borderColor: "rgba(139, 0, 0, 0)", 
              boxShadow: "inset 0 0px 0px rgba(0, 0, 0, 0)" 
            }}
            animate={
              isMaxThreat ? {
                borderColor: `rgba(139, 0, 0, ${0.95 * threatIntensity})`,
                boxShadow: `inset 0 0 95px rgba(255, 10, 10, ${0.95 * threatIntensity}), inset 0 0 170px rgba(140, 5, 5, ${0.85 * threatIntensity}), inset 0 0 270px rgba(45, 0, 0, ${0.75 * threatIntensity})`,
                opacity: 1.0 * threatIntensity,
              } : !pulseActive ? {
                borderColor: `rgba(139, 0, 0, ${0.85 * threatIntensity})`,
                boxShadow: `inset 0 0 35px rgba(139, 0, 0, ${0.45 * threatIntensity}), inset 0 0 90px rgba(80, 0, 0, ${0.35 * threatIntensity})`,
                opacity: 0.75 * threatIntensity,
              } : {
                borderColor: [
                  `rgba(139, 0, 0, ${0.6 * threatIntensity})`,
                  `rgba(255, 10, 10, ${1.0 * threatIntensity})`,
                  `rgba(139, 0, 0, ${0.6 * threatIntensity})`,
                  `rgba(255, 10, 10, ${1.0 * threatIntensity})`,
                  `rgba(139, 0, 0, ${0.6 * threatIntensity})`,
                ],
                boxShadow: [
                  `inset 0 0 35px rgba(139, 0, 0, ${0.5 * threatIntensity}), inset 0 0 80px rgba(80, 0, 0, ${0.4 * threatIntensity}), inset 0 0 150px rgba(15, 0, 0, ${0.3 * threatIntensity})`,
                  `inset 0 0 95px rgba(255, 10, 10, ${0.95 * threatIntensity}), inset 0 0 170px rgba(140, 5, 5, ${0.85 * threatIntensity}), inset 0 0 270px rgba(45, 0, 0, ${0.75 * threatIntensity})`,
                  `inset 0 0 35px rgba(139, 0, 0, ${0.5 * threatIntensity}), inset 0 0 80px rgba(80, 0, 0, ${0.4 * threatIntensity}), inset 0 0 150px rgba(15, 0, 0, ${0.3 * threatIntensity})`,
                  `inset 0 0 95px rgba(255, 10, 10, ${0.95 * threatIntensity}), inset 0 0 170px rgba(140, 5, 5, ${0.85 * threatIntensity}), inset 0 0 270px rgba(45, 0, 0, ${0.75 * threatIntensity})`,
                  `inset 0 0 35px rgba(139, 0, 0, ${0.5 * threatIntensity}), inset 0 0 80px rgba(80, 0, 0, ${0.4 * threatIntensity}), inset 0 0 150px rgba(15, 0, 0, ${0.3 * threatIntensity})`,
                ],
                opacity: [
                  0.35 * threatIntensity,
                  1.0 * threatIntensity,
                  0.35 * threatIntensity,
                  1.0 * threatIntensity,
                  0.35 * threatIntensity,
                ]
              }
            }
            exit={{ 
              opacity: 0,
              borderColor: "rgba(139, 0, 0, 0)",
              boxShadow: "inset 0 0 0px rgba(0, 0, 0, 0)",
              transition: { duration: 0.5, ease: "easeOut" }
            }}
            transition={
              isMaxThreat || !pulseActive ? {
                duration: 1.0,
                ease: "easeOut",
              } : pulseTransition
            }
            style={{
              background: "transparent",
              borderWidth: "3px",
              borderStyle: "solid",
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Static Battlemap Background Cover */}
      <AnimatePresence>
        {isThrown && activeMapImg && (
          <motion.div 
            key="battlemap-background-cover"
            initial={{ 
              clipPath: `circle(0px at ${dropPoint.x}px ${dropPoint.y}px)`,
              opacity: 0,
              scale: 0.98
            }}
            animate={{ 
              clipPath: `circle(3000px at ${dropPoint.x}px ${dropPoint.y}px)`,
              opacity: 1,
              scale: 1
            }}
            exit={{ 
              clipPath: `circle(0px at ${dropPoint.x}px ${dropPoint.y}px)`,
              opacity: 0,
              scale: 0.98
            }}
            transition={{ 
              clipPath: {
                duration: 1.2,
                ease: [0.22, 1, 0.36, 1]
              },
              scale: {
                type: "spring",
                stiffness: 55,
                damping: 12
              },
              opacity: { duration: 0.5 }
            }}
            className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
          >
            <img 
              src={activeMapImg}
              alt="Active Battlemap Background"
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{
                imageRendering: 'auto',
              }}
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Gradients for Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <radialGradient id="skullGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#4a4a4a" />
            <stop offset="40%" stopColor="#2a2a2a" />
            <stop offset="80%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <linearGradient id="nebulaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3ff33">
              <animate attributeName="stop-color" values="#a3ff33;#33ff57;#f3ff33;#a3ff33" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#f3ff33">
              <animate attributeName="stop-color" values="#f3ff33;#a3ff33;#33ff57;#f3ff33" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#33ff57">
              <animate attributeName="stop-color" values="#33ff57;#f3ff33;#a3ff33;#33ff57" dur="4s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>
      </svg>

      {/* Wrapper to control transparency of everything else */}
      <div className={`w-full min-h-screen transition-opacity duration-300 ${
        isEverythingHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}>
      
      <React.Fragment key={activeCharId}>
      {/* Top Middle Concentric Circles / Custom Restructured Dashboard */}
      {!isThrown ? (
        <>
          {useRestructureAlignment ? (
            /* Swapped Layout: Ribbon at corner-left, Life HUD at corner-right */
            <>
              {/* Ribbon ARCH element at corner-left */}
              <div 
                className="absolute z-[100] flex items-center justify-center transition-all duration-300 pointer-events-none select-none origin-top-left"
                style={{
                  top: '6px',
                  left: '6px',
                  width: '320px',
                  height: '96px',
                  transform: 'scale(0.84)'
                }}
              >
                <div className="relative flex items-center justify-center pointer-events-auto h-[88px] w-[88px]">
                  <RibbonEnds />
                  <RibbonBack />
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
                                key={item.id === '12:00' ? "flame" : "heart"}
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
                    
                    {/* Inner Pink Circle (Reset on click, Settings on hold) */}
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
                    
                    {/* Custom cosmic starry arched ribbon overlay covers the bottom 30% of pink circle */}
                    <RibbonFront />
                  </motion.div>
                </div>
              </div>
              
              {/* Compass Life HUD Badge (Top Right) */}
              <div 
                className="absolute z-[120] origin-top-right pointer-events-auto select-none"
                style={{ right: '5.76px', top: '4.92px', transform: 'scale(0.8448)' }}
              >
                <Life noPadding={true} />
              </div>
            </>
          ) : (
            layoutOrientation === 'horizontal' ? (
            <div 
              className="absolute top-[1.5%] left-1/2 -translate-x-1/2 flex flex-row items-center justify-center gap-[4.5rem] transition-all duration-300 z-[100]"
              style={headerFadeStyle}
            >
              <div className="relative flex items-center justify-center h-[96px] w-[320px]">
                {/* Cosmic back ribbon element, placed behind everything else */}
                <RibbonEnds />
                <RibbonBack />
                
                {/* Outer Blue Circle */}
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
                              key={item.id === '12:00' ? "flame" : "heart"}
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
                  
                  {/* Inner Pink Circle (Reset on click, Settings on hold) */}
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
                  
                  {/* Custom cosmic starry arched ribbon overlay covers the bottom 30% of pink circle */}
                  <RibbonFront />
                
                </motion.div>
                
              </div>
              
              {/* Gothic Life & Temp Tracker Badge inline side-by-side */}
              <div className="relative z-[300]">
                <Life />
              </div>
            </div>
          ) : (
            <div 
              className="absolute top-[1%] left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-300 z-[100]"
              style={headerFadeStyle}
            >
              {/* Cosmic back ribbon element, placed behind everything else */}
              <RibbonEnds />
              <RibbonBack />
              
              {/* Outer Blue Circle */}
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
                            key={item.id === '12:00' ? "flame" : "heart"}
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
                
                {/* Inner Pink Circle (Reset on click, Settings on hold) */}
                <motion.div 
                  className="w-20 h-20 rounded-full border-2 cursor-pointer transition-all duration-300 relative z-[30] pointer-events-auto overflow-hidden flex items-center justify-center animate-pulse-slow"
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
                
                {/* Custom cosmic starry arched ribbon overlay covers the bottom 30% of pink circle */}
                <RibbonFront />
              
              </motion.div>
        
              {/* Interactive D&D Gothic Life & Temp Tracker Badge positioned 1px below ribbon */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 z-[300]"
                style={{ top: "101px" }}
              >
                <Life />
              </div>
            </div>
          ))}
     
          {/* Starting below the life section, at the same distance, three rectangular panels spanning to bottom */}
          <AbilitiesSections />
        </>
      ) : (
        <TabletopRestructure 
          skullLevel={skullLevel}
          setSkullLevel={setSkullLevel}
          pulseActive={pulseActive}
          pulseTransition={pulseTransition}
          threatIntensity={threatIntensity}
          isMaxThreat={isMaxThreat}
          heartPositions={heartPositions}
          dotHoverScale={dotHoverScale}
          dotTransition={dotTransition}
          handlePress={handlePress}
          onRestoreMap={() => {
            safeStorage.setItem('tabletop_is_thrown', 'false');
            safeStorage.setItem('tabletop_app_opacity', '100');
            window.dispatchEvent(new Event('tabletop-state-update'));
          }}
        />
      )}
      </React.Fragment>

      {/* RPG Settings Popover Overlay */}
      <AnimatePresence>
        {showSettings && (
          <SettingsWindow 
            onClose={() => {
              setShowSettings(false);
              setSettingsProps(null);
            }} 
            playTick={playSettingsClickSound}
            initialTab={settingsProps?.initialTab}
            autostartEditCharId={settingsProps?.autostartEditCharId}
          />
        )}
      </AnimatePresence>

      {/* Character Codex Overlay */}
      <AnimatePresence>
        {activeCodexCharId && (
          <CharacterCodexModal 
            charId={activeCodexCharId}
            onClose={() => setActiveCodexCharId(null)}
          />
        )}
      </AnimatePresence>
      </div>

      {/* Floating Eye Symbol for screen hiding / focus mode */}
      <button
        id="cosmic-eye-portal-toggle"
        onClick={() => {
          if (isEverythingHidden) {
            playSettingsClickSound(500, 0.08, 'sine');
          } else {
            playSettingsClickSound(750, 0.15, 'sine');
          }
          setIsEverythingHidden(!isEverythingHidden);
        }}
        className={`fixed right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-2 transition-all duration-300 cursor-pointer pointer-events-auto focus:outline-none ${isAnyMenuOpen ? 'z-[10]' : 'z-[9999]'} ${
          isEverythingHidden 
            ? "text-amber-400 opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            : "text-stone-400 hover:text-stone-200 opacity-40 hover:opacity-100 hover:scale-105"
        }`}
        title={isEverythingHidden ? "Show interface" : "Hide interface"}
      >
        {isEverythingHidden ? (
          <Eye size={22} className="stroke-[1.75]" />
        ) : (
          <EyeOff size={22} className="stroke-[1.75]" />
        )}
      </button>

      <style>{`
        div#root:nth-of-type(1) > div:nth-of-type(1) > button#cosmic-eye-portal-toggle:nth-of-type(1) > svg:nth-of-type(1) {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.2));
        }
        div#root:nth-of-type(1) > div:nth-of-type(1) > button#cosmic-eye-portal-toggle:nth-of-type(1):hover > svg:nth-of-type(1) {
          filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.85));
          transform: scale(1.15) rotate(180deg);
        }

        /* Focused Element 2: Cosmic Eye Portal Toggle */
        div#root:nth-of-type(1) > div:nth-of-type(1) > button#cosmic-eye-portal-toggle:nth-of-type(1) {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        body.vtt-menu-open div#root:nth-of-type(1) > div:nth-of-type(1) > button#cosmic-eye-portal-toggle:nth-of-type(1) {
          z-index: 5 !important;
          opacity: 0.12 !important;
          pointer-events: none !important;
          transform: translateY(-50%) scale(0.85);
        }

        /* Companion details panel remains styled to stay perfectly above and responsive */

        /* Focused Element 2: Companion Details Panel (CSS Selector 2) - styled to stay perfectly above and responsive */
        div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(7) {
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(245, 158, 11, 0.15) !important;
          border-color: rgba(245, 158, 11, 0.35) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          z-index: 999999 !important;
          pointer-events: auto !important;
        }
        div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(7):hover {
          box-shadow: 0 12px 45px rgba(0, 0, 0, 0.95), 0 0 35px rgba(245, 158, 11, 0.25) !important;
          border-color: rgba(245, 158, 11, 0.5) !important;
        }

        /* CSS Selector 1: When menu is open, move the dice container behind/beneath menus and disable intercept */
        body.vtt-menu-open div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) {
          pointer-events: none !important;
          opacity: 0.7 !important;
        }

        /* Move dice and their shadows beneath/behind open menus and disable pointer intercept */
        body.vtt-menu-open [id^="vtt-global-d6-"] {
          pointer-events: none !important;
        }

        /* Explicit CSS Selector targeting for selected element behavior confirmation */
        body.vtt-menu-open div:nth-of-type(2) > div#vtt-global-d6-0:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) {
          pointer-events: none !important;
        }

        /* General scrollbar hiding for html and body */
        html, body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none !important;
        }

        /* Targeted Element 1: content container scrollability without scrollbars */
        div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) {
          overflow-y: auto !important;
          max-height: 100vh !important;
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE/Edge */
        }
        div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5)::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
}
