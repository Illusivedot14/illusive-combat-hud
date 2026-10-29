import { MODULE_ID } from "./constants.mjs";
import { settingOn } from "./hud-settings.mjs";
import { ich, ichCore } from "./i18n.mjs";
import { getEconomyAvailability } from "./midi-qol.mjs";
import { getViewedCombat } from "./combat.mjs";

const ECONOMY_TYPES = ["action", "bonus", "reaction"];

export function findCombatantForToken(token) {
  const combat = getViewedCombat();
  if (!combat || !token) return null;
  return combat.combatants.find((c) => c.tokenId === token.id) ?? null;
}

export function getCombatantForToken(token) {
  if (!getViewedCombat()?.started || !token) return null;
  return findCombatantForToken(token);
}

export function buildEconomyPips(token) {
  const combat = getViewedCombat();
  const inCombat = Boolean(combat?.started && getCombatantForToken(token));
  if (!inCombat || !token?.actor) return [];

  const availability = getEconomyAvailability(token.actor);
  const labels = {
    action: ich.section("action"),
    bonus: ich.section("bonus"),
    reaction: ich.section("reaction")
  };

  return ECONOMY_TYPES.map((type) => ({
    id: type,
    label: labels[type],
    available: availability[type] ?? true
  }));
}

export function buildLegendaryPips(actor) {
  const legact = actor?.system?.resources?.legact;
  if (!legact?.max) return null;

  return {
    label: ich.section("legendary"),
    remaining: legact.value ?? Math.max(0, (legact.max ?? 0) - (legact.spent ?? 0)),
    max: legact.max
  };
}

/** Toggle legendary actions between remaining and fully spent (0). */
export async function toggleLegendarySpent(actor) {
  const legact = actor?.system?.resources?.legact;
  if (!legact?.max) return false;

  const remaining = Number.isFinite(legact.value)
    ? legact.value
    : Math.max(0, (legact.max ?? 0) - (legact.spent ?? 0));
  const next = remaining > 0 ? 0 : legact.max;
  await actor.update({ "system.resources.legact.value": next });
  return true;
}

/** Player-facing movement label (dnd5e labels walk as "Speed" internally). */
export function movementTypeLabel(key, config) {
  if (key === "walk") {
    const walk = game.i18n?.localize("DND5E.MOVEMENT.Type.Walk");
    if (walk && walk !== "DND5E.MOVEMENT.Type.Walk") return walk;
    return "Walk";
  }
  return ichCore(config?.label ?? `DND5E.MOVEMENT.Type.${key}`);
}

/** Font Awesome icon class for the active movement mode (no `fas` prefix). */
export function movementModeIcon(mode) {
  switch (mode) {
    case "fly": return "fa-person-fairy";
    case "swim": return "fa-person-swimming";
    case "climb": return "fa-person-through-window";
    case "burrow": return "fa-person-digging";
    case "crawl": return "fa-person-praying";
    case "jump": return "fa-person-running-fast";
    case "blink": return "fa-person-from-portal";
    case "walk": return "fa-person-walking";
    default: return "fa-person-walking";
  }
}

const FALLBACK_MOVEMENT_ACTIONS = ["walk", "fly", "swim", "burrow", "crawl", "climb", "jump", "blink"];

function toFaIcon(icon, fallbackId) {
  if (typeof icon === "string") {
    const name = icon.split(/\s+/).find((part) => (
      part.startsWith("fa-") && !["fa-solid", "fa-regular", "fa-brands", "fa-fw"].includes(part)
    ));
    if (name) return name;
  }
  return movementModeIcon(fallbackId);
}

function canSelectMovementAction(token, action, config, current) {
  if (action === current) return true;
  const canSelect = config?.canSelect;
  if (typeof canSelect === "function") return Boolean(canSelect(token.document));
  if (canSelect === undefined) return true;
  return Boolean(canSelect);
}

