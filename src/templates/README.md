# Templates

Reusable screens preserved from earlier versions of the app. Nothing in this
folder is imported by the live app (on purpose — see below).

## StartupGrid3x3.tsx — the original 3x3 startup screen

**What it is:** the exact screen the app used to open on: nine bowed-in
panels at the bottom of the screen in a 3×3 array.

- Column 1: Starborn / Compendium / Journal
- Column 2: Weapons / Magic / Inventory
- Column 3: Tabletop (draggable map — drag/throw it to enter the main game
  menu) / EmptyEight / Dice (+ dice roller)

**Where it came from:** verbatim copy of
`src/03_abilities/01_section_boxes.tsx` (component `AbilitiesSections`,
helper `BowedInPanel`) as of commit `bd43e22` (Nov 6, 2026), with only the
imports re-pointed, the default export renamed to `StartupGrid3x3`, and a
header comment added. Layout, styling, labels, and wiring are unchanged.

**Why it is not imported:** the live app still renders the original
`AbilitiesSections` when the tabletop is retrieved, so importing this copy
too would mount a second `DiceRoller` / `Tabletop` alongside the live ones.

**How to reuse it later:** render `<StartupGrid3x3 />` wherever the old
startup screen should appear again — e.g. in `src/App.tsx`, in place of the
main game menu when `tabletop_is_thrown` is false, exactly as `App.tsx`
used to render `<AbilitiesSections />`.

**Related change:** as of Nov 6, 2026 the app opens directly on the main
game menu (`TabletopRestructure` in
`src/03_abilities/07_tabletop/01_maps/02_restructure.tsx`) instead of this
screen. See the one-time migration in `src/main.tsx`
(`startup_main_menu_migrated`) and the `tabletop_is_thrown` default in
`src/App.tsx`.
