import { MODULE_ID } from "../../common/constants.mjs";
import { settingOn } from "../../common/hud-settings.mjs";
import { BOSS_BAR_I18N } from "./boss-bar-main.mjs";
import { BossBarConfiguration } from "./app/BossBarConfiguration.mjs";

export function initBossBarConfig() {
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!settingOn("enableBossBar")) return;

    controls.tokens.tools.bossBar = {
      name: "bossBar",
      title: `${BOSS_BAR_I18N}.controls.bossUI.name`,
      icon: "fas fa-pastafarianism",
      visible: game.user.isGM,
      button: true,
      onClick: async () => {
        await BossBarConfiguration.cleanUpActors();
        new BossBarConfiguration().render(true);
      }
    };
  });
}
