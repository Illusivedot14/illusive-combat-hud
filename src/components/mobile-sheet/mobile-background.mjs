/**
 * Sheet-only mobile backdrop (Swipe-equivalent of #swipe-vtt-nocanvas-bg).
 */

import { MODULE_ID } from "../../common/constants.mjs";
import { isIllusiveMobileMode } from "../../common/mobile-client.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";

const ROOT_ID = "ich-mobile-nocanvas-bg";

function getEnabled() {
  try {
    return game.settings.get(MODULE_ID, "mobileBackgroundEnabled") !== false;
  } catch {
    return true;
  }
}

function getImagePath() {
  try {
    return String(game.settings.get(MODULE_ID, "mobileBackground") ?? "").trim();
  } catch {
    return "";
  }
}

export function destroyMobileBackground() {
  document.getElementById(ROOT_ID)?.remove();
}

export function renderMobileBackground() {
  ensureMobileSheetStyles();

  if (!isIllusiveMobileMode() || !getEnabled()) {
    destroyMobileBackground();
    return;
  }

  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="ich-nocanvas-bg-image" aria-hidden="true"></div>
      <div class="ich-nocanvas-bg-vignette" aria-hidden="true"></div>
    `;
    const iface = document.getElementById("interface");
    if (iface?.parentNode) iface.parentNode.insertBefore(root, iface);
    else document.body.insertBefore(root, document.body.firstChild);
  }

  const img = root.querySelector(".ich-nocanvas-bg-image");
  if (!img) return;

  const path = getImagePath();
  if (path) {
    const url = path.replaceAll('"', "%22");
    img.style.backgroundImage = `url("${url}")`;
    root.classList.add("has-image");
  } else {
    img.style.backgroundImage = "";
    root.classList.remove("has-image");
  }
}

export function bindMobileBackground() {
  renderMobileBackground();
  Hooks.on("changeSetting", (data) => {
    if (data?.namespace !== MODULE_ID) return;
    if (data.key === "mobileBackgroundEnabled" || data.key === "mobileBackground") {
      renderMobileBackground();
    }
  });
}