/** How the token moves — Foundry's list, not the speeds on the sheet. */
export function listTokenMovementActions(token) {
  const configured = CONFIG.Token?.movement?.actions;
  const current = token?.document?._source?.movementAction ?? token?.document?.movementAction ?? null;
  if (configured && Object.keys(configured).length) {
    return Object.entries(configured)
      .filter(([id, config]) => canSelectMovementAction(token, id, config, current))
      .sort((a, b) => (a[1]?.order ?? 0) - (b[1]?.order ?? 0))
      .map(([id, config]) => ({
        id,
        label: game.i18n?.localize?.(config.label) ?? config.label ?? id,
        icon: toFaIcon(config.icon, id)
      }));
  }
  return FALLBACK_MOVEMENT_ACTIONS.map((id) => ({
    id,
    label: movementTypeLabel(id, CONFIG.DND5E?.movementTypes?.[id]),
    icon: movementModeIcon(id)
  }));
}

export function getTokenMovementDisplay(token) {
  const action = String(
    token?.document?.movementAction
    || CONFIG.Token?.movement?.defaultAction
    || "walk"
  );
  const config = CONFIG.Token?.movement?.actions?.[action];
  return {
    mode: action,
    modeLabel: config?.label
      ? (game.i18n?.localize?.(config.label) ?? config.label)
      : movementTypeLabel(action, CONFIG.DND5E?.movementTypes?.[action]),
    modeIcon: toFaIcon(config?.icon, action)
  };
}

/** Effective movement speed after derived data (armor, encumbrance, conditions). */
export function getMovementModeSpeed(movement, key) {
  if (!movement) return 0;
  if (key === "walk") return Math.max(0, Number(movement.walk ?? movement.speed ?? 0));
  return Math.max(0, Number(movement[key] ?? 0));
}

function getWalkBaseSpeed(actor) {
  const sourceWalk = actor?._source?.system?.attributes?.movement?.walk;
  if (Number.isFinite(sourceWalk) && sourceWalk > 0) return Number(sourceWalk);

  const speciesWalk = actor?.system?.attributes?.movement?.fromSpecies?.walk;
  if (Number.isFinite(speciesWalk) && speciesWalk > 0) return Number(speciesWalk);

  return null;
}

export function getMovementModes(actor) {
  const movement = actor?.system?.attributes?.movement;
  if (!movement) return [];

  const modes = [];
  const walkBase = getWalkBaseSpeed(actor);

  for (const [key, config] of Object.entries(CONFIG.DND5E?.movementTypes ?? {})) {
    if (config.hidden) continue;
    const speed = getMovementModeSpeed(movement, key);
    if (speed > 0 || key === "walk") {
      const entry = {
        id: key,
        label: movementTypeLabel(key, config),
        speed
      };
      if (key === "walk" && walkBase && walkBase > speed) entry.baseSpeed = walkBase;
      modes.push(entry);
    }
  }
  return modes;
}

function getMovementPoolMax(movement) {
  if (!movement) return 0;
  if (movement.max > 0) return movement.max;

  let peak = 0;
  for (const key of Object.keys(CONFIG.DND5E?.movementTypes ?? {})) {
    peak = Math.max(peak, getMovementModeSpeed(movement, key));
  }

  if (!peak) {
    for (const key of ["walk", "fly", "swim", "climb", "burrow"]) {
      peak = Math.max(peak, getMovementModeSpeed(movement, key));
    }
  }

  return peak;
}

/**
 * Shared movement budget is the highest available speed (gestalt / fly 90 + walk 30 → 90).
 * Each mode is also capped by its own speed. Remaining for a mode is
 * min(modeSpeed − modeUsed, poolRemaining).
 */
