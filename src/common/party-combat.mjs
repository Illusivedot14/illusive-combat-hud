import { getViewedCombat } from "./combat.mjs";
import { MODULE_ID } from "./constants.mjs";
import { ich } from "./i18n.mjs";

const STABLE_FLAG = "stable";

function getHP(actor) {
  const hp = actor?.system?.attributes?.hp;
  return {
    value: hp?.value ?? 0,
    max: hp?.max ?? 0
  };
}

function combatantForToken(token) {
  const combat = getViewedCombat();
  return combat?.combatants?.find((entry) => entry.tokenId === token?.id) ?? null;
}

function deathCounters(actor) {
  const death = actor?.system?.attributes?.death ?? {};
  return {
    success: Number(death.success ?? 0),
    failure: Number(death.failure ?? 0)
  };
}

function hasStableStatus(actor) {
  const statuses = actor?.statuses;
  if (!statuses) return false;
  if (typeof statuses.has === "function") {
    return statuses.has("stable") || statuses.has("stabilized");
  }
  if (Array.isArray(statuses)) {
    return statuses.includes("stable") || statuses.includes("stabilized");
  }
  return Boolean(statuses.stable || statuses.stabilized);
}

function hasStableFlag(actor) {
  return Boolean(actor?.getFlag?.(MODULE_ID, STABLE_FLAG) ?? actor?.flags?.[MODULE_ID]?.[STABLE_FLAG]);
}

/** Centered glyph for unconscious / dead / stabilized portraits. */
export function buildVitalityIcon(member) {
  if (member.isDefeated) {
    return { kind: "dead", icon: "fa-skull", label: ich.ui("dead") };
  }
  if (member.isStabilized) {
    return { kind: "stabilized", icon: "fa-bed", label: ich.ui("stabilized") };
  }
  if (member.isDeathSaving) {
    return { kind: "unconscious", icon: "fa-dizzy", label: ich.ui("unconscious") };
  }
  return null;
}

export function getDeathSaves(actor) {
  const hp = getHP(actor);
  if (hp.value > 0 || hp.max <= 0) return null;

  return deathCounters(actor);
}

/** True when the actor is dead (defeated mark or 3 death save failures) at 0 HP. */
export function isCombatantDefeated(actor, combatant = null) {
  if (!actor) return false;

  const hp = getHP(actor);
  if (hp.max <= 0 || hp.value > 0) return false;

  if (combatant && (combatant.isDefeated ?? combatant.defeated)) return true;

  const { failure } = deathCounters(actor);
  return failure >= 3;
}

/**
 * True when unconscious but stable at 0 HP.
 * dnd5e resets death.success/failure to 0 on stabilize, so we also honor a module flag
 * and the system `stable`/`stabilized` status when present.
 */
export function isCombatantStabilized(actor, combatant = null) {
  if (!actor) return false;
  if (isCombatantDefeated(actor, combatant)) return false;

  const hp = getHP(actor);
  if (hp.max <= 0 || hp.value > 0) return false;

  const { success, failure } = deathCounters(actor);
  if (success >= 3) return true;

  // Death saves have restarted after being stable.
  if (success > 0 || failure > 0) return false;

  return hasStableStatus(actor) || hasStableFlag(actor);
}

/** True when at 0 HP and still rolling death saves. */
export function isCombatantDeathSaving(actor, combatant = null) {
  if (!actor) return false;
  if (isCombatantDefeated(actor, combatant) || isCombatantStabilized(actor, combatant)) return false;

  const hp = getHP(actor);
  if (hp.max <= 0 || hp.value > 0) return false;

  return true;
}

/** Mark actor stable at 0 HP (dnd5e clears counters on stabilize; we keep a flag). */
export async function markActorStable(actor) {
  if (!actor) return false;
  const updates = {
    "system.attributes.death.success": 0,
    "system.attributes.death.failure": 0,
    [`flags.${MODULE_ID}.${STABLE_FLAG}`]: true
  };
  await actor.update(updates);
  return true;
}

