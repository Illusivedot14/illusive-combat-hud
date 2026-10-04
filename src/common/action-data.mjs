import { evaluateAbilityState, evaluateStandardActionState } from "./ability-utils.mjs";
import { ich } from "./i18n.mjs";
import { buildStandardActions } from "./standard-actions.mjs";
import { useReactionFromHud, getReactionContext } from "./reaction-context.mjs";
import { isSuitcaseEntry, isFreeActivation, getInteractionActivationTypes } from "./item-interactions.mjs";
import { useActivityFromHud } from "./midi-use.mjs";
import { buildAbilityRowDisplay } from "./ability-display.mjs";

const ACTIVATION_GROUPS = {
  action: new Set(["action"]),
  bonus: new Set(["bonus"]),
  reaction: new Set(["reaction"]),
  legendary: new Set(["legendary", "mythic"])
};

const FALLBACK_ICONS = {
  action: "icons/svg/combat.svg",
  bonus: "icons/svg/dice-target.svg",
  reaction: "icons/svg/shield.svg",
  legendary: "icons/svg/aura.svg",
  mythic: "icons/svg/aura.svg",
  special: "icons/svg/explosion.svg",
  free: "icons/svg/explosion.svg",
  utilize: "icons/svg/potion.svg"
};

function normalizeActivationType(type) {
  if (type == null || type === "") return null;
  const key = String(type).toLowerCase();
  if (key === "none" || key === "free") return "free";
  return key;
}

function getLinkedSpell(activity) {
  if (!activity || activity.type !== "cast") return null;
  return activity.cachedSpell
    ?? (activity.spell?.uuid ? foundry.utils.fromUuidSync(activity.spell.uuid, { strict: false }) : null);
}

function getActivationType(item, activity) {
  const fromActivity = normalizeActivationType(activity?.activation?.type);
  if (fromActivity) return fromActivity;

  const fromItem = normalizeActivationType(item?.system?.activation?.type);
  if (fromItem) return fromItem;

  if (activity?.type === "cast") {
    const spell = getLinkedSpell(activity);
    const fromSpell = normalizeActivationType(spell?.system?.activation?.type);
    if (fromSpell) return fromSpell;
    return "action";
  }

  if (item?.type === "spell") return "action";

  return null;
}

function itemIsUsable(item) {
  if (!item || item.disabled) return false;
  return true;
}

function listActivities(item) {
  const activities = item.system?.activities;
  if (!activities) return [];
  if (typeof activities[Symbol.iterator] === "function") return [...activities];
  if (activities.contents) return [...activities.contents];
  return [];
}

const PRIMARY_LAUNCH_TYPES = new Set(["cast", "attack", "save", "heal", "summon"]);
const SECONDARY_LAUNCH_TYPES = new Set(["damage", "utility", "check", "forward", "activate", "utilize"]);

function isCachedSpellItem(item) {
  return Boolean(item?.getFlag?.("dnd5e", "cachedFor") ?? item?.flags?.dnd5e?.cachedFor);
}

function pickPrimarySpellActivity(activities) {
  return activities.find((activity) => activity.type === "save" || activity.type === "attack")
    ?? activities.find((activity) => activity.canUse !== false)
    ?? activities[0]
    ?? null;
}

function shouldIncludeActivity(item, activity, activities) {
  if (activity?.isRider) return false;
  if (activity?.type === "cast") return true;

  if (item.type === "spell") {
    return activity === pickPrimarySpellActivity(activities);
  }

  const primaries = activities.filter((entry) => !entry.isRider && PRIMARY_LAUNCH_TYPES.has(entry.type));
  if (primaries.length) return primaries.includes(activity);

  return SECONDARY_LAUNCH_TYPES.has(activity?.type);
}

function collectActivations(item, allowedTypes) {
  const entries = [];
  const activities = listActivities(item);
  if (!itemIsUsable(item)) return entries;

  for (const activity of activities) {
    if (!shouldIncludeActivity(item, activity, activities)) continue;
    const type = getActivationType(item, activity);
    if (!type || !allowedTypes.has(type)) continue;
    entries.push({ item, activity, activationType: type });
  }

  if (entries.length) return entries;

  if (item.type === "spell" && activities.length) {
    const primary = pickPrimarySpellActivity(activities);
    const type = getActivationType(item, primary);
    if (type && allowedTypes.has(type)) {
      entries.push({ item, activity: primary, activationType: type });
    }
    return entries;
  }

  const type = getActivationType(item, null);
  if (type && allowedTypes.has(type)) {
    entries.push({ item, activity: null, activationType: type });
  }

  return entries;
}

