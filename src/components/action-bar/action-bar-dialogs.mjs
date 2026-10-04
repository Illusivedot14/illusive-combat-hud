import { settingOn } from "../../common/hud-settings.mjs";
import {
  attachReactionDialog,
  getReactionContext
} from "../../common/reaction-context.mjs";

const hijackers = [];

export function registerActionBarDialogHijack(name, predicate, handler) {
  hijackers.push({ name, predicate, handler });
}

let bound = false;

export function bindActionBarDialogHijacks(onReactionRefresh) {
  if (bound) return;
  bound = true;

  registerActionBarDialogHijack(
    "ReactionDialog",
    () => settingOn("preferHudReactions"),
    (app) => {
      const ctx = getReactionContext();
      if (!ctx || ctx.actorId !== app.data?.actor?.id) return false;
      attachReactionDialog(app);
      onReactionRefresh?.();
      return true;
    }
  );

  Hooks.on("renderApplication", (app) => {
    if (!settingOn("enableActionBar")) return;
    const name = app?.constructor?.name;
    if (!name) return;

    for (const entry of hijackers) {
      if (entry.name !== name) continue;
      if (!entry.predicate()) continue;
      if (entry.handler(app)) break;
    }
  });
}
