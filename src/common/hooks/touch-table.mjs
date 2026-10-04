/**
 * Touch-table / map-display clients: pan the map without dragging every token,
 * but still focus one token at a time for the HUD (no ownership required).
 */

import { MODULE_ID } from "../constants.mjs";

let hudFocusTokenId = null;
let hooksBound = false;

function isCoarseTouchDevice() {
  return navigator.maxTouchPoints > 0
    && typeof matchMedia === "function"
    && matchMedia("(pointer: coarse)").matches;
}

/** Dedicated touch map client — explicit setting, or auto on coarse touch (non-GM). */
export function isTouchTableClient() {
  try {
    const raw = game.settings.get(MODULE_ID, "touchTableClient") ?? "auto";
    if (raw === "on" || raw === true) return true;
    if (raw === "off" || raw === false) return false;
    return !game.user.isGM && isCoarseTouchDevice();
  } catch {
    return false;
  }
}

export function getHudFocusToken() {
  const id = hudFocusTokenId || game.settings.get(MODULE_ID, "actionBarLastTokenId") || null;
  return id ? canvas?.tokens?.get(id) ?? null : null;
}

function clearUserTargets() {
  for (const token of [...(game.user?.targets ?? [])]) {
    token.setTarget(false, { releaseOthers: false, user: game.user });
  }
}

/** Drop Foundry canvas control only — used before pan / on join when many tokens were selected. */
export function releaseCanvasSelection() {
  if (canvas?.tokens?.controlled?.length) canvas.tokens.releaseAll();
  clearUserTargets();
}

async function clearHudFocus({ refresh = true } = {}) {
  hudFocusTokenId = null;
  try {
    await game.settings.set(MODULE_ID, "actionBarLastTokenId", "");
  } catch {
    /* ignore */
  }
  if (refresh) await refreshHudSelection();
}

async function refreshHudSelection() {
  try {
    const { refreshHud } = await import("../render/core.mjs");
    const { ICH_RENDER } = await import("../render/scopes.mjs");
    refreshHud(ICH_RENDER.SELECTION);
  } catch {
    /* ignore */
  }
}

/** HUD focus for tokens the client can see but does not own. */
export async function focusHudToken(token, { pan = true, clearTargets = false } = {}) {
  if (!token?.actor || !isTouchTableClient()) return false;

  releaseCanvasSelection();
  if (clearTargets) clearUserTargets();

  hudFocusTokenId = token.id;
  try {
    await game.settings.set(MODULE_ID, "actionBarLastTokenId", token.id);
  } catch {
    /* ignore */
  }

  if (pan) {
    const { panCanvasToToken } = await import("../token-actions.mjs");
    panCanvasToToken(token);
  }
  await refreshHudSelection();
  return true;
}

function bindTouchTableHooks() {
  if (hooksBound) return;
  hooksBound = true;

  Hooks.on("canvasReady", () => {
    if (!isTouchTableClient()) return;
    releaseCanvasSelection();
    void clearHudFocus({ refresh: true });
  });

  Hooks.on("canvasPan", () => {
    if (!isTouchTableClient()) return;
    releaseCanvasSelection();
  });

  Hooks.on("canvasClick", () => {
    if (!isTouchTableClient()) return;
    releaseCanvasSelection();
    void clearHudFocus();
  });

  Hooks.on("clickToken", (token) => {
    if (!isTouchTableClient() || !token?.actor) return;
    void focusHudToken(token, { pan: false });
  });
}

export function bindTouchTableClient() {
  bindTouchTableHooks();
}