function isDefaultActivityImg(activity) {
  if (!activity?.img) return true;
  if (/\/systems\/dnd5e\/icons\/svg\/activity\//i.test(activity.img)) return true;
  const metaImg = activity.metadata?.img;
  if (metaImg && activity.img === metaImg) return true;
  // Prepared default: empty stored img means metadata art was filled in.
  if (activity._source && !String(activity._source.img ?? "").trim()) return true;
  return false;
}

function resolveAbilityImg(item, activity, actor, activationType) {
  const linkedSpell = getLinkedSpell(activity);
  // Prefer sheet art (item / linked spell) over generic activity-type SVGs.
  const img = linkedSpell?.img
    || (!isDefaultActivityImg(activity) ? activity.img : null)
    || item?.img
    || null;
  if (!img || img === actor?.img) {
    return FALLBACK_ICONS[activationType] ?? FALLBACK_ICONS[activity?.type] ?? "icons/svg/mystery-man.svg";
  }
  return img;
}

const GENERIC_ACTIVITY_NAME_RE = /^(midi\s+)?(attack|cast|use|consume|heal|save|check|damage|utility|summon|forward)$/i;

function localizedActivityTitles(activity) {
  const keys = [activity?.metadata?.title, activity?.metadata?.dnd5eTitle].filter(Boolean);
  return keys.map((key) => {
    try {
      return game.i18n?.localize?.(key) ?? key;
    } catch {
      return key;
    }
  });
}

/** True when the activity name is a dnd5e/Midi type title, not a custom sheet label. */
export function isGenericActivityName(activity, item = null) {
  const name = String(activity?.name ?? "").trim();
  if (!name) return true;
  if (item?.name && name === item.name) return true;
  if (GENERIC_ACTIVITY_NAME_RE.test(name)) return true;
  if (localizedActivityTitles(activity).some((title) => title && title === name)) return true;
  // Prepared default: empty stored name means metadata title was filled in.
  if (activity?._source && !String(activity._source.name ?? "").trim()) return true;
  return false;
}

/**
 * Compact chip label for crowded ability grids.
 * Keeps the full name for tooltips / aria; shortens common weapon/activity noise.
 */
export function shortAbilityLabel(fullName, { max = 20 } = {}) {
  let name = String(fullName ?? "").trim();
  if (!name) return "";

  const colon = name.indexOf(": ");
  if (colon > 0) {
    const item = name.slice(0, colon).trim();
    const activity = name.slice(colon + 2).trim();
    if (activity && !GENERIC_ACTIVITY_NAME_RE.test(activity) && activity.length <= Math.max(item.length, 12)) {
      name = activity;
    } else {
      name = item;
    }
  }

  name = name.replace(/,\s*(light|heavy|hand|finesse|thrown|versatile|two-handed|reach)$/i, "");
  name = name.replace(/\s+strike$/i, "");

  if (name.length > max) {
    return `${name.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
  }
  return name;
}

export function buildAbilityLabel(item, activity) {
  if (item.type === "spell") return item.name;

  if (activity?.type === "cast") {
    const spell = getLinkedSpell(activity);
    if (spell?.name) return spell.name;
    if (activity.name && !isGenericActivityName(activity, item)) return activity.name;
    return item.name;
  }

  if (activity?.name && !isGenericActivityName(activity, item)) {
    return activity.name === item.name ? item.name : `${item.name}: ${activity.name}`;
  }

  return item.name;
}

function buildAbilityButton({ item, activity, activationType }, actor, section, context) {
  const name = buildAbilityLabel(item, activity);
  const state = evaluateAbilityState({
    item,
    activity,
    actor,
    section,
    inCombat: context.inCombat,
    token: context.token,
    context
  });

  return {
    itemId: item.id,
    activityId: activity?.id ?? "",
    activationType,
    section: activationType === "mythic" ? "legendary" : section,
    name,
    shortName: shortAbilityLabel(name),
    img: resolveAbilityImg(item, activity, actor, activationType),
    title: state.disabledReason ? `${name} — ${state.disabledReason}` : name,
    isStandard: false,
    ...state,
    ...buildAbilityRowDisplay(item, activity, { isStandard: false })
  };
}

export function getAbilitiesForTypes(actor, typeKeys, sectionId, context = {}) {
  if (!actor) return [];

  const allowedTypes = new Set();
  for (const key of typeKeys) {
    for (const type of ACTIVATION_GROUPS[key] ?? []) allowedTypes.add(type);
  }

  const abilities = [];
  const seen = new Set();

  for (const item of actor.items) {
    if (!itemIsUsable(item)) continue;
    if (isCachedSpellItem(item)) continue;

    for (const entry of collectActivations(item, allowedTypes)) {
      if (isSuitcaseEntry(item, entry.activity, entry.activationType)) continue;

      const key = `${entry.item.id}:${entry.activity?.id ?? "item"}:${entry.activationType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      abilities.push(buildAbilityButton(entry, actor, sectionId, context));
    }
  }

  return abilities.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

export function getItemInteractionAbilities(actor, context = {}) {
  if (!actor) return [];

  const allowedTypes = getInteractionActivationTypes();
  const abilities = [];
  const seen = new Set();

  for (const item of actor.items) {
    if (!itemIsUsable(item)) continue;
    if (isCachedSpellItem(item)) continue;

    for (const entry of collectActivations(item, allowedTypes)) {
      if (!isSuitcaseEntry(item, entry.activity, entry.activationType)) continue;

      const key = `${entry.item.id}:${entry.activity?.id ?? "item"}:${entry.activationType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ability = buildAbilityButton(entry, actor, "standard", context);
      ability.isFree = isFreeActivation(entry.activationType);
      abilities.push(ability);
    }
  }

  return abilities.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

function enrichStandardActions(actor, context) {
  return buildStandardActions(actor, context).map((action) => {
    const state = evaluateStandardActionState(action, actor, context.inCombat);
    return {
      ...action,
      ...state,
      shortName: shortAbilityLabel(action.name),
      title: state.disabledReason ? `${action.name} — ${state.disabledReason}` : action.name,
      ...buildAbilityRowDisplay(null, null, action)
    };
  });
}

/** Items, free / special activations — suitcase gem (section id `standard` for UI keys). */
function buildItemsSection(actor, context) {
  const abilities = getItemInteractionAbilities(actor, context);
  if (!abilities.length) return null;

  return {
    id: "standard",
    label: ich.ui("tabItemInteraction"),
    abilities
  };
}

function buildActionSection(actor, context) {
  const abilities = [
    ...enrichStandardActions(actor, context),
    ...getAbilitiesForTypes(actor, ["action"], "action", context)
  ];
  if (!abilities.length) return null;

  return {
    id: "action",
    label: ich.section("action"),
    abilities
  };
}

export function buildActionBarSections(actor, context = {}) {
  const sections = [
    buildItemsSection(actor, context),
    buildActionSection(actor, context),
    { id: "bonus", label: ich.section("bonus"), abilities: getAbilitiesForTypes(actor, ["bonus"], "bonus", context) },
    { id: "reaction", label: ich.section("reaction"), abilities: getAbilitiesForTypes(actor, ["reaction"], "reaction", context) },
    { id: "legendary", label: ich.section("legendary"), abilities: getAbilitiesForTypes(actor, ["legendary"], "legendary", context) }
  ].filter((section) => section && section.abilities.length > 0);

  return sections;
}

/** Always keeps item/action/bonus/reaction sections so gems stay selectable (empty state). */
export function buildCombatToolbarSections(actor, context = {}) {
  const populated = buildActionBarSections(actor, context);
  const byId = Object.fromEntries(populated.map((section) => [section.id, section]));
  const hasLegendary = Boolean(actor?.system?.resources?.legact?.max);

  const ids = [
    "standard",
    "action",
    "bonus",
    "reaction",
    ...(hasLegendary ? ["legendary"] : [])
  ];

  return ids.map((id) => {
    const existing = byId[id];
    if (existing) return existing;

    if (id === "action") {
      return {
        id,
        label: ich.section("action"),
        abilities: enrichStandardActions(actor, context)
      };
    }

    if (id === "standard") {
      return {
        id,
        label: ich.ui("tabItemInteraction"),
        abilities: []
      };
    }

    return {
      id,
      label: ich.section(id),
      abilities: []
    };
  });
}

export function buildAbilityList(actor, context = {}) {
  return buildActionBarSections(actor, context).flatMap((section) =>
    section.abilities.map((ability) => ({ ...ability, section: section.id }))
  );
}

export async function useAbility(token, itemId, activityId, event, section, options = {}) {
  const actor = token?.actor;
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  const reactionCtx = getReactionContext();
  if (section === "reaction" && reactionCtx?.actorId === actor.id) {
    return useReactionFromHud(token, itemId, activityId);
  }

  const item = actor.items.get(itemId);
  if (!item) return false;

  const activity = activityId ? item.system.activities?.get(activityId) : null;
  return useActivityFromHud(token, item, activity, section, event, reactionCtx ?? {}, options);
}