export function buildMovementData(token) {
  if (!getViewedCombat()?.started || !token?.actor) return null;

  const movement = token.actor.system?.attributes?.movement;
  if (!movement) return null;

  const scene = canvas?.scene
    ?? token.document?.parent
    ?? game.scenes?.active
    ?? game.scenes?.current
    ?? null;
  const gridDistance = Number(scene?.grid?.distance ?? scene?.dimensions?.distance) || 5;
  const pose = getTokenMovementDisplay(token);
  const mode = pose.mode;
  const poolMax = getMovementPoolMax(movement);
  if (!poolMax) return null;

  const isDashing = Boolean(token.actor.getFlag?.(MODULE_ID, "dashing"));
  const maxFeet = Math.max(0, isDashing ? poolMax * 2 : poolMax);
  const history = token.document.movementHistory ?? [];
  const usedFeet = getMovementUsedFeet(token, history, gridDistance);
  const remainingFeet = Math.max(0, maxFeet - usedFeet);
  const percent = maxFeet > 0 ? Math.clamp((remainingFeet / maxFeet) * 100, 0, 100) : 100;
  const usedByMode = getMovementUsedByMode(token, history, gridDistance, usedFeet, mode);
  const modes = enrichMovementModes(token.actor, mode, usedByMode, remainingFeet, isDashing);

  return {
    usedFeet,
    maxFeet,
    remainingFeet,
    poolMax,
    percent,
    mode,
    modeLabel: pose.modeLabel,
    modeIcon: pose.modeIcon,
    isDashing,
    isGestalt: poolMax > getMovementModeSpeed(movement, mode),
    modes: shouldShowMovementModes(modes) ? modes : [],
    canUndo: canUndoTokenMovement(token)
  };
}

/** Walk/fly speed display when not in active combat (muted movement readout). */
export function buildIdleMovementData(token) {
  if (!token?.actor) return null;

  const movement = token.actor.system?.attributes?.movement;
  if (!movement) return null;

  const pose = getTokenMovementDisplay(token);
  const mode = pose.mode;
  const poolMax = getMovementPoolMax(movement);
  if (!poolMax) return null;

  const modes = enrichMovementModes(token.actor, mode, {}, poolMax, false);

  return {
    usedFeet: 0,
    maxFeet: poolMax,
    remainingFeet: poolMax,
    poolMax,
    percent: 100,
    mode,
    modeLabel: pose.modeLabel,
    modeIcon: pose.modeIcon,
    isDashing: false,
    isGestalt: poolMax > getMovementModeSpeed(movement, mode),
    modes: shouldShowMovementModes(modes) ? modes : [],
    canUndo: canUndoTokenMovement(token)
  };
}

function shouldShowMovementModes(modes) {
  // Total pool is on the ring readout; only list modes when there's a choice.
  return modes.length > 1;
}

function enrichMovementModes(actor, activeMode, usedByMode, poolRemaining, isDashing) {
  const factor = isDashing ? 2 : 1;
  return getMovementModes(actor)
    .filter((entry) => entry.speed > 0)
    .map((entry) => {
      const max = entry.speed * factor;
      const used = Math.max(0, Number(usedByMode[entry.id] ?? 0));
      const remaining = Math.max(0, Math.min(max - used, poolRemaining));
      return {
        ...entry,
        max,
        used,
        remaining,
        icon: movementModeIcon(entry.id),
        isActive: entry.id === activeMode,
        isEmpty: remaining <= 0,
        percent: max > 0 ? Math.clamp((remaining / max) * 100, 0, 100) : 0
      };
    });
}

function normalizeMovementMode(value) {
  const key = String(value ?? "walk").toLowerCase();
  if (CONFIG.DND5E?.movementTypes?.[key]) return key;
  if (["walk", "fly", "swim", "climb", "burrow"].includes(key)) return key;
  return "walk";
}

function segmentMovementCost(token, from, to, gridDistance) {
  const direct = Number(to?.cost);
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct);

  if (typeof token.document?.measureMovementPath === "function") {
    try {
      const measured = token.document.measureMovementPath([from, to]);
      if (Number.isFinite(measured?.cost)) return Math.round(measured.cost);
      if (Number.isFinite(measured?.spaces) && measured.spaces > 0) {
        return Math.round(measured.spaces * gridDistance);
      }
      if (Number.isFinite(measured?.distance)) return Math.round(measured.distance);
    } catch {
      /* fall through */
    }
  }
  return 0;
}

