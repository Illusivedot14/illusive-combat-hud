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
import { isMobileTargetPickActive } from "./mobile-target-pick.mjs";
import { openMobileAuraMenu, openMobileLightMenu } from "./mobile-controller-menus.mjs";
import {
  bindMobileSidebar,
  isMobileSidebarOpen,
  listFoundrySidebarTabs,
  openMobileSidebarTab
} from "./mobile-sidebar.mjs";
import { isTokenLightOn } from "../action-bar/action-bar-light.mjs";
import { isTokenAuraOn } from "../token-aura/token-aura.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";
import { ensureDomRoot } from "../../common/viewport.mjs";

const ROOT_ID = "ich-mobile-move";
const HOLD_MS = 150;

let bound = false;
let sidebarExpanded = true;
let stepping = false;
let holdTimer = null;
let holdAction = null;

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
  const existing = document.getElementById(ROOT_ID);
  if (existing && !existing.querySelector(".ich-move-sidebar-tabs-clip")) existing.remove();
  return ensureDomRoot(ROOT_ID, {
    className: "ich-mobile-move",
    html: `
    <div class="ich-move-utils">
      <div role="button" tabindex="0" class="ich-move-util" data-move="light" aria-label="">
        <i class="fas fa-lightbulb" aria-hidden="true"></i>
      </div>
      <div role="button" tabindex="0" class="ich-move-util" data-move="aura" aria-label="">
        <i class="fas fa-circle-dot" aria-hidden="true"></i>
      </div>
      <div role="button" tabindex="0" class="ich-move-flip" data-move="flip" aria-label="">
        <i class="fas fa-left-right" aria-hidden="true"></i>
      </div>
    </div>
    <div class="ich-move-sidebar" id="ich-move-sidebar">
      <div class="ich-move-sidebar-tabs-clip">
        <div class="ich-move-sidebar-tabs" id="ich-move-sidebar-tabs"></div>
      </div>
      <div role="button" tabindex="0" class="ich-move-sidebar-toggle" data-sidebar-toggle="1">
        <i class="fas fa-chevron-up" aria-hidden="true"></i>
      </div>
    </div>
    <div class="ich-move-panel">
      <div class="ich-move-well">
      <div class="ich-move-pad">
        <div role="button" tabindex="0" data-move="upLeft"><i class="fas fa-arrow-up" style="transform:rotate(-45deg)" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="up"><i class="fas fa-arrow-up" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="upRight"><i class="fas fa-arrow-up" style="transform:rotate(45deg)" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="left"><i class="fas fa-arrow-left" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" class="ich-move-mode" data-move="mode"></div>
        <div role="button" tabindex="0" data-move="right"><i class="fas fa-arrow-right" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="downLeft"><i class="fas fa-arrow-down" style="transform:rotate(45deg)" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="down"><i class="fas fa-arrow-down" aria-hidden="true"></i></div>
        <div role="button" tabindex="0" data-move="downRight"><i class="fas fa-arrow-down" style="transform:rotate(-45deg)" aria-hidden="true"></i></div>
      </div>
      </div>
      <div class="ich-move-meta">
        <span class="ich-move-feet" data-move="feet" hidden></span>
        <div role="button" tabindex="0" class="ich-move-undo" data-move="undo-one" hidden>
          <i class="fas fa-undo" aria-hidden="true"></i>
          <span></span>
        </div>
        <div role="button" tabindex="0" class="ich-move-undo" data-move="undo-all" hidden>
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          <span></span>
        </div>
      </div>
    </div>
  `
  });
}

function controllerHidden() {
  return isMobileSheetOpen() || isMobileTargetPickActive() || isMobileSidebarOpen();
}

function applyMoveChrome(root, { showFeet = false, showUndo = false } = {}) {
  const hidden = controllerHidden();
  const hasToken = Boolean(focusedToken()) || actorHasMapToken(focusedActor());
  root.classList.toggle("is-hidden", hidden);
  root.classList.toggle("no-token", !hasToken);
  const panel = root.querySelector(".ich-move-panel");
  if (panel) panel.hidden = hidden || !hasToken;
  root.querySelectorAll(".ich-move-utils").forEach((el) => {
    el.hidden = hidden || !hasToken;
  });
  const sidebar = root.querySelector(".ich-move-sidebar");
  if (sidebar) sidebar.hidden = hidden;
  applySidebarExpanded(root);

  root.querySelectorAll(".ich-move-undo").forEach((el) => {
    el.hidden = !showUndo;
  });
  const feet = root.querySelector(".ich-move-feet");
  if (feet) feet.hidden = !showFeet;
}

