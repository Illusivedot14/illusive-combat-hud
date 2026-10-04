import { MODULE_ID, MODULE_PATH, ichRenderTemplate } from "../../common/constants.mjs";
import { isIllusiveMobileMode } from "../../common/mobile-client.mjs";
import { buildMobileSheetContext } from "./mobile-sheet-data.mjs";
import { handleMobileSheetAction, MOBILE_SHEET_NO_REFRESH } from "./mobile-sheet-actions.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";
import { setMobileFocusedActorId } from "./mobile-focus.mjs";

const ROOT_ID = "ich-mobile-sheet-root";
const TEMPLATE = `${MODULE_PATH}/src/components/mobile-sheet/mobile-sheet.hbs`;
const STATE_HOOK = `${MODULE_ID}.mobileSheetState`;

let openActorId = null;
let currentTab = "abilities";
let bound = false;
let refreshQueued = false;
let pendingRefresh = false;
let actionBusy = false;
let actionBusyTimer = null;
let lastActionKey = "";
let lastActionAt = 0;
let pointerMoved = false;
let pointerStartY = 0;
/** @type {Map<string, number>} `${actorId}:${tab}` → scrollTop */
const tabScrollPositions = new Map();
/** Horizontal section-nav scrollLeft, keyed by actor id (do not snap on tab change). */
const navScrollPositions = new Map();

function rootEl() {
  return document.getElementById(ROOT_ID);
}

function ensureRoot() {
  let root = rootEl();
  if (root) return root;
  root = document.createElement("div");
  root.id = ROOT_ID;
  document.body.appendChild(root);
  return root;
}

function publishSheetState() {
  document.body.classList.toggle("ich-mobile-sheet-open", Boolean(openActorId));
  document.body.classList.toggle("ich-mobile-client", isIllusiveMobileMode());
  Hooks.callAll(STATE_HOOK, {
    open: Boolean(openActorId),
    actorId: openActorId
  });
}

function hideForeignMobileSheets() {
  document.querySelectorAll(
    ".mobile-sheet-drawer:not(.ich-illusive-mobile-sheet), .application.mobile-character-sheet, .mobile-character-sheet:not(.ich-illusive-mobile-sheet)"
  ).forEach((el) => {
    el.style.setProperty("display", "none", "important");
    el.setAttribute("data-ich-sheet-hidden", "1");
  });
}

function restoreForeignMobileSheets() {
  document.querySelectorAll("[data-ich-sheet-hidden]").forEach((el) => {
    el.style.removeProperty("display");
    el.removeAttribute("data-ich-sheet-hidden");
  });
}

export function isMobileSheetOpen() {
  return Boolean(openActorId);
}

export function getMobileSheetActor() {
  return openActorId ? game.actors.get(openActorId) : null;
}

/** @deprecated Kept for older intercept callers; always false now. */
export function shouldIgnoreSwipeCloseSideEffect() {
  return false;
}

export async function closeMobileSheet() {
  captureTabScroll();
  openActorId = null;
  restoreForeignMobileSheets();
  const root = rootEl();
  if (root) root.innerHTML = "";
  publishSheetState();
}

function scrollSectionEl() {
  return rootEl()?.querySelector(".sheet-section") ?? null;
}

function tabScrollKey(actorId = openActorId, tab = currentTab) {
  if (!actorId || !tab) return null;
  return `${actorId}:${tab}`;
}

function captureTabScroll(tab = currentTab) {
  const el = scrollSectionEl();
  const key = tabScrollKey(openActorId, tab);
  if (!el || !key) return;
  tabScrollPositions.set(key, el.scrollTop || 0);
}

function restoreTabScroll(tab = currentTab) {
  const el = scrollSectionEl();
  const key = tabScrollKey(openActorId, tab);
  if (!el || !key) return;
  const y = tabScrollPositions.get(key) ?? 0;
  el.scrollTop = y;
}

