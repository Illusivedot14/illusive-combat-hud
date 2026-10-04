import { settingOn } from "./hud-settings.mjs";
import { getViewedCombat } from "./combat.mjs";
import { selectTokenForTurn } from "./token-actions.mjs";
import { combatantToken } from "../components/turn-tracker/turn-tracker-combatant.mjs";

function getTurnCombatant(combat, current) {
  if (!combat) return null;

  if (current?.tokenId) {
    return combat.combatants.find((c) => c.tokenId === current.tokenId) ?? null;
  }

  const turn = current?.turn ?? combat.turn;
  return combat.turns?.[turn] ?? combat.combatant ?? null;
}

function onTurnChange(combat, _prior, current) {
  if (!combat?.started || !canvas?.ready) return;
  if (!settingOn("enableTurnHelpers")) return;

  const viewed = getViewedCombat();
  if (viewed && viewed.id !== combat.id) return;

  const token = combatantToken(getTurnCombatant(combat, current));
  if (token) void selectTokenForTurn(token);
}

export function bindCombatTurnHooks() {
  Hooks.on("combatTurnChange", onTurnChange);
  Hooks.on("combatStart", (combat) => onTurnChange(combat, null, combat?.current));
}
