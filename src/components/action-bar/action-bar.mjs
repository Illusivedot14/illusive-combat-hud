import { MODULE_ID, MODULE_PATH, ichRenderTemplate } from "../../common/constants.mjs";
import { buildMemberData, isTokenTurn } from "../../common/actor-data.mjs";
import { applyActorPortrait } from "../../common/portrait-thumb.mjs";
import { buildPassiveScores, buildVisionSummary } from "../../common/actor-stats.mjs";
import { buildCombatToolbarSections, useAbility } from "../../common/action-data.mjs";
import {
  buildEconomyPips,
  buildLegendaryPips,
  buildMovementData,
  buildIdleMovementData,
  getCombatantForToken,
  findCombatantForToken,
  setMovementMode
} from "../../common/action-economy.mjs";
import { canSpendEconomy, getEconomyAvailability, toggleEconomySpent, isItemsEconomySpent, toggleItemsEconomySpent } from "../../common/midi-qol.mjs";
import { allowsExtraAttackSwing, shouldForceTargetPick } from "../../common/ability-utils.mjs";
import { ich } from "../../common/i18n.mjs";
import { buildTargetListLabel } from "../../common/range-utils.mjs";
import { executeStandardAction, clearTurnFlags } from "../../common/standard-actions.mjs";
import { dropConcentrationFromHud } from "../../common/combat-actions.mjs";
import {
  clearReactionPrompt,
  getActionBarToken,
  getReactionContext,
  isReactionActorForUser,
  passReaction,
  startReactionPrompt
} from "../../common/reaction-context.mjs";
import {
  buildVitalityIcon,
  getDeathSaves,
  isPartyDeathSaving,
  isPartyDefeated,
  isPartyStabilized,
  markActorStable,
  syncActorStableFlag
} from "../../common/party-combat.mjs";
import {
  computeActionBarScale,
  getHudBand,
  isPortraitDisplay
} from "../../common/hud-bounds.mjs";
import { getUiLocalRect, getUiViewportSize } from "../../common/viewport.mjs";
import { settingOn } from "../../common/hud-settings.mjs";
import { desktopHudEnabled } from "../../common/mobile-client.mjs";
import { getViewedCombat } from "../../common/combat.mjs";
import { refreshHud } from "../../common/render/core.mjs";
import { ICH_RENDER } from "../../common/render/scopes.mjs";
import { definePanel } from "../../common/render/define-panel.mjs";
import { renderTokenStatuses, positionTokenStatuses } from "../token-statuses/token-statuses.mjs";
import { syncFoundryUiVisibility, isFoundryHotbarHidden } from "./action-bar-foundry-ui.mjs";
import {
  handleCombatFlowButton,
  handleUtilityButton,
  canOpenTokenConfig,
  showMovementOptions,
  showStatusOptions,
  showLightOptions,
  showRollsOptions,
  isTokenLightOn
} from "./action-bar-token-actions.mjs";
import { closeUtilDropdownUnlessStatus, relinkStatusDropdownAnchor, toggleEconomySpentDropdown } from "./action-bar-util-dropdown.mjs";
import { buildAbilityGroups } from "./action-bar-groups.mjs";
import { bindAbilityTooltips } from "./ability-tooltip.mjs";
import { bindActionBarUiTooltips, hideActionBarUiTooltip } from "./action-bar-ui-tooltip.mjs";
import {
  buildDrawerEntries,
  isDrawerOpen,
  rollDrawerEntry,
  toggleDrawer
} from "./action-bar-drawer.mjs";
import {
  activateWeaponSet,
  buildWeaponSetContext,
  snapshotWeaponSet
} from "./action-bar-weapon-sets.mjs";
import { pickCastSlotLevel } from "./action-bar-cast-picker.mjs";
import {
  buildTargetPickView,
  cancelTargetPick,
  confirmTargetPick,
  getRequiredTargetCount,
  getTargetPickState,
  handleControlTokenDuringTargetPick,
  isTargetPickActive,
  startTargetPick
} from "./action-bar-target-picker.mjs";
import { bindActionBarDialogHijacks } from "./action-bar-dialogs.mjs";
import {
  isTokenPinned,
  rememberActionBarToken,
  setPinnedTokenId
} from "../../common/action-bar-token.mjs";
import { toggleFavorite } from "./action-bar-prefs.mjs";
import { applyActionBarMinimized, expandActionBarForSelection, toggleActionBarMinimized } from "./action-bar-minimize.mjs";
import { handlePortraitHpContextMenu } from "./action-bar-hp-adjust.mjs";
import { buildActionBarResources } from "../../common/actor-resources.mjs";
import { panCanvasToToken, clearUserTargets } from "../../common/token-actions.mjs";

const ABILITIES_TEMPLATE = `${MODULE_PATH}/src/components/action-bar/action-bar-abilities.hbs`;
const ECONOMY_KEYS = { standard: "S", action: "A", bonus: "B", reaction: "R", legendary: "L" };
const ECONOMY_TYPES = new Set(["action", "bonus", "reaction"]);
const PORTRAIT_RING_RADIUS = 75;
const PORTRAIT_RING_SIZE = 171;
const FULL_TAB_LABELS = {
  standard: () => ich.ui("tabItemInteraction"),
  action: () => ich.section("action"),
  bonus: () => ich.ui("tabBonusShort"),
  reaction: () => ich.section("reaction"),
  legendary: () => ich.section("legendary")
};

let clickBound = false;
let midiHooksBound = false;
let selectedSection = null;
let selectedTokenId = null;
let renderedSectionIds = new Set();
let renderedSectionTokenId = null;
let favoritesOnly = false;

export function positionActionBar() {
  const dock = document.getElementById("ich-action-bar-dock");
  const hotbar = document.getElementById("hotbar");
  if (!dock || dock.hidden) {
    syncFoundryUiVisibility();
    return;
  }

  const band = getHudBand();
  const scale = computeActionBarScale(band);
  const offsetX = game.settings.get(MODULE_ID, "tokenOffsetX") ?? 0;
  const offsetY = game.settings.get(MODULE_ID, "tokenOffsetY") ?? 0;
  const portrait = isPortraitDisplay();

  syncFoundryUiVisibility();

  // When the action bar is tucked away, sit above Foundry's restored hotbar.
  const hotbarRect = isFoundryHotbarHidden() ? null : (hotbar ? getUiLocalRect(hotbar) : null);
  const uiH = getUiViewportSize().h;
  dock.style.bottom = hotbarRect != null
    ? `${Math.max(12, uiH - hotbarRect.top + 8 + offsetY)}px`
    : `${(portrait ? 6 : 12) + offsetY}px`;

  dock.style.left = `${Math.round(band.center + offsetX)}px`;
  dock.style.right = "auto";
  dock.style.transform = `translateX(-50%) scale(${scale})`;
  dock.style.transformOrigin = "bottom center";

  positionTokenStatuses();
}

function requestPanelRefresh() {
  refreshHud(ICH_RENDER.ACTION_BAR);
}

