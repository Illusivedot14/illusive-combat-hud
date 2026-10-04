# Illusive Combat HUD

BG3-style combat HUD for Foundry VTT (dnd5e + Midi-QOL).

## Features

- **Party rail** — portrait stack with HP bar or text, resource pip, downed styling, sort order, and name tooltips
- **Current token panel** — HP tiers, temp HP, AC/speed chips, your-turn banner, docks beside the macro hotbar
- **Turn tracker** — initiative cards with max-visible cap, optional HP numbers, hide defeated, and turn-change slide
- **Token statuses** — effect icons with duration badges and right-click duration editing
- **Action bar** — Midi-synced A/B/R/L economy, movement, resources, standard actions, targeting, and ability launch

## Requirements

- Foundry VTT v13+
- dnd5e system 5.2+
- [Midi-QOL](https://foundryvtt.com/packages/midi-qol) v14+

## Settings

All client settings are under **Configure Settings → Module Settings → Illusive Combat HUD**:

| Setting | Default | Description |
|---------|---------|-------------|
| Action Bar | on | Master toggle for the action bar |
| Abilities Outside Combat | on | Show abilities when not in combat |
| Standard Combat Actions | on | Dash, Dodge, Disengage, Help, Hide, Ready |
| HUD Reaction Picker | off | Optional: route Midi reaction prompts through the action bar instead of Midi’s dialog |
| Party Combat State | on | Conditions/concentration/death saves on party portraits |
| Party/Token Layout | — | Offset and scale sliders for party rail and token panel |
| HUD Theme | BG3 | Ornate frames vs minimal flat panels |
| Turn Tracker Max Cards | 9 | How many initiative cards fit before scrolling (1–16) |
| Hide Defeated | off | Remove defeated combatants from the turn tracker for players |
| Movement Mode Switcher | on | Walk/fly/swim mode buttons on movement bar |
| End Turn Button | on | Show End Turn during your turn |

## Usage

1. Enable the module and reload Foundry.
2. Place player character tokens on the scene.
3. Select a token — the current-token panel and action bar appear beside the hotbar.
4. During combat, use economy chips (S/A/B/R/L) to expand ability lists.
5. **Reactions** (Counterspell, opportunity attacks, Shield, etc.) are handled by **Midi-QOL** — respond in its reaction prompt when triggered. Enable **HUD Reaction Picker** only if you want those prompts on the action bar instead.
6. Target enemies on canvas (T) before using targeted abilities.
7. **Right-click** a party portrait for sheet, target, or ping options.
8. **Right-click** a turn tracker card for pan, ping, and GM combat tools.
9. **Double-click** a party portrait to open its character sheet.

## Version

See `module.json` for the current version.
