import { isIllusiveMobileMode } from "../../common/mobile-client.mjs";
import { getViewedCombat } from "../../common/combat.mjs";
import {
  buildIdleMovementData,
  buildMovementData,
  cycleMovementMode,
  listTokenMovementActions
} from "../../common/action-economy.mjs";
import {
  actorHasMapToken,
  canUndoActorToken,
  findActorTokenDoc,
  getWalkStepCount,
  getWalkUsedFeet,
  STEP_DIRS,
  flipActorToken,
  stepActorToken,
  tokenViewFromDoc,
  undoActorToken,
  viewedScene
} from "../../common/token-step.mjs";
import { ich } from "../../common/i18n.mjs";
import { getMobileFocusedActor } from "./mobile-focus.mjs";
import { getMobileSheetActor, isMobileSheetOpen, MOBILE_SHEET_STATE_HOOK } from "./mobile-sheet.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";
import { ensureDomRoot, setImportant } from "../../common/viewport.mjs";

const ROOT_ID = "ich-mobile-move";
const KEY_PX = 64;
const KEY_GAP_PX = 4;
const PAD_PX = KEY_PX * 3 + KEY_GAP_PX * 2;

const HOLD_MS = 150;

let bound = false;
let stepping = false;
let holdTimer = null;
let holdAction = null;

function paintKeyFace(el, extra = {}) {
  setImportant(el, {
    "box-sizing": "border-box",
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    padding: "0",
    margin: "0",
    border: "2px solid var(--mobile-btn-border, var(--mobile-accent-50, #b794f6))",
    "border-radius": "10px",
    background: "var(--mobile-bg-secondary, #1f1830)",
    color: "var(--mobile-text-primary, #fff)",
    "box-shadow": "0 4px 16px var(--mobile-shadow-strong, rgba(0,0,0,0.45))",
    "line-height": "1",
    cursor: "pointer",
    "user-select": "none",
    "touch-action": "none",
    "pointer-events": "auto",
    ...extra
  });
}

function rootEl() {
  return document.getElementById(ROOT_ID);
}

function focusedActor() {
  return getMobileFocusedActor() ?? getMobileSheetActor();
}

function focusedToken() {
  return tokenViewFromDoc(findActorTokenDoc(focusedActor()));
}

function inCombat() {
  return Boolean(getViewedCombat()?.started);
}

function ensureRoot() {
  return ensureDomRoot(ROOT_ID, {
    className: "ich-mobile-move",
    html: `
    <div role="button" tabindex="0" class="ich-move-flip" data-move="flip" aria-label="">
      <i class="fas fa-left-right" aria-hidden="true"></i>
    </div>
    <div class="ich-move-panel">
      <div class="ich-move-status">
        <div role="button" tabindex="0" class="ich-move-mode" data-move="mode"></div>
        <span class="ich-move-feet" data-move="feet"></span>
        <div role="button" tabindex="0" class="ich-move-undo" data-move="undo-one" hidden>
          <i class="fas fa-undo" aria-hidden="true"></i>
          <span></span>
        </div>
        <div role="button" tabindex="0" class="ich-move-undo" data-move="undo-all" hidden>
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          <span></span>
        </div>
      </div>
      <div class="ich-move-pad">
        <div role="button" tabindex="0" data-move="upLeft"><i class="fas fa-arrow-up" style="transform:rotate(-45deg)" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="up"><i class="fas fa-arrow-up" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="upRight"><i class="fas fa-arrow-up" style="transform:rotate(45deg)" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="left"><i class="fas fa-arrow-left" aria-hidden="true"></i></div>
        <span class="ich-move-empty" aria-hidden="true"></span>
        <div role="button" tabindex="0" data-move="right"><i class="fas fa-arrow-right" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="downLeft"><i class="fas fa-arrow-down" style="transform:rotate(45deg)" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="down"><i class="fas fa-arrow-down" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="downRight"><i class="fas fa-arrow-down" style="transform:rotate(-45deg)" aria-hidden="true"></i></div>
      </div>
    </div>
  `
  });
}

