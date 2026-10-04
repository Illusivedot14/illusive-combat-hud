import { MODULE_ID } from "../../common/constants.mjs";
import { ich } from "../../common/i18n.mjs";
import { hudAnimationOn } from "../../common/hud-settings.mjs";
import { getUiLocalRect, getUiViewportSize } from "../../common/viewport.mjs";
import {
  beginFoundryChromeConceal,
  beginFoundryChromeReveal,
  finishFoundryChromeReveal,
  syncFoundryUiVisibility
} from "./action-bar-foundry-ui.mjs";

const MOTION_MS = 320;
const MOTION_CLASS = "ich-action-bar-motion-active";
const MOTION_OUT = "ich-action-bar-motion-out";
const MOTION_IN = "ich-action-bar-motion-in";
const HANDOFF_DOCK = "ich-action-bar-dock--handoff";

async function repositionDock() {
  const { positionActionBar } = await import("./action-bar.mjs");
  positionActionBar();
}

function motionRoot(dock = document.getElementById("ich-action-bar-dock")) {
  return dock?.querySelector(".ich-action-bar-motion") ?? null;
}

function prefersReducedMotion() {
  return typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animationEnabled() {
  return hudAnimationOn() && !prefersReducedMotion();
}

export function isActionBarMinimized() {
  return game.settings.get(MODULE_ID, "actionBarMinimized") === true;
}

function updateMinimizeControl(dock) {
  const button = dock?.querySelector(".ich-action-bar-minimize");
  if (!button) return;

  const minimized = dock.classList.contains("ich-action-bar-dock--minimized");
  const icon = button.querySelector("i");
  if (icon) icon.className = minimized ? "fas fa-chevron-up" : "fas fa-chevron-down";

  const label = minimized ? ich.actionBar("expand") : ich.actionBar("minimize");
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
  button.setAttribute("aria-expanded", minimized ? "false" : "true");
}

function clearMotionStyles(motion) {
  motion.style.removeProperty("height");
  motion.style.removeProperty("min-height");
  motion.style.removeProperty("max-height");
  motion.style.removeProperty("margin-bottom");
  motion.style.removeProperty("transform");
  motion.style.removeProperty("overflow");
  motion.style.removeProperty("pointer-events");
  motion.style.removeProperty("visibility");
}

function clearMotionClasses(dock) {
  dock.classList.remove(MOTION_CLASS, MOTION_OUT, MOTION_IN);
}

function beginMotion(dock, direction) {
  clearMotionClasses(dock);
  dock.classList.add(MOTION_CLASS);
  dock.classList.add(direction === "out" ? MOTION_OUT : MOTION_IN);
}

function waitForMotion(motion) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      motion.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      resolve();
    };
    const onEnd = (event) => {
      if (event.target !== motion) return;
      if (event.propertyName && event.propertyName !== "transform") return;
      finish();
    };
    motion.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, MOTION_MS + 120);
  });
}

function lockMotionHeight(motion, height) {
  motion.style.overflow = "visible";
  motion.style.height = `${height}px`;
  motion.style.minHeight = `${height}px`;
  motion.style.maxHeight = `${height}px`;
  motion.style.visibility = "visible";
}

/** Pixels needed to move the motion root fully past the bottom of the UI viewport. */
function slideOffDistance(motion) {
  const top = getUiLocalRect(motion)?.top ?? 0;
  const uiH = getUiViewportSize().h;
  return Math.ceil(Math.max(uiH - top, motion.offsetHeight)) + 8;
}

function applyMinimizedInstant(dock, minimized) {
  clearMotionClasses(dock);
  dock.classList.remove(HANDOFF_DOCK);
  const motion = motionRoot(dock);
  if (motion) clearMotionStyles(motion);
  dock.classList.toggle("ich-action-bar-dock--minimized", minimized);
  if (motion) motion.setAttribute("aria-hidden", minimized ? "true" : "false");
}

/**
 * Slide the action bar fully off the bottom of the screen (transform) while
 * collapsing only the layout gap for the chevron (margin-bottom). Height stays locked.
 */
