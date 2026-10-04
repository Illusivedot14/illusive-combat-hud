import { MODULE_ID } from "../constants.mjs";

/** Built-in English defaults when lang file entries are missing. */
export const HUD_FALLBACKS = {
  "currentToken.yourTurn": "Your Turn",
  "turnTracker.minimize": "Minimize turn tracker",
  "turnTracker.expand": "Expand turn tracker",
  "turnTracker.pan": "Pan to Token",
  "partyMenu.select": "Select Token",
  "partyMenu.sheet": "Open Character Sheet",
  "partyMenu.ping": "Ping Token",
  "partyMenu.target": "Target Token",
  "partyMenu.setTurn": "Set as Current Turn",
  "partyMenu.markDefeated": "Mark Defeated",
  "partyMenu.unmarkDefeated": "Unmark Defeated",
  "partyRail.minimize": "Minimize party rail",
  "partyRail.expand": "Expand party rail",
  "sections.standard": "Standard",
  "sections.action": "Action",
  "sections.bonus": "Bonus",
  "sections.reaction": "Reaction",
  "sections.legendary": "Legendary",
  "actions.dash": "Dash",
  "actions.disengage": "Disengage",
  "actions.dodge": "Dodge",
  "actions.help": "Help",
  "actions.hide": "Hide",
  "actions.ready": "Ready",
  "actions.readyPrompt": "Describe the readied action:",
  "movement.remaining": "Movement remaining",
  "movement.mode": "Movement mode",
  "movement.dashing": "Dashing",
  "target.none": "Select target(s) on the canvas (T)",
  "target.one": "1 target selected",
  "target.many": "{count} targets selected",
  "target.outOfRange": "Out of range",
  "target.noLOS": "No line of sight",
  "target.list": "Targets: {names}",
  "reaction.prompt": "{name} can use a reaction.",
  "reaction.banner": "Reaction available — {trigger}",
  "reaction.pass": "Pass",
  "reaction.notTriggered": "Not available for this trigger",
  "turn.end": "End Turn",
  "turn.notYourTurn": "It is not this token's turn.",
  "warnings.noOwner": "You do not own this token.",
  "warnings.economySpent": "{type} already spent.",
  "warnings.needTarget": "Select a target first.",
  "warnings.needAlly": "Select an ally to help.",
  "empty.noParty": "No party",
  "empty.noAbilities": "No {section} abilities.",
  "empty.noAbilitiesOoc": "No {section} abilities (out of combat).",
  "empty.outOfCombat": "No usable abilities found. Start combat or enable Abilities Outside Combat in Action Bar settings.",
  "empty.notInCombat": "This token is not in the active combat.",
  "reasons.cannotUse": "Cannot use",
  "reasons.unavailable": "Unavailable",
  "reasons.notYourTurn": "Not your turn",
  "reasons.noSpellSlots": "No spell slots",
  "reasons.noUses": "No uses left",
  "reasons.noAmmo": "No ammo",
  "reasons.missingMaterials": "Missing materials",
  "reasons.selectTarget": "Select a target",
  "reasons.notInCombat": "Not in combat",
  "reasons.noLegendary": "No legendary actions left",
  "ui.concentratingOn": "Concentrating on {name}",
  "ui.spellSlotsLevel": "Level {level} spell slots",
  "ui.actionEconomy": "Action economy",
  "ui.armorClass": "Armor Class",
  "ui.walkSpeed": "Walk speed",
  "ui.openSheet": "Open Character Sheet",
  "ui.showLocation": "Show location on map",
  "ui.deathSaves": "Death saves",
  "ui.stabilized": "Stabilized",
  "ui.unconscious": "Unconscious",
  "ui.dead": "Dead",
  "ui.dropConcentration": "Drop concentration",
  "actionBar.resources": "Resources",
  "actionBar.pactMagic": "Pact Magic",
  "actionBar.pactLevel": "Slot level {level}",
  "actionBar.legendaryResistance": "Legendary Resistance",
  "actionBar.lairActions": "Lair Actions",
  "ui.ready": "Ready",
  "ui.cancel": "Cancel"
};

/** @type {Map<string, string>} */
let STRING_TABLE = new Map();
let i18nReady = false;

const MODULE_KEY_PREFIX = `${MODULE_ID}.`;
const MODULE_KEY_RE = /illusive-combat-hud\./;

export function fullKey(key) {
  return key.startsWith(MODULE_KEY_PREFIX) ? key : `${MODULE_ID}.${key}`;
}

export function shortKey(key) {
  return key.startsWith(MODULE_KEY_PREFIX) ? key.slice(MODULE_KEY_PREFIX.length) : key;
}

