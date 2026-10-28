import { ich } from "../../common/i18n.mjs";
import { shouldShowCameraPad } from "../../common/hooks/touch-table.mjs";
import {
  applyCanvasView,
  canvasScaleLimits,
  clampStick,
  nextScale,
  nextViewPosition,
  readCanvasView,
  stickToSceneDelta
} from "../../common/camera-control.mjs";

const PAD_ID = "ich-camera-pad";
export const PAD_CONTROL_PX = 52;
const KEY_GAP_PX = 4;
export const PAD_GRID_PX = PAD_CONTROL_PX * 3 + KEY_GAP_PX * 2;
export const PAD_WIDTH_PX = PAD_GRID_PX + 8 + PAD_CONTROL_PX;
export const PAD_HEIGHT_PX = PAD_GRID_PX;
export const PAD_CLEARANCE_PX = 16;

const OBSTACLE_SELECTOR = [
  "#ich-action-bar-dock",
  "#ich-action-bar-dock .ich-action-bar-minimize",
  "#ich-action-bar-dock .ich-mock-side-left",
  "#ich-action-bar-dock .ich-mock-combat-rail",
  "#ich-token-statuses .ich-status-icon",
  "#ich-party-status .ich-portrait-card",
  "#ich-party-status .ich-party-minimize",
  "#ich-party-status .ich-party-scroll-slider"
].join(", ");

/**
 * Keep the pad's horizontal spot. Lift its bottom edge above anything in that
 * column: action bar, its icons, collapse arrows, and the party portraits.
 */
export function cameraPadBottomPx({ floor, padLeft, padWidth, viewportHeight, obstacles }) {
  let bottom = floor;
  const padRight = padLeft + padWidth;
  for (const box of obstacles ?? []) {
    if (!box || box.width < 1 || box.height < 1) continue;
    if (padLeft >= box.right || padRight <= box.left) continue;
    const above = viewportHeight - box.top + PAD_CLEARANCE_PX;
    if (above > bottom) bottom = above;
  }
  return Math.round(bottom);
}

const ARROWS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

function setImportant(el, props) {
  for (const [name, value] of Object.entries(props)) {
    el.style.setProperty(name, value, "important");
  }
}

const PAD_SHELL = `
<div id="${PAD_ID}" class="ich-camera-pad">
  <div class="ich-camera-pad-arrows">
    <span class="ich-camera-pad-empty" aria-hidden="true"></span>
    <div role="button" tabindex="0" data-camera="up"><i class="fas fa-arrow-up" aria-hidden="true"></i></div>
    <span class="ich-camera-pad-empty" aria-hidden="true"></span>
    <div role="button" tabindex="0" data-camera="left"><i class="fas fa-arrow-left" aria-hidden="true"></i></div>
    <span class="ich-camera-pad-hub" aria-hidden="true"></span>
    <div role="button" tabindex="0" data-camera="right"><i class="fas fa-arrow-right" aria-hidden="true"></i></div>
    <span class="ich-camera-pad-empty" aria-hidden="true"></span>
    <div role="button" tabindex="0" data-camera="down"><i class="fas fa-arrow-down" aria-hidden="true"></i></div>
    <span class="ich-camera-pad-empty" aria-hidden="true"></span>
  </div>
  <div class="ich-camera-pad-zoom">
    <div role="button" tabindex="0" data-camera="zoom-in"><i class="fas fa-plus" aria-hidden="true"></i></div>
    <div role="button" tabindex="0" data-camera="zoom-out"><i class="fas fa-minus" aria-hidden="true"></i></div>
  </div>
</div>`;

const heldArrows = new Set();
const pointers = new Map();
let zoomHeld = null;
let rafId = 0;
let lastTs = 0;
let bound = false;

function rootEl() {
  return document.getElementById(PAD_ID);
}

function stickFromArrows() {
  let x = 0;
  let y = 0;
  for (const dir of heldArrows) {
    const step = ARROWS[dir];
    if (!step) continue;
    x += step.x;
    y += step.y;
  }
  return clampStick(x, y);
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  lastTs = 0;
}

function resetInput() {
  heldArrows.clear();
  pointers.clear();
  zoomHeld = null;
  rootEl()?.querySelectorAll(".is-held").forEach((el) => el.classList.remove("is-held"));
}