/** Clear stable flag when healed or death saves restart. */
export async function clearActorStable(actor) {
  if (!actor || !hasStableFlag(actor)) return false;
  if (typeof actor.unsetFlag === "function") {
    await actor.unsetFlag(MODULE_ID, STABLE_FLAG);
  } else {
    await actor.update({ [`flags.${MODULE_ID}.-=${STABLE_FLAG}`]: null });
  }
  return true;
}

async function setCombatantDefeated(token, actor, defeated) {
  const combat = getViewedCombat() ?? game.combat;
  const combatant = combat?.combatants?.find?.(
    (entry) => entry.tokenId === token?.id || entry.actorId === actor?.id
  );
  if (!combatant) return;
  const isDefeated = Boolean(combatant.defeated || combatant.isDefeated);
  if (isDefeated === defeated) return;
  try {
    await combatant.update({ defeated });
  } catch {
    /* ignore */
  }
}

/** Apply dead overlay + combatant defeated flag. */
export async function setActorDefeatedState(actor, token, defeated) {
  if (!actor) return false;
  const statusId = CONFIG.specialStatusEffects?.DEFEATED ?? "dead";
  try {
    await actor.toggleStatusEffect?.(statusId, { active: defeated, overlay: true });
  } catch {
    /* ignore */
  }
  await setCombatantDefeated(token, actor, defeated);
  return true;
}

/**
 * After HUD damage: at 0 HP each damaging hit adds one death failure;
 * leftover damage past 0 that is over twice max HP is instant death.
 * @returns {"instant"|"failure"|"defeated"|null}
 */
export async function applyDamageDeathRules(actor, token, amount, snapshot) {
  if (!actor || !(amount > 0)) return null;

  const max = Number(snapshot?.max) || Number(actor.system?.attributes?.hp?.max) || 0;
  const valueBefore = Math.max(0, Number(snapshot?.value) || 0);
  const tempBefore = Math.max(0, Number(snapshot?.temp) || 0);

  // Damage remaining after temp HP, then how far that goes past 0 HP.
  const afterTemp = Math.max(0, amount - tempBefore);
  const beyondZero = Math.max(0, afterTemp - valueBefore);

  if (max > 0 && beyondZero > 2 * max) {
    const updates = {
      "system.attributes.hp.value": 0,
      "system.attributes.death.success": 0,
      "system.attributes.death.failure": 3
    };
    if (actor.system?.attributes?.death) await actor.update(updates);
    else await actor.update({ "system.attributes.hp.value": 0 });
    await clearActorStable(actor);
    await setActorDefeatedState(actor, token, true);
    return "instant";
  }

  // Already at 0: each hit that isn't fully absorbed by temp adds one failure.
  if (valueBefore > 0 || afterTemp <= 0) return null;

  await clearActorStable(actor);

  if (!actor.system?.attributes?.death) {
    await setActorDefeatedState(actor, token, true);
    return "defeated";
  }

  const failure = Math.min(3, (Number(actor.system.attributes.death.failure) || 0) + 1);
  await actor.update({ "system.attributes.death.failure": failure });
  if (failure >= 3) {
    await setActorDefeatedState(actor, token, true);
    return "defeated";
  }
  return "failure";
}

/** Keep the stable flag in sync with HP / restarted death saves. */
export async function syncActorStableFlag(actor) {
  if (!actor || !hasStableFlag(actor)) return false;

  const hp = getHP(actor);
  if (hp.value > 0) return clearActorStable(actor);

  const { success, failure } = deathCounters(actor);
  if (success > 0 || failure > 0) return clearActorStable(actor);

  return false;
}

/** True when the token is unconscious but stable (3 death save successes at 0 HP). */
export function isPartyStabilized(token) {
  return isCombatantStabilized(token?.actor, combatantForToken(token));
}

/** True when the token is dead (defeated or 3 death save failures). */
export function isPartyDefeated(token) {
  return isCombatantDefeated(token?.actor, combatantForToken(token));
}

/** True when the token is at 0 HP and still rolling death saves. */
export function isPartyDeathSaving(token) {
  return isCombatantDeathSaving(token?.actor, combatantForToken(token));
}
