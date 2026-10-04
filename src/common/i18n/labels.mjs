import { ichLocalize } from "./core.mjs";

export function ichSetting(settingKey, field) {
  return ichLocalize(`settings.${settingKey}.${field}`);
}

export function ichMenu(menuKey, field) {
  return ichLocalize(`settings.menus.${menuKey}.${field}`);
}

export function ichSectionLabel(sectionId) {
  return ichLocalize(`sections.${sectionId}`);
}

export function ichSettingChoices(settingKey, choiceKeys) {
  return Object.fromEntries(choiceKeys.map((choice) => [choice, ichSetting(settingKey, choice)]));
}

export function ichMainSettingLabels(settingKey) {
  return {
    name: ichSetting(settingKey, "name"),
    hint: ichSetting(settingKey, "hint")
  };
}