function actorMaxFeet(token, movement) {
  if (Number.isFinite(movement?.maxFeet) && movement.maxFeet > 0) return movement.maxFeet;
  const walk = Number(token?.actor?.system?.attributes?.movement?.walk);
  return Number.isFinite(walk) && walk > 0 ? walk : null;
}

function locSidebarToggle() {
  return sidebarExpanded
    ? (ich.mobileMove("hideSidebar") ?? "Hide tabs")
    : (ich.mobileMove("showSidebar") ?? "Show tabs");
}

function applySidebarExpanded(root) {
  root.classList.toggle("sidebar-collapsed", !sidebarExpanded);
  const toggle = root.querySelector("[data-sidebar-toggle]");
  if (!toggle) return;
  toggle.setAttribute("aria-expanded", sidebarExpanded ? "true" : "false");
  toggle.setAttribute("aria-label", locSidebarToggle());
  toggle.title = locSidebarToggle();
  if (!toggle.querySelector("i")) {
    toggle.innerHTML = `<i class="fas fa-chevron-up" aria-hidden="true"></i>`;
  }
}

function paintSidebarTabs(root) {
  const host = root.querySelector("#ich-move-sidebar-tabs");
  if (!host) return;
  const tabs = listFoundrySidebarTabs();
  const key = tabs.map((tab) => `${tab.id}:${tab.icon}:${tab.label}`).join("|");
  if (key === host.dataset.tabKey) return;
  host.dataset.tabKey = key;
  host.replaceChildren();
  for (const tab of tabs) {
    const button = document.createElement("div");
    button.role = "button";
    button.tabIndex = 0;
    button.className = "ich-move-sidebar-tab";
    button.dataset.sidebarTab = tab.id;
    button.title = tab.label;
    button.setAttribute("aria-label", tab.label);
    button.innerHTML = `<i class="${tab.icon}" aria-hidden="true"></i>`;
    host.appendChild(button);
  }
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
    modeBtn.title = label;
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

  const light = root.querySelector("[data-move='light']");
  if (light) {
    light.setAttribute("aria-label", ich.actionBar("toggleLight"));
    light.classList.toggle("is-on", Boolean(token && isTokenLightOn(token)));
  }
  const aura = root.querySelector("[data-move='aura']");
  if (aura) {
    aura.setAttribute("aria-label", ich.actionBar("toggleAura"));
    aura.classList.toggle("is-on", Boolean(token && isTokenAuraOn(token)));
  }
  paintSidebarTabs(root);
  applySidebarExpanded(root);

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

  if (action === "light") {
    await openMobileLightMenu(token);
    paintPad();
    return;
  }
  if (action === "aura") {
    await openMobileAuraMenu(token);
    paintPad();
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
}

function keyFromEvent(event) {
  const root = rootEl();
  if (!root) return null;
  const button = event.target?.closest?.("[data-move]");
  if (!button || !root.contains(button) || button.classList.contains("is-disabled")) return null;
  return button;
}

function tabFromEvent(event) {
  const root = rootEl();
  if (!root) return null;
  const button = event.target?.closest?.("[data-sidebar-tab]");
  if (!button || !root.contains(button)) return null;
  return button;
}

function toggleFromEvent(event) {
  const root = rootEl();
  if (!root) return null;
  const button = event.target?.closest?.("[data-sidebar-toggle]");
  if (!button || !root.contains(button)) return null;
  return button;
}

function onPointerDown(event) {
  const toggle = toggleFromEvent(event);
  if (toggle) {
    event.preventDefault();
    event.stopPropagation();
    toggle.setPointerCapture?.(event.pointerId);
    setHeld(toggle, true);
    sidebarExpanded = !sidebarExpanded;
    applySidebarExpanded(rootEl());
    return;
  }
  const tabButton = tabFromEvent(event);
  if (tabButton) {
    event.preventDefault();
    event.stopPropagation();
    tabButton.setPointerCapture?.(event.pointerId);
    setHeld(tabButton, true);
    void openMobileSidebarTab(tabButton.dataset.sidebarTab);
    return;
  }
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
  if (keyFromEvent(event) || tabFromEvent(event) || toggleFromEvent(event)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function shouldShowMove() {
  return isIllusiveMobileMode();
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
  bindMobileSidebar();
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
  Hooks.on("renderSidebar", () => {
    if (isIllusiveMobileMode()) renderMobileMove();
  });
  if (globalThis.game?.ready) renderMobileMove();
}
