# Combat flow (technical)

Companion to [combat-flow.md](combat-flow.md). Pointers only — not a line-by-line tour.

The HUD has one paint loop. Mode is a boolean on the **viewed combat + this token**, not a separate app.

flowchart TB
  boot["main.mjs ready"] --> panels["registerHudPanels"]
  panels --> party["party-status"]
  panels --> bar["action-bar.mjs"]
  panels --> tracker["turn-tracker"]
  boot --> hooks["render/hooks.mjs"]
  boot --> combatId["getViewedCombat()"]

  combatId --> gate{"inCombat(token)<br/>started AND combatant?"}

  subgraph ooc [Out of combat]
    tokenOoc["resolveActionBarToken()"]
    idle["buildIdleMovementData()"]
    join["handleCombatFlowButton()<br/>enterCombatWithToken()"]
    begin["startCombatRollingUnrolled()"]
    tokenOoc --> idle
    tokenOoc --> join --> begin
  end

  subgraph ic [In combat]
    tokenIc["same token resolver"]
    spend["canSpendEconomy()"]
    feet["buildMovementData()"]
    undo["undoLastTokenMovement()"]
    barClick["onActionBarClick"]
    slot["pickCastSlotLevel()"]
    targets{"needs targets?"}
    pick["startTargetPick()"]
    fire["useActivityFromHud()<br/>Midi completeActivityUse"]
    areas["spell-regions.mjs"]
    next["combat.nextTurn()"]
    tokenIc --> spend
    tokenIc --> feet --> undo
    tokenIc --> barClick --> slot --> targets
    targets -->|none or already picked| fire
    targets -->|force pick / none selected| pick --> fire
    fire --> areas
    fire --> next
  end

  gate -->|no| ooc
  gate -->|yes| ic
  begin --> gate
  next --> gate

## Boot

`src/main.mjs` loads settings, then on `ready` binds canvas hooks, HUD render, action bar, and combat-turn helpers.

Panels register in `src/common/render/panels.mjs`:

1. Party rail — `src/components/party-status/`
2. Action bar — `src/components/action-bar/action-bar.mjs`
3. Turn tracker — `src/components/turn-tracker/`

Repaints come from `src/common/render/hooks.mjs` (`controlToken`, combat hooks, Midi spend hooks, actor/item/effect updates).

Which combat is “the” combat: `getViewedCombat()` in `src/common/combat.mjs`.

## What “in combat” means

`inCombat(token)` in `action-bar.mjs`:

`getViewedCombat()?.started && getCombatantForToken(token)`

- Encounter exists but **not started** → out of combat UI.
- Combat started, token **not** a combatant → out of combat UI (join via the combat button).
- Started **and** this token is in it → in combat UI.

Whose turn: `getActiveCombatant()` reads `combat.turns[combat.turn]`, not `combat.combatant` (that lags one beat in v14).

## Out of combat

| Piece | Behavior | Where |
|---|---|---|
| Action bar token | First controlled token (or touch-table focus) | `resolveActionBarToken()` in `src/common/action-bar-token.mjs` |
| Abilities | Shown if “Abilities Outside Combat” is on | `buildCombatToolbarSections()` / `buildAbilitiesHtml()` |
| Economy | Display only, not spent | `buildSectionData(..., combatActive)` |
| Movement | Full speed, no budget, no undo | `buildIdleMovementData()` in `src/common/action-economy.mjs` |
| Combat button | Join this token to the encounter | `handleCombatFlowButton()` → `enterCombatWithToken()` in `action-bar-token-actions.mjs` |
| Turn tracker | Cards stay in list order; Next = Begin | `getCarouselOrder()` in `carousel-layout.mjs`; `handleTurnTrackerAction("next-turn")` in `turn-tracker-controls.mjs` |

Begin combat rolls anyone without initiative, then `combat.startCombat()` (`startCombatRollingUnrolled()`).

D&D Beyond is **not** HUD code. Sheet refresh is `DDBImporter.updateAllPCs.foundry()`. Live HP/dice is `ddb-sync`.

## In combat

| Piece | Behavior | Where |
|---|---|---|
| Economy | Action / bonus / reaction spent through Midi | `canSpendEconomy()`; clicks in `onActionBarClick` |
| Movement | Feet from `token.document.movementHistory` | `buildMovementData()` |
| Undo move | Last recorded drag via Foundry `revertRecordedMovement` | `undoLastTokenMovement()` |
| Combat button | End turn if it is this token’s turn | `handleCombatFlowButton()` → `combat.nextTurn()` |
| Turn tracker | Active card in front; Next advances turn | `turn-tracker-controls.mjs`, `turn-tracker-dom.mjs` |
| Auto-pan | Optional, on turn change | `bindCombatTurnHooks()` in `src/common/combat-turn.mjs` |

### Using an ability

Click path: `onActionBarClick` in `action-bar.mjs`.

1. Economy check if `inCombat`.
2. Slot picker if the spell can upcast — `pickCastSlotLevel()` in `action-bar-cast-picker.mjs`.
3. Targeting:
   - Needs canvas targets and none selected (or `shouldForceTargetPick` for weapons/attacks) → `startTargetPick()` in `action-bar-target-picker.mjs`.
   - Confirm requires **exact** count (`confirmTargetPick`).
4. Fire: `useAbility()` → `useActivityFromHud()` in `src/common/midi-use.mjs` → Midi `completeActivityUse`.

Intended split (not fully how `shouldForceTargetPick` works today): one target already selected should fire; several targets keep the picker.

### Areas

GM-only, `src/common/hooks/spell-regions.mjs`:

- Instantaneous → delete the region after 6s.
- Concentration → flag `dnd5e.dependentOn` the concentration effect; delete the effect if it only disables, so the region goes with it.

## Shared chrome

Always on the selected token, both modes:

- Status / light / rolls dropdowns — `action-bar-util-dropdown.mjs`
- Party portraits — `src/components/party-status/`
- Token effect icons — `src/components/token-statuses/`
- Boss bar — `src/components/boss-bar/` (GM pick, socket to players)

Phones skip the canvas HUD (`isIllusiveMobileMode()` in `src/common/mobile-client.mjs`) and get `src/components/mobile-sheet/` instead.

## Mode switch

`inCombat` is false until the encounter is started **and** this token is in it. Begin / join flips that. End combat or leave combat flips it back. The chart above is the same gate.
