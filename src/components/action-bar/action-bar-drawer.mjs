import { ich } from "../../common/i18n.mjs";

const SKILL_ORDER = [
  "acr", "ani", "arc", "ath", "dec", "his", "ins", "itm", "inv", "med", "nat", "prc", "prf", "per", "rel", "slt", "ste", "sur"
];

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

let drawerOpen = false;

export function isDrawerOpen() {
  return drawerOpen;
}

export function setDrawerOpen(open) {
  drawerOpen = open;
}

export function toggleDrawer() {
  drawerOpen = !drawerOpen;
  return drawerOpen;
}

function skillLabel(id) {
  return CONFIG.DND5E?.skills?.[id]?.label ?? id.toUpperCase();
}

function abilityLabel(id) {
  return CONFIG.DND5E?.abilities?.[id]?.label ?? id.toUpperCase();
}

function toolLabel(id, fallback = null) {
  const lookup = CONFIG.DND5E?.enrichmentLookup?.tools?.[id]?.label
    ?? CONFIG.DND5E?.toolProficiencies?.[id]
    ?? CONFIG.DND5E?.vehicleTypes?.[id]
    ?? CONFIG.DND5E?.tools?.[id];
  if (typeof lookup === "string" && !lookup.startsWith("Compendium.")) {
    const loc = game.i18n?.localize?.(lookup);
    if (loc && loc !== lookup) return loc;
    if (!lookup.includes(".")) return lookup;
  }
  return fallback || id;
}

function collectToolEntries(actor) {
  const seen = new Set();
  const tools = [];

  for (const [id, data] of Object.entries(actor.system?.tools ?? {})) {
    if (!id || data == null) continue;
    seen.add(id);
    const total = data.total ?? data.mod;
    tools.push({
      id,
      type: "tool",
      label: toolLabel(id),
      mod: total,
      modLabel: formatMod(total)
    });
  }

  for (const item of actor.items ?? []) {
    if (item?.type !== "tool") continue;
    const key = item.system?.type?.baseItem || item.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const total = item.system?.total ?? actor.system?.tools?.[key]?.total;
    tools.push({
      id: key,
      type: "tool",
      label: item.name || toolLabel(key),
      mod: total,
      modLabel: formatMod(total)
    });
  }

  tools.sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base" }));
  return tools;
}

function formatMod(value) {
  if (!Number.isFinite(Number(value))) return null;
  const n = Math.floor(Number(value));
  return n >= 0 ? `+${n}` : `${n}`;
}

export function buildDrawerEntries(actor) {
  if (!actor) return { checks: [], skills: [], saves: [], tools: [] };

  const checks = ABILITY_ORDER.filter((id) => actor.system?.abilities?.[id]).map((id) => ({
    id,
    type: "check",
    label: ich.actionBar("checkLabel", { ability: abilityLabel(id) }),
    mod: actor.system.abilities[id]?.mod,
    modLabel: formatMod(actor.system.abilities[id]?.mod)
  }));

  const skills = SKILL_ORDER.filter((id) => actor.system?.skills?.[id]).map((id) => ({
    id,
    type: "skill",
    label: skillLabel(id),
    mod: actor.system.skills[id]?.total ?? actor.system.skills[id]?.mod,
    modLabel: formatMod(actor.system.skills[id]?.total ?? actor.system.skills[id]?.mod)
  }));

  const saves = ABILITY_ORDER.filter((id) => actor.system?.abilities?.[id]).map((id) => ({
    id,
    type: "save",
    label: ich.actionBar("saveLabel", { ability: abilityLabel(id) }),
    mod: actor.system.abilities[id]?.save?.value
      ?? actor.system.abilities[id]?.save
      ?? actor.system.abilities[id]?.mod,
    modLabel: formatMod(
      actor.system.abilities[id]?.save?.value
      ?? actor.system.abilities[id]?.save
      ?? actor.system.abilities[id]?.mod
    )
  }));

  const tools = collectToolEntries(actor);

  return { checks, skills, saves, tools };
}

/** Show Advantage / Normal / Disadvantage unless the sheet skip-dialog keys are held. */
function buildD20Dialog(event) {
  const areKeysPressed = game.system?.utils?.areKeysPressed;
  if (typeof areKeysPressed === "function" && event) {
    const skip = ["skipDialogNormal", "skipDialogAdvantage", "skipDialogDisadvantage"]
      .some((action) => areKeysPressed(event, action));
    if (skip) return {};
  }
  return { configure: true };
}

export async function rollDrawerEntry(actor, entry, event = null) {
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  const dialog = buildD20Dialog(event);
  const message = { create: true };

  if (entry.type === "check") {
    if (typeof actor.rollAbilityCheck === "function") {
      await actor.rollAbilityCheck({ ability: entry.id, event }, dialog, message);
    } else {
      await actor.rollAbilityTest?.({ ability: entry.id, event }, dialog, message);
    }
    return true;
  }

  if (entry.type === "skill") {
    await actor.rollSkill({ skill: entry.id, event }, dialog, message);
    return true;
  }

  if (entry.type === "save") {
    if (typeof actor.rollSavingThrow === "function") {
      await actor.rollSavingThrow({ ability: entry.id, event }, dialog, message);
    } else {
      await actor.rollAbilitySave?.({ ability: entry.id, event }, dialog, message);
    }
    return true;
  }

  if (entry.type === "tool") {
    if (typeof actor.rollToolCheck === "function") {
      await actor.rollToolCheck({ tool: entry.id, event }, dialog, message);
      return true;
    }
    const item = actor.items?.get?.(entry.id);
    if (!item) return false;
    if (typeof item.rollToolCheck === "function") {
      await item.rollToolCheck({ tool: entry.id, event }, dialog, message);
    } else {
      await item.roll?.({ event }, dialog, message);
    }
    return true;
  }

  return false;
}
