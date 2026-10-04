import { MODULE_ID } from "./constants.mjs";
import { ich } from "./i18n.mjs";
import { hasAvailableSpellSlot } from "./actor-resources.mjs";
import { canSpendEconomy } from "./midi-qol.mjs";
import { checkAbilityRange } from "./range-utils.mjs";
import { getViewedCombat, getActiveCombatant } from "./combat.mjs";

const ECONOMY_SECTIONS = new Set(["action", "bonus", "reaction"]);

function resolveEconomySection(section, activationType) {
  if (ECONOMY_SECTIONS.has(section)) return section;
  if (ECONOMY_SECTIONS.has(activationType)) return activationType;
  return null;
}

/**
 * Extra Attack / Multiattack swings: Midi marks Action spent on the first Attack,
 * but later weapon/attack uses are still legal on that same action.
 * Spells and non-attack features stay locked once Action is spent.
 */
export function allowsExtraAttackSwing(item, activity, economySection) {
  if (economySection !== "action") return false;
  if (item?.type === "spell") return false;
  if (item?.type === "weapon") return true;
  return activity?.type === "attack";
}

export function getTargetConfig(item, activity) {
  const activityTarget = activity?.target;
  if (activityTarget && (
    activityTarget.template?.type
    || activityTarget.affects?.type
    || activityTarget.type
    || activityTarget.value
    || activityTarget.affects?.count
  )) {
    return activityTarget;
  }

  if (activity?.type === "cast") {
    const spell = activity.cachedSpell
      ?? (activity.spell?.uuid ? foundry.utils.fromUuidSync(activity.spell.uuid, { strict: false }) : null);
    const spellActivities = spell?.system?.activities?.contents ?? spell?.system?.activities ?? [];
    const spellActivity = spellActivities.find?.((entry) => entry.canUse !== false) ?? spellActivities[0];
    if (spellActivity?.target) return spellActivity.target;
  }

  return item?.system?.target ?? null;
}

export function requiresTargeting(item, activity) {
  const target = getTargetConfig(item, activity);
  if (!target) return false;

  const affectsType = target.affects?.type ?? target.type;
  const templateType = target.template?.type;

  if (affectsType === "self") return false;
  if (templateType) return true;
  if (affectsType) return true;

  const legacyValue = target.value ?? target.affects?.count;
  if (legacyValue && !templateType) return true;

  return false;
}

/** True when the player must pick canvas targets before launching (not templates or self). */
export function requiresCanvasTargets(item, activity) {
  const target = getTargetConfig(item, activity);
  if (target?.template?.type) return false;

  const affectsType = target?.affects?.type ?? target?.type;
  if (affectsType === "self") return false;

  // Weapons / attack rolls always need a canvas target for Midi, even when
  // dnd5e leaves the target block empty on the activity.
  if (item?.type === "weapon" || activity?.type === "attack") return true;

  if (!target) return false;
  return requiresTargeting(item, activity);
}

/** Attacks/weapons always open the HUD picker (including Extra Attack swings). */
export function shouldForceTargetPick(item, activity) {
  if (!requiresCanvasTargets(item, activity)) return false;
  return item?.type === "weapon" || activity?.type === "attack";
}

function hasLegendaryActions(actor) {
  const legact = actor?.system?.resources?.legact;
  if (!legact?.max) return true;
  const remaining = Number.isFinite(legact.value)
    ? legact.value
    : Math.max(0, (legact.max ?? 0) - (legact.spent ?? 0));
  return remaining > 0;
}

/** True when this spell item consumes leveled/pact slots (not innate/at-will/ritual). */
function spellUsesSlots(item) {
  if (item?.type !== "spell") return false;
  const level = Number(item.system?.level) || 0;
  if (level <= 0) return false;
  if (typeof item.system?.canScale === "boolean") return item.system.canScale;

  const method = item.system?.method
    ?? item.system?.preparation?.mode
    ?? "spell";
  const model = CONFIG?.DND5E?.spellcasting?.[method];
  if (model && Object.prototype.hasOwnProperty.call(model, "slots")) {
    return Boolean(model.slots);
  }
  return !["innate", "atwill", "ritual", "always"].includes(String(method).toLowerCase());
}

function getSpellSlotKey(item, activity) {
  // Trust dnd5e when it already decided this activity does not spend a slot.
  if (activity && activity.requiresSpellSlot === false) return null;

  if (activity?.requiresSpellSlot) {
    return activity.spell?.slot
      ?? (item?.system?.level > 0 ? `spell${item.system.level}` : null)
      ?? (Number(activity.spell?.level) > 0 ? `spell${activity.spell.level}` : null);
  }

  // Feature/innate cast activities must not invent a slot key from the linked spell level.
  if (activity?.type === "cast") return null;

  if (spellUsesSlots(item)) return `spell${item.system.level}`;
  return null;
}

function actorHasSpellSlotPools(actor) {
  const spells = actor?.system?.spells ?? {};
  if ((Number(spells.pact?.max) || 0) > 0) return true;
  for (let level = 1; level <= 9; level++) {
    if ((Number(spells[`spell${level}`]?.max) || 0) > 0) return true;
  }
  return false;
}

function hasSpellSlot(actor, item, activity) {
  const slotKey = getSpellSlotKey(item, activity);
  if (!slotKey) return true;
  // Monsters/NPCs with spellcasting but no slot pools still cast their spells.
  if (!actorHasSpellSlotPools(actor)) return true;
  return hasAvailableSpellSlot(actor, slotKey);
}

