/**
 * Client-wide mobile settings gear (UI theme + Dice So Nice).
 * Fixed to the viewport — not part of any character sheet.
 */

import { isIllusiveMobileMode } from "../../common/mobile-client.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";
import {
  openAccentColorOverlay,
  openDiceSoNiceSettings,
  openMobileSettingsMenu,
  withSheetDropped
} from "./mobile-sheet-dialogs.mjs";

const GEAR_ID = "ich-mobile-global-gear";
let bound = false;

async function runSettingsFlow() {
  ensureMobileSheetStyles();
  await withSheetDropped(async () => {
    const choice = await openMobileSettingsMenu();
    if (choice === "ui-color") await openAccentColorOverlay();
    else if (choice === "dice") await openDiceSoNiceSettings();
  });
}

export function renderMobileGlobalGear() {
  ensureMobileSheetStyles();
  if (!isIllusiveMobileMode()) {
    document.getElementById(GEAR_ID)?.remove();
    return;
  }

  let btn = document.getElementById(GEAR_ID);
  if (!btn) {
    btn = document.createElement("button");
    btn.id = GEAR_ID;
    btn.type = "button";
    btn.className = "ich-mobile-global-gear";
    btn.title = "Client settings";
    btn.setAttribute("aria-label", "Client settings");
    btn.innerHTML = `<i class="fa-solid fa-gear" aria-hidden="true"></i>`;
    document.body.appendChild(btn);
  }
}

export function bindMobileGlobalGear() {
  if (bound) return;
  bound = true;

  document.body.addEventListener(
    "pointerup",
    (ev) => {
      const btn = ev.target?.closest?.(`#${GEAR_ID}`);
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      void runSettingsFlow();
    },
    true
  );

  Hooks.on("ready", () => {
    if (isIllusiveMobileMode()) renderMobileGlobalGear();
  });
}
