import { ich } from "../../common/i18n.mjs";
import { getCombatantForToken, findCombatantForToken } from "../../common/action-economy.mjs";
import { getViewedCombat, getActiveCombatant } from "../../common/combat.mjs";
import { toggleMovementDropdown, toggleStatusDropdown, toggleLightDropdown, toggleRollsDropdown } from "./action-bar-util-dropdown.mjs";

export {
  LIGHT_PRESETS,
  isTokenLightOn,
  collectLightPresetChoices,
  applyLightPreset,
  toggleTokenLight
} from "./action-bar-light.mjs";

export async function openActorSheet(actor) {
  if (!actor) return false;
  await actor.sheet?.render(true);
  return true;
}

/**
 * Token Config is gated by Foundry's "Configure Token Settings" permission.
 * Owning the actor/character is not enough — players get a permission error otherwise.
 */
export function canOpenTokenConfig(token) {
  if (!token?.document || !game.user) return false;
  if (game.user.isGM) return true;
  if (game.user.can?.("TOKEN_CONFIGURE")) return true;
  const sheet = token.document.sheet;
  if (sheet && typeof sheet.isVisible === "boolean") return sheet.isVisible;
  return false;
}

/** Open Foundry token configuration (not the character sheet). */
export async function openTokenConfig(token) {
  const doc = token?.document;
  if (!doc) return false;

  if (!canOpenTokenConfig(token)) {
    return false;
  }

  if (typeof doc.sheet?.render === "function") {
    await doc.sheet.render(true);
    return true;
  }

  const ConfigClass = foundry?.applications?.sheets?.TokenConfig ?? globalThis.TokenConfig;
  if (!ConfigClass) return false;

  try {
    await new ConfigClass(doc).render(true);
  } catch (_err) {
    await new ConfigClass({ document: doc }).render(true);
  }
  return true;
}

export async function toggleTokenVisibility(token) {
  if (!token?.document) return false;
  if (!game.user.isGM) {
    ui.notifications.warn(ich.warning("gmOnly"));
    return false;
  }
  await token.document.update({ hidden: !token.document.hidden });
  return true;
}

export async function showMovementOptions(anchor, token) {
  return toggleMovementDropdown(anchor, token);
}

export async function showStatusOptions(anchor, token) {
  return toggleStatusDropdown(anchor, token);
}

export async function showLightOptions(anchor, token) {
  return toggleLightDropdown(anchor, token);
}

export async function showRollsOptions(anchor, token) {
  return toggleRollsDropdown(anchor, token);
}

async function runShortRest(actor) {
  if (typeof actor?.shortRest === "function") {
    await actor.shortRest();
    return true;
  }
  if (typeof game.dnd5e?.documents?.Actor5e?.prototype?.shortRest === "function") {
    await actor.shortRest?.();
    return true;
  }
  ui.notifications.warn(ich.actionBar("restUnavailable"));
  return false;
}

async function runLongRest(actor) {
  if (typeof actor?.longRest === "function") {
    await actor.longRest();
    return true;
  }
  if (typeof game.dnd5e?.documents?.Actor5e?.prototype?.longRest === "function") {
    await actor.longRest?.();
    return true;
  }
  ui.notifications.warn(ich.actionBar("restUnavailable"));
  return false;
}

export async function promptRest(actor) {
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: ich.actionBar("restTitle") },
    content: `<p>${ich.actionBar("restPrompt")}</p>`,
    buttons: [
      {
        action: "short",
        label: ich.actionBar("shortRest"),
        icon: "fas fa-hourglass-half",
        callback: () => "short"
      },
      {
        action: "long",
        label: ich.actionBar("longRest"),
        icon: "fas fa-bed",
        callback: () => "long"
      },
      {
        action: "cancel",
        label: ich.ui("cancel"),
        icon: "fas fa-times",
        callback: () => null
      }
    ],
    default: "short"
  });

  if (choice === "short") return runShortRest(actor);
  if (choice === "long") return runLongRest(actor);
  return false;
}

export async function enterCombatWithToken(token) {
  if (!token?.actor) return false;

  let combat = game.combat;
  if (!combat) {
    if (typeof Combat?.canUserCreate === "function" ? !Combat.canUserCreate(game.user) : !game.user?.isGM) {
      ui.notifications.warn(ich.actionBar("tipEnterCombatNoPermission"));
      return false;
    }
    const created = await Combat.create({ scene: canvas.scene?.id, combatants: [] });
    combat = created.combat ?? created;
  } else if (!game.user?.isGM && !combat.canUserModify?.(game.user, "update")) {
    ui.notifications.warn(ich.actionBar("tipEnterCombatNoPermission"));
    return false;
  }

  let combatant = findCombatantForToken(token);
  if (combatant) {
    return false;
  }

  const created = await combat.createEmbeddedDocuments("Combatant", [{
    tokenId: token.id,
    actorId: token.actor.id,
    hidden: false
  }]);
  combatant = created[0];

  if (combatant && combatant.initiative == null) {
    await combat.rollInitiative([combatant.id]);
  }

  if (!combat.started) {
    ui.notifications.info(ich.actionBar("joinedCombat", { name: token.name }));
  }

  return true;
}

export async function leaveCombatWithToken(token) {
  const combatant = findCombatantForToken(token);
  if (!combatant) {
    ui.notifications.info(ich.actionBar("notInCombat"));
    return false;
  }
  await combatant.delete();
  return true;
}

export async function handleCombatFlowButton(token) {
  const combat = getViewedCombat() ?? game.combat;
  if (!combat?.started) {
    if (findCombatantForToken(token)) return false;
    return enterCombatWithToken(token);
  }

  const combatant = getCombatantForToken(token);
  if (!combatant) {
    return enterCombatWithToken(token);
  }

  // Foundry v14: `combat.combatant` (via `_current`) can lag one beat behind
  // `combat.turns[combat.turn]` after turn changes — do not trust it here.
  const active = getActiveCombatant(combat);
  const isActiveTurn = Boolean(
    active
    && (active.id === combatant.id || (active.tokenId && active.tokenId === token.id))
  );

  if (!isActiveTurn) {
    ui.notifications.warn(ich.turn("notYourTurn"));
    return false;
  }

  return combat.nextTurn();
}

export async function handleUtilityButton(action, token) {
  if (!token?.actor) return false;

  switch (action) {
    case "configure":
      return openTokenConfig(token);
    case "sheet":
      return openActorSheet(token.actor);
    case "light":
      return false;
    case "rolls":
      return false;
    case "movement":
      return false;
    case "status":
      return false;
    case "visibility":
      return toggleTokenVisibility(token);
    case "rest": {
      if (findCombatantForToken(token)) {
        return leaveCombatWithToken(token);
      }
      if (getViewedCombat()?.started ?? game.combat?.started) {
        ui.notifications.warn(ich.actionBar("restDuringCombat"));
        return false;
      }
      return promptRest(token.actor);
    }
    default:
      return false;
  }
}