async function renderActionBarDock(dock) {
  const bar = document.getElementById("ich-action-bar");
  if (!bar) return;

  dock.classList.add("ich-action-bar-full-layout");

  const token = getActionBarToken() ?? null;
  // Selecting a token always reveals the bar, even if it was minimized/hidden.
  if (token && canvas?.tokens?.controlled?.length) {
    await expandActionBarForSelection(dock);
  } else {
    applyActionBarMinimized(dock);
  }

  await paintActionBarContent(bar, token);
  await renderTokenStatuses();
  dock.hidden = bar.hidden;
  const minimize = dock.querySelector(".ich-action-bar-minimize");
  if (minimize) minimize.hidden = bar.hidden;
  syncFoundryUiVisibility();
  positionActionBar();
  applyActionBarMinimized(dock);
}

export const actionBarPanel = definePanel({
  id: "ich-action-bar-dock",
  mask: "actionBar",
  shell: `<div id="ich-action-bar-dock"><button type="button" class="ich-action-bar-minimize" data-action="toggle-action-bar-minimize" aria-label="Minimize action bar" data-tooltip="Minimize action bar" hidden><i class="fas fa-chevron-down" aria-hidden="true"></i></button><div class="ich-action-bar-motion"><div id="ich-action-bar" hidden></div></div></div>`,
  enabled: () => settingOn("enableActionBar") && desktopHudEnabled(),
  position: positionActionBar,
  render: renderActionBarDock
});

function buildPortraitRingData(hp, showTempHp) {
  const circumference = 2 * Math.PI * PORTRAIT_RING_RADIUS;
  const hpLength = (hp.basePercent / 100) * circumference;
  const tempLength = showTempHp && hp.temp > 0 ? (hp.tempPercent / 100) * circumference : 0;
  const center = PORTRAIT_RING_SIZE / 2;

  return {
    r: PORTRAIT_RING_RADIUS,
    size: PORTRAIT_RING_SIZE,
    center,
    circumference,
    hpLength,
    hpGap: Math.max(0, circumference - hpLength),
    tempLength,
    tempGap: Math.max(0, circumference - tempLength),
    tempOffset: circumference - hpLength,
    showTemp: showTempHp && hp.temp > 0 && tempLength > 0
  };
}

function buildSpeedRingData(movement) {
  if (!movement) return null;
  const circumference = 2 * Math.PI * PORTRAIT_RING_RADIUS;
  const fillLength = (movement.percent / 100) * circumference;
  const center = PORTRAIT_RING_SIZE / 2;
  return {
    r: PORTRAIT_RING_RADIUS,
    size: PORTRAIT_RING_SIZE,
    center,
    fillLength,
    fillGap: Math.max(0, circumference - fillLength),
    percent: movement.percent,
    isDashing: Boolean(movement.isDashing)
  };
}

/** Previous / mid-animation speed visuals (DOM swaps otherwise flash and jolt). */
let lastSpeedVisual = {
  fillLength: null,
  fillGap: null,
  modes: Object.create(null)
};

function parseStrokeDasharray(value) {
  const parts = String(value ?? "")
    .split(/[,\s]+/)
    .map((part) => parseFloat(part))
    .filter((n) => Number.isFinite(n));
  if (parts.length < 2) return null;
  return { fillLength: parts[0], fillGap: parts[1] };
}

function readScaleX(el) {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return null;
  const matrix = transform.match(/matrix\(([^)]+)\)/);
  if (matrix) {
    const scale = parseFloat(matrix[1].split(",")[0]);
    return Number.isFinite(scale) ? Math.clamp(scale, 0, 1) : null;
  }
  const matrix3d = transform.match(/matrix3d\(([^)]+)\)/);
  if (matrix3d) {
    const scale = parseFloat(matrix3d[1].split(",")[0]);
    return Number.isFinite(scale) ? Math.clamp(scale, 0, 1) : null;
  }
  return null;
}

/** Capture the on-screen (possibly mid-transition) speed visuals before a re-render. */
function captureLiveSpeedVisual(container) {
  const visual = {
    fillLength: lastSpeedVisual.fillLength,
    fillGap: lastSpeedVisual.fillGap,
    modes: { ...lastSpeedVisual.modes }
  };
  if (!container) return visual;

  const fill = container.querySelector(".ich-mock-speed-ring-fill");
  if (fill) {
    const parsed = parseStrokeDasharray(
      getComputedStyle(fill).strokeDasharray || fill.getAttribute("stroke-dasharray")
    );
    if (parsed) {
      visual.fillLength = parsed.fillLength;
      visual.fillGap = parsed.fillGap;
    }
  }

  for (const btn of container.querySelectorAll(".ich-mock-speed-mode[data-mode]")) {
    const modeId = btn.dataset.mode;
    const bar = btn.querySelector(".ich-mock-speed-mode-fill");
    if (!bar || !modeId) continue;
    const scale = readScaleX(bar);
    if (scale != null) visual.modes[modeId] = scale;
  }

  return visual;
}

function applySpeedVisualSeed(context, fromVisual) {
  if (context.speedRing) {
    const useFrom = fromVisual?.fillLength != null && fromVisual?.fillGap != null;
    context.speedRing.displayFillLength = useFrom ? fromVisual.fillLength : context.speedRing.fillLength;
    context.speedRing.displayFillGap = useFrom ? fromVisual.fillGap : context.speedRing.fillGap;
  }

  const modes = context.movement?.modes;
  if (!modes?.length) return;

  for (const mode of modes) {
    const next = Math.clamp(Number(mode.percent ?? 100), 0, 100) / 100;
    const from = fromVisual?.modes?.[mode.id];
    mode.displayScale = from != null ? from : next;
  }
}

/**
 * Paint already shows the live "from" seed. Ease to the new remaining values
 * on the next frames so the browser never flashes the final state first.
 */
function animateSpeedDrain(container, speedRing) {
  if (!container) return;

  const fill = container.querySelector(".ich-mock-speed-ring-fill");
  if (fill && speedRing) {
    const nextDash = `${speedRing.fillLength} ${speedRing.fillGap}`;
    const seeded = fill.getAttribute("stroke-dasharray");
    if (seeded !== nextDash) {
      fill.style.transition = "none";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.transition = "";
          fill.setAttribute("stroke-dasharray", nextDash);
        });
      });
    }
    lastSpeedVisual.fillLength = speedRing.fillLength;
    lastSpeedVisual.fillGap = speedRing.fillGap;
  } else if (!speedRing) {
    lastSpeedVisual.fillLength = null;
    lastSpeedVisual.fillGap = null;
  }

  const nextModes = Object.create(null);
  for (const btn of container.querySelectorAll(".ich-mock-speed-mode[data-mode]")) {
    const modeId = btn.dataset.mode;
    const bar = btn.querySelector(".ich-mock-speed-mode-fill");
    if (!bar || !modeId) continue;

    const nextPercent = Math.clamp(Number(btn.dataset.modePercent ?? 100), 0, 100) / 100;
    const seeded = readScaleX(bar) ?? nextPercent;
    if (Math.abs(seeded - nextPercent) > 0.001) {
      bar.style.transition = "none";
      bar.style.transform = `scaleX(${seeded})`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.transition = "";
          bar.style.transform = `scaleX(${nextPercent})`;
        });
      });
    } else {
      bar.style.transform = `scaleX(${nextPercent})`;
    }
    nextModes[modeId] = nextPercent;
  }
  lastSpeedVisual.modes = nextModes;
}

