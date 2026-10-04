/**
 * Mobile client helpers — detection + owned list + noCanvas mirror Swipe VTT.
 * Source patterns taken from swipe-vtt.js DeviceUtils / MobileSheetDrawer._initOwnedCharacters
 * and the init/ready noCanvas sync + reload.
 */

import { MODULE_ID } from "./constants.mjs";
import { settingOn } from "./hud-settings.mjs";
import { applyEarlyMobileBootClass, persistMobileBootFlag } from "./mobile-boot.mjs";

const RELOAD_GUARD = "ich-mobile-client-reload";

/** Swipe: DeviceUtils.isNativeMobile() */
export function isNativeMobile() {
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent ?? "");
  const coarse = navigator.maxTouchPoints > 0
    && typeof matchMedia === "function"
    && matchMedia("(pointer: coarse)").matches;
  return Boolean(uaMobile || coarse);
}

/**
 * Swipe: DeviceUtils.isMobile()
 * (desktopModeEnabled forced-true path omitted — we use mobileClientMode instead)
 */
export function detectMobileDevice() {
  const mode = getMobileClientMode();
  if (mode === "forceMobile") return true;
  if (mode === "forceDesktop") return false;
  return isNativeMobile();
}

export function getMobileClientMode() {
  try {
    return game.settings.get(MODULE_ID, "mobileClientMode") ?? "auto";
  } catch {
    return "auto";
  }
}

export function isMobileClient() {
  return detectMobileDevice();
}

export function isIllusiveMobileMode() {
  return settingOn("enableMobileSheet") && isMobileClient();
}

export function desktopHudEnabled() {
  return !isIllusiveMobileMode();
}

function applyBodyClass(active) {
  persistMobileBootFlag(active);
}

/**
 * Swipe sheets-only: if disableCanvas/noCanvas mismatch → set core.noCanvas and reload.
 * Returns true when a reload was triggered.
 */
export async function syncMobileClientSettings() {
  if (!game.settings) return false;

  const wantNoCanvas = isIllusiveMobileMode();
  applyBodyClass(wantNoCanvas);

  let haveNoCanvas = false;
  try {
    haveNoCanvas = game.settings.get("core", "noCanvas") === true;
  } catch {
    return false;
  }

  let managed = false;
  try {
    managed = game.settings.get(MODULE_ID, "ichManagedNoCanvas") === true;
  } catch {
    managed = false;
  }

  // Already correct
  if (wantNoCanvas === haveNoCanvas) {
    if (wantNoCanvas && !managed) {
      try { await game.settings.set(MODULE_ID, "ichManagedNoCanvas", true); } catch { /* ignore */ }
    }
    sessionStorage.removeItem(RELOAD_GUARD);
    return false;
  }

  // Enter sheets-only (Swipe: set noCanvas + location.reload)
  if (wantNoCanvas && !haveNoCanvas) {
    const guard = sessionStorage.getItem(RELOAD_GUARD);
    if (guard === "enter") {
      // Previous reload did not stick — clear guard and try once more
      sessionStorage.removeItem(RELOAD_GUARD);
    }
    try {
      // Sticky boot flag BEFORE reload so the next paint never shows desktop chrome
      persistMobileBootFlag(true);
      await game.settings.set("core", "noCanvas", true);
      await game.settings.set(MODULE_ID, "ichManagedNoCanvas", true);
      try {
        await game.settings.set("core", "performanceMode", 0);
        await game.settings.set("core", "maxFPS", 30);
        await game.settings.set("core", "lightAnimation", false);
        await game.settings.set("core", "visionAnimation", false);
      } catch { /* optional core knobs */ }
      sessionStorage.setItem(RELOAD_GUARD, "enter");
      window.location.reload();
      return true;
    } catch (err) {
      console.error(`${MODULE_ID} | failed to enable noCanvas`, err);
      return false;
    }
  }

  // Leave sheets-only only if Illusive turned it on
  if (!wantNoCanvas && haveNoCanvas && managed) {
    try {
      persistMobileBootFlag(false);
      await game.settings.set("core", "noCanvas", false);
      await game.settings.set(MODULE_ID, "ichManagedNoCanvas", false);
      sessionStorage.setItem(RELOAD_GUARD, "leave");
      window.location.reload();
      return true;
    } catch (err) {
      console.error(`${MODULE_ID} | failed to disable noCanvas`, err);
      return false;
    }
  }

  sessionStorage.removeItem(RELOAD_GUARD);
  return false;
}

