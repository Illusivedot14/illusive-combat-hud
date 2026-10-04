import { MODULE_ID, MODULE_PATH, ichLoadTemplates } from "./common/constants.mjs";
import { initI18n, bindI18nHooks } from "./common/i18n.mjs";
import { bindRenderHooks, refreshHud, ICH_RENDER } from "./common/render.mjs";
import { registerSettings } from "./settings.mjs";
import { bindActionBarInteractions } from "./components/action-bar/action-bar.mjs";
import { bindTokenStatusInteractions } from "./components/token-statuses/token-statuses.mjs";
import { bindLayoutHooks } from "./common/layout.mjs";
import { bindCombatTurnHooks } from "./common/combat-turn.mjs";
import { bindPanelThemeHooks } from "./common/panel-theme.mjs";
import { migrateStalePartyPlayerPrefs } from "./common/party-player-prefs.mjs";
import { initBossBar, onBossBarReady } from "./components/boss-bar/boss-bar-init.mjs";
import { bindMobileSheet, MOBILE_SHEET_TEMPLATE } from "./components/mobile-sheet/mobile-sheet.mjs";
import { bootMobileClientUi } from "./components/mobile-sheet/mobile-carousel.mjs";
import { bindMobileSheetDiceBroadcast } from "./components/mobile-sheet/mobile-sheet-dsn.mjs";
import {
  bindMobileClientHooks,
  isIllusiveMobileMode,
  syncMobileClientSettings,
  suppressMobileClientNotices
} from "./common/mobile-client.mjs";
import { applyEarlyMobileBootClass, persistMobileBootFlag } from "./common/mobile-boot.mjs";
import { bindCanvasHooks } from "./common/hooks/index.mjs";
import { bindOverlayGuardHooks } from "./common/overlay-guard.mjs";
import { bindConnectionQrOverlay, showConnectionQrs, purgeConnectionQrTiles } from "./components/connection-qr/connection-qr-overlay.mjs";

// Hide Foundry chrome on phones as soon as this module evaluates (before init awaits).
applyEarlyMobileBootClass();

Hooks.once("init", async () => {
  if (!game.modules.get("midi-qol")?.active) {
    console.error(`${MODULE_ID} | Midi-QOL is required but not active.`);
  }

  await initI18n();
  bindI18nHooks();
  bindCanvasHooks();
  bindOverlayGuardHooks();
  registerSettings();

  // After settings exist — lock boot flag so chrome stays hidden (or force desktop).
  if (isIllusiveMobileMode()) {
    persistMobileBootFlag(true);
    document.documentElement.classList.remove("ich-mobile-force-desktop");
  } else {
    persistMobileBootFlag(false);
    document.documentElement.classList.add("ich-mobile-force-desktop");
  }

  initBossBar();
  await ichLoadTemplates([
    `${MODULE_PATH}/src/components/party-status/party-status.hbs`,
    `${MODULE_PATH}/src/components/token-statuses/token-statuses.hbs`,
    `${MODULE_PATH}/src/components/token-statuses/set-duration.hbs`,
    `${MODULE_PATH}/src/components/action-bar/action-bar-full.hbs`,
    `${MODULE_PATH}/src/components/turn-tracker/turn-tracker.hbs`,
    `${MODULE_PATH}/src/components/turn-tracker/add-event.hbs`,
    `${MODULE_PATH}/src/components/action-bar/action-bar-abilities.hbs`,
    `${MODULE_PATH}/src/templates/settings-submenu.hbs`,
    MOBILE_SHEET_TEMPLATE
  ]);

  // Swipe init path: if mobile, align core.noCanvas immediately (reload on ready if needed).
  if (isIllusiveMobileMode()) {
    persistMobileBootFlag(true);
    try {
      const have = game.settings.get("core", "noCanvas") === true;
      if (!have) {
        await game.settings.set("core", "noCanvas", true);
        await game.settings.set(MODULE_ID, "ichManagedNoCanvas", true);
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | init noCanvas sync failed`, err);
    }
  }
});

Hooks.once("setup", () => {
  if (isIllusiveMobileMode()) persistMobileBootFlag(true);
  // Before ClientIssues posts permanent phone viewport errors.
  suppressMobileClientNotices();
});

Hooks.once("ready", async () => {
  bindMobileClientHooks();
  bindConnectionQrOverlay();
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = { ...(mod.api ?? {}), showConnectionQrs, purgeConnectionQrTiles };
  // Swipe ready path: mismatch → set + window.reload()
  if (await syncMobileClientSettings()) return;

  bindMobileSheet();
  bindMobileSheetDiceBroadcast();
  await bootMobileClientUi();

  if (isIllusiveMobileMode()) {
    console.info(`${MODULE_ID} | mobile sheets-only active | noCanvas=${game.settings.get("core", "noCanvas")}`);
    return;
  }

  bindLayoutHooks();
  bindPanelThemeHooks();
  try {
    await migrateStalePartyPlayerPrefs();
  } catch (err) {
    console.error(`${MODULE_ID} | party prefs migrate failed`, err);
  }
  try {
    await onBossBarReady();
  } catch (err) {
    console.error(`${MODULE_ID} | boss bar ready failed`, err);
  }
  bindRenderHooks();
  bindTokenStatusInteractions();
  bindActionBarInteractions();
  bindCombatTurnHooks();
  refreshHud(ICH_RENDER.ALL);
});