function bindSectionScrollCapture() {
  const el = scrollSectionEl();
  if (!el || el.dataset.ichScrollBound === "1") return;
  el.dataset.ichScrollBound = "1";
  el.addEventListener(
    "scroll",
    () => {
      const key = tabScrollKey(openActorId, currentTab);
      if (!key) return;
      tabScrollPositions.set(key, el.scrollTop || 0);
    },
    { passive: true }
  );
}

function restoreTabScrollSoon(tab = currentTab) {
  restoreTabScroll(tab);
  requestAnimationFrame(() => {
    restoreTabScroll(tab);
    requestAnimationFrame(() => restoreTabScroll(tab));
  });
  setTimeout(() => restoreTabScroll(tab), 50);
  setTimeout(() => restoreTabScroll(tab), 180);
}

function captureNavScroll() {
  const track = rootEl()?.querySelector(".section-nav-track");
  if (!track || !openActorId) return;
  navScrollPositions.set(openActorId, track.scrollLeft || 0);
}

function restoreNavScroll() {
  const track = rootEl()?.querySelector(".section-nav-track");
  if (!track || !openActorId) return;
  if (!navScrollPositions.has(openActorId)) return;
  track.scrollLeft = navScrollPositions.get(openActorId) || 0;
}

/** Safari-safe copy of element.dataset. */
function readDataset(el) {
  const out = {};
  if (!el?.dataset) return out;
  for (const key of Object.keys(el.dataset)) {
    out[key] = el.dataset[key];
  }
  return out;
}

function clearBusy() {
  actionBusy = false;
  if (actionBusyTimer) {
    clearTimeout(actionBusyTimer);
    actionBusyTimer = null;
  }
  if (pendingRefresh) {
    pendingRefresh = false;
    queueRefresh();
  }
}

function markBusy() {
  actionBusy = true;
  if (actionBusyTimer) clearTimeout(actionBusyTimer);
  actionBusyTimer = setTimeout(() => {
    actionBusy = false;
    actionBusyTimer = null;
    if (pendingRefresh) {
      pendingRefresh = false;
      queueRefresh();
    }
  }, 10000);
}

async function renderSheet({ capture = true } = {}) {
  ensureMobileSheetStyles();
  if (capture) captureTabScroll();
  captureNavScroll();

  const actor = getMobileSheetActor();
  const root = ensureRoot();
  if (!actor || !openActorId) {
    root.innerHTML = "";
    publishSheetState();
    return;
  }

  hideForeignMobileSheets();
  if (!openActorId) openActorId = actor.id;

  const context = buildMobileSheetContext(actor, { tab: currentTab });
  root.innerHTML = await ichRenderTemplate(TEMPLATE, context);
  publishSheetState();
  bindSectionScrollCapture();

  // Restore after layout so the section has a real scroll height
  restoreTabScrollSoon();
  // Keep tab bar where the user left it — never scrollIntoView / snap
  restoreNavScroll();
  requestAnimationFrame(() => restoreNavScroll());
}

function queueRefresh() {
  if (!openActorId || refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    void renderSheet();
  });
}

async function dispatchSheetAction(actionEl, event) {
  const action = actionEl.dataset?.action;
  if (!action) return;

  const key = [
    action,
    actionEl.dataset.tab || "",
    actionEl.dataset.ability || "",
    actionEl.dataset.skill || "",
    actionEl.dataset.itemId || "",
    actionEl.dataset.effectId || "",
    actionEl.dataset.type || "",
    actionEl.dataset.index || ""
  ].join("|");
  const now = Date.now();
  if (key === lastActionKey && now - lastActionAt < 450) return;
  lastActionKey = key;
  lastActionAt = now;

  if (actionBusy) return;

  if (action === "close") {
    await closeMobileSheet();
    return;
  }

  if (action === "tab") {
    const nextTab = actionEl.dataset.tab || "abilities";
    if (nextTab === currentTab) return;
    captureTabScroll(currentTab);
    captureNavScroll();
    currentTab = nextTab;
    await renderSheet({ capture: false });
    return;
  }

  const actor = getMobileSheetActor();
  if (!actor) return;

  markBusy();
  actionEl.classList.add("is-pressed");
  try {
    const dataset = readDataset(actionEl);
    const changed = await handleMobileSheetAction(actor, action, dataset, event);
    if (changed && !MOBILE_SHEET_NO_REFRESH.has(action)) queueRefresh();
    if (changed && (action === "use-item" || action === "inspect-item")) setTimeout(() => queueRefresh(), 400);
  } catch (err) {
    console.error(`${MODULE_ID} | mobile sheet action failed`, action, err);
  } finally {
    actionEl.classList.remove("is-pressed");
    clearBusy();
  }
}

