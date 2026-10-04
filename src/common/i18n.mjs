/**
 * Illusive Combat HUD — internationalization (single entry point).
 *
 * Usage:
 *   import { ich, initI18n, ichSetting } from "../common/i18n.mjs";
 *   await initI18n();
 *   ich.warning("noOwner");
 *   ichSetting("enableActionBar", "name");
 */

export { initI18n, ichLocalize, ichResolve, ichCore } from "./i18n/core.mjs";
export {
  ichSetting,
  ichMenu,
  ichSectionLabel,
  ichSettingChoices,
  ichMainSettingLabels
} from "./i18n/labels.mjs";
export { ich } from "./i18n/catalog.mjs";
export {
  bindI18nHooks,
  buildSettingField,
  registerSettingsSubmenu,
  IchSubsettingsForm
} from "./i18n/settings-ui.mjs";
