import { ich } from "./i18n.mjs";
import { focusHudToken, isTouchTableClient, releaseCanvasSelection } from "./hooks/touch-table.mjs";

/** Soft canvas pan — longer than Foundry's default snap. */
const TOKEN_PAN_DURATION_MS = 800;

export function clearUserTargets() {
  for (const token of [...(game.user?.targets ?? [])]) {
    token.setTarget(false, { releaseOthers: false, user: game.user });
  }
}

export function canControlToken(token) {
  if (!token) return false;
  if (game.user.isGM) return true;
  return Boolean(token.isOwner || token.actor?.isOwner);
}

/**
 * Smoothly pan the canvas to a token's center.
 * @param {Token} token
 * @param {{ duration?: number }} [options]
 * @returns {Promise<unknown>|void}
 */
export function panCanvasToToken(token, { duration = TOKEN_PAN_DURATION_MS } = {}) {
  if (!token?.isVisible || !canvas?.animatePan) return;

  const center = token.center ?? { x: token.x, y: token.y };
  const options = {
    x: center.x,
    y: center.y,
    duration
  };

  const easing = globalThis.CanvasAnimation?.easeInOutCosine
    ?? globalThis.foundry?.utils?.easeInOutCosine;
  if (typeof easing === "function") options.easing = easing;

  return canvas.animatePan(options);
}

/** Draw a canvas ping at a token's center. */
export function pingCanvasAtToken(token) {
  if (!token?.isVisible || !canvas?.ping) return;
  const center = token.center ?? { x: token.x, y: token.y };
  canvas.ping(center);
}

export async function selectToken(token, { pan = true, clearTargets = false } = {}) {
  if (!token) return false;

  if (canControlToken(token)) {
    if (clearTargets) clearUserTargets();
    await token.control({ releaseOthers: true });
    if (pan) panCanvasToToken(token);
    return token.controlled;
  }

  if (isTouchTableClient()) {
    return focusHudToken(token, { pan, clearTargets });
  }

  ui.notifications.warn(ich.warning("noOwner"));
  return false;
}

/**
 * Pan to a token from HUD chrome. Selects only when the user can control it —
 * otherwise pans and pings (no ownership warning).
 */
export function focusTokenOnCanvas(token) {
  if (!token) return false;
  if (canControlToken(token)) {
    void selectToken(token, { pan: true });
    return true;
  }
  if (isTouchTableClient()) {
    void focusHudToken(token, { pan: true });
    return true;
  }
  panCanvasToToken(token);
  pingCanvasAtToken(token);
  return true;
}

/** Auto-pan on turn change — GM, non-touch players, and touch table each behave differently. */
export async function selectTokenForTurn(token) {
  if (!token) return false;

  if (isTouchTableClient()) {
    if (canControlToken(token)) {
      return selectToken(token, { pan: false, clearTargets: true });
    }
    return focusHudToken(token, { pan: false, clearTargets: true });
  }

  if (game.user.isGM) {
    releaseCanvasSelection();
    if (canControlToken(token)) {
      return selectToken(token, { pan: true, clearTargets: true });
    }
    clearUserTargets();
    panCanvasToToken(token);
    return true;
  }

  clearUserTargets();
  if (canControlToken(token)) {
    await token.control({ releaseOthers: true });
  }
  panCanvasToToken(token);
  return true;
}

export function openActorSheetFromEvent(event) {
  event.stopPropagation();
  const row = event.target.closest("[data-actor-id]");
  const actor = game.actors.get(row?.dataset.actorId);
  actor?.sheet?.render(true);
}
