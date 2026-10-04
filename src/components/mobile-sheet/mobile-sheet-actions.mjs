import { MODULE_ID } from "../../common/constants.mjs";
import { ich } from "../../common/i18n.mjs";
import {
  swipeStyleEvaluateAndToMessage,
  broadcastDiceSoNiceToOthers
} from "./mobile-sheet-dsn.mjs";
import { pickRollModeOverlay, pickAttackOrDamageOverlay, openHpDialogOverlay, openItemDetailOverlay, openAccentColorOverlay, openDiceSoNiceSettings, openMobileSettingsMenu } from "./mobile-sheet-dialogs.mjs";
import { canUseItem } from "./mobile-sheet-data.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";

function dropSheetForDialog() {
  document.getElementById("ich-mobile-sheet-root")?.classList.add("ich-mobile-sheet-behind-dialog");
}

function raiseSheetAfterDialog() {
  document.getElementById("ich-mobile-sheet-root")?.classList.remove("ich-mobile-sheet-behind-dialog");
}

function signed(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+ ${v}` : `- ${Math.abs(v)}`;
}

async function pickRollMode(title) {
  ensureMobileSheetStyles();
  dropSheetForDialog();
  try {
    return await pickRollModeOverlay(title);
  } finally {
    raiseSheetAfterDialog();
  }
}

async function pickAttackOrDamage(title) {
  ensureMobileSheetStyles();
  dropSheetForDialog();
  try {
    return await pickAttackOrDamageOverlay(title);
  } finally {
    raiseSheetAfterDialog();
  }
}

function d20Formula(modTotal, mode) {
  const bonus = signed(modTotal);
  if (mode === "advantage") return `2d20kh1 ${bonus}`;
  if (mode === "disadvantage") return `2d20kl1 ${bonus}`;
  return `1d20 ${bonus}`;
}

function d20Dice(mode) {
  if (mode === "advantage") return "2d20kh1";
  if (mode === "disadvantage") return "2d20kl1";
  return "1d20";
}

function abilityMod(actor, abilityId, type /* check|save */) {
  const ab = actor.system?.abilities?.[abilityId];
  if (!ab) return 0;
  if (type === "save") {
    const save = ab.save?.value ?? ab.save;
    if (typeof save === "number") return save;
    return Number(ab.mod) || 0;
  }
  return Number(ab.mod) || 0;
}

function skillMod(actor, skillId) {
  const sk = actor.system?.skills?.[skillId];
  return Number(sk?.total ?? sk?.mod) || 0;
}

async function rollMobileD20(actor, kind, id) {
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }
  if (!id) return false;

  let mod = 0;
  let flavor = "";
  if (kind === "check") {
    mod = abilityMod(actor, id, "check");
    flavor = `${CONFIG.DND5E?.abilities?.[id]?.label ?? id} Check`;
  } else if (kind === "save") {
    mod = abilityMod(actor, id, "save");
    flavor = `${CONFIG.DND5E?.abilities?.[id]?.label ?? id} Saving Throw`;
  } else if (kind === "skill") {
    mod = skillMod(actor, id);
    flavor = CONFIG.DND5E?.skills?.[id]?.label ?? id;
  } else {
    return false;
  }

  const mode = await pickRollMode(flavor);
  if (!mode) return false;

  await swipeStyleEvaluateAndToMessage(d20Formula(mod, mode), {
    data: actor.getRollData?.() ?? {},
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor
  });
  return true;
}

function listActivities(item) {
  const acts = item?.system?.activities;
  if (!acts) return [];
  if (Array.isArray(acts)) return acts.filter(Boolean);
  if (acts.contents) return [...acts.contents].filter(Boolean);
  if (typeof acts[Symbol.iterator] === "function") {
    try { return [...acts].filter(Boolean); } catch { /* fall through */ }
  }
  if (typeof acts.values === "function") {
    try { return [...acts.values()].filter(Boolean); } catch { /* fall through */ }
  }
  return [];
}

function getAttackActivity(item) {
  const acts = listActivities(item);
  return acts.find((a) => a.type === "attack" && typeof a.use === "function")
    ?? acts.find((a) => a.type === "attack" && typeof a.rollAttack === "function")
    ?? acts.find((a) => typeof a.rollAttack === "function")
    ?? null;
}

function getPrimaryUseActivity(item) {
  const acts = listActivities(item);
  return acts.find((a) => typeof a.use === "function")
    ?? acts.find((a) => typeof a.rollAttack === "function")
    ?? acts[0]
    ?? null;
}

function getDamageActivity(item) {
  const acts = listActivities(item);
  return acts.find((a) => a.type === "damage" || a.type === "heal")
    ?? getAttackActivity(item)
    ?? acts.find((a) => a.damage?.parts?.length || a.damage)
    ?? null;
}

function parseModifierNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const m = String(value).trim().match(/^[+-]?\d+/);
  return m ? Number(m[0]) : null;
}

function partToFormula(part) {
  if (!part) return null;
  if (typeof part === "string") return part.trim() || null;
  if (Array.isArray(part)) {
    // dnd5e legacy [formula, type]
    const f = part[0];
    return typeof f === "string" && f.trim() ? f.trim() : null;
  }
  if (typeof part === "object") {
    const f = part.formula ?? part.custom?.formula ?? part.number;
    if (typeof f === "string" && f.trim()) return f.trim();
    if (typeof part.denomination === "number" && part.number != null) {
      return `${part.number}d${part.denomination}${part.bonus ? ` + ${part.bonus}` : ""}`;
    }
  }
  return null;
}

function collectDamageFormula(item, activity) {
  // Modern activity API
  if (activity && typeof activity.getDamageData === "function") {
    try {
      const data = activity.getDamageData({});
      const parts = (data?.parts ?? data?.rolls ?? []).map(partToFormula).filter(Boolean);
      if (parts.length) return { formula: parts.join(" + "), data: data?.data ?? {} };
    } catch (err) {
      console.warn(`${MODULE_ID} | getDamageData failed`, err);
    }
  }

  const actParts = Array.isArray(activity?.damage?.parts)
    ? activity.damage.parts
    : Array.isArray(activity?.damage?.value)
      ? activity.damage.value
      : null;
  if (Array.isArray(actParts)) {
    const parts = actParts.map(partToFormula).filter(Boolean);
    if (parts.length) return { formula: parts.join(" + "), data: {} };
  }

  // Legacy item.system.damage
  const sysParts = item.system?.damage?.parts;
  if (Array.isArray(sysParts)) {
    const parts = sysParts.map(partToFormula).filter(Boolean);
    if (parts.length) return { formula: parts.join(" + "), data: {} };
  }

  const label = item.labels?.damage ?? item.labels?.derivedDamage?.[0]?.formula;
  if (typeof label === "string" && label.trim()) return { formula: label.trim(), data: {} };

  return null;
}

/**
 * Weapons: choose Attack or Damage.
 * Attack → Adv/Normal/Disadv then d20.
 * Damage → weapon damage formula to chat (+ desktop DSN).
 */
async function rollMobileWeapon(actor, item) {
  const choice = await pickAttackOrDamage(item.name);
  if (!choice) return false;
  if (choice === "damage") return rollMobileDamage(actor, item);
  return rollMobileAttack(actor, item);
}

async function rollMobileDamage(actor, item) {
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }
  const activity = getDamageActivity(item);
  const found = collectDamageFormula(item, activity);
  if (!found?.formula) {
    ui.notifications.warn("No damage formula on that item.");
    return false;
  }

  const data = {
    ...(actor.getRollData?.() ?? {}),
    ...(found.data ?? {})
  };

  await swipeStyleEvaluateAndToMessage(found.formula, {
    data,
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${item.name} — Damage`
  });
  return true;
}