function hasItemUses(item, activity) {
  const uses = activity?.uses?.max ? activity.uses : item?.system?.uses;
  if (!uses?.max) return true;
  const remaining = uses.max - (uses.spent ?? 0);
  if (Number.isFinite(uses.value)) return uses.value > 0;
  return remaining > 0;
}

function hasAmmo(actor, item) {
  if (!item || item.type !== "weapon") return true;
  const ammoType = item.system?.ammunition?.type;
  if (!ammoType) return true;
  if (item.system?.properties?.has?.("amm")) return true;

  const stock = actor.items
    .filter((entry) => entry.type === "consumable" && entry.system?.type?.value === ammoType)
    .reduce((sum, entry) => sum + (entry.system?.quantity ?? 0), 0);
  return stock > 0;
}

function hasConsumption(actor, item, activity) {
  const targets = activity?.consumption?.targets ?? [];
  if (!targets.length) return true;

  for (const target of targets) {
    if (target.scales) continue;
    const cost = Number(target.value?.formula ?? target.value ?? 1) || 1;

    if (target.type === "material") {
      const material = actor.items.get(target.target);
      if (!material || (material.system?.quantity ?? 0) < cost) return false;
    }

    if (target.type === "itemUses") {
      const source = target.target ? actor.items.get(target.target) : item;
      const uses = source?.system?.uses;
      if (uses?.max) {
        const remaining = Number.isFinite(uses.value)
          ? uses.value
          : uses.max - (uses.spent ?? 0);
        if (remaining < cost) return false;
      }
    }
  }

  return true;
}

function isOwnersTurn(actor) {
  const combat = getViewedCombat() ?? game.combat;
  if (!combat?.started) return true;
  const active = getActiveCombatant(combat);
  if (!active || !actor?.id) return false;
  return active.actorId === actor.id || active.actor?.id === actor.id;
}

function isReactionValid(activity, context) {
  if (!context?.reactionKeys?.size) return true;
  const key = `${activity.item?.id ?? activity.parent?.id}:${activity.id}`;
  return context.reactionKeys.has(key);
}

export function evaluateAbilityState({
  item,
  activity,
  actor,
  section,
  inCombat,
  token,
  context = {}
}) {
  const reasons = [];
  let disabled = false;

  if (activity?.canUse === false) {
    disabled = true;
    reasons.push(ich.reason("cannotUse"));
  }

  if (item?.disabled) {
    disabled = true;
    reasons.push(ich.reason("unavailable"));
  }

  const economySection = resolveEconomySection(section, activity?.activation?.type ?? item?.system?.activation?.type);

  if (
    inCombat
    && economySection
    && !canSpendEconomy(actor, economySection)
    && !allowsExtraAttackSwing(item, activity, economySection)
  ) {
    disabled = true;
    reasons.push(ich.warning("economySpent", { type: economySection }));
  }

  if (inCombat && economySection && economySection !== "reaction" && !isOwnersTurn(actor)) {
    disabled = true;
    reasons.push(ich.reason("notYourTurn"));
  }

  if (!hasSpellSlot(actor, item, activity)) {
    disabled = true;
    reasons.push(ich.reason("noSpellSlots"));
  }

  if (!hasItemUses(item, activity)) {
    disabled = true;
    reasons.push(ich.reason("noUses"));
  }

  if (!hasAmmo(actor, item)) {
    disabled = true;
    reasons.push(ich.reason("noAmmo"));
  }

  if (!hasConsumption(actor, item, activity)) {
    disabled = true;
    reasons.push(ich.reason("missingMaterials"));
  }

  if (section === "reaction" && activity && !isReactionValid(activity, context)) {
    disabled = true;
    reasons.push(ich.reaction("notTriggered"));
  }

  if (section === "legendary" && !hasLegendaryActions(actor)) {
    disabled = true;
    reasons.push(ich.reason("noLegendary"));
  }

  const needsTarget = requiresCanvasTargets(item, activity);
  const showTargetBadge = requiresTargeting(item, activity) && !getTargetConfig(item, activity)?.template?.type;
  const targetCount = game.user.targets?.size ?? 0;
  // Missing targets no longer disables the button — click opens the HUD target picker.

  let outOfRange = false;
  if (token && needsTarget && targetCount > 0) {
    const range = checkAbilityRange(token, item, activity);
    if (!range.inRange) {
      disabled = true;
      outOfRange = true;
      reasons.push(range.reason === "noLOS" ? ich.target("noLOS") : ich.target("outOfRange"));
    }
  }

  return {
    disabled,
    needsTarget: showTargetBadge,
    hasTargets: targetCount > 0,
    targetCount,
    outOfRange,
    disabledReason: reasons.join(" · ") || null
  };
}

export function evaluateStandardActionState(action, actor, inCombat) {
  const reasons = [];
  let disabled = false;

  if (!inCombat) {
    disabled = true;
    reasons.push(ich.reason("notInCombat"));
  }

  if (inCombat && !canSpendEconomy(actor, "action")) {
    disabled = true;
    reasons.push(ich.warning("economySpent", { type: "action" }));
  }

  if (inCombat && !isOwnersTurn(actor)) {
    disabled = true;
    reasons.push(ich.reason("notYourTurn"));
  }

  return {
    disabled,
    disabledReason: reasons.join(" · ") || null
  };
}