function hideChrome(el) {
  if (!el) return;
  setImportant(el, {
    display: "none",
    visibility: "hidden",
    "pointer-events": "none"
  });
  el.hidden = true;
}

function applyMoveChrome(root, { showFeet = false, showUndo = false } = {}) {
  setImportant(root, {
    position: "fixed",
    inset: "0 0 var(--ich-carousel-dock, 96px) 0",
    "z-index": "100002",
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    background: "transparent",
    "pointer-events": "none"
  });

  const panel = root.querySelector(".ich-move-panel");
  if (panel) {
    const sheetOpen = isMobileSheetOpen();
    setImportant(panel, {
      display: sheetOpen ? "none" : "flex",
      "flex-direction": "column",
      "align-items": "center",
      gap: "10px",
      padding: "0",
      margin: "0",
      border: "none",
      background: "transparent",
      "box-shadow": "none",
      "pointer-events": sheetOpen ? "none" : "auto",
      visibility: sheetOpen ? "hidden" : "visible"
    });
    panel.hidden = sheetOpen;
  }

  const pad = root.querySelector(".ich-move-pad");
  if (pad) {
    const track = `${KEY_PX}px ${KEY_PX}px ${KEY_PX}px`;
    setImportant(pad, {
      display: "grid",
      "grid-template-columns": track,
      "grid-template-rows": track,
      gap: `${KEY_GAP_PX}px`,
      width: `${PAD_PX}px`,
      height: `${PAD_PX}px`
    });
  }

  const key = `${KEY_PX}px`;
  root.querySelectorAll(".ich-move-empty").forEach((el) => {
    setImportant(el, {
      width: key,
      height: key,
      border: "none",
      background: "transparent"
    });
  });

  root.querySelectorAll(".ich-move-pad [data-move]").forEach((el) => {
    paintKeyFace(el, {
      width: key,
      height: key,
      "min-width": key,
      "max-width": key,
      "min-height": key,
      "max-height": key,
      "font-size": "26px"
    });
  });

  root.querySelectorAll(".ich-move-mode").forEach((el) => {
    paintKeyFace(el, {
      height: "52px",
      "min-height": "52px",
      padding: "0 12px",
      gap: "8px",
      "font-size": "16px",
      "font-weight": "700"
    });
  });

  root.querySelectorAll(".ich-move-undo").forEach((el) => {
    if (showUndo) {
      paintKeyFace(el, {
        height: "52px",
        "min-height": "52px",
        padding: "0 12px",
        gap: "8px",
        "font-size": "16px",
        "font-weight": "700"
      });
      el.hidden = false;
    } else {
      hideChrome(el);
    }
  });

  const flip = root.querySelector(".ich-move-flip");
  if (flip) {
    paintKeyFace(flip, {
      position: "fixed",
      left: "12px",
      right: "auto",
      top: "auto",
      bottom: "calc(var(--ich-carousel-dock, 96px) + 12px)",
      width: "72px",
      height: "72px",
      "min-width": "72px",
      "max-width": "72px",
      "min-height": "72px",
      "max-height": "72px",
      "border-radius": "50%",
      "font-size": "1.8rem",
      "z-index": "100003"
    });
  }

  const feet = root.querySelector(".ich-move-feet");
  if (feet) {
    if (showFeet) {
      paintKeyFace(feet, {
        height: "52px",
        "min-height": "52px",
        padding: "0 12px",
        "font-size": "16px",
        "font-weight": "700",
        cursor: "default"
      });
      feet.hidden = false;
    } else {
      hideChrome(feet);
    }
  }
}

function actorMaxFeet(token, movement) {
  if (Number.isFinite(movement?.maxFeet) && movement.maxFeet > 0) return movement.maxFeet;
  const walk = Number(token?.actor?.system?.attributes?.movement?.walk);
  return Number.isFinite(walk) && walk > 0 ? walk : null;
}