/**
 * Attack roll: Adv / Normal / Disadv, then roll to chat (+ desktop DSN).
 */
async function rollMobileAttack(actor, item) {
  const activity = getAttackActivity(item);
  const title = `${item.name} Attack`;
  const mode = await pickRollMode(title);
  if (!mode) return false;

  let formula = null;
  let data = actor.getRollData?.() ?? {};

  if (activity && typeof activity.getAttackData === "function") {
    try {
      const attackData = activity.getAttackData({});
      const parts = (attackData.parts ?? []).filter(Boolean);
      data = { ...data, ...(attackData.data ?? {}) };
      formula = [d20Dice(mode), ...parts].join(" + ");
    } catch (err) {
      console.warn(`${MODULE_ID} | getAttackData failed, falling back`, err);
    }
  }

  if (!formula) {
    const mod = parseModifierNumber(
      activity?.labels?.modifier
      ?? item.labels?.modifier
      ?? item.labels?.toHit
      ?? activity?.attack?.bonus
    ) ?? 0;
    formula = d20Formula(mod, mode);
  }

  await swipeStyleEvaluateAndToMessage(formula, {
    data,
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${item.name} — Attack`
  });
  return true;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Tap item: open detail overlay with description + bottom actions. */
async function inspectAndActItem(actor, itemId, event) {
  const item = actor.items.get(itemId);
  if (!item) {
    ui.notifications.warn("Item not found.");
    return false;
  }

  const showAttack = Boolean(item.type === "weapon" || getAttackActivity(item));
  const showDamage = Boolean(getDamageActivity(item) || (item.type === "weapon" && getAttackActivity(item)));
  const mode = item.system?.preparation?.mode;
  const always = ["always", "innate", "atwill", "pact"].includes(mode);
  const canPrepare = item.type === "spell"
    && !always
    && (mode === "prepared" || (mode == null && Number(item.system?.level ?? 0) > 0));
  const prepared = always || Boolean(item.system?.preparation?.prepared);
  // Prefer localized CONFIG labels; fall back to capitalized type key.
  let typeBit = "";
  try {
    if (item.type === "feat") {
      const value = item.system?.type?.value;
      const label = value ? CONFIG.DND5E?.featureTypes?.[value]?.label : null;
      typeBit = label ? game.i18n.localize(label) : "Feat";
    } else if (CONFIG.Item?.typeLabels?.[item.type]) {
      typeBit = game.i18n.localize(CONFIG.Item.typeLabels[item.type]);
    } else if (item.type) {
      typeBit = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    }
  } catch {
    typeBit = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "";
  }

  dropSheetForDialog();
  let choice = null;
  try {
    choice = await openItemDetailOverlay(item, {
      subtitle: typeBit,
      canUse: canUseItem(item),
      canEquip: "equipped" in (item.system ?? {}),
      equipped: Boolean(item.system?.equipped),
      showAttack,
      showDamage: showDamage || showAttack,
      canPrepare,
      prepared
    });
  } finally {
    if (!choice) raiseSheetAfterDialog();
  }
  if (!choice) return false;

  try {
    if (choice === "equip") {
      await item.update({ "system.equipped": !item.system.equipped });
      return true;
    }
    if (choice === "prepare") {
      await item.update({ "system.preparation.prepared": !prepared });
      return true;
    }
    if (choice === "attack") return rollMobileAttack(actor, item);
    if (choice === "damage") return rollMobileDamage(actor, item);
    if (choice === "use") {
      const used = await useItemLikeSheet(item, event);
      if (!used) {
        ui.notifications.warn("That item cannot be used.");
        return false;
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error(`${MODULE_ID} | mobile inspect-item failed`, itemId, err);
    ui.notifications.error("Could not use that item.");
    return false;
  } finally {
    raiseSheetAfterDialog();
  }
}

/** @deprecated Prefer inspectAndActItem — kept for any leftover use-item hooks. */
async function confirmAndUseItem(actor, itemId, event) {
  return inspectAndActItem(actor, itemId, event);
}

/**
 * dnd5e 3+/4+/5: prefer Activity#use, then Item#use, then displayCard as a last resort.
 */
async function useItemLikeSheet(item, event) {
  const activity = getPrimaryUseActivity(item);

  if (activity && typeof activity.use === "function") {
    await activity.use({ event });
    return true;
  }

  if (typeof item.use === "function") {
    // dnd5e signatures vary across versions — try modern first, then legacy.
    try {
      await item.use({ event }, { configure: false });
      return true;
    } catch {
      await item.use({}, { event, configure: false });
      return true;
    }
  }

  if (activity && typeof activity.rollAttack === "function") {
    await activity.rollAttack({ event });
    return true;
  }

  if (typeof item.displayCard === "function") {
    await item.displayCard();
    return true;
  }

  if (typeof item.toChat === "function") {
    await item.toChat();
    return true;
  }

  return false;
}

/** Same as Amethyst: rollInitiativeDialog, else rollInitiative({ createCombatants: true }). */
async function rollInitiativeLikeAmethyst(actor) {
  dropSheetForDialog();
  try {
    if (typeof actor.rollInitiativeDialog === "function") {
      await actor.rollInitiativeDialog();
      return true;
    }
    if (typeof actor.rollInitiative === "function") {
      const result = await actor.rollInitiative({ createCombatants: true, rerollInitiative: true });
      await broadcastDiceSoNiceToOthers(result, {
        actor,
        speaker: ChatMessage.getSpeaker({ actor })
      });
      return true;
    }
    // Last resort: plain init roll into chat (DSN via allowInteractive:false path).
    const total = Number(actor.system?.attributes?.init?.total) || 0;
    await swipeStyleEvaluateAndToMessage(d20Formula(total, "normal"), {
      data: actor.getRollData?.() ?? {},
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: "Initiative"
    });
    return true;
  } catch (err) {
    console.error(`${MODULE_ID} | initiative roll failed`, err);
    ui.notifications.error("Initiative roll failed.");
    return false;
  } finally {
    raiseSheetAfterDialog();
  }
}

/**
 * Use dnd5e's rollDeathSave so successes/failures/crit revive actually apply.
 * Adv/Disadv via our overlay (system configure dialog skipped).
 */
async function rollDeathSaveLikeSystem(actor) {
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  const mode = await pickRollMode("Death Save");
  if (!mode) return false;

  const advantage = mode === "advantage";
  const disadvantage = mode === "disadvantage";
  const ADV = CONFIG.Dice?.D20Roll?.ADV_MODE;
  const advantageMode = advantage
    ? (ADV?.ADVANTAGE ?? 1)
    : disadvantage
      ? (ADV?.DISADVANTAGE ?? -1)
      : (ADV?.NORMAL ?? 0);

  try {
    if (typeof actor.rollDeathSave === "function") {
      const rolls = await actor.rollDeathSave(
        {
          advantage,
          disadvantage,
          rolls: [{ options: { advantage, disadvantage, advantageMode } }]
        },
        { configure: false },
        {
          data: {
            speaker: ChatMessage.getSpeaker({ actor }),
            flags: { [MODULE_ID]: { mobileSheetDsn: true } }
          }
        }
      );
      if (!rolls) return false;
      await broadcastDiceSoNiceToOthers(rolls, {
        actor,
        speaker: ChatMessage.getSpeaker({ actor })
      });
      return true;
    }

    // Fallback if system API missing: roll + apply DC 10 manually
    const { roll } = await swipeStyleEvaluateAndToMessage(d20Formula(0, mode), {
      data: actor.getRollData?.() ?? {},
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: "Death Saving Throw"
    });
    await applyDeathSaveResult(actor, roll);
    return true;
  } catch (err) {
    console.error(`${MODULE_ID} | death save failed`, err);
    ui.notifications.error("Death save failed.");
    return false;
  }
}

async function applyDeathSaveResult(actor, roll) {
  if (!actor || !roll) return;
  const death = actor.system?.attributes?.death ?? {};
  const total = Number(roll.total) || 0;
  const isCrit = total === 20 || roll.isCritical === true;
  const isFumble = total === 1 || roll.isFumble === true;
  let updates = {};

  if (total >= 10) {
    if (isCrit) {
      updates = {
        "system.attributes.death.success": 0,
        "system.attributes.death.failure": 0,
        "system.attributes.hp.value": 1
      };
    } else {
      const successes = Math.min(3, (Number(death.success) || 0) + 1);
      updates = successes >= 3
        ? { "system.attributes.death.success": 0, "system.attributes.death.failure": 0 }
        : { "system.attributes.death.success": successes };
    }
  } else {
    const failures = Math.min(3, (Number(death.failure) || 0) + (isFumble ? 2 : 1));
    updates = { "system.attributes.death.failure": failures };
  }

  if (Object.keys(updates).length) await actor.update(updates);
}

async function openHpDialogFixed(actor) {
  ensureMobileSheetStyles();
  dropSheetForDialog();
  try {
    return await openHpDialogOverlay(actor);
  } finally {
    raiseSheetAfterDialog();
  }
}

export async function handleMobileSheetAction(actor, action, dataset, event) {
  if (!actor) return false;

  if (!actor.isOwner && !["close", "open-dndbeyond", "open-full-sheet", "open-dice-settings", "open-ui-color", "open-settings-menu"].includes(action)) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  switch (action) {
    case "roll-check":
      return rollMobileD20(actor, "check", dataset.ability);
    case "roll-save":
      return rollMobileD20(actor, "save", dataset.ability);
    case "roll-skill":
      return rollMobileD20(actor, "skill", dataset.skill);
    case "roll-initiative":
      return rollInitiativeLikeAmethyst(actor);
    case "roll-death-save":
      return rollDeathSaveLikeSystem(actor);
    case "set-death-pip": {
      const type = dataset.type === "failure" ? "failure" : "success";
      const index = Number(dataset.index);
      if (!Number.isFinite(index) || index < 0 || index > 2) return false;
      const current = Number(actor.system?.attributes?.death?.[type]) || 0;
      // Tap pip N → set count to N+1; tap the filled top pip again → clear back to N
      const next = current === index + 1 ? index : index + 1;
      await actor.update({ [`system.attributes.death.${type}`]: Math.max(0, Math.min(3, next)) });
      return true;
    }
    case "toggle-inspiration": {
      await actor.update({
        "system.attributes.inspiration": !actor.system?.attributes?.inspiration
      });
      return true;
    }
    case "open-hp":
      return openHpDialogFixed(actor);
    case "inspect-item":
    case "use-item":
      return inspectAndActItem(actor, dataset.itemId, event);
    case "toggle-equipped": {
      const item = actor.items.get(dataset.itemId);
      if (!item || !("equipped" in (item.system ?? {}))) return false;
      await item.update({ "system.equipped": !item.system.equipped });
      return true;
    }
    case "toggle-prepared": {
      const item = actor.items.get(dataset.itemId);
      if (!item || item.type !== "spell") return false;
      const prepared = Boolean(item.system?.preparation?.prepared);
      await item.update({ "system.preparation.prepared": !prepared });
      return true;
    }
    case "toggle-effect": {
      const effect = actor.effects.get(dataset.effectId);
      if (!effect) return false;
      await effect.update({ disabled: !effect.disabled });
      return true;
    }
    case "delete-effect": {
      const effect = actor.effects.get(dataset.effectId);
      if (!effect) return false;
      await effect.delete();
      return true;
    }
    case "short-rest":
      if (typeof actor.shortRest === "function") {
        dropSheetForDialog();
        try {
          await actor.shortRest();
        } finally {
          raiseSheetAfterDialog();
        }
        return true;
      }
      return false;
    case "long-rest":
      if (typeof actor.longRest === "function") {
        dropSheetForDialog();
        try {
          await actor.longRest();
        } finally {
          raiseSheetAfterDialog();
        }
        return true;
      }
      return false;
    case "open-dndbeyond":
    case "open-full-sheet": // legacy action id
      return openDndBeyondCharacter(actor);
    case "open-settings-menu": {
      dropSheetForDialog();
      const choice = await openMobileSettingsMenu();
      if (choice === "ui-color") {
        try {
          await openAccentColorOverlay();
          return true;
        } finally {
          raiseSheetAfterDialog();
        }
      }
      if (choice === "dice") {
        try {
          await openDiceSoNiceSettings();
          return true;
        } finally {
          raiseSheetAfterDialog();
        }
      }
      raiseSheetAfterDialog();
      return false;
    }
    case "open-dice-settings": {
      dropSheetForDialog();
      try {
        await openDiceSoNiceSettings();
        return true;
      } finally {
        raiseSheetAfterDialog();
      }
    }
    case "open-ui-color": {
      dropSheetForDialog();
      try {
        await openAccentColorOverlay();
        return true;
      } finally {
        raiseSheetAfterDialog();
      }
    }
    default:
      return false;
  }
}

/**
 * Open the actor's D&D Beyond character page (ddb-importer flags).
 * Does not open Foundry's full sheet — that sits under the mobile overlay and is unused here.
 */
function openDndBeyondCharacter(actor) {
  const ddb = actor.getFlag?.("ddbimporter", "dndbeyond")
    ?? actor.flags?.ddbimporter?.dndbeyond
    ?? {};
  const id = ddb.characterId
    ?? actor.getFlag?.("ddbimporter", "id")
    ?? actor.flags?.ddbimporter?.id;
  const url = String(ddb.url || (id ? `https://www.dndbeyond.com/characters/${id}` : "")).trim();

  if (!url) {
    ui.notifications?.warn?.(
      "No D&D Beyond link on this actor. Import/link it with ddb-importer first."
    );
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return false;
}

export const MOBILE_SHEET_NO_REFRESH = new Set([
  "roll-check",
  "roll-save",
  "roll-skill",
  "roll-initiative"
]);
