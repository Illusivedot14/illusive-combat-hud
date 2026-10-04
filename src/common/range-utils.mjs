import { ich } from "./i18n.mjs";
import { getMidiApi } from "./midi-qol.mjs";

export function checkAbilityRange(token, item, activity) {
  const targets = game.user.targets;
  if (!token || !targets?.size) return { inRange: true };

  const midi = getMidiApi();
  const act = activity ?? item?.system?.activities?.contents?.[0] ?? item?.system?.activities?.[0];
  if (!midi?.checkActivityRange || !act) return { inRange: true };

  const { result, reason } = midi.checkActivityRange(act, token, targets, false);
  const inRange = result === "normal" || result === "long";
  if (inRange && midi.canSense) {
    for (const target of targets) {
      if (!midi.canSense(token, target)) {
        return { inRange: false, reason: "noLOS", result: "fail" };
      }
    }
  }

  return { inRange, reason, result };
}

export function buildTargetListLabel() {
  const targets = [...(game.user.targets ?? [])];
  if (!targets.length) return "";
  const names = targets.map((t) => t.name).join(", ");
  return ich.target("list", { names });
}