function formatData(str, data = {}) {
  if (!str || !data || !Object.keys(data).length) return str;
  return Object.entries(data).reduce(
    (text, [entryKey, value]) => text.replaceAll(`{${entryKey}}`, String(value ?? "")),
    str
  );
}

export function looksLikeModuleKey(value) {
  if (!value || typeof value !== "string") return true;
  return value.includes(MODULE_KEY_PREFIX) || MODULE_KEY_RE.test(value);
}

function humanizeKey(short) {
  const parts = short.split(".");
  const suffixes = new Set([
    "name", "hint", "label", "title", "bar", "text", "left", "center",
    "compact", "normal", "large", "bg3", "minimal", "fixed", "initiative", "alphabetical"
  ]);
  let leaf = parts[parts.length - 1] ?? short;
  if (suffixes.has(leaf) && parts.length > 1) leaf = parts[parts.length - 2];

  return leaf
    .replace(/^show/, "Show ")
    .replace(/^enable/, "Enable ")
    .replace(/^hide/, "Hide ")
    .replace(/^prefer/, "Prefer ")
    .replace(/^color/, "Color ")
    .replace(/^party/, "Party ")
    .replace(/^token/, "Token ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function storeString(key, value) {
  if (!key || typeof value !== "string" || !value) return;
  STRING_TABLE.set(key, value);
  const short = shortKey(key);
  if (!STRING_TABLE.has(short)) STRING_TABLE.set(short, value);
}

function ingestLangObject(obj, prefix = MODULE_ID) {
  if (!obj || typeof obj !== "object") return;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      storeString(key.includes(".") ? key : `${prefix}.${key}`, value);
      continue;
    }
    if (value && typeof value === "object") ingestLangObject(value, `${prefix}.${key}`);
  }
}

function mergeFoundryCatalogs() {
  const catalogs = [
    game.i18n?.translations?.[game.i18n.lang],
    game.i18n?.translations?.en,
    game.i18n?._fallback
  ].filter(Boolean);

  for (const catalog of catalogs) {
    for (const [key, value] of Object.entries(catalog)) {
      if (key.startsWith(MODULE_KEY_PREFIX) && typeof value === "string") storeString(key, value);
    }
    const mod = catalog[MODULE_ID];
    if (mod && typeof mod === "object") ingestLangObject(mod, MODULE_ID);
  }
}

async function loadLangFile(lang) {
  return foundry.utils.fetchJsonWithTimeout(`modules/${MODULE_ID}/lang/${lang}.json`);
}

export async function initI18n() {
  STRING_TABLE = new Map();

  for (const [key, value] of Object.entries(HUD_FALLBACKS)) {
    storeString(`${MODULE_ID}.${key}`, value);
  }

  const lang = game.i18n?.lang ?? "en";
  const files = lang === "en" ? ["en"] : [lang, "en"];

  for (const file of files) {
    try {
      ingestLangObject(await loadLangFile(file));
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not load lang/${file}.json`, error);
    }
  }

  mergeFoundryCatalogs();
  i18nReady = true;
}

function lookupRaw(key) {
  const id = fullKey(key);
  const short = shortKey(key);
  return STRING_TABLE.get(id) ?? STRING_TABLE.get(short) ?? null;
}

/** Resolve any module string key. Never returns a raw module i18n key. */
export function ichLocalize(key, data = {}) {
  if (!key) return "";

  const short = shortKey(fullKey(key));
  let text = lookupRaw(key);

  if (!text && game.i18n) {
    const id = fullKey(key);
    const fromCore = data && Object.keys(data).length
      ? game.i18n.format(id, data)
      : game.i18n.localize(id);
    if (fromCore && !looksLikeModuleKey(fromCore)) text = fromCore;
  }

  if (!text) text = humanizeKey(short);

  text = formatData(text, data);
  if (looksLikeModuleKey(text)) text = humanizeKey(short);

  if (!i18nReady) console.warn(`${MODULE_ID} | ichLocalize before initI18n: ${short}`);

  return text;
}

export function ichResolve(value, data = {}) {
  if (!value || typeof value !== "string") return value ?? "";
  if (!looksLikeModuleKey(value)) return formatData(value, data);
  return ichLocalize(value, data);
}

/** Foundry system/core keys only — not module strings. */
export function ichCore(key, data = {}) {
  if (!game.i18n) return key;
  const text = data && Object.keys(data).length ? game.i18n.format(key, data) : game.i18n.localize(key);
  return text && text !== key ? text : key;
}
