import { ichLocalize } from "./core.mjs";
import { ichSectionLabel } from "./labels.mjs";

function group(prefix) {
  return (id, data = {}) => ichLocalize(`${prefix}.${id}`, data);
}

/**
 * Grouped HUD string accessors. Prefer these over raw ichLocalize key strings.
 */
export const ich = {
  t: ichLocalize,
  section: ichSectionLabel,
  action: group("actions"),
  movement: group("movement"),
  target: group("target"),
  reaction: group("reaction"),
  turn: group("turn"),
  warning: group("warnings"),
  reason: group("reasons"),
  empty: group("empty"),
  ui: group("ui"),
  partyMenu: group("partyMenu"),
  partyRail: group("partyRail"),
  partyPlayerPrefs: group("partyPlayerPrefs"),
  currentToken: group("currentToken"),
  turnTracker: group("turnTracker"),
  actionBar: group("actionBar")
};
