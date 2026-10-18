import { safeStorage } from '../storage';

export type StatType = 'body' | 'mind' | 'speed' | 'endurance' | 'wield' | 'magic';

export interface StatInfo {
  name: string;
  description: string;
  features: string[];
}

export const STAT_DETAILS: Record<StatType, StatInfo> = {
  body: {
    name: 'Body',
    description: 'Governs physical power, health reservoir, and sheer muscle strength.',
    features: [
      'Increases maximum health thresholds',
      'Boosts melee bash and brute force actions',
      'Aids in carrying high loads and door-breaking checks',
      'Synthesizes with Wield to empower martial mastery and heavy swinging'
    ]
  },
  mind: {
    name: 'Mind',
    description: 'Measures intellect, visual focus, spell preparation, and situational awareness.',
    features: [
      'Increases magic attack hit probability with target rolls',
      'Enhances success rate of ancient ruins analysis and glyph decoding',
      'Provides high resistance against external illusions and mind hazards',
      'Synergizes with Magic to empower astral spellweaver matrices'
    ]
  },
  speed: {
    name: 'Speed',
    description: 'Improves dexterity, reflex pacing, manual agility, and lockpicking finesse.',
    features: [
      'Enhances movement speeds and dodge maneuvers',
      'Reduces preparation cooldowns and increases turn order priority',
      'Amplifies thief actions, pickpocketing, and traps disarm checks'
    ]
  },
  endurance: {
    name: 'Endurance',
    description: 'Represents physical stamina, toxin resistance, and defensive fortitude.',
    features: [
      'Helps shrug off debilitating poison, frostbite, and burn damage',
      'Decreases incoming physical block damage and stagger probability',
      'Governs recovery rates when resting or consuming restorative elixirs'
    ]
  },
  wield: {
    name: 'Wield',
    description: 'Dictates armed combat skill, weapon controls precision, and combat stances.',
    features: [
      'Increases hit ratings and critical strikes with Starseeker Blades and Astral Bows',
      'Allows equipping high-tier legendary tier weaponry',
      'Governs weapon parry safety parameters and stance-shifting effectiveness',
      'Synergizes with Body for massive martial strike damage'
    ]
  },
  magic: {
    name: 'Magic',
    description: 'Represents the pure flow of internal mana, spell force, and connection to the cosmos.',
    features: [
      'Increases maximum mana reserves for spellforge matrices',
      'Amplifies spell casting damage and area-of-effect radius',
      'Decrypts high-circle spell formulas and allows summoning celestial elements',
      'Synergizes with Mind to increase Magic-Hit roll accuracy'
    ]
  }
};

export const getRequiredXPForNextLevel = (score: number): number => {
  // Level x requires (x + 1) XP. For level 0, it requires exactly 1 XP.
  // For level 1, it requires exactly 2 XP, level 2 requires 3 XP, etc.
  return Math.max(1, score + 1);
};

export const getStatXP = (stat: StatType): number => {
  const saved = safeStorage.getItem(`vtt_xp_${stat}`);
  return saved ? parseInt(saved, 10) : 0;
};

export const saveStatXP = (stat: StatType, xp: number): void => {
  safeStorage.setItem(`vtt_xp_${stat}`, xp.toString());
};

// Returns descriptive string of level up if true, else null
const lastXPEntryTimes: Record<string, number> = {};

export const STAT_DEFAULT_SCORES: Record<StatType, number> = {
  body: 12,
  mind: 14,
  speed: 15,
  endurance: 13,
  wield: 12,
  magic: 16
};

export const addStatXP = (
  stat: StatType, 
  amount: number, 
  playAudiofn?: (freq: number, type: OscillatorType, dur: number) => void
): { leveledUp: boolean; oldScore: number; newScore: number; xpGranted: number; msg?: string } => {
  const xpKey = `vtt_xp_${stat}`;
  const scoreKey = `vtt_stat_${stat}`;
  
  // Get current score safely
  const scoreSaved = safeStorage.getItem(scoreKey);
  const parsedScore = scoreSaved !== null ? parseInt(scoreSaved, 10) : NaN;
  const currentScore = !isNaN(parsedScore) ? parsedScore : (STAT_DEFAULT_SCORES[stat] !== undefined ? STAT_DEFAULT_SCORES[stat] : 10);

  const now = Date.now();
  if (lastXPEntryTimes[stat] && now - lastXPEntryTimes[stat] < 200) {
    console.log(`Blocking duplicate addStatXP for ${stat}`);
    return {
      leveledUp: false,
      oldScore: currentScore,
      newScore: currentScore,
      xpGranted: 0,
      msg: ''
    };
  }
  lastXPEntryTimes[stat] = now;
  
  // Get current XP safely
  const xpSaved = safeStorage.getItem(xpKey);
  const parsedXP = xpSaved !== null ? parseInt(xpSaved, 10) : NaN;
  const currentXP = !isNaN(parsedXP) ? parsedXP : 0;
  
  // Ensure strict number types to prevent any silent string coercion (which could result in e.g. "1" + 3 = "13")
  const safeCurrentXP = Number(currentXP) || 0;
  const safeAmount = Number(amount) || 0;
  const safeCurrentScore = Number(currentScore) || 0;
  
  let newXP = safeCurrentXP + safeAmount;
  let newScore = safeCurrentScore;
  let leveledUp = false;
  
  let req = getRequiredXPForNextLevel(newScore);
  
  console.log(`[XP System] BEFORE level up loop: stat=${stat}, currentXP=${safeCurrentXP}, amount=${safeAmount}, totalNewXP=${newXP}, currentScore=${safeCurrentScore}, req=${req}`);
  
  while (newXP >= req) {
    newXP -= req;
    newScore += 1;
    leveledUp = true;
    req = getRequiredXPForNextLevel(newScore);
    console.log(`[XP System] Leveled Up in loop: newScore=${newScore}, remainingXP=${newXP}, nextReq=${req}`);
  }
  
  console.log(`[XP System] AFTER level up loop: final XP=${newXP}/${req}, finalScore=${newScore}, leveledUp=${leveledUp}`);
  
  // Save both
  safeStorage.setItem(xpKey, newXP.toString());
  safeStorage.setItem(scoreKey, newScore.toString());
  
  // Dispatch sync event for other components
  window.dispatchEvent(new Event('tabletop-state-update'));
  
  let msg = '';
  if (leveledUp) {
    msg = `[Stat Level Up!]: ${STAT_DETAILS[stat].name} improved from Score ${currentScore} to ${newScore}!`;
    if (playAudiofn) {
      try {
        // Play level up sound chime sequence
        playAudiofn(523.25, 'triangle', 0.1); // C5
        setTimeout(() => playAudiofn(659.25, 'triangle', 0.1), 120); // E5
        setTimeout(() => playAudiofn(783.99, 'triangle', 0.15), 240); // G5
        setTimeout(() => playAudiofn(1046.50, 'triangle', 0.25), 360); // C6
      } catch (e) {
        console.error("Audio error during stat levelling:", e);
      }
    }
  }
  
  return {
    leveledUp,
    oldScore: currentScore,
    newScore,
    xpGranted: amount,
    msg
  };
};
