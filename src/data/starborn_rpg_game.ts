export interface RPGTopic {
  id: string;
  label: string;
  content: string;
}

export const gameRulesTopics: RPGTopic[] = [
  {
    id: "what_is_game",
    label: "What Is This Game?",
    content: "Starborn is a tactical cosmic space-fantasy Tabletop RPG where players harness starlight, modify bodily cells via runic tech, and pilot celestial ships across stellar systems. You play as a 'Nebulist'—individuals bound to stellar alignments with the power to rewrite probability and challenge forces of Void corruption."
  },
  {
    id: "setting_overview",
    label: "Setting Overview",
    content: "Set in the Aetheric Belt, a cluster of planetary rifts surrounding a massive collapsed white dwarf star named Zenith. Gravity is weak, ships sail on starlight streams, and ancient ruins containing pure Cosmic Spark cores lie unguarded inside floating asteroid fields."
  },
  {
    id: "core_themes",
    label: "Core Themes",
    content: "Cosmic Hope vs. Entropic Decay. The tension between technology (cybernetic rune grafts) and biological flow (spirit-channeling). Light and shadow dictate safety: staying in illuminated safe-zones offers health recovery, whereas stepping into total darkness raises Void Stress."
  },
  {
    id: "core_gameplay_loop",
    label: "Core Gameplay Loop",
    content: "1. Navigate planetary space routes using coordinate coordinates.\n2. Infiltrate ancient planetary cores or handle faction security requests.\n3. Defeat anomalous rifts using tactical action-point rules.\n4. Secure starlight sparks to forge magical matrices and upgrade bases."
  },
  {
    id: "dice_mechanics",
    label: "Dice & Resolution Mechanics",
    content: "All task resolutions are decided by rolling 2d10. Add the relevant Astral Attribute modifier. If the sum meets or exceeds the Difficulty Class (DC), the check succeed. Matching doubles trigger a critical cosmic 'Spark' which multiplies combat output or cuts spell cost in half."
  },
  {
    id: "attributes",
    label: "Attributes",
    content: "Characters are defined by seven core capabilities: Attunement (Mana size), Mind (hacking, deduction), Speed (initiative, dodge), Endurance (life matrix size), Wield (accuracy, blade attack), Magic (spell Forge capability), and Spirit (fate shielding)."
  },
  {
    id: "skills",
    label: "Skills",
    content: "Skills represent narrow disciplines trained over time. Key skills include: Astral Navigation, cyberware Overclock, anomaly scanning, diplomatic parley, weightless Acrobatics, and runic glyph decryption. Roll checks with Attribute + Skill Rank."
  },
  {
    id: "resources",
    label: "Resources (HP, Mana, Stress, etc.)",
    content: "HPs represent active physical barrier shielding. Mana Units (MU) powers spellcraft. Void Stress measures cognitive purity—high stress forces players to roll on the 'Distortion Hazard Table' at the beginning of each turn."
  },
  {
    id: "char_creation",
    label: "Character Creation",
    content: "To build a character, allocate 15 standard points across Astral Attributes, select one Celestial Archetype path (Nebula Smith, Aether Monk, or Starlight Drifter), choose a starting Zodiac Birth Seal, and equip a standard starter tech toolkit."
  },
  {
    id: "combat",
    label: "Combat",
    content: "Initiative is speed-based. Rounds represent 6 seconds. Active players spend 3 Action Points (AP). Typical costs: moving 5 blocks = 1 AP, light weapon slash = 1 AP, casting custom magic runes = 2 AP, firing rocket launchers = 3 AP."
  },
  {
    id: "exploration",
    label: "Exploration",
    content: "Explore using planetary grid tracking. Travel across hostile star storms drains environmental fuel pads. Scanning anomalies reveals secret starlight caches but risks alerting surrounding Void patrols."
  },
  {
    id: "social_encounters",
    label: "Social Encounters",
    content: "Social parley relies on spirit or mind tests. Faction alignment shifts dynamically based on dialogue outcomes. Gaining the trust of the Solar Syndicate unlocks cheap black-market upgrades."
  },
  {
    id: "progression",
    label: "Advancement & Progression",
    content: "Earn Cosmic XP from resolving events, forging custom runes, or clearing rifts. Upon leveling up, you gain +1 attribute point, +1 spell design pool limit point, and may swap passive zodiac seals."
  },
  {
    id: "equipment_items",
    label: "Equipment & Items",
    content: "Carry equipment across three zones: Main weapon slots (plasma sabers, cosmic bow), off-hand auxiliary slot (energy shield, sensory visor), and utility backpack limits (healing gels, spare batteries)."
  },
  {
    id: "conditions",
    label: "Conditions & Status Effects",
    content: "Negative conditions impair actions: Space Burn (takes fire damage over time), Stasis Lock (Speed is 0 for 1 round), Deep Freeze (cannot cast active magic), and Void Delusion (-2 penalty on all spirit rolls)."
  },
  {
    id: "magic_abilities",
    label: "Magic / Powers / Special Abilities",
    content: "Channel spellcraft using customized matrix chains. Choose range, target counts, and elemental type (arcane, radioactive, kinetic, or absolute-zero). Combine limits to optimize Mana cost."
  },
  {
    id: "reference_tables",
    label: "Reference Tables",
    content: "Handy GM tables include: DC Difficulty guidelines (Easy=8, Medium=12, Hard=18, Celestial=25), standard laser weapon ranges, thermal heat dissipation rates, and rift-minion HP statistics."
  },
  {
    id: "quick_start",
    label: "Quick Start Rules",
    content: "1. Grab two ten-sided dice.\n2. Pick a pre-generated hero card.\n3. Select your core spell slot matrix.\n4. Place your node mini in the safe starlight zone.\n5. Roll initiative and challenge the Void!"
  }
];
