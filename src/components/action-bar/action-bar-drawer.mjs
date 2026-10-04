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

  const tools = actor.items
    ?.filter?.((item) => item.type === "tool")
    ?.map((item) => ({
      id: item.id,
      type: "tool",
      label: item.name,
      mod: item.system?.proficient ? "+" : "",
      modLabel: item.system?.proficient ? "+" : null
    })) ?? [];

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
    const item = actor.items.get(entry.id);
    if (!item) return false;
    const toolKey = item.system?.type?.baseItem ?? item.id;
    if (typeof item.rollToolCheck === "function") {
      await item.rollToolCheck({ tool: toolKey, event }, dialog, message);
    } else {
      await item.roll?.({ event }, dialog, message);
    }
    return true;
  }

  return false;
}
