/**
 * Single Midi-QOL interface for the HUD.
 *
 * Economy: Midi API hasUsed / setUsed, else flags.midi-qol.actions.
 * Fire: completeActivityUse / completeItemUse, else activity.use / item.use.
 * Range: midi.checkActivityRange / canSense.
 * Linked spell / activity list: ability-utils getLinkedSpell + listActivities.
 */

import { MODULE_ID } from "./constants.mjs";
import { settingOn } from "./hud-settings.mjs";
import { ich } from "./i18n.mjs";
import { getLinkedSpell, getTargetConfig, listActivities, requiresCanvasTargets } from "./ability-utils.mjs";
import { clearUserTargets } from "./token-actions.mjs";
import { getAbilityAttackCount, isSingleUseMultiHit, padTargetUuids } from "./attack-count.mjs";

export const MIDI_ID = "midi-qol";

const ECONOMY = Object.freeze({
  action: { has: "hasUsedAction", set: "setActionUsed", flag: "action" },
  bonus: {
    has: "hasUsedBonusAction",
    set: "setBonusActionUsed",
    flag: "bonus",
    used: "bonusActionsUsed",
    max: "bonusActionsMax"
  },
  reaction: {
    has: "hasUsedReaction",
    set: "setReactionUsed",
    flag: "reaction",
    used: "reactionsUsed",
    max: "reactionsMax"
  }
});

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
    return false;
  }
  return false;
}

export function isEconomyAvailable(actor, type) {
  if (!actor) return true;
  const spec = ECONOMY[type];
  if (!spec) return true;
  const api = getMidiApi();
  if (typeof api?.[spec.has] === "function") return !api[spec.has](actor);

  const actions = getMidiActions(actor);
  if (spec.flag in actions) return !flagMeansUsed(actions[spec.flag]);
  if (spec.used) return Number(actions[spec.used] ?? 0) < Number(actions[spec.max] ?? 1);
  return true;
}

export function getEconomyAvailability(actor) {
  return {
    action: isEconomyAvailable(actor, "action"),
    bonus: isEconomyAvailable(actor, "bonus"),
    reaction: isEconomyAvailable(actor, "reaction")
  };
}

export async function markEconomyUsed(actor, type) {
  if (!actor) return;
  const spec = ECONOMY[type];
  if (!spec) return;
  const api = getMidiApi();
  if (api?.[spec.set]) await api[spec.set](actor);
  else await actor.setFlag(MIDI_ID, `actions.${spec.flag}`, true);
}

async function clearMidiActionFlag(actor, key) {
  try {
    await actor.unsetFlag(MIDI_ID, `actions.${key}`);
  } catch {
    await actor.setFlag(MIDI_ID, `actions.${key}`, false);
  }
}