function inCombat(token) {
  return Boolean(getViewedCombat()?.started && getCombatantForToken(token));
}

function isMyTurn(token) {
  return isTokenTurn(token);
}

function resetSectionForToken(token) {
  const tokenId = token?.id ?? null;
  if (tokenId !== selectedTokenId) {
    selectedTokenId = tokenId;
    selectedSection = null;
    lastSpeedVisual = { fillLength: null, fillGap: null, modes: Object.create(null) };
  }
}

function setReactionPrompt(actor, activities, triggerType, options) {
  if (!actor?.id || !isReactionActorForUser(actor)) return;

  startReactionPrompt(actor, activities, triggerType, options);
  selectedSection = "reaction";
  ui.notifications.info(ich.reaction("prompt", { name: actor.name }), { localize: false });
  requestPanelRefresh();
}

function buildTargetHint(token, abilities) {
  const needsTarget = abilities.filter((ability) => ability.needsTarget);
  if (!needsTarget.length) return "";

  const count = game.user.targets?.size ?? 0;
  if (count > 0) {
    const list = buildTargetListLabel();
    return list || (count === 1 ? ich.target("one") : ich.target("many", { count }));
  }
  return ich.target("none");
}

function getReactionBanner() {
  const context = getReactionContext();
  if (!context) return "";
  return ich.reaction("banner", { trigger: context.triggerType ?? "reaction" });
}

function buildSectionData(sections, { actor, combatActive, economyAvailability, legendaryPips, reactionCtx }) {
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    tabLabel: FULL_TAB_LABELS[section.id]?.() ?? section.label,
    key: ECONOMY_KEYS[section.id] ?? section.label.charAt(0),
    abilities: section.abilities,
    available: combatActive
      ? (section.id === "standard"
        ? (economyAvailability.action ?? true)
        : (economyAvailability[section.id] ?? true))
      : true,
    isSelected: false,
    legendaryRemaining: section.id === "legendary" ? legendaryPips?.remaining : null,
    reactionPrompt: section.id === "reaction" && reactionCtx?.actorId === actor.id
  }));
}

/** Reconciles the module-level selectedSection against what's on screen (dropping a stale
 *  selection, defaulting to Action when available), flags the chosen entry, and returns it. */
function resolveSelectedSection(sectionData) {
  if (selectedSection && !sectionData.some((section) => section.id === selectedSection)) {
    selectedSection = null;
  }
  if (sectionData.length && !selectedSection) {
    selectedSection = sectionData.some((section) => section.id === "action")
      ? "action"
      : sectionData[0].id;
  }

  for (const section of sectionData) section.isSelected = section.id === selectedSection;
  return sectionData.find((section) => section.id === selectedSection) ?? null;
}

/** Portrait member data + HP ring geometry for the full layout. */
function buildFullMember(token, { showResourceBar, showTempHp }) {
  const member = buildMemberData(token);
  if (!showResourceBar) member.resource = null;
  return { member, rings: buildPortraitRingData(member.hp, showTempHp) };
}

function pipPoint(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const center = PORTRAIT_RING_SIZE / 2;
  return {
    cx: Number((center + PORTRAIT_RING_RADIUS * Math.cos(rad)).toFixed(2)),
    cy: Number((center + PORTRAIT_RING_RADIUS * Math.sin(rad)).toFixed(2))
  };
}

function buildDeathSavePips(deathSaves) {
  if (!deathSaves) return null;

  // Top arc = successes, bottom arc = failures (SVG angles: 0° right, clockwise-down positive y).
  // Spread ±28° from the poles (tighter cluster on the ring).
  const successAngles = [-118, -90, -62];
  const failureAngles = [62, 90, 118];

  return {
    successes: successAngles.map((angle, index) => ({
      ...pipPoint(angle),
      index,
      filled: index < (deathSaves.success ?? 0)
    })),
    failures: failureAngles.map((angle, index) => ({
      ...pipPoint(angle),
      index,
      filled: index < (deathSaves.failure ?? 0)
    }))
  };
}

function applyDeathSaveFields(member, token) {
  member.isDeathSaving = isPartyDeathSaving(token);
  member.isDefeated = isPartyDefeated(token);
  member.isStabilized = isPartyStabilized(token);
  member.vitalityIcon = buildVitalityIcon(member);
  member.deathSaves = member.isDeathSaving ? getDeathSaves(token.actor) : null;
  member.deathSavePips = buildDeathSavePips(member.deathSaves);
  member.canRollDeathSave = Boolean(member.isDeathSaving && token?.actor?.isOwner);
  return member;
}

function canUserManageCombatants(combat = getViewedCombat() ?? game.combat) {
  if (game.user?.isGM) return true;
  if (!combat) {
    if (typeof Combat?.canUserCreate === "function") return Combat.canUserCreate(game.user);
    return Boolean(game.user?.can?.("COMBAT_CREATE"));
  }
  if (typeof combat.canUserModify === "function") return combat.canUserModify(game.user, "update");
  return Boolean(combat.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3));
}

function buildEnterCombatButtonState(canJoin) {
  if (!canJoin) {
    return {
      label: ich.actionBar("enterCombat"),
      shortLabel: ich.actionBar("enterCombatShort"),
      icon: "fa-swords",
      disabled: true,
      waiting: false,
      tone: "enter",
      tipDetail: ich.actionBar("tipEnterCombatNoPermission")
    };
  }
  return {
    label: ich.actionBar("enterCombat"),
    shortLabel: ich.actionBar("enterCombatShort"),
    icon: "fa-swords",
    disabled: false,
    waiting: false,
    tone: "enter",
    tipDetail: ich.actionBar("tipCombatReady")
  };
}

function buildCombatButtonState(token, combatStarted, combatActive) {
  const inEncounter = Boolean(findCombatantForToken(token));
  const canJoin = canUserManageCombatants();

  if (!combatStarted) {
    if (inEncounter) {
      return {
        label: ich.actionBar("waitingForCombat"),
        shortLabel: ich.actionBar("waitingForCombatShort"),
        icon: "fa-hourglass-half",
        disabled: true,
        waiting: true,
        tone: "wait",
        tipDetail: ich.actionBar("tipCombatDisabled")
      };
    }
    return buildEnterCombatButtonState(canJoin);
  }

  if (!combatActive) {
    if (inEncounter) {
      return {
        label: ich.actionBar("waitingForCombat"),
        shortLabel: ich.actionBar("waitingForCombatShort"),
        icon: "fa-hourglass-half",
        disabled: true,
        waiting: true,
        tone: "wait",
        tipDetail: ich.actionBar("tipCombatDisabled")
      };
    }
    return buildEnterCombatButtonState(canJoin);
  }

  const myTurn = isMyTurn(token);
  return {
    label: myTurn ? ich.turn("end") : ich.actionBar("waitingForTurn"),
    shortLabel: myTurn ? ich.turn("endShort") : ich.actionBar("waitingForTurnShort"),
    icon: myTurn ? "fa-forward-step" : "fa-hourglass-half",
    disabled: !myTurn,
    waiting: !myTurn,
    tone: myTurn ? "end" : "wait",
    tipDetail: myTurn ? ich.actionBar("tipCombatReady") : ich.actionBar("tipCombatDisabled")
  };
}

