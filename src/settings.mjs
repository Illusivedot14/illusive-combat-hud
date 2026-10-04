import { MODULE_ID } from "./common/constants.mjs";
import { applyPanelTheme } from "./common/panel-theme.mjs";
import { refreshHud, repositionHud } from "./common/render/core.mjs";
import { ICH_RENDER } from "./common/render/scopes.mjs";
import { applyTurnTrackerMinimized } from "./components/turn-tracker/turn-tracker-minimize.mjs";
import { BossBar } from "./components/boss-bar/boss-bar-init.mjs";
import { applyPartyRailMinimized } from "./components/party-status/party-status-minimize.mjs";
import { applyActionBarMinimized } from "./components/action-bar/action-bar-minimize.mjs";
import { syncFoundryUiVisibility } from "./components/action-bar/action-bar-foundry-ui.mjs";
import {
  ichMainSettingLabels,
  ichSettingChoices,
  registerSettingsSubmenu
} from "./common/i18n.mjs";
import { applyLayoutVariables } from "./common/layout.mjs";
import { DISPLAY_PROFILE_CHOICES } from "./common/hud-bounds.mjs";
const DISPLAY_KEYS = ["displayProfile", "mobileClientMode", "touchTableClient"];

const PARTY_KEYS = [
  "partyMaxPortraits",
  "partyScroll"
];

const TURN_TRACKER_KEYS = [
  "turnTrackerMaxCards",
  "turnTrackerScroll",
  "showTurnCardHpNumbers",
  "hideDefeatedCombatants",
  "carouselTurnAnimation",
  "enableTurnHelpers"
];

const BOSS_BAR_KEYS = [
  "bossBarResetPosition",
  "bossBarCurrentHpPath",
  "bossBarMaxHpPath",
  "bossBarWoundsSystem"
];

const ACTION_BAR_KEYS = [
  "enableTokenStatuses",
  "hudAnimation",
  "preferHudReactions",
  "midiConfigureDialog"
];

const MOBILE_KEYS = [
  "mobileClientMode",
  "mobileBackgroundEnabled",
  "mobileBackground",
  "mobileAccentColor"
];

function registerHidden(key, config) {
  game.settings.register(MODULE_ID, key, {
    scope: "client",
    config: false,
    ...config
  });
}

function registerWorldHidden(key, config) {
  game.settings.register(MODULE_ID, key, {
    scope: "world",
    config: false,
    ...config
  });
}

function registerMain(key, config) {
  game.settings.register(MODULE_ID, key, {
    scope: "client",
    config: true,
    ...ichMainSettingLabels(key),
    ...config
  });
}

