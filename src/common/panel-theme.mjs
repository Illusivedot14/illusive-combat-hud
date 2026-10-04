import { MODULE_ID } from "./constants.mjs";
import { settingOn } from "./hud-settings.mjs";
import { refreshHud } from "./render/core.mjs";
import { ICH_RENDER } from "./render/scopes.mjs";

export function applyPanelTheme() {
  const root = document.documentElement;
  const theme = game.settings.get(MODULE_ID, "hudTheme") ?? "bg3";
  const ornate = settingOn("showOrnateFrames");
  const partyOpacity = (game.settings.get(MODULE_ID, "partyRailOpacity") ?? 100) / 100;
  const tokenOpacity = (game.settings.get(MODULE_ID, "tokenPanelOpacity") ?? 100) / 100;
  const partySize = game.settings.get(MODULE_ID, "partySize") ?? "normal";

  document.body.classList.toggle("ich-theme-minimal", theme === "minimal");
  document.body.classList.toggle("ich-theme-bg3", theme !== "minimal");
  document.body.classList.toggle("ich-ornate-disabled", !ornate);
  document.body.classList.remove("ich-active-pulse-off");
  document.body.dataset.ichPartySize = partySize;

  root.style.setProperty("--ich-party-opacity", String(partyOpacity));
  root.style.setProperty("--ich-token-opacity", String(tokenOpacity));
}

let hooksBound = false;

export function bindPanelThemeHooks() {
  applyPanelTheme();
  if (hooksBound) return;
  hooksBound = true;

  Hooks.on("changeSetting", (data) => {
    if (data.namespace !== MODULE_ID) return;
    const themeKeys = new Set([
      "hudTheme", "showOrnateFrames", "partyRailOpacity", "tokenPanelOpacity",
      "partySize"
    ]);
    if (themeKeys.has(data.key)) {
      applyPanelTheme();
      refreshHud(ICH_RENDER.THEME);
    }
  });
}