function leftoverFeet(token, movement) {
  const max = actorMaxFeet(token, movement);
  const used = Math.max(
    getWalkUsedFeet(viewedScene(), token?.id ?? token?.document?.id),
    Number(movement?.usedFeet) || 0
  );
  if (max != null) return { left: Math.max(0, max - used), max };
  if (Number.isFinite(movement?.remainingFeet)) {
    return { left: movement.remainingFeet, max: Number.isFinite(movement.maxFeet) ? movement.maxFeet : null };
  }
  return null;
}

function paintPad() {
  const root = rootEl();
  if (!root) return;

  const token = focusedToken();
  const combat = inCombat();
  let movement = null;
  let modes = [];
  try {
    movement = token
      ? (combat ? buildMovementData(token) : buildIdleMovementData(token))
      : null;
    modes = token ? listTokenMovementActions(token) : [];
  } catch {
    movement = null;
    modes = [];
  }
  const current = modes.find((m) => m.isActive)
    ?? modes.find((m) => m.id === (token?.document?.movementAction ?? movement?.mode))
    ?? modes[0];
  const leftover = leftoverFeet(token, movement);
  const moved = getWalkStepCount(token?.id ?? token?.document?.id) > 0
    || canUndoActorToken(focusedActor());
  const showUndo = Boolean(combat && moved);
  const showFeet = Boolean(combat && moved && leftover);

  root.classList.toggle("is-combat", combat);
  root.classList.toggle("has-token", Boolean(token));
  applyMoveChrome(root, { showFeet, showUndo });

  const modeBtn = root.querySelector("[data-move='mode']");
  if (modeBtn) {
    const label = current?.label || movement?.modeLabel || ich.movement("mode");
    modeBtn.innerHTML = `<i class="fas ${current?.icon || "fa-person-walking"}" aria-hidden="true"></i><span>${label}</span>`;
    const modeOff = !token || modes.length < 2;
    modeBtn.classList.toggle("is-disabled", modeOff);
    modeBtn.setAttribute("aria-disabled", modeOff ? "true" : "false");
  }

  const feet = root.querySelector("[data-move='feet']");
  if (feet) {
    if (showFeet) {
      feet.textContent = leftover.max == null ? `${leftover.left} ft` : `${leftover.left}/${leftover.max} ft`;
    } else {
      feet.textContent = "";
    }
  }

  const undoOne = root.querySelector("[data-move='undo-one']");
  if (undoOne) {
    const label = ich.mobileMove("undoOne");
    const caption = undoOne.querySelector("span");
    if (caption) caption.textContent = showUndo ? label : "";
    undoOne.setAttribute("aria-label", label);
  }
  const undoAll = root.querySelector("[data-move='undo-all']");
  if (undoAll) {
    const label = ich.mobileMove("undoAll");
    const caption = undoAll.querySelector("span");
    if (caption) caption.textContent = showUndo ? label : "";
    undoAll.setAttribute("aria-label", label);
  }

  const flip = root.querySelector("[data-move='flip']");
  if (flip) flip.setAttribute("aria-label", ich.actionBar("flipToken"));

  for (const [dir, key] of [
    ["up", "panUp"],
    ["down", "panDown"],
    ["left", "panLeft"],
    ["right", "panRight"],
    ["upLeft", "panUpLeft"],
    ["upRight", "panUpRight"],
    ["downLeft", "panDownLeft"],
    ["downRight", "panDownRight"]
  ]) {
    const btn = root.querySelector(`[data-move="${dir}"]`);
    if (!btn) continue;
    btn.classList.remove("is-disabled");
    btn.setAttribute("aria-label", ich.mobileMove(key));
  }
}