function buildEconomyMap(token, inCombat = false) {
  const actor = token?.actor;
  const available = { action: true, bonus: true, reaction: true };
  if (inCombat) {
    for (const entry of buildEconomyPips(token)) {
      available[entry.id] = entry.available !== false;
    }
  } else if (actor) {
    // Still reflect manual / midi spent state out of combat when flags are set.
    const live = getEconomyAvailability(actor);
    available.action = live.action;
    available.bonus = live.bonus;
    available.reaction = live.reaction;
  }
  return {
    ...available,
    itemsSpent: isItemsEconomySpent(actor),
    actionSpent: !available.action,
    bonusSpent: !available.bonus,
    reactionSpent: !available.reaction
  };
}

function buildActionBarLabels(activeSectionLabel) {
  return {
    movementRemaining: ich.movement("remaining"),
    movementDashing: ich.movement("dashing"),
    movementMode: ich.movement("mode"),
    movementGestalt: ich.movement("gestalt"),
    reactionPass: ich.reaction("pass"),
    noAbilities: ich.empty("noAbilities", { section: activeSectionLabel }),
    noSections: ich.empty("noAbilities", { section: ich.ui("actionEconomy") }),
    outOfCombatEmpty: ich.empty("outOfCombat"),
    notInCombat: ich.empty("notInCombat"),
    actionEconomy: ich.ui("actionEconomy"),
    openSheet: ich.ui("openSheet"),
    showLocation: ich.ui("showLocation"),
    configure: ich.actionBar("configureToken"),
    tabIconSheet: ich.ui("tabIconSheet"),
    armorClass: ich.ui("armorClass"),
    walkSpeed: ich.ui("walkSpeed"),
    currentHp: ich.ui("currentHp"),
    items: ich.ui("tabItemInteraction"),
    action: ich.section("action"),
    bonus: ich.section("bonus"),
    reaction: ich.section("reaction"),
    legendary: ich.section("legendary"),
    utilities: ich.actionBar("utilities"),
    vitals: ich.actionBar("vitals"),
    passiveScores: ich.actionBar("passiveScores"),
    hotbar: ich.actionBar("hotbar"),
    toggleLight: ich.actionBar("toggleLight"),
    rolls: ich.actionBar("rolls"),
    toggleMovement: ich.actionBar("toggleMovement"),
    assignStatus: ich.actionBar("assignStatus"),
    toggleVisibility: ich.actionBar("toggleVisibility"),
    tempHp: ich.ui("tempHp"),
    favorite: ich.actionBar("favorite"),
    unfavorite: ich.actionBar("unfavorite"),
    targetPickCanvasHint: ich.actionBar("targetPickCanvasHint"),
    resources: ich.actionBar("resources")
  };
}

function buildMovementTitle(movement, inCombat) {
  if (!movement) return "";
  const parts = [ich.movement("remaining")];
  if (movement.isGestalt) parts.push(ich.movement("gestalt"));
  if (movement.isDashing) parts.push(ich.movement("dashing"));
  if (inCombat) parts.push(`${movement.remainingFeet}/${movement.maxFeet} ${movement.modeLabel}`);
  else parts.push(`${movement.poolMax ?? movement.maxFeet} ${movement.modeLabel}`);
  return parts.join(" — ");
}

function buildMovementTipDetail(movement) {
  const lines = [
    movement?.modeLabel ? `${movement.modeLabel}.` : null,
    movement?.isGestalt ? ich.movement("gestalt") : null,
    ich.actionBar("tipMovementUtilDetail")
  ].filter(Boolean);

  if (movement?.modes?.length) {
    for (const mode of movement.modes) {
      lines.push(`${mode.label}: ${mode.remaining}/${mode.max}`);
    }
  }
  return lines.join(" ");
}

async function buildAbilitiesHtml(token, actor, combatActive, activeSection) {
  if (!activeSection) {
    return `<p class="ich-action-empty ich-mock-ability-empty">${ich.empty("noAbilities", { section: ich.ui("actionEconomy") })}</p>`;
  }

  const abilityGroups = buildAbilityGroups(
    activeSection.abilities,
    actor,
    activeSection.id,
    { favoritesOnly }
  );

  return ichRenderTemplate(ABILITIES_TEMPLATE, {
    abilityGroups,
    selectedSection: activeSection.id,
    emptyLabel: combatActive
      ? ich.empty("noAbilities", { section: activeSection.label })
      : ich.empty("noAbilitiesOoc", { section: activeSection.tabLabel ?? activeSection.label }),
    labels: {
      favorite: ich.actionBar("favorite"),
      unfavorite: ich.actionBar("unfavorite"),
      colName: ich.actionBar("colName"),
      colRange: ich.actionBar("colRange"),
      colHit: ich.actionBar("colHit"),
      colEffect: ich.actionBar("colEffect"),
      colNotes: ich.actionBar("colNotes")
    }
  });
}

function buildGemTip(label, available, inCombat) {
  const detail = [
    ich.actionBar("tipGemFilter", { section: label }),
    !inCombat
      ? null
      : (available ? ich.actionBar("tipGemAvailable") : ich.actionBar("tipGemSpent"))
  ].filter(Boolean).join(" ");

  return { title: label, detail };
}