/**
 * Owned mobile carousel actors.
 * Ownership check matches Swipe (`testUserPermission(..., "OWNER")`).
 * Includes every owned character (not only scene tokens) so the full party
 * stays visible, plus any other OWNER actor that has a token on the current scene.
 */
export function getMobileSheetActors() {
  const primaryId = game.user?.character?.id ?? null;
  const scene = game.scenes?.current ?? game.scenes?.active ?? null;
  const tokenActorIds = new Set(
    (scene?.tokens ?? []).map((t) => t.actorId).filter(Boolean)
  );

  const byId = new Map();
  for (const actor of game.actors ?? []) {
    if (!actor?.testUserPermission?.(game.user, "OWNER")) continue;
    const onScene = tokenActorIds.has(actor.id);
    const isCharacter = actor.type === "character";
    if (!isCharacter && !onScene) continue;
    byId.set(actor.id, actor);
  }

  const sorted = [...byId.values()].sort((a, b) => {
    if (a.id === primaryId) return -1;
    if (b.id === primaryId) return 1;
    if (a.type !== b.type) return a.type === "character" ? -1 : 1;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""), game.i18n?.lang);
  });

  const max = 16; // Swipe: oc+1 with oc=15
  return sorted.length > max ? sorted.slice(0, max) : sorted;
}

export function bindMobileClientHooks() {
  applyBodyClass(isIllusiveMobileMode());
  suppressMobileClientNotices();

  Hooks.on("changeSetting", (data) => {
    if (data.namespace === MODULE_ID && (data.key === "enableMobileSheet" || data.key === "mobileClientMode")) {
      void syncMobileClientSettings();
    }
  });
}

const SUPPRESSED_MOBILE_NOTICE_KEYS = new Set([
  "INFO.SceneViewCanvasDisabled",
  "SCENE.GenerateThumbNoCanvas",
  "ERROR.RESOLUTION.Window",
  "ERROR.RESOLUTION.Scale",
  "ERROR.RESOLUTION.Screen",
  "BackgroundTextureSize"
]);

let mobileNoticesPatched = false;

/**
 * Sheet-only mobile never uses the canvas / desktop viewport — mute Foundry toasts
 * about disabled canvas, tiny phone windows, and oversized textures.
 */
export function suppressMobileClientNotices() {
  if (!isIllusiveMobileMode()) return;
  if (mobileNoticesPatched || !ui?.notifications?.notify) return;
  mobileNoticesPatched = true;

  const original = ui.notifications.notify.bind(ui.notifications);
  ui.notifications.notify = function ichNotify(message, type = "info", options = {}) {
    if (shouldSuppressMobileNotice(message)) return null;
    return original(message, type, options);
  };

  // Permanent resolution errors may already be queued before our ready hook.
  clearExistingSuppressedNotifications();
}

function shouldSuppressMobileNotice(message) {
  if (!isIllusiveMobileMode()) return false;
  const raw = String(message ?? "");
  if (SUPPRESSED_MOBILE_NOTICE_KEYS.has(raw)) return true;
  if (/game Canvas is disabled/i.test(raw)) return true;
  if (/Disable Game Canvas/i.test(raw) && /thumbnail/i.test(raw)) return true;
  if (/usable window dimensions/i.test(raw)) return true;
  if (/requires a screen resolution/i.test(raw)) return true;
  if (/maximum texture size/i.test(raw)) return true;
  if (/background texture with dimensions/i.test(raw)) return true;
  return false;
}

function clearExistingSuppressedNotifications() {
  const root = document.getElementById("notifications");
  if (!root) return;
  for (const el of [...root.querySelectorAll(".notification")]) {
    const text = el.textContent ?? "";
    if (shouldSuppressMobileNotice(text)) el.remove();
  }
}