async function onAction(action) {
  const actor = focusedActor();
  const token = focusedToken();
  if (!token) {
    ui.notifications?.warn?.(ich.mobileMove("noToken"));
    return;
  }

  if (action === "mode") {
    if (rootEl()?.querySelector("[data-move='mode']")?.classList.contains("is-disabled")) return;
    await cycleMovementMode(token);
    paintPad();
    return;
  }

  if (action === "undo-one" || action === "undo-all") {
    if (!inCombat()) return;
    const result = await undoActorToken(actor, { all: action === "undo-all" });
    if (!result.ok) ui.notifications?.warn?.(ich.actionBar("movementUndoEmpty"));
    paintPad();
    return;
  }

  if (action === "flip") {
    const result = await flipActorToken(actor);
    if (!result.ok && result.reason === "noToken") {
      ui.notifications?.warn?.(ich.mobileMove("noToken"));
    } else if (!result.ok) {
      ui.notifications?.warn?.(ich.warning("noOwner"));
    }
    return;
  }

  if (stepping) return;
  if (!STEP_DIRS.includes(action)) return;
  stepping = true;
  try {
    const result = await stepActorToken(actor, action);
    if (!result.ok && result.reason === "noToken") {
      ui.notifications?.warn?.(ich.mobileMove("noToken"));
    } else if (!result.ok && result.reason === "noOwner") {
      ui.notifications?.warn?.(ich.warning("noOwner"));
    } else if (!result.ok) {
      ui.notifications?.warn?.(ich.mobileMove("failed"));
      stopHold();
    }
  } finally {
    stepping = false;
    paintPad();
  }
}

function stopHold() {
  if (holdTimer) {
    clearInterval(holdTimer);
    holdTimer = null;
  }
  holdAction = null;
}

function startHold(action) {
  stopHold();
  holdAction = action;
  holdTimer = setInterval(() => {
    if (holdAction) void onAction(holdAction);
  }, HOLD_MS);
}

function setHeld(el, held) {
  if (!el) return;
  el.classList.toggle("is-held", held);
  if (held) {
    el.style.setProperty("background", "var(--mobile-bg-button-active, rgba(183,148,246,0.24))", "important");
    el.style.setProperty("color", "var(--mobile-accent, #b794f6)", "important");
    el.style.setProperty("border-color", "var(--mobile-accent, #b794f6)", "important");
  } else {
    el.style.setProperty("background", "var(--mobile-bg-secondary, #1f1830)", "important");
    el.style.setProperty("color", "var(--mobile-text-primary, #fff)", "important");
    el.style.setProperty("border-color", "var(--mobile-btn-border, var(--mobile-accent-50, #b794f6))", "important");
  }
}

function keyFromEvent(event) {
  const root = rootEl();
  if (!root) return null;
  const button = event.target?.closest?.("[data-move]");
  if (!button || !root.contains(button) || button.classList.contains("is-disabled")) return null;
  return button;
}

function onPointerDown(event) {
  const button = keyFromEvent(event);
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  button.setPointerCapture?.(event.pointerId);
  setHeld(button, true);
  const action = button.dataset.move;
  void onAction(action);
  if (STEP_DIRS.includes(action)) startHold(action);
}

function onPointerUp(event) {
  stopHold();
  const root = rootEl();
  root?.querySelectorAll(".is-held").forEach((el) => setHeld(el, false));
  if (keyFromEvent(event)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function shouldShowMove() {
  return isIllusiveMobileMode() && actorHasMapToken(focusedActor());
}

export function renderMobileMove() {
  if (!shouldShowMove()) {
    rootEl()?.remove();
    return;
  }
  ensureMobileSheetStyles();
  ensureRoot();
  paintPad();
}

export function bindMobileMove() {
  if (bound) return;
  bound = true;
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);
  Hooks.on("updateToken", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("createToken", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("deleteToken", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("updateCombat", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("createCombat", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("deleteCombat", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("combatStart", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on(MOBILE_SHEET_STATE_HOOK, () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("canvasReady", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  Hooks.on("updateScene", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  if (globalThis.game?.ready) renderMobileMove();
}
