/**
 * Client-wide mobile settings gear (UI theme + Dice So Nice).
 * Fixed to the viewport — not part of any character sheet.
 */

import { isIllusiveMobileMode } from "../../common/mobile-client.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";
import {
  openAccentColorOverlay,
  openDiceSoNiceSettings,
  openMobileSettingsMenu
} from "./mobile-sheet-dialogs.mjs";

const GEAR_ID = "ich-mobile-global-gear";
let bound = false;

function dropSheet() {
  document.getElementById("ich-mobile-sheet-root")?.classList.add("ich-mobile-sheet-behind-dialog");
}

function raiseSheet() {
  document.getElementById("ich-mobile-sheet-root")?.classList.remove("ich-mobile-sheet-behind-dialog");
}

async function runSettingsFlow() {
  ensureMobileSheetStyles();
  dropSheet();
  const choice = await openMobileSettingsMenu();
  if (choice === "ui-color") {
    try {
      await openAccentColorOverlay();
    } finally {
      raiseSheet();
    }
    return;
  }
  if (choice === "dice") {
    dropSheet();
    try {
      await openDiceSoNiceSettings();
    } finally {
      raiseSheet();
    }
    return;
  }
  raiseSheet();
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