function actionElFromEvent(event) {
  const root = rootEl();
  if (!root || !openActorId) return null;
  const actionEl = event.target?.closest?.("[data-action]");
  if (!actionEl || !root.contains(actionEl)) return null;
  if (actionEl.disabled) return null;
  return actionEl;
}

function onPointerDown(event) {
  if (!openActorId) return;
  if (event.target?.closest?.("#ich-mobile-carousel")) return;
  pointerMoved = false;
  pointerStartY = event.clientY ?? 0;
}

function onPointerMove(event) {
  if (!openActorId || pointerMoved) return;
  if (Math.abs((event.clientY ?? 0) - pointerStartY) > 12) pointerMoved = true;
}

function onSheetPointerUp(event) {
  if (!openActorId || pointerMoved) return;
  if (document.body.classList.contains("ich-mobile-roller-open")) return;
  if (event.pointerType === "mouse" && event.button != null && event.button !== 0) return;
  if (event.target?.closest?.("#ich-mobile-carousel")) return;
  if (event.target?.closest?.("#ich-mobile-dice-roller")) return;
  if (event.target?.closest?.("#ich-mobile-global-gear")) return;
  if (event.target?.closest?.(".ich-ms-overlay")) return;
  const actionEl = actionElFromEvent(event);
  if (!actionEl) return;
  event.preventDefault();
  event.stopPropagation();
  void dispatchSheetAction(actionEl, event);
}

function onDocumentUpdate(doc) {
  if (!openActorId) return;
  const actor = getMobileSheetActor();
  if (!actor) return;

  const relevant = doc === actor || doc?.parent === actor || doc?.actor === actor;
  if (!relevant) return;

  // Death saves (and other system rolls) update the actor while actionBusy is true —
  // defer refresh so success/failure pips still light up.
  if (actionBusy) {
    pendingRefresh = true;
    return;
  }
  queueRefresh();
}

export async function openMobileSheet(actor, { tab } = {}) {
  if (!actor) return false;
  // Roller greys the sheet out — still allow open/switch so carousel stays authoritative
  ensureMobileSheetStyles();
  openActorId = actor.id;
  setMobileFocusedActorId(actor.id);
  if (tab) currentTab = tab;
  await renderSheet();
  return true;
}

export function preferIllusiveMobileSheet() {
  return isIllusiveMobileMode();
}

export function bindMobileSheet() {
  if (bound) return;
  bound = true;

  ensureMobileSheetStyles();

  document.body.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  document.body.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
  document.body.addEventListener("pointerup", onSheetPointerUp, true);

  Hooks.on("updateActor", onDocumentUpdate);
  Hooks.on("updateItem", onDocumentUpdate);
  Hooks.on("createItem", onDocumentUpdate);
  Hooks.on("deleteItem", onDocumentUpdate);
  Hooks.on("updateActiveEffect", onDocumentUpdate);
  Hooks.on("createActiveEffect", onDocumentUpdate);
  Hooks.on("deleteActiveEffect", onDocumentUpdate);

  Hooks.on(`close${MODULE_ID}MobileSheet`, closeMobileSheet);
}

export { TEMPLATE as MOBILE_SHEET_TEMPLATE, STATE_HOOK as MOBILE_SHEET_STATE_HOOK };