async function animateActionBarMinimized(dock, minimized) {
  const motion = motionRoot(dock);
  if (!motion || !animationEnabled()) {
    applyMinimizedInstant(dock, minimized);
    syncFoundryUiVisibility();
    await repositionDock();
    return;
  }

  dock.style.overflow = "visible";
  dock.classList.add(HANDOFF_DOCK);

  if (minimized) {
    const height = motion.offsetHeight;
    if (height <= 0) {
      applyMinimizedInstant(dock, true);
      syncFoundryUiVisibility();
      await repositionDock();
      return;
    }

    // Fade the Foundry hotbar in under the departing action bar, and lift the
    // dock to its final resting height so the end doesn't snap.
    beginFoundryChromeReveal();
    await repositionDock();

    const slidePx = slideOffDistance(motion);
    const extraSlide = Math.max(0, slidePx - height);
    lockMotionHeight(motion, height);
    motion.style.marginBottom = "0px";
    motion.style.transform = "translateY(0)";
    void motion.offsetHeight;

    beginMotion(dock, "out");
    motion.style.marginBottom = `${-height}px`;
    motion.style.transform = `translateY(${extraSlide}px)`;
    motion.style.pointerEvents = "none";

    await waitForMotion(motion);

    dock.classList.add("ich-action-bar-dock--minimized");
    clearMotionClasses(dock);
    clearMotionStyles(motion);
    dock.style.removeProperty("overflow");
    motion.setAttribute("aria-hidden", "true");
    finishFoundryChromeReveal();
    dock.classList.remove(HANDOFF_DOCK);
    return;
  }

  // Expand: fade hotbar away first, drop the dock, then slide the action bar up.
  await beginFoundryChromeConceal();
  await repositionDock();

  const storedHeight = Math.ceil(parseFloat(dock.style.getPropertyValue("--ich-action-bar-frame-height")) || 0);
  dock.classList.remove("ich-action-bar-dock--minimized");
  motion.setAttribute("aria-hidden", "false");
  motion.style.visibility = "hidden";
  motion.style.pointerEvents = "none";

  const height = motion.offsetHeight || storedHeight;
  if (height <= 0) {
    clearMotionStyles(motion);
    applyMinimizedInstant(dock, false);
    dock.classList.remove(HANDOFF_DOCK);
    return;
  }

  lockMotionHeight(motion, height);
  motion.style.marginBottom = `${-height}px`;
  motion.style.transform = "translateY(0)";
  void motion.offsetHeight;

  motion.style.transform = `translateY(${slideOffDistance(motion)}px)`;
  void motion.offsetHeight;

  motion.style.visibility = "visible";
  beginMotion(dock, "in");
  motion.style.marginBottom = "0px";
  motion.style.transform = "translateY(0)";
  motion.style.pointerEvents = "";

  await waitForMotion(motion);

  clearMotionClasses(dock);
  clearMotionStyles(motion);
  dock.style.removeProperty("overflow");
  dock.classList.remove(HANDOFF_DOCK);
}

function syncFrameHeight(dock) {
  const motion = motionRoot(dock);
  if (!motion || dock.classList.contains("ich-action-bar-dock--minimized")) return;
  const height = motion.offsetHeight;
  if (height > 0) dock.style.setProperty("--ich-action-bar-frame-height", `${height}px`);
}

/** Sync minimized UI from the client setting (no animation — used on mount/settings). */
export function applyActionBarMinimized(dock = document.getElementById("ich-action-bar-dock")) {
  if (!dock) return;
  if (dock.dataset.barAnimating === "1") return;
  applyMinimizedInstant(dock, isActionBarMinimized());
  updateMinimizeControl(dock);
  if (!isActionBarMinimized()) syncFrameHeight(dock);
}

/** Clear minimize so the bar is visible (e.g. on token select). */
export async function expandActionBarForSelection(dock = document.getElementById("ich-action-bar-dock")) {
  if (!isActionBarMinimized()) {
    applyActionBarMinimized(dock);
    return;
  }
  await game.settings.set(MODULE_ID, "actionBarMinimized", false);
  applyActionBarMinimized(dock);
}

export async function toggleActionBarMinimized(dock = document.getElementById("ich-action-bar-dock")) {
  if (!dock) return;
  if (dock.dataset.barAnimating === "1") return;

  const nextMinimized = !isActionBarMinimized();
  dock.dataset.barAnimating = "1";
  try {
    if (nextMinimized) syncFrameHeight(dock);
    await animateActionBarMinimized(dock, nextMinimized);
    updateMinimizeControl(dock);
    await game.settings.set(MODULE_ID, "actionBarMinimized", nextMinimized);
    syncFoundryUiVisibility();
    await repositionDock();
  } finally {
    delete dock.dataset.barAnimating;
    applyActionBarMinimized(dock);
  }
}