function tick(ts) {
  rafId = 0;
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;

  const stick = stickFromArrows();
  const moving = stick.x !== 0 || stick.y !== 0;
  if (!moving && !zoomHeld) {
    lastTs = 0;
    return;
  }

  const view = readCanvasView();
  const { dx, dy } = stickToSceneDelta(stick.x, stick.y, view.scale, dt);
  const scale = nextScale(view.scale, zoomHeld, dt, canvasScaleLimits());
  applyCanvasView(nextViewPosition(view, { dx, dy, scale }));
  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function setHeld(el, held) {
  el?.classList.toggle("is-held", held);
}

function pressAction(action, el) {
  if (ARROWS[action]) {
    heldArrows.add(action);
    setHeld(el, true);
    ensureLoop();
    return;
  }
  if (action === "zoom-in" || action === "zoom-out") {
    zoomHeld = action === "zoom-in" ? "in" : "out";
    setHeld(el, true);
    ensureLoop();
  }
}

function releaseAction(action, el) {
  if (ARROWS[action]) {
    heldArrows.delete(action);
    setHeld(el, false);
    return;
  }
  if (action === "zoom-in" || action === "zoom-out") {
    if ((action === "zoom-in" && zoomHeld === "in") || (action === "zoom-out" && zoomHeld === "out")) {
      zoomHeld = null;
    }
    setHeld(el, false);
  }
}

function onPointerDown(event) {
  const root = rootEl();
  if (!root?.contains(event.target)) return;
  const button = event.target.closest("[data-camera]");
  const action = button?.dataset?.camera;
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  button.setPointerCapture?.(event.pointerId);
  pointers.set(event.pointerId, { action, button });
  pressAction(action, button);
}

function onPointerUp(event) {
  const held = pointers.get(event.pointerId);
  if (!held) return;
  event.preventDefault();
  event.stopPropagation();
  pointers.delete(event.pointerId);
  releaseAction(held.action, held.button);
}

function paintPad(root) {
  root.setAttribute("aria-label", ich.cameraPad("title"));
  for (const [action, key] of [
    ["up", "panUp"],
    ["down", "panDown"],
    ["left", "panLeft"],
    ["right", "panRight"],
    ["zoom-in", "zoomIn"],
    ["zoom-out", "zoomOut"]
  ]) {
    const button = root.querySelector(`[data-camera="${action}"]`);
    if (button) button.setAttribute("aria-label", ich.cameraPad(key));
  }
}

/** Lock the pad to a compact plus. Sizes are exact pixels so Foundry cannot stretch it. */
export function applyCameraPadChrome(root) {
  if (!root) return root;

  setImportant(root, {
    position: "fixed",
    inset: "auto",
    right: "auto",
    top: "auto",
    "z-index": "2147483646",
    display: "flex",
    "align-items": "center",
    "justify-content": "flex-start",
    gap: "8px",
    width: `${PAD_WIDTH_PX}px`,
    height: `${PAD_HEIGHT_PX}px`,
    "min-width": `${PAD_WIDTH_PX}px`,
    "max-width": `${PAD_WIDTH_PX}px`,
    "min-height": `${PAD_HEIGHT_PX}px`,
    "max-height": `${PAD_HEIGHT_PX}px`,
    padding: "0",
    margin: "0",
    "box-sizing": "border-box",
    overflow: "visible",
    border: "none",
    background: "transparent",
    "pointer-events": "auto",
    "touch-action": "none",
    visibility: "visible",
    opacity: "1",
    flex: "none",
    transform: "none"
  });

  const arrows = root.querySelector(".ich-camera-pad-arrows");
  if (arrows) {
    const track = `${PAD_CONTROL_PX}px ${PAD_CONTROL_PX}px ${PAD_CONTROL_PX}px`;
    setImportant(arrows, {
      display: "grid",
      "grid-template-columns": track,
      "grid-template-rows": track,
      gap: `${KEY_GAP_PX}px`,
      width: `${PAD_GRID_PX}px`,
      height: `${PAD_GRID_PX}px`,
      "min-width": `${PAD_GRID_PX}px`,
      "max-width": `${PAD_GRID_PX}px`,
      flex: "none"
    });
  }

  const zoom = root.querySelector(".ich-camera-pad-zoom");
  if (zoom) {
    setImportant(zoom, {
      display: "flex",
      "flex-direction": "column",
      "justify-content": "center",
      gap: "8px",
      width: `${PAD_CONTROL_PX}px`,
      flex: "none"
    });
  }

  const key = `${PAD_CONTROL_PX}px`;
  root.querySelectorAll(".ich-camera-pad-empty, .ich-camera-pad-hub").forEach((el) => {
    setImportant(el, {
      width: key,
      height: key,
      "min-width": key,
      "max-width": key,
      "min-height": key,
      "max-height": key,
      padding: "0",
      margin: "0",
      border: "none",
      background: "transparent"
    });
  });

  root.querySelectorAll("[data-camera]").forEach((el) => {
    setImportant(el, {
      width: key,
      height: key,
      "min-width": key,
      "max-width": key,
      "min-height": key,
      "max-height": key,
      padding: "0",
      margin: "0",
      flex: "none",
      "box-sizing": "border-box",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      "justify-self": "center",
      "align-self": "center",
      border: "2px solid #f0ddb0",
      "border-radius": "10px",
      background: "#2a1c10",
      color: "#f0ddb0",
      "font-size": "26px",
      "line-height": "1",
      cursor: "pointer"
    });
  });

  return root;
}

function obstacleVisible(el) {
  if (el.hidden || el.closest("[hidden]")) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const clipped = el.closest(".ich-party-body, .ich-action-bar-motion");
  if (clipped) {
    const clip = clipped.getBoundingClientRect();
    if (clip.width < 1 || clip.height < 1) return false;
  }
  return true;
}

function obstacleBoxes() {
  return [...document.querySelectorAll(OBSTACLE_SELECTOR)]
    .filter(obstacleVisible)
    .map((el) => el.getBoundingClientRect());
}

function placePad(root) {
  applyCameraPadChrome(root);
  const board = document.getElementById("board") ?? document.getElementById("board-game");
  const rect = board?.getBoundingClientRect();
  const left = rect ? Math.max(90, Math.round(rect.left + 90)) : 90;
  const floor = rect ? Math.max(16, Math.round(window.innerHeight - rect.bottom + 16)) : 16;
  const bottom = cameraPadBottomPx({
    floor,
    padLeft: left,
    padWidth: PAD_WIDTH_PX,
    viewportHeight: window.innerHeight,
    obstacles: obstacleBoxes()
  });
  root.style.setProperty("left", `${left}px`, "important");
  root.style.setProperty("bottom", `${bottom}px`, "important");
}

let placeRaf = 0;
let obstacleWatch = null;

function schedulePlace() {
  if (placeRaf) return;
  placeRaf = requestAnimationFrame(() => {
    placeRaf = 0;
    const root = rootEl();
    if (root) placePad(root);
  });
}

function watchObstacles() {
  if (obstacleWatch || typeof ResizeObserver !== "function") return;
  const observer = new ResizeObserver(() => schedulePlace());
  const seen = new Set();
  const attach = () => {
    for (const el of document.querySelectorAll(OBSTACLE_SELECTOR)) {
      if (seen.has(el)) continue;
      seen.add(el);
      observer.observe(el);
    }
  };
  attach();
  const overlay = document.getElementById("ich-hud-overlay") ?? document.body;
  const mutations = new MutationObserver(() => {
    attach();
    schedulePlace();
  });
  mutations.observe(overlay, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden"]
  });
  obstacleWatch = { observer, mutations };
}

function unmountPad() {
  stopLoop();
  resetInput();
  rootEl()?.remove();
}

function mountPad() {
  let el = rootEl();
  if (!el) {
    const wrap = document.createElement("div");
    wrap.innerHTML = PAD_SHELL.trim();
    el = wrap.firstElementChild;
    if (!el) return;
    document.documentElement.appendChild(el);
  }
  placePad(el);
  paintPad(el);
}

function bindPad() {
  if (bound) return;
  bound = true;
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);
  window.addEventListener("resize", schedulePlace);
  watchObstacles();
}

export function refreshCameraPad() {
  if (!shouldShowCameraPad()) {
    unmountPad();
    return;
  }
  bindPad();
  mountPad();
}

export function bindCameraPad() {
  const show = () => refreshCameraPad();
  Hooks.on("ready", show);
  Hooks.on("canvasReady", show);
  if (globalThis.game?.ready) show();
}