/** Feet spent per movement mode from path history (falls back to active mode). */
function getMovementUsedByMode(token, history, gridDistance, usedFeet, activeMode) {
  const byMode = Object.create(null);
  if (!history?.length || usedFeet <= 0) return byMode;

  for (let i = 1; i < history.length; i++) {
    const from = history[i - 1];
    const to = history[i];
    const modeKey = normalizeMovementMode(
      to?.action ?? to?.movementAction ?? from?.action ?? from?.movementAction ?? activeMode
    );
    byMode[modeKey] = (byMode[modeKey] ?? 0) + segmentMovementCost(token, from, to, gridDistance);
  }

  const segmented = Object.values(byMode).reduce((total, value) => total + value, 0);
  if (segmented <= 0) {
    byMode[normalizeMovementMode(activeMode)] = usedFeet;
    return byMode;
  }

  // Keep mode caps aligned with the authoritative pool total when segments disagree.
  if (segmented !== usedFeet) {
    const scale = usedFeet / segmented;
    for (const key of Object.keys(byMode)) {
      byMode[key] = Math.round(byMode[key] * scale);
    }
  }
  return byMode;
}

function getMovementUsedFeet(token, history, gridDistance) {
  if (!history.length) return 0;

  if (history.length >= 2 && typeof token.document.measureMovementPath === "function") {
    try {
      const measured = token.document.measureMovementPath(history);
      if (Number.isFinite(measured?.cost)) {
        return Math.round(measured.cost);
      }
      if (Number.isFinite(measured?.spaces) && measured.spaces > 0) {
        return Math.round(measured.spaces * gridDistance);
      }
      if (Number.isFinite(measured?.distance)) {
        return Math.round(measured.distance);
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Failed to measure movement path`, error);
    }
  }

  const usedCost = history.reduce((total, entry) => total + (entry.cost ?? 0), 0);
  return Math.round(usedCost);
}

export async function setMovementMode(token, mode) {
  if (!token?.document) return;
  await token.document.update({ movementAction: mode });
}

/** Next Foundry movement action — same list as the token HUD. */
export async function cycleMovementMode(token) {
  if (!token?.document) return false;
  const modes = listTokenMovementActions(token);
  if (!modes.length) return false;
  const current = token.document._source?.movementAction ?? token.document.movementAction ?? modes[0].id;
  const index = modes.findIndex((entry) => entry.id === current);
  const next = modes[(index < 0 ? 0 : index + 1) % modes.length];
  if (!next || next.id === current) return false;
  await token.document.update({ movementAction: next.id });
  return true;
}

function getRecordedMovementHistory(token) {
  return token?.document?._source?._movementHistory ?? token?.document?.movementHistory ?? [];
}

function getFirstRecordedMovementId(token) {
  const history = getRecordedMovementHistory(token);
  for (const entry of history) {
    if (entry?.movementId) return entry.movementId;
  }
  return null;
}

function getLastRecordedMovementId(token) {
  const history = getRecordedMovementHistory(token);
  for (let i = history.length - 1; i >= 0; i--) {
    const id = history[i]?.movementId;
    if (id) return id;
  }
  return null;
}

export function canUndoTokenMovement(token) {
  return getRecordedMovementHistory(token).length > 1 && Boolean(getLastRecordedMovementId(token));
}

/** Undo only the last recorded step. */
export async function undoOneTokenMovement(token) {
  const doc = token?.document;
  if (!doc || typeof doc.revertRecordedMovement !== "function") return false;
  if (!canUndoTokenMovement(token)) return false;
  const movementId = getLastRecordedMovementId(token);
  if (!movementId) return false;
  return Boolean(await doc.revertRecordedMovement(movementId));
}

/** Put the token all the way back in one move, not square-by-square. */
export async function undoLastTokenMovement(token) {
  const doc = token?.document;
  if (!doc) return false;
  if (typeof doc.revertRecordedMovement !== "function") return false;
  if (!canUndoTokenMovement(token)) return false;
  const movementId = getFirstRecordedMovementId(token);
  if (!movementId) return false;
  return Boolean(await doc.revertRecordedMovement(movementId));
}
