/**
 * Centralized Z-Index and Layer Hierarchy System
 * 
 * Edit this file to control the exact vertical stacking order of all HUD,
 * tabletop elements, 3D dice physics, menus, and modals.
 */

export const LAYER_HIERARCHY = {
  // 1. Map & Interactive grid background structures
  GAME_MAP_CONTAINER: 1,
  GRID_COORDINATES: 10,

  // 2. Control nodes, Pentagram layout, and passive map markers
  PENTAGRAM_RADIAL: 20,
  RADIAL_MENU_ITEMS: 30,

  // 3. Normal HUD Elements (life bars, static widgets, ribbon selectors)
  HUD_STAT_BARS: 120,
  RIBBON_CONTROLS: 130,

  // 4. Central 3D Dice Simulation Layer (Standard vs Menu Open state)
  // When no menus are active, dice sit high for free-form tabletop tossing
  DICE_SIMULATION_HIGH: 99999,
  DICE_SHADOW_HIGH: 99998,

  // When a menu IS open, these values instantly re-evaluate to drop the dice beneath all overlays
  DICE_SIMULATION_BENEATH_MENUS: 2,
  DICE_SHADOW_BENEATH_MENUS: 1,

  // 5. Active Menus & Interfaces (Spell forging matrices, action logs, Companion panels)
  // These are set elevated to fully dominate and sit on top of the physical workspace 
  COMPACT_SECTION_MENU: 999800,  // Slide-out modular RPG menus and companion logs
  SPELL_BUILDER_POPUP: 999900,   // Full-screen Spell Forger matrix controls
  
  // 6. Settings window & high-tier configuration tools
  GLOBAL_SETTINGS_CARD: 1000000,

  // 7. Context Tooltips, hover elements, and vital system alerts
  DICE_HOVER_TOOLTIPS: 1000100,
  GLOBAL_ALERT_MODAL: 2000000,
};

/**
 * Returns the exact z-index needed for the physical 3D dice simulation container element,
 * dynamically checking whether any menu or screen overlay is currently active.
 */
export function getActiveDiceZIndex(isAnyMenuOpen: boolean): number {
  if (isAnyMenuOpen) {
    return LAYER_HIERARCHY.DICE_SIMULATION_BENEATH_MENUS;
  }
  return LAYER_HIERARCHY.DICE_SIMULATION_HIGH;
}

/**
 * Returns the exact z-index needed for the physical dice simulation shadows,
 * dynamically checking whether any menu or screen overlay is currently active.
 */
export function getActiveDiceShadowZIndex(isAnyMenuOpen: boolean): number {
  if (isAnyMenuOpen) {
    return LAYER_HIERARCHY.DICE_SHADOW_BENEATH_MENUS;
  }
  return LAYER_HIERARCHY.DICE_SHADOW_HIGH;
}
