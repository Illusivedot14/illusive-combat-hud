import { settingOn } from "./hud-settings.mjs";
import { getMidiApi } from "./midi-qol.mjs";
import { ich } from "./i18n.mjs";
import { getTargetConfig, requiresCanvasTargets } from "./ability-utils.mjs";
import { checkAbilityRange } from "./range-utils.mjs";
import { clearUserTargets } from "./token-actions.mjs";

/** Effective target type, including cast activities that inherit spell targeting. */
export function getEffectiveTargetType(activity) {
  let effectiveTargetType = activity?.target?.affects?.type ?? activity?.target?.type;
  if (activity?.type !== "cast") return effectiveTargetType;

  const override = activity._source?.target?.override ?? activity.target?.override;
  if (override) return effectiveTargetType;

  const spell = activity.cachedSpell
    ?? (activity.spell?.uuid ? foundry.utils.fromUuidSync(activity.spell.uuid) : null);
  if (!spell) return effectiveTargetType;

  const spellActivities = spell.system?.activities?.contents ?? spell.system?.activities ?? [];
  const spellActivity = spellActivities.find?.((entry) => entry.canUse) ?? spellActivities[0];
  return spellActivity?.target?.affects?.type ?? spellActivity?.target?.type ?? effectiveTargetType;
}

function tokenUuid(token) {
  return token?.document?.uuid ?? token?.uuid ?? null;
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

  const triggerUuid = context.triggerTokenUuid
    ?? context.options?.workflow?.tokenUuid
    ?? context.options?.triggerTokenUuid
    ?? context.options?.tokenUuid;

  if (context.reactionKeys && triggerUuid) return [triggerUuid];

  if (section === "reaction" && triggerUuid) return [triggerUuid];

  const targets = [...(game.user.targets ?? [])];
  if (!targets.length) return [];

  return targets.map((entry) => entry.document?.uuid ?? entry.uuid).filter(Boolean);
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

/**
 * Launch an item activity through Midi when available, with HUD-friendly defaults.
 * Falls back to dnd5e activity.use / item.use.
 */
export async function useActivityFromHud(token, item, activity, section, event, context = {}, options = {}) {
  if (activity && !validateHudTargets(token, item, activity, section).ok) {
    return false;
  }

  const midi = getMidiApi();
  let midiOptions = buildHudMidiOptions(token, activity, section, context);
  if (options.spellLevel != null) {
    midiOptions.spellLevel = options.spellLevel;
    midiOptions.workflowOptions = foundry.utils.mergeObject(midiOptions.workflowOptions ?? {}, {
      spellLevel: options.spellLevel
    });
  }

  if (activity && midi?.completeActivityUse) {
    await midi.completeActivityUse(
      activity,
      { midiOptions },
      {},
      { systemCard: false }
    );
  } else if (!activity && midi?.completeItemUse) {
    await midi.completeItemUse(item, { midiOptions }, {}, { systemCard: false });
  } else if (activity) {
    await activity.use({ event, midiOptions }, { event });
  } else {
    await item.use({ event, midiOptions }, { event });
  }

  // Midi already received targetUuids; clear canvas targeting for the next action.
  if (options.clearTargets !== false) clearUserTargets();
  return true;
}
