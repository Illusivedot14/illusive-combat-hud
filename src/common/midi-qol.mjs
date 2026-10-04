import { MODULE_ID } from "./constants.mjs";

const MIDI_ID = "midi-qol";

export function getMidiApi() {
  return game.modules.get(MIDI_ID)?.api ?? globalThis.MidiQOL ?? null;
}

export function getMidiActions(actor) {
  return actor?.getFlag?.(MIDI_ID, "actions") ?? {};
}

/** True when a midi action-tracking flag represents "already used". */
function flagMeansUsed(value) {
  if (value == null || value === false || value === 0 || value === "0" || value === "false") return false;
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (typeof value === "object") {
    if ("value" in value) return flagMeansUsed(value.value);
    if ("used" in value) return flagMeansUsed(value.used);
    // Empty / unknown objects are not treated as spent.
    return false;
  }
  return false;
}

export function isActionAvailable(actor) {
  if (!actor) return true;
  const api = getMidiApi();
  if (typeof api?.hasUsedAction === "function") return !api.hasUsedAction(actor);
  return !flagMeansUsed(getMidiActions(actor).action);
}

export function isBonusActionAvailable(actor) {
  if (!actor) return true;
  const api = getMidiApi();
  if (typeof api?.hasUsedBonusAction === "function") return !api.hasUsedBonusAction(actor);

  const actions = getMidiActions(actor);
  if ("bonus" in actions) return !flagMeansUsed(actions.bonus);

  const used = Number(actions.bonusActionsUsed ?? 0);
  const max = Number(actions.bonusActionsMax ?? 1);
  return used < max;
}

export function isReactionAvailable(actor) {
  if (!actor) return true;
  const api = getMidiApi();
  if (typeof api?.hasUsedReaction === "function") return !api.hasUsedReaction(actor);

  const actions = getMidiActions(actor);
  if ("reaction" in actions) return !flagMeansUsed(actions.reaction);

  const used = Number(actions.reactionsUsed ?? 0);
  const max = Number(actions.reactionsMax ?? 1);
  return used < max;
}

export function getEconomyAvailability(actor) {
  return {
    action: isActionAvailable(actor),
    bonus: isBonusActionAvailable(actor),
    reaction: isReactionAvailable(actor)
  };
}

export function canSpendEconomy(actor, economyType) {
  return getEconomyAvailability(actor)[economyType] ?? true;
}

export async function markActionUsed(actor) {
  const api = getMidiApi();
  if (api?.setActionUsed) await api.setActionUsed(actor);
  else await actor.setFlag(MIDI_ID, "actions.action", true);
}

export async function markBonusActionUsed(actor) {
  const api = getMidiApi();
  if (api?.setBonusActionUsed) await api.setBonusActionUsed(actor);
  else await actor.setFlag(MIDI_ID, "actions.bonus", true);
}

export async function markReactionUsed(actor) {
  const api = getMidiApi();
  if (api?.setReactionUsed) await api.setReactionUsed(actor);
  else await actor.setFlag(MIDI_ID, "actions.reaction", true);
}

async function clearMidiActionFlag(actor, key) {
  try {
    await actor.unsetFlag(MIDI_ID, `actions.${key}`);
  } catch (_err) {
    await actor.setFlag(MIDI_ID, `actions.${key}`, false);
  }
}

/** Toggle action / bonus / reaction spent state (Midi when present, flags otherwise). */
export async function toggleEconomySpent(actor, economyType) {
  if (!actor || !["action", "bonus", "reaction"].includes(economyType)) return false;

  const available = getEconomyAvailability(actor)[economyType];
  const markUsed = available !== false;

  if (economyType === "action") {
    if (markUsed) await markActionUsed(actor);
    else await clearMidiActionFlag(actor, "action");
    return true;
  }
  if (economyType === "bonus") {
    if (markUsed) await markBonusActionUsed(actor);
    else await clearMidiActionFlag(actor, "bonus");
    return true;
  }
  if (markUsed) await markReactionUsed(actor);
  else await clearMidiActionFlag(actor, "reaction");
  return true;
}

export function isItemsEconomySpent(actor) {
  return Boolean(actor?.getFlag?.(MODULE_ID, "economy.itemsSpent"));
}

export async function toggleItemsEconomySpent(actor) {
  if (!actor) return false;
  await actor.setFlag(MODULE_ID, "economy.itemsSpent", !isItemsEconomySpent(actor));
  return true;
}