function buildUiTips({ labels, inCombat, economy, economySelected, visionSummary, member, movement, movementTitle, utilityRestLabel, restDisabled, showLeaveCombat, combatButton, legendary }) {
  const hpLine = member?.hp
    ? ich.actionBar("tipHpDetail", {
      current: member.hp.value,
      temp: member.hp.temp ?? 0,
      max: member.hp.max
    })
    : "";

  return {
    gemItems: buildGemTip(labels.items, true, inCombat),
    gemAction: buildGemTip(labels.action, economy.action, inCombat),
    gemBonus: buildGemTip(labels.bonus, economy.bonus, inCombat),
    gemReaction: buildGemTip(labels.reaction, economy.reaction, inCombat),
    gemLegendary: legendary
      ? {
        title: labels.legendary,
        detail: [
          ich.actionBar("tipGemFilter", { section: labels.legendary }),
          ich.actionBar("tipLegendaryDetail", {
            remaining: legendary.remaining,
            max: legendary.max
          })
        ].filter(Boolean).join(" ")
      }
      : null,
    sheet: {
      title: labels.openSheet,
      detail: ich.actionBar("tipSheetDetail")
    },
    configure: {
      title: labels.configure,
      detail: ich.actionBar("tipConfigureDetail")
    },
    light: {
      title: labels.toggleLight,
      detail: ich.actionBar("tipLightDetail")
    },
    rolls: {
      title: labels.rolls,
      detail: ich.actionBar("tipRollsDetail")
    },
    movementUtil: {
      title: movement?.modeLabel
        ? `${labels.toggleMovement} — ${movement.modeLabel}`
        : labels.toggleMovement,
      detail: movement?.modeLabel
        ? `${movement.modeLabel}. ${ich.actionBar("tipMovementUtilDetail")}`
        : ich.actionBar("tipMovementUtilDetail")
    },
    status: {
      title: labels.assignStatus,
      detail: ich.actionBar("statusPickerPrompt")
    },
    visibility: {
      title: labels.toggleVisibility,
      detail: ich.actionBar("tipVisibilityDetail")
    },
    rest: {
      title: utilityRestLabel,
      detail: showLeaveCombat
        ? ich.actionBar("tipLeaveCombatDetail")
        : restDisabled
          ? ich.actionBar("restDuringCombat")
          : ich.actionBar("restPrompt")
    },
    combat: {
      title: combatButton.label,
      detail: combatButton.tipDetail
        ?? (combatButton.disabled ? ich.actionBar("tipCombatDisabled") : ich.actionBar("tipCombatReady"))
    },
    hp: {
      title: labels.currentHp,
      detail: hpLine
    },
    deathSave: {
      title: ich.ui("deathSaves"),
      detail: member?.deathSaves
        ? ich.actionBar("tipDeathSaveDetail", {
          success: member.deathSaves.success ?? 0,
          failure: member.deathSaves.failure ?? 0
        })
        : ich.actionBar("rollDeathSave")
    },
    ac: {
      title: labels.armorClass,
      detail: member?.stats?.ac != null
        ? ich.actionBar("tipAcDetail", { ac: member.stats.ac })
        : ""
    },
    tempHp: {
      title: labels.tempHp,
      detail: member?.hp?.temp
        ? ich.actionBar("tipTempHpDetail", { temp: member.hp.temp })
        : ""
    },
    movement: {
      title: movementTitle || labels.movementRemaining,
      detail: buildMovementTipDetail(movement)
    },
    passivesGroup: {
      title: labels.passiveScores,
      detail: visionSummary || ich.actionBar("tipPassivesDetail")
    }
  };
}

function enrichPassives(passives, visionSummary) {
  const skillNames = {
    prc: ich.actionBar("tipPassivePrc"),
    ins: ich.actionBar("tipPassiveIns"),
    inv: ich.actionBar("tipPassiveInv")
  };
  const icons = {
    prc: "fa-eye",
    ins: "fa-brain",
    inv: "fa-magnifying-glass"
  };

  return passives.map((entry) => ({
    ...entry,
    icon: icons[entry.id] ?? "fa-circle-question",
    tipTitle: `${skillNames[entry.id] ?? entry.label ?? entry.short} ${entry.value}`,
    tipDetail: entry.id === "prc" ? (visionSummary || "") : ""
  }));
}

async function buildActionBarContext(token) {
  if (!token?.actor) return { showPanel: false };

  const actor = token.actor;
  const combatStarted = Boolean(getViewedCombat()?.started);
  const combatActive = combatStarted && Boolean(getCombatantForToken(token));
  const reactionCtx = getReactionContext();
  const legendaryPips = buildLegendaryPips(actor);
  const showTempHp = settingOn("showTokenTempHp");
  const { member, rings } = buildFullMember(token, {
    showResourceBar: settingOn("showResourceBar"),
    showTempHp
  });

  applyDeathSaveFields(member, token);

  // Always keep A/B/R sections selectable (even when empty) so gems show an empty state.
  const sections = buildCombatToolbarSections(actor, { inCombat: combatActive, token });

  const economyAvailability = getEconomyAvailability(actor);
  const sectionData = buildSectionData(sections, {
    actor,
    combatActive,
    economyAvailability,
    legendaryPips,
    reactionCtx
  });
  const activeSection = resolveSelectedSection(sectionData);
  renderedSectionIds = new Set(sectionData.map((section) => section.id));
  renderedSectionTokenId = token.id;

  const economy = buildEconomyMap(token, combatActive);
  const selected = selectedSection ?? "";
  const movement = combatActive ? buildMovementData(token) : buildIdleMovementData(token);
  const speedRing = buildSpeedRingData(movement);
  const abilitiesHtml = await buildAbilitiesHtml(token, actor, combatActive, activeSection);
  const labels = buildActionBarLabels(activeSection?.tabLabel ?? activeSection?.label ?? "");
  const combatButton = buildCombatButtonState(token, combatStarted, combatActive);
  // Leave Combat as soon as this token is on the initiative list (even before Start Combat).
  const showLeaveCombat = Boolean(findCombatantForToken(token));
  const utilityRestLabel = showLeaveCombat ? ich.actionBar("leaveCombat") : ich.actionBar("rest");
  const restDisabled = combatStarted && !showLeaveCombat;
  const movementTitle = buildMovementTitle(movement, combatActive);
  const configureDisabled = !canOpenTokenConfig(token);
  const visibilityDisabled = !game.user?.isGM;
  const lightOn = isTokenLightOn(token);
  const resources = settingOn("showActionResourceStrip")
    ? buildActionBarResources(actor)
    : [];

  const economySelected = {
    standard: selected === "standard",
    action: selected === "action",
    bonus: selected === "bonus",
    reaction: selected === "reaction",
    legendary: selected === "legendary"
  };
  const visionSummary = buildVisionSummary(token);
  const tips = buildUiTips({
    labels,
    inCombat: combatActive,
    economy,
    economySelected,
    visionSummary,
    member,
    movement,
    movementTitle,
    utilityRestLabel,
    restDisabled,
    showLeaveCombat,
    combatButton,
    legendary: legendaryPips
  });
  const targetPick = buildTargetPickView();

  return {
    showPanel: true,
    inCombat: combatActive,
    combatStarted,
    restDisabled,
    showLeaveCombat,
    configureDisabled,
    visibilityDisabled,
    lightOn,
    resources,
    member,
    rings,
    showTempHp,
    showStatChips: settingOn("showTokenAcSpeed"),
    showYourTurn: settingOn("showYourTurnBanner") && isMyTurn(token),
    showResourceLabel: settingOn("showResourceLabel"),
    colorHpBar: settingOn("colorHpBarByHealth"),
    economy,
    economySelected,
    targetPick,
    selectedSection: selected,
    sectionTitle: activeSection?.tabLabel ?? activeSection?.label ?? "",
    showItemsGem: true,
    showLegendaryGem: Boolean(legendaryPips),
    abilitiesHtml,
    passives: enrichPassives(buildPassiveScores(actor), visionSummary),
    visionSummary,
    tips,
    legendary: legendaryPips ?? { remaining: 0, max: 0 },
    combatButton,
    utilityRestLabel,
    reactionBanner: getReactionBanner(),
    showReactionPass: Boolean(reactionCtx?.actorId === actor.id),
    reactionGemPrompt: Boolean(reactionCtx?.actorId === actor.id),
    movement,
    speedRing,
    movementTitle,
    labels,
    deathSavesLabel: ich.ui("deathSaves"),
    stabilizedLabel: ich.ui("stabilized")
  };
}

