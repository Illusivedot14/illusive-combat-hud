/**
 * Early mobile boot — hide Foundry chrome before the sheet UI mounts.
 * Keep this free of settings imports so it can run at module evaluate time.
 */

const BOOT_KEY = "ich-mobile-boot";
const BOOT_STYLE_ID = "ich-mobile-boot-css";

function isNativeMobileHeuristic() {
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent ?? "");
  const coarse = navigator.maxTouchPoints > 0
    && typeof matchMedia === "function"
    && matchMedia("(pointer: coarse)").matches;
  return Boolean(uaMobile || coarse);
}

/** CSS that must exist before Foundry paints sidebar/hotbar/etc. */
export const MOBILE_BOOT_CSS = `
html.ich-mobile-boot,
html.ich-mobile-boot body,
body.ich-mobile-client {
  background: #121116 !important;
}
html.ich-mobile-boot #board,
html.ich-mobile-boot #ui-left,
html.ich-mobile-boot #ui-right,
html.ich-mobile-boot #ui-top,
html.ich-mobile-boot #ui-bottom,
html.ich-mobile-boot #sidebar,
html.ich-mobile-boot #navigation,
html.ich-mobile-boot #players,
html.ich-mobile-boot #hotbar,
html.ich-mobile-boot #fps,
html.ich-mobile-boot #logo,
html.ich-mobile-boot #pause,
html.ich-mobile-boot #ich-hud-overlay,
html.ich-mobile-boot #ich-action-bar-dock,
html.ich-mobile-boot #ich-party-status,
html.ich-mobile-boot #ich-turn-tracker,
html.ich-mobile-boot #ich-token-statuses,
html.ich-mobile-boot .favbar,
html.ich-mobile-boot #controls,
html.ich-mobile-boot #scene-controls,
html.ich-mobile-boot #camera-views,
body.ich-mobile-client #board,
body.ich-mobile-client #ui-left,
body.ich-mobile-client #ui-right,
body.ich-mobile-client #ui-top,
body.ich-mobile-client #ui-bottom,
body.ich-mobile-client #sidebar,
body.ich-mobile-client #navigation,
body.ich-mobile-client #players,
body.ich-mobile-client #hotbar,
body.ich-mobile-client #fps,
body.ich-mobile-client #logo,
body.ich-mobile-client #pause,
body.ich-mobile-client #ich-hud-overlay,
body.ich-mobile-client #ich-action-bar-dock,
body.ich-mobile-client #ich-party-status,
body.ich-mobile-client #ich-turn-tracker,
body.ich-mobile-client #ich-token-statuses,
body.ich-mobile-client .favbar,
body.ich-mobile-client #controls,
body.ich-mobile-client #scene-controls,
body.ich-mobile-client #camera-views {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
html.ich-mobile-boot #interface {
  background: #121116 !important;
}
`;

export function injectMobileBootCss() {
  let el = document.getElementById(BOOT_STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = BOOT_STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = MOBILE_BOOT_CSS;
}

/**
 * Call as early as possible (module evaluate + start of init).
 * Sticky session flag keeps chrome hidden across the noCanvas reload.
 */
export function applyEarlyMobileBootClass() {
  injectMobileBootCss();

  let sticky = null;
  try { sticky = sessionStorage.getItem(BOOT_KEY); } catch { /* ignore */ }

  if (sticky === "0") {
    document.documentElement.classList.remove("ich-mobile-boot");
    return false;
  }

  const want = sticky === "1" || isNativeMobileHeuristic();
  if (want) {
    document.documentElement.classList.add("ich-mobile-boot");
    document.body?.classList?.add("ich-mobile-client");
    try { sessionStorage.setItem(BOOT_KEY, "1"); } catch { /* ignore */ }
    return true;
  }

  document.documentElement.classList.remove("ich-mobile-boot");
  return false;
}

/** Persist the resolved mode so the next paint/reload stays dark. */
export function persistMobileBootFlag(active) {
  try {
    sessionStorage.setItem(BOOT_KEY, active ? "1" : "0");
  } catch { /* ignore */ }
  document.documentElement.classList.toggle("ich-mobile-boot", Boolean(active));
  document.body?.classList?.toggle("ich-mobile-client", Boolean(active));
  if (active) injectMobileBootCss();
}
