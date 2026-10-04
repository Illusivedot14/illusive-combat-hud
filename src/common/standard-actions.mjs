import { MODULE_ID } from "./constants.mjs";
import { ich } from "./i18n.mjs";
import { markActionUsed } from "./midi-qol.mjs";

export const STANDARD_ACTION_IDS = ["dash", "disengage", "dodge", "help", "hide", "ready"];

const STANDARD_ACTION_ICONS = {
  dash: "systems/dnd5e/icons/svg/activity/forward.svg",
  disengage: "systems/dnd5e/icons/svg/activity/utility.svg",
  dodge: "systems/dnd5e/icons/svg/statuses/dodging.svg",
  help: "icons/svg/aura.svg",
  hide: "systems/dnd5e/icons/svg/statuses/hiding.svg",
  ready: "systems/dnd5e/icons/svg/activity/order.svg"
};

export function buildStandardActions(actor, context = {}) {
  if (!actor || context.inCombat === false) return [];

  return STANDARD_ACTION_IDS.map((id) => ({
    id,
    itemId: `standard:${id}`,
    activityId: "",
    section: "action",
    activationType: "action",
    name: ich.action(id),
    img: STANDARD_ACTION_ICONS[id],
    needsTarget: id === "help",
    hasTargets: id === "help" ? (game.user.targets?.size ?? 0) > 0 : false,
    disabled: false,
    disabledReason: null,
    title: ich.action(id),
    isStandard: true
  }));
}

async function spendAction(actor) {
  await markActionUsed(actor);
}

async function createRoundEffect(actor, name, icon, statuses = []) {
  const combat = game.combat;
  const effectData = {
    name,
    icon,
    statuses,
    duration: combat?.started
      ? { rounds: 1, startRound: combat.round, startTurn: combat.turn }
      : { seconds: 6 }
  };
  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}

export async function executeStandardAction(token, actionId) {
  const actor = token?.actor;
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  const label = ich.action(actionId);

  switch (actionId) {
    case "dash":
      await spendAction(actor);
      await actor.setFlag(MODULE_ID, "dashing", true);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
        content: `<strong>${label}</strong> — ${actor.name} doubles movement this turn.`
      });
      return true;

    case "disengage":
      await spendAction(actor);
      await createRoundEffect(actor, label, STANDARD_ACTION_ICONS.disengage);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
        content: `<strong>${label}</strong> — ${actor.name} avoids opportunity attacks until their next turn.`
      });
      return true;

    case "dodge":
      await spendAction(actor);
      await actor.toggleStatusEffect("dodging");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
        content: `<strong>${label}</strong> — ${actor.name} is dodging.`
      });
      return true;

    case "help": {
      const target = [...(game.user.targets ?? [])][0];
      if (!target?.actor) {
        ui.notifications.warn(ich.warning("needAlly"));
        return false;
      }
      await spendAction(actor);
      await createRoundEffect(
        target.actor,
        `${label} from ${actor.name}`,
        STANDARD_ACTION_ICONS.help
      );
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
        content: `<strong>${label}</strong> — ${actor.name} helps ${target.name} (advantage on the next ability check).`
      });
      return true;
    }

    case "hide":
      await spendAction(actor);
      await actor.toggleStatusEffect("hiding");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
        content: `<strong>${label}</strong> — ${actor.name} attempts to hide.`
      });
      return true;

    case "ready": {
      const flavor = await new Promise((resolve) => {
        new Dialog({
          title: label,
          content: `<p>${ich.action("readyPrompt")}</p><textarea id="ich-ready-text" rows="3" style="width:100%"></textarea>`,
          buttons: {
            ok: {
              icon: "<i class='fas fa-check'></i>",
              label: ich.ui("ready"),
              callback: (html) => resolve(html.find("#ich-ready-text").val()?.trim() || null)
            },
            cancel: {
              icon: "<i class='fas fa-times'></i>",
              label: ich.ui("cancel"),
              callback: () => resolve(null)
            }
          },
          default: "ok"
        }, { width: 360 }).render(true);
      });

      if (!flavor) return false;
      await spendAction(actor);
      await actor.setFlag(MODULE_ID, "readied", flavor);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
        content: `<strong>${label}</strong> — ${actor.name}: ${flavor}`
      });
      return true;
    }

    default:
      return false;
  }
}

export async function clearTurnFlags(actor) {
  if (!actor) return;
  await actor.unsetFlag(MODULE_ID, "dashing");
  await actor.unsetFlag(MODULE_ID, "readied");
}
