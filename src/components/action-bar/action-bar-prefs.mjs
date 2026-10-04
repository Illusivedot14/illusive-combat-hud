import { MODULE_ID } from "../../common/constants.mjs";

const FLAG = "actionBarPrefs";

const DEFAULTS = {
  favorites: [],
  collapsedGroups: {},
  expandedGroups: {},
  weaponSets: null
};

function prefs(actor) {
  return foundry.utils.mergeObject(DEFAULTS, actor?.getFlag(MODULE_ID, FLAG) ?? {}, { inplace: false });
}

async function savePrefs(actor, patch) {
  const next = foundry.utils.mergeObject(prefs(actor), patch, { inplace: false });
  await actor.setFlag(MODULE_ID, FLAG, next);
  return next;
}

export function getAbilityKey(ability) {
  return `${ability.itemId}:${ability.activityId}:${ability.isStandard ? "standard" : ability.section}`;
}

export function getFavorites(actor) {
  return new Set(prefs(actor).favorites);
}

export async function toggleFavorite(actor, key) {
  const set = getFavorites(actor);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return savePrefs(actor, { favorites: [...set] });
}

export function getWeaponSetData(actor) {
  return prefs(actor).weaponSets;
}

export async function setWeaponSetData(actor, weaponSets) {
  return savePrefs(actor, { weaponSets });
}