async function paintActionBarContent(container, token) {
  if (!container) return;

  if (!settingOn("enableActionBar") || !token?.actor) {
    container.replaceChildren();
    container.hidden = true;
    syncFoundryUiVisibility();
    return;
  }

  const sameToken = (token?.id ?? null) === selectedTokenId;
  const fromSpeedVisual = sameToken
    ? captureLiveSpeedVisual(container)
    : { fillLength: null, fillGap: null, modes: Object.create(null) };
  resetSectionForToken(token);
  const context = await buildActionBarContext(token);
  if (!context.showPanel) {
    container.replaceChildren();
    container.hidden = true;
    syncFoundryUiVisibility();
    lastSpeedVisual = { fillLength: null, fillGap: null, modes: Object.create(null) };
    return;
  }

  applySpeedVisualSeed(context, fromSpeedVisual);

  closeUtilDropdownUnlessStatus();
  hideActionBarUiTooltip();

  const abilityScroll = document.querySelector("#ich-action-bar .ich-mock-ability-well .ich-ability-groups")?.scrollTop ?? 0;
  const previousSection = document.querySelector("#ich-action-bar .ich-ability-groups")?.dataset.section ?? "";

  container.innerHTML = await ichRenderTemplate(
    `${MODULE_PATH}/src/components/action-bar/action-bar-full.hbs`,
    context
  );
  container.hidden = false;
  container.removeAttribute("hidden");
  relinkStatusDropdownAnchor(container);
  const barPortrait = container.querySelector(".ich-mock-portrait, .ich-full-portrait, .ich-ornate-portrait");
  if (barPortrait instanceof HTMLImageElement && token?.actor) {
    applyActorPortrait(barPortrait, token.actor, {
      alt: context.member?.name || "",
      fallbackSrc: context.member?.img || ""
    });
  }
  bindAbilityTooltips(container, token);
  bindActionBarUiTooltips();
  syncFoundryUiVisibility();
  animateSpeedDrain(container, context.speedRing);

  const nextGroups = container.querySelector(".ich-mock-ability-well .ich-ability-groups");
  if (nextGroups && previousSection && previousSection === nextGroups.dataset.section) {
    nextGroups.scrollTop = abilityScroll;
  }
}

function onEconomySelect(sectionId) {
  selectedSection = sectionId;
  requestPanelRefresh();
}

async function onEconomyContextMenu(event) {
  const dock = document.getElementById("ich-action-bar-dock");
  if (!dock?.contains(event.target)) return;

  if (handlePortraitHpContextMenu(event)) return;

  const gem = event.target.closest("#ich-action-bar .ich-mock-gem[data-economy]");
  if (!gem) return;

  event.preventDefault();
  event.stopPropagation();

  const token = getActionBarToken();
  if (!token?.actor) return;

  await toggleEconomySpentDropdown(gem, token, gem.dataset.economy, {
    x: event.clientX,
    y: event.clientY
  });
}