/** Toggle action / bonus / reaction spent state (Midi when present, flags otherwise). */
export async function toggleEconomySpent(actor, economyType) {
  if (!actor || !ECONOMY[economyType]) return false;
  if (isEconomyAvailable(actor, economyType) !== false) await markEconomyUsed(actor, economyType);
  else await clearMidiActionFlag(actor, ECONOMY[economyType].flag);
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

export function getReactionTimeoutMs() {
  try {
    return (game.settings.get(MIDI_ID, "reactionTimeout") ?? 12) * 1000;
  } catch {
    return 12000;
  }
}

export function getConcentrationEffect(actor, item) {
  return getMidiApi()?.getConcentrationEffect?.(actor, item)
    ?? globalThis.MidiQOL?.getConcentrationEffect?.(actor, item)
    ?? null;
}

export function checkAbilityRange(token, item, activity) {
  const targets = game.user.targets;
  if (!token || !targets?.size) return { inRange: true };

  const midi = getMidiApi();
  const act = activity ?? item?.system?.activities?.contents?.[0] ?? item?.system?.activities?.[0];
  if (!midi?.checkActivityRange || !act) return { inRange: true };

  const { result, reason } = midi.checkActivityRange(act, token, targets, false);
  const inRange = result === "normal" || result === "long";
  if (inRange && midi.canSense) {
    for (const target of targets) {
      if (!midi.canSense(token, target)) {
        return { inRange: false, reason: "noLOS", result: "fail" };
      }
    }
  }
  return { inRange, reason, result };
}

/** Effective target type, including cast activities that inherit spell targeting. */
export function getEffectiveTargetType(activity) {
  let effectiveTargetType = activity?.target?.affects?.type ?? activity?.target?.type;
  if (activity?.type !== "cast") return effectiveTargetType;

  const override = activity._source?.target?.override ?? activity.target?.override;
  if (override) return effectiveTargetType;

  const spellActivities = listActivities(getLinkedSpell(activity));
  const spellActivity = spellActivities.find((entry) => entry.canUse) ?? spellActivities[0];
  return spellActivity?.target?.affects?.type ?? spellActivity?.target?.type ?? effectiveTargetType;
}

function tokenUuid(token) {
  return token?.document?.uuid ?? token?.uuid ?? null;
}

export function resolveTriggerTokenUuid(options = {}, existing = null) {
  return options.workflow?.tokenUuid
    ?? options.triggerTokenUuid
    ?? options.tokenUuid
    ?? existing?.triggerTokenUuid
    ?? existing?.options?.workflow?.tokenUuid
    ?? existing?.options?.triggerTokenUuid
    ?? existing?.options?.tokenUuid
    ?? null;
}

/** Resolve Midi target UUIDs for an activity launched from the HUD. */
export function resolveActivityTargetUuids(token, activity, context = {}, section = null) {
  if (!token) return [];

  const targetConfig = getTargetConfig(activity?.item ?? activity?.parent, activity);
  if (targetConfig?.template?.type) return [];

  const effectiveTargetType = getEffectiveTargetType(activity);
  if (effectiveTargetType === "self") {
    const selfUuid = tokenUuid(token);
    return selfUuid ? [selfUuid] : [];
  }

  const triggerUuid = resolveTriggerTokenUuid(context.options ?? {}, context);
  if ((context.reactionKeys || section === "reaction") && triggerUuid) return [triggerUuid];
  if (Array.isArray(context.targetUuids)) return [...context.targetUuids];

  const targets = [...(game.user.targets ?? [])];
  if (!targets.length) return [];

  const uuids = targets.map((entry) => entry.document?.uuid ?? entry.uuid).filter(Boolean);
  const item = activity?.item ?? activity?.parent;
  if (isSingleUseMultiHit(item, activity)) {
    return padTargetUuids(uuids, getAbilityAttackCount(token.actor, item, activity));
  }
  return uuids;
}

export function buildHudMidiOptions(token, activity, section, context = {}) {
  const targetUuids = resolveActivityTargetUuids(token, activity, context, section);
  const isReaction = section === "reaction";

  return foundry.utils.mergeObject({
    createWorkflow: true,
    configureDialog: isReaction ? true : settingOn("midiConfigureDialog"),
    checkGMStatus: false,
    targetUuids,
    isReaction,
    ignoreUserTargets: isReaction || targetUuids.length > 0,
    workflowOptions: {
      targetConfirmation: "none"
    }
  }, isReaction ? (context.options ?? {}) : {});
}

function validateHudTargets(token, item, activity, section) {
  if (section === "reaction") return { ok: true };
  if (!requiresCanvasTargets(item, activity)) return { ok: true };

  const count = game.user.targets?.size ?? 0;
  if (count === 0) {
    ui.notifications.warn(ich.warning("needTarget"));
    return { ok: false };
  }

  const range = checkAbilityRange(token, item, activity);
  if (!range.inRange) {
    ui.notifications.warn(range.reason === "noLOS" ? ich.target("noLOS") : ich.target("outOfRange"));
    return { ok: false };
  }
  return { ok: true };
}

async function completeMidiUse(item, activity, midiOptions, event) {
  const midi = getMidiApi();
  const extra = { systemCard: false };
  if (activity && midi?.completeActivityUse) {
    await midi.completeActivityUse(activity, { midiOptions }, {}, extra);
    return;
  }
  if (!activity && midi?.completeItemUse) {
    await midi.completeItemUse(item, { midiOptions }, {}, extra);
    return;
  }
  if (activity) await activity.use({ event, midiOptions }, { event });
  else await item.use({ event, midiOptions }, { event });
}

/**
 * Launch an item activity through Midi when available, with HUD-friendly defaults.
 * Falls back to dnd5e activity.use / item.use.
 */
export async function useActivityFromHud(token, item, activity, section, event, context = {}, options = {}) {
  if (options.validateTargets !== false && activity && !validateHudTargets(token, item, activity, section).ok) {
    return false;
  }

  const midiOptions = buildHudMidiOptions(token, activity, section, context);
  if (options.spellLevel != null) {
    midiOptions.spellLevel = options.spellLevel;
    midiOptions.workflowOptions = foundry.utils.mergeObject(midiOptions.workflowOptions ?? {}, {
      spellLevel: options.spellLevel
    });
  }

  await completeMidiUse(item, activity, midiOptions, event);
  if (options.clearTargets !== false) clearUserTargets();
  return true;
}

export function buildTargetListLabel() {
  const targets = [...(game.user.targets ?? [])];
  if (!targets.length) return "";
  const names = targets.map((t) => t.name).join(", ");
  return ich.target("list", { names });
}