export function registerSettings() {
  const layoutRefresh = () => repositionHud();
  const displayRefresh = () => {
    applyLayoutVariables();
    repositionHud();
  };
  const refreshParty = () => refreshHud(ICH_RENDER.PARTY);
  const refreshActionBar = () => refreshHud(ICH_RENDER.ACTION_BAR);
  const refreshActionBarLayout = () => refreshHud({ actionBar: true, layout: true });
  const refreshTurn = () => refreshHud(ICH_RENDER.TURN);
  const refreshTheme = () => {
    applyPanelTheme();
    refreshHud(ICH_RENDER.THEME);
  };

  registerHidden("displayProfile", {
    type: String,
    default: "auto",
    choices: ichSettingChoices("displayProfile", [...DISPLAY_PROFILE_CHOICES]),
    onChange: displayRefresh
  });

  registerSettingsSubmenu("displayMenu", {
    menuId: "display",
    titleKey: "settings.menus.display.title",
    icon: "fas fa-desktop",
    settingKeys: DISPLAY_KEYS
  });

  const layoutNumber = (key, def, min, max, onChange = layoutRefresh, scope = "client") => {
    const register = scope === "world" ? registerWorldHidden : registerHidden;
    register(key, {
      type: Number,
      default: def,
      range: { min, max, step: 1 },
      onChange
    });
  };

  const registerBool = (key, { default: def = true, onChange } = {}) => {
    registerHidden(key, { type: Boolean, default: def, onChange });
  };

  registerHidden("showResourceBar", { type: Boolean, default: true, onChange: refreshActionBar });
  // Legacy: turn highlight is always on during combat; setting kept for migration only.
  registerWorldHidden("showPartyCombatState", { type: Boolean, default: true, onChange: refreshParty });
  registerHidden("preferHudReactions", { type: Boolean, default: true });
  registerHidden("actionBarAlwaysOn", { type: Boolean, default: false, onChange: refreshActionBar });
  registerHidden("actionBarLastTokenId", { type: String, default: "", config: false });
  registerHidden("actionBarPinTokenId", { type: String, default: "", config: false, onChange: refreshActionBar });
  registerHidden("midiConfigureDialog", {
    type: Boolean,
    default: false,
    onChange: refreshActionBar
  });
  // Legacy: chrome hide is always tied to action-bar expand state.
  registerHidden("hideHotbarWhenVisible", {
    type: Boolean,
    default: true
  });
  registerHidden("enableTokenStatuses", {
    type: Boolean,
    default: true,
    onChange: refreshActionBarLayout
  });
  // Legacy placement key — icons are always top-right now.
  registerHidden("tokenStatusPlacement", {
    type: String,
    default: "topRight"
  });
  // Legacy keys kept hidden so old worlds don't error; features are always on.
  registerHidden("showActionResourceStrip", { type: Boolean, default: true });
  registerHidden("showStandardActions", { type: Boolean, default: true });
  registerHidden("showMovementModes", { type: Boolean, default: true });
  registerHidden("showEndTurn", { type: Boolean, default: true });
  registerHidden("abilitiesOutOfCombat", { type: Boolean, default: true });
  registerHidden("showMovementBar", { type: Boolean, default: true });
  registerHidden("statusHighlightDisposition", { type: Boolean, default: true });
  registerHidden("statusExpiringStyle", { type: String, default: "pulse" });
  registerHidden("statusBuffBorderColor", { type: String, default: "#5cb85c" });
  registerHidden("statusDebuffBorderColor", { type: String, default: "#d9534f" });
  registerHidden("partyRailAnimation", { type: Boolean, default: true });
  const refreshTurnResize = () => refreshHud(ICH_RENDER.TURN, { recenter: true });

  registerHidden("turnTrackerMaxCards", {
    type: Number,
    default: 9,
    range: { min: 1, max: 16, step: 1 },
    onChange: refreshTurnResize
  });
  registerBool("turnTrackerScroll", { default: true, onChange: refreshTurnResize });
  registerHidden("turnTrackerMinimized", {
    type: Boolean,
    default: false,
    onChange: () => applyTurnTrackerMinimized()
  });
  registerHidden("actionBarMinimized", {
    type: Boolean,
    default: false,
    onChange: () => {
      applyActionBarMinimized();
      syncFoundryUiVisibility();
      repositionHud();
    }
  });

  layoutNumber("partyOffsetX", 0, -300, 300, layoutRefresh, "world");
  layoutNumber("partyOffsetY", 0, -300, 300, layoutRefresh, "world");
  layoutNumber("partyScale", 100, 75, 125, layoutRefresh, "world");
  layoutNumber("tokenOffsetX", 0, -300, 300);
  layoutNumber("tokenOffsetY", 0, -300, 300);

  registerHidden("hudTheme", {
    type: String,
    choices: ichSettingChoices("hudTheme", ["bg3", "minimal"]),
    default: "bg3",
    onChange: refreshTheme
  });

  registerBool("showOrnateFrames", { onChange: refreshTheme });
  registerBool("showTokenAcSpeed", { onChange: refreshActionBar });
  registerBool("showTokenTempHp", { onChange: refreshActionBar });
  registerBool("colorHpBarByHealth", { onChange: refreshActionBar });
  registerBool("showYourTurnBanner", { onChange: refreshActionBar });
  registerBool("showResourceLabel", { onChange: refreshActionBar });

  registerHidden("tokenPanelOpacity", {
    type: Number,
    default: 100,
    range: { min: 50, max: 100, step: 5 },
    onChange: refreshTheme
  });

  registerHidden("partySortOrder", {
    type: String,
    choices: ichSettingChoices("partySortOrder", ["fixed", "initiative", "turnOrder", "alphabetical"]),
    default: "fixed",
    onChange: refreshParty
  });

  registerHidden("partyPlayerPrefs", {
    type: Object,
    default: {},
    onChange: () => {
      layoutRefresh();
      applyPartyRailMinimized();
      refreshParty();
    }
  });

  registerHidden("partyMinimized", {
    type: Boolean,
    default: false,
    onChange: () => applyPartyRailMinimized()
  });

  // Legacy: names are no longer shown on party portraits.
  registerWorldHidden("showPartyNames", { type: Boolean, default: false, onChange: refreshParty });
  // Per-client action-bar minimize/expand animation (GM and players).
  registerHidden("hudAnimation", {
    type: Boolean,
    default: true,
    onChange: () => applyActionBarMinimized()
  });

  registerHidden("partyRailOpacity", {
    type: Number,
    default: 100,
    range: { min: 50, max: 100, step: 5 },
    onChange: refreshTheme
  });

  // Per-client so GMs and players can each set max visible / scrolling.
  registerHidden("partyMaxPortraits", {
    type: Number,
    default: 4,
    range: { min: 1, max: 8, step: 1 },
    onChange: refreshParty
  });
  registerHidden("partyScroll", {
    type: Boolean,
    default: true,
    onChange: refreshParty
  });

  registerWorldHidden("partySize", {
    type: String,
    choices: ichSettingChoices("partySize", ["compact", "normal", "large"]),
    default: "normal",
    onChange: refreshTheme
  });

  // World / GM-only turn tracker options.
  registerWorldHidden("hideDefeatedCombatants", { type: Boolean, default: false, onChange: refreshTurn });
  registerWorldHidden("showTurnCardHpNumbers", { type: Boolean, default: true, onChange: refreshTurn });
  // Legacy: pulse is always on; setting kept for migration only.
  registerHidden("activeTurnPulse", { type: Boolean, default: true, onChange: refreshTheme });
  registerBool("carouselTurnAnimation", { default: true });
  registerBool("enableTurnHelpers", { default: false });

  // Legacy: wash always tracks remaining HP (party-style); setting kept for migration only.
  registerWorldHidden("damageWashBelowHalf", {
    type: Boolean,
    default: false,
    onChange: () => {
      refreshParty();
      refreshTurn();
    }
  });

  // Legacy: enemy health status is always shown to players now.
  registerHidden("showEnemyHp", {
    type: Boolean,
    default: true,
    scope: "world",
    onChange: refreshTurn
  });

  game.settings.register(MODULE_ID, "eventHistory", {
    name: "Recent Combat Events",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Main config order (DOM also reordered): enable → menu for each feature.
  registerMain("enablePartyStatus", {
    type: Boolean,
    default: true,
    onChange: refreshParty
  });

  registerSettingsSubmenu("partyMenu", {
    menuId: "party",
    titleKey: "settings.menus.party.title",
    icon: "fas fa-users",
    settingKeys: PARTY_KEYS
  });

  registerMain("enableTurnTracker", {
    type: Boolean,
    default: true,
    onChange: refreshTurn
  });

  registerSettingsSubmenu("turnTrackerMenu", {
    menuId: "turnTracker",
    titleKey: "settings.menus.turnTracker.title",
    icon: "fas fa-circle-notch",
    settingKeys: TURN_TRACKER_KEYS
  });

  registerMain("enableActionBar", {
    type: Boolean,
    default: true,
    onChange: refreshActionBar
  });

  registerSettingsSubmenu("actionBarMenu", {
    menuId: "actionBar",
    titleKey: "settings.menus.actionBar.title",
    icon: "fas fa-hand-fist",
    settingKeys: ACTION_BAR_KEYS
  });

  registerMain("enableBossBar", {
    type: Boolean,
    default: true,
    onChange: () => BossBar.update()
  });

  registerSettingsSubmenu("bossBarMenu", {
    menuId: "bossBar",
    titleKey: "settings.menus.bossBar.title",
    icon: "fas fa-pastafarianism",
    settingKeys: BOSS_BAR_KEYS
  });

  registerMain("enableMobileSheet", {
    type: Boolean,
    default: true,
    onChange: () => {
      import("./common/mobile-client.mjs")
        .then((m) => m.syncMobileClientSettings())
        .catch((err) => console.error(`${MODULE_ID} | mobile sheet toggle failed`, err));
    }
  });

  registerHidden("mobileClientMode", {
    type: String,
    default: "auto",
    choices: ichSettingChoices("mobileClientMode", ["auto", "forceMobile", "forceDesktop"]),
    onChange: () => {
      import("./common/mobile-client.mjs")
        .then((m) => m.syncMobileClientSettings())
        .catch((err) => console.error(`${MODULE_ID} | mobile mode change failed`, err));
    }
  });

  registerHidden("touchTableClient", {
    type: String,
    default: "auto",
    scope: "user",
    choices: ichSettingChoices("touchTableClient", ["auto", "on", "off"])
  });

  // Tracks whether Illusive set core.noCanvas so we can undo it on desktop.
  registerHidden("ichManagedNoCanvas", {
    type: Boolean,
    default: false
  });

  // Mobile backdrop + accent live in the Mobile Sheet Settings submenu.
  game.settings.register(MODULE_ID, "mobileBackgroundEnabled", {
    ...ichMainSettingLabels("mobileBackgroundEnabled"),
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      import("./components/mobile-sheet/mobile-background.mjs")
        .then((m) => m.renderMobileBackground())
        .catch((err) => console.error(`${MODULE_ID} | mobile background toggle failed`, err));
    }
  });

  game.settings.register(MODULE_ID, "mobileBackground", {
    ...ichMainSettingLabels("mobileBackground"),
    scope: "world",
    config: false,
    type: String,
    default: "",
    filePicker: "image",
    onChange: () => {
      import("./components/mobile-sheet/mobile-background.mjs")
        .then((m) => m.renderMobileBackground())
        .catch((err) => console.error(`${MODULE_ID} | mobile background change failed`, err));
    }
  });

  game.settings.register(MODULE_ID, "mobileAccentColor", {
    ...ichMainSettingLabels("mobileAccentColor"),
    scope: "client",
    config: false,
    type: String,
    default: "#b794f6",
    onChange: (value) => {
      import("./components/mobile-sheet/mobile-accent.mjs")
        .then((m) => m.applyMobileAccentColor(value))
        .catch((err) => console.error(`${MODULE_ID} | mobile accent change failed`, err));
    }
  });

  registerSettingsSubmenu("mobileMenu", {
    menuId: "mobile",
    titleKey: "settings.menus.mobile.title",
    icon: "fas fa-mobile-screen",
    settingKeys: MOBILE_KEYS
  });

  // Ephemeral pulse: show connection QR overlay on one player's client.
  registerWorldHidden("connectionQrPulse", {
    type: Object,
    default: { show: false, targetId: null, at: 0 }
  });
}