/** Click pip N: fill through N, or clear back to N-1 if that pip is already the highest filled. */
async function toggleDeathSavePip(token, pipType, pipIndex) {
  const actor = token?.actor;
  if (!actor || !isPartyDeathSaving(token)) return false;
  if (!actor.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  const index = Number(pipIndex);
  if (!Number.isInteger(index) || index < 0 || index > 2) return false;
  if (pipType !== "success" && pipType !== "failure") return false;

  const death = actor.system?.attributes?.death ?? {};
  const current = Number(death[pipType] ?? 0);
  const next = current > index ? index : index + 1;

  // Match dnd5e: 3 successes stabilize and clear counters (we keep a module flag).
  if (pipType === "success" && next >= 3) {
    await markActorStable(actor);
    return true;
  }

  await actor.update({ [`system.attributes.death.${pipType}`]: next });
  return true;
}

async function rollDeathSaveFromHud(token, event) {
  const actor = token?.actor;
  if (!actor || !isPartyDeathSaving(token)) return false;
  if (!actor.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }
  if (typeof actor.rollDeathSave !== "function") {
    ui.notifications.warn(ich.actionBar("rollDeathSave"));
    return false;
  }

  // Match the character sheet: pass the click event. Force a public roll so
  // players see chat + Dice So Nice (GM clients often default to gmroll/blind,
  // and Midi-QOL can mark death saves as blind).
  const publicMode = CONST.DICE_ROLL_MODES?.PUBLIC ?? "publicroll";
  const midiConfig = globalThis.MidiQOL?.configSettings?.();
  const priorBlind = midiConfig?.rollSavesBlind;
  if (Array.isArray(priorBlind)) {
    midiConfig.rollSavesBlind = priorBlind.filter((entry) => entry !== "death" && entry !== "all");
  }

  let rolls = null;
  try {
    rolls = await actor.rollDeathSave(
      { event, legacy: false },
      {},
      { rollMode: publicMode }
    );
  } finally {
    if (midiConfig && priorBlind) midiConfig.rollSavesBlind = priorBlind;
  }

  return Boolean(rolls?.length);
}

async function handleTargetPickAction(event) {
  const cancelPick = event.target.closest("#ich-action-bar [data-action='target-pick-cancel']");
  if (cancelPick) {
    event.preventDefault();
    event.stopPropagation();
    cancelTargetPick();
    return true;
  }

  const confirmPick = event.target.closest("#ich-action-bar [data-action='target-pick-confirm']");
  if (confirmPick && !confirmPick.disabled) {
    event.preventDefault();
    event.stopPropagation();
    await finishTargetPickAndUse();
    return true;
  }

  return false;
}

async function onActionBarClick(event) {
  const dock = document.getElementById("ich-action-bar-dock");
  if (!dock?.contains(event.target)) return;

  const minimizeBtn = event.target.closest("[data-action='toggle-action-bar-minimize']");
  if (minimizeBtn) {
    event.preventDefault();
    event.stopPropagation();
    await toggleActionBarMinimized(dock);
    return;
  }

  const panel = document.getElementById("ich-action-bar");
  if (!panel?.contains(event.target)) return;

  const token = getActionBarToken();

  if (await handleTargetPickAction(event)) return;

  const deathSavePip = event.target.closest("#ich-action-bar [data-action='death-save-pip']");
  if (deathSavePip) {
    event.preventDefault();
    event.stopPropagation();
    if (
      token
      && await toggleDeathSavePip(token, deathSavePip.dataset.pipType, deathSavePip.dataset.pipIndex)
    ) {
      requestPanelRefresh();
    }
    return;
  }

  const deathSaveBtn = event.target.closest("#ich-action-bar [data-action='death-save']");
  if (deathSaveBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (token && await rollDeathSaveFromHud(token, event)) requestPanelRefresh();
    return;
  }

  if (event.target.closest("#ich-action-bar .ich-reaction-pass-btn")) {
    event.preventDefault();
    event.stopPropagation();
    passReaction();
    requestPanelRefresh();
    return;
  }

  const combatBtn = event.target.closest("#ich-action-bar [data-action='combat-flow']");
  if (combatBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (combatBtn.classList.contains("is-disabled") || combatBtn.getAttribute("aria-disabled") === "true") return;
    if (token && await handleCombatFlowButton(token)) requestPanelRefresh();
    return;
  }

  const modeBtn = event.target.closest("#ich-action-bar .ich-movement-mode-btn");
  if (modeBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (token) await setMovementMode(token, modeBtn.dataset.mode);
    requestPanelRefresh();
    return;
  }

  const utilBtn = event.target.closest("#ich-action-bar [data-util]");
  if (utilBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (!token || utilBtn.disabled || utilBtn.classList.contains("is-disabled") || utilBtn.getAttribute("aria-disabled") === "true") return;

    const util = utilBtn.dataset.util;
    if (util === "movement") {
      await showMovementOptions(utilBtn, token);
      return;
    }
    if (util === "status") {
      await showStatusOptions(utilBtn, token);
      return;
    }
    if (util === "light") {
      await showLightOptions(utilBtn, token);
      return;
    }
    if (util === "rolls") {
      await showRollsOptions(utilBtn, token);
      return;
    }

    if (await handleUtilityButton(util, token)) requestPanelRefresh();
    return;
  }

  const dropConcentrationBtn = event.target.closest("#ich-action-bar .ich-drop-concentration-btn");
  if (dropConcentrationBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (token && await dropConcentrationFromHud(token)) requestPanelRefresh();
    return;
  }

  const economyChip = event.target.closest("#ich-action-bar .ich-mock-gem[data-economy]");
  if (economyChip) {
    event.preventDefault();
    event.stopPropagation();
    onEconomySelect(economyChip.dataset.economy);
    return;
  }

  if (event.target.closest("#ich-action-bar .ich-full-tab-sheet")) {
    event.preventDefault();
    event.stopPropagation();
    const actorId = event.target.closest("#ich-action-bar [data-actor-id]")?.dataset.actorId;
    game.actors.get(actorId)?.sheet?.render(true);
    return;
  }

  if (event.target.closest("#ich-action-bar .ich-pin-btn")) {
    event.preventDefault();
    event.stopPropagation();
    if (!token) return;
    await setPinnedTokenId(isTokenPinned(token) ? "" : token.id);
    requestPanelRefresh();
    return;
  }

  if (event.target.closest("#ich-action-bar .ich-favorites-filter")) {
    event.preventDefault();
    event.stopPropagation();
    favoritesOnly = !favoritesOnly;
    requestPanelRefresh();
    return;
  }

  if (event.target.closest("#ich-action-bar .ich-drawer-toggle")) {
    event.preventDefault();
    event.stopPropagation();
    toggleDrawer();
    requestPanelRefresh();
    return;
  }

  const drawerBtn = event.target.closest("#ich-action-bar .ich-drawer-btn");
  if (drawerBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (token?.actor) {
      await rollDrawerEntry(token.actor, {
        type: drawerBtn.dataset.drawerType,
        id: drawerBtn.dataset.drawerId
      }, event);
    }
    return;
  }

  const weaponSetBtn = event.target.closest("#ich-action-bar .ich-weapon-set-btn");
  if (weaponSetBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (token?.actor) {
      await activateWeaponSet(token.actor, Number(weaponSetBtn.dataset.weaponSet));
      requestPanelRefresh();
    }
    return;
  }

  const weaponSaveBtn = event.target.closest("#ich-action-bar .ich-weapon-set-save");
  if (weaponSaveBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (token?.actor) {
      await snapshotWeaponSet(token.actor, Number(weaponSaveBtn.dataset.weaponSetSave));
      requestPanelRefresh();
    }
    return;
  }


  const favToggle = event.target.closest("#ich-action-bar .ich-favorite-toggle");
  if (favToggle) {
    event.preventDefault();
    event.stopPropagation();
    if (token?.actor) {
      await toggleFavorite(token.actor, favToggle.dataset.favoriteKey);
      requestPanelRefresh();
    }
    return;
  }

  const button = event.target.closest("#ich-action-bar .ich-ability-btn");
  if (!button || button.dataset.disabled === "true") return;

  event.preventDefault();
  event.stopPropagation();

  if (!token?.actor) return;

  const itemId = button.dataset.itemId;
  const activityId = button.dataset.activityId || "";
  const section = button.dataset.section;
  const activationType = button.dataset.activationType || "";
  const isStandard = button.dataset.standard === "true";
  const economyType = ECONOMY_TYPES.has(section)
    ? section
    : (ECONOMY_TYPES.has(activationType) ? activationType : null);

  if (isStandard && inCombat(token) && !canSpendEconomy(token.actor, "action")) {
    ui.notifications.warn(ich.warning("economySpent", { type: "A" }));
    return;
  }

  if (inCombat(token) && economyType && !canSpendEconomy(token.actor, economyType)) {
    const item = !isStandard ? token.actor.items.get(itemId) : null;
    const activity = item && activityId ? item.system?.activities?.get?.(activityId) : null;
    if (isStandard || !allowsExtraAttackSwing(item, activity, economyType)) {
      ui.notifications.warn(ich.warning("economySpent", { type: ECONOMY_KEYS[economyType] ?? economyType }));
      return;
    }
  }

  try {
    if (isStandard) {
      const actionId = itemId.replace("standard:", "");
      if (actionId === "help" && (game.user.targets?.size ?? 0) === 0) {
        await startTargetPick({
          tokenId: token.id,
          actorId: token.actor.id,
          itemId,
          activityId: "",
          section,
          spellLevel: null,
          isStandard: true,
          actionId,
          required: 1,
          abilityName: button.dataset.name || button.getAttribute("aria-label") || "Help"
        });
        return;
      }
      const used = await executeStandardAction(token, actionId);
      if (!used) return;
      clearUserTargets();
    } else {
      const item = token.actor.items.get(itemId);
      const activity = activityId ? item?.system.activities?.get(activityId) : null;
      let spellLevel = null;
      if (item && (activity?.type === "cast" || item.type === "spell")) {
        const pick = await pickCastSlotLevel(token.actor, item, activity);
        if (pick.cancelled) return;
        spellLevel = pick.level;
      }

      const required = getRequiredTargetCount(item, activity);
      const forcePick = shouldForceTargetPick(item, activity);
      if (required && (forcePick || (game.user.targets?.size ?? 0) === 0)) {
        await startTargetPick({
          tokenId: token.id,
          actorId: token.actor.id,
          itemId,
          activityId,
          section,
          spellLevel,
          isStandard: false,
          actionId: null,
          required,
          abilityName: item?.name || button.dataset.name || button.getAttribute("aria-label") || "Ability"
        });
        return;
      }

      const used = await useAbility(token, itemId, activityId, event, section, { spellLevel });
      if (used === false) return;
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to use ability`, error);
    return;
  }

  requestPanelRefresh();
}

async function finishTargetPickAndUse() {
  const pending = confirmTargetPick();
  if (!pending) return;

  const token = getActionBarToken();
  if (!token?.actor || token.id !== pending.tokenId) {
    ui.notifications.warn(ich.empty("notInCombat"));
    cancelTargetPick({ clearTargets: false });
    return;
  }

  try {
    if (pending.isStandard) {
      const used = await executeStandardAction(token, pending.actionId);
      if (!used) return;
      clearUserTargets();
    } else {
      const used = await useAbility(
        token,
        pending.itemId,
        pending.activityId,
        null,
        pending.section,
        { spellLevel: pending.spellLevel }
      );
      if (used === false) return;
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to use ability after target pick`, error);
    return;
  }

  requestPanelRefresh();
}

function onActionBarDoubleClick(event) {
  const panel = document.getElementById("ich-action-bar");
  if (!panel?.contains(event.target)) return;

  const portrait = event.target.closest("#ich-action-bar .ich-mock-portrait-block");
  if (!portrait) return;

  event.preventDefault();
  event.stopPropagation();

  const token = getActionBarToken();
  if (!token?.isVisible) return;

  panCanvasToToken(token);
}

function bindActionBarClicks() {
  if (clickBound) return;
  document.body.addEventListener("click", onActionBarClick, true);
  document.body.addEventListener("pointerup", onActionBarPointerUp, true);
  document.body.addEventListener("dblclick", onActionBarDoubleClick, true);
  document.body.addEventListener("contextmenu", onEconomyContextMenu, true);
  clickBound = true;
}

async function onActionBarPointerUp(event) {
  if (!isTargetPickActive() || event.button !== 0) return;

  const dock = document.getElementById("ich-action-bar-dock");
  if (!dock?.contains(event.target)) return;

  const panel = document.getElementById("ich-action-bar");
  if (!panel?.contains(event.target)) return;

  await handleTargetPickAction(event);
}

let deathSaveHooksBound = false;

function bindDeathSaveHooks() {
  if (deathSaveHooksBound) return;

  const stampStable = (details) => {
    if (!details) return;
    if (details.chatString === "DND5E.DeathSaveSuccess") {
      details.updates = details.updates ?? {};
      details.updates[`flags.${MODULE_ID}.stable`] = true;
    }
    if (details.chatString === "DND5E.DeathSaveCriticalSuccess") {
      details.updates = details.updates ?? {};
      details.updates[`flags.${MODULE_ID}.stable`] = false;
    }
  };

  // Modern dnd5e (4.1+) and legacy hook shapes.
  Hooks.on("dnd5e.rollDeathSaveV2", (_rolls, details) => stampStable(details));
  Hooks.on("dnd5e.rollDeathSave", (_actor, _roll, details) => stampStable(details));

  Hooks.on("dnd5e.postRollDeathSave", async (_rolls, data) => {
    const actor = data?.subject;
    if (!actor) return;
    const hp = actor.system?.attributes?.hp?.value ?? 0;
    if (hp > 0) {
      await syncActorStableFlag(actor);
      requestPanelRefresh();
      return;
    }

    // Fallback: after a stabilize roll, counters are cleared to 0/0 — set the flag if missing.
    const content = String(data?.message?.content ?? "");
    const chatKey = data?.chatString ?? data?.details?.chatString ?? "";
    const stableText = game.i18n?.format?.("DND5E.DeathSaveSuccess", { name: actor.name }) ?? "";
    const looksStable = Boolean(
      chatKey === "DND5E.DeathSaveSuccess"
      || (
        content
        && (
          (stableText && content.includes(stableText))
          || /stable/i.test(content)
          || content.includes(game.i18n?.localize?.("DND5E.DeathSaveSuccess") ?? "\0")
        )
      )
    );
    if (looksStable && !actor.getFlag?.(MODULE_ID, "stable")) {
      await actor.setFlag(MODULE_ID, "stable", true);
    }

    await syncActorStableFlag(actor);
    requestPanelRefresh();
  });

  Hooks.on("updateActor", async (actor, changes) => {
    if (!actor) return;
    const hpChanged = foundry.utils.hasProperty(changes, "system.attributes.hp");
    const deathChanged = foundry.utils.hasProperty(changes, "system.attributes.death");
    const flagChanged = foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`);
    if (!hpChanged && !deathChanged && !flagChanged) return;

    // Manual / sheet path: reaching 3 successes before dnd5e clears them.
    const nextSuccess = foundry.utils.getProperty(changes, "system.attributes.death.success");
    if (Number(nextSuccess) >= 3) {
      await markActorStable(actor);
      requestPanelRefresh();
      return;
    }

    await syncActorStableFlag(actor);
    if (flagChanged || deathChanged || hpChanged) requestPanelRefresh();
  });

  deathSaveHooksBound = true;
}

function bindMidiRefreshHooks() {
  if (midiHooksBound) return;

  Hooks.on("midi-qol.ReactionFilter", (reactionActivities, options, triggerType) => {
    if (!settingOn("enableActionBar") || !settingOn("preferHudReactions")) return;

    const actor = reactionActivities?.[0]?.actor;
    if (!actor || !isReactionActorForUser(actor)) return;

    setReactionPrompt(actor, reactionActivities, triggerType, options);
  });

  bindActionBarDialogHijacks(() => {
    selectedSection = "reaction";
    requestPanelRefresh();
  });

  Hooks.on("midi-qol.RollComplete", () => {
    if (!settingOn("enableActionBar")) return;
    requestPanelRefresh();
  });

  Hooks.on(`${MODULE_ID}.reactionPromptClosed`, () => {
    if (!settingOn("enableActionBar")) return;
    requestPanelRefresh();
  });

  midiHooksBound = true;
}

export function handleActionBarCombatTurn() {
  clearReactionPrompt();
  selectedSection = null;
  const combatant = getViewedCombat()?.combatant;
  if (combatant?.actor) clearTurnFlags(combatant.actor);
}

export function shouldRefreshActionBarForActor(actor, changes) {
  const token = getActionBarToken();
  if (!token?.actor || token.actor.id !== actor.id) return false;
  if (!changes || typeof changes !== "object") return false;

  // Sheet edits (HP, AC, skills, resources, spells, etc.) and module/midi flags.
  return (
    foundry.utils.hasProperty(changes, "system")
    || foundry.utils.hasProperty(changes, "flags.midi-qol")
    || foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)
    || foundry.utils.hasProperty(changes, "name")
    || foundry.utils.hasProperty(changes, "img")
    || foundry.utils.hasProperty(changes, "prototypeToken")
  );
}

export function bindActionBarInteractions() {
  bindActionBarClicks();
  bindMidiRefreshHooks();
  bindDeathSaveHooks();

  Hooks.on("controlToken", (token, controlled) => {
    if (handleControlTokenDuringTargetPick(token, controlled)) return;
    if (controlled && token) rememberActionBarToken(token);
  });
}
