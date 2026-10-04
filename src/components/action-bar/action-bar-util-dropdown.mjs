import { MODULE_PATH, ichRenderTemplate } from "../../common/constants.mjs";
import { ich } from "../../common/i18n.mjs";
import { canControlToken } from "../../common/token-actions.mjs";
import { refreshHud } from "../../common/render/core.mjs";
import { ICH_RENDER } from "../../common/render/scopes.mjs";
import {
  buildLegendaryPips,
  toggleLegendarySpent
} from "../../common/action-economy.mjs";
import {
  getEconomyAvailability,
  isItemsEconomySpent,
  toggleEconomySpent,
  toggleItemsEconomySpent
} from "../../common/midi-qol.mjs";
import {
  collectMovementChoices,
  collectStatusChoices,
  toggleTokenStatusEffect
} from "./action-bar-token-hud.mjs";
import {
  applyLightPreset,
  collectLightPresetChoices
} from "./action-bar-light.mjs";
import { buildDrawerEntries, rollDrawerEntry } from "./action-bar-drawer.mjs";

let activeDropdown = null;
let activeAnchor = null;
let outsideClickBound = false;

export function closeUtilDropdown() {
  activeDropdown?.remove();
  activeDropdown = null;
  activeAnchor?.classList.remove("is-dropdown-open");
  activeAnchor = null;
}

/** Keep the apply-status menu open across action-bar re-renders (effect toggles). */
export function isStatusDropdownOpen() {
  return Boolean(activeDropdown?.dataset?.type === "status" && activeDropdown.isConnected);
}

export function closeUtilDropdownUnlessStatus() {
  if (isStatusDropdownOpen()) return;
  closeUtilDropdown();
}

export function relinkStatusDropdownAnchor(root) {
  if (!isStatusDropdownOpen() || !root) return;
  const nextAnchor = root.querySelector("[data-util='status']");
  if (!nextAnchor) return;
  activeAnchor?.classList.remove("is-dropdown-open");
  activeAnchor = nextAnchor;
  nextAnchor.classList.add("is-dropdown-open");
}

function bindOutsideClick() {
  if (outsideClickBound) return;
  document.body.addEventListener("click", onOutsideClick, true);
  document.body.addEventListener("contextmenu", onOutsideContextMenu, true);
  outsideClickBound = true;
}

function onOutsideClick(event) {
  if (!activeDropdown) return;
  if (event.target.closest(".ich-util-dropdown")) return;
  if (event.target.closest("[data-util='movement'], [data-util='status'], [data-util='light'], [data-util='rolls']")) return;
  if (event.target.closest(".ich-mock-gem[data-economy]")) return;
  closeUtilDropdown();
}

function onOutsideContextMenu(event) {
  if (!activeDropdown) return;
  if (event.target.closest(".ich-util-dropdown")) return;
  if (event.target.closest(".ich-mock-gem[data-economy]")) return;
  closeUtilDropdown();
}

function positionDropdown(anchor, dropdown, point = null, type = null) {
  const gap = 6;
  dropdown.style.position = "fixed";
  // Above #ich-hud-overlay (1000) / target-pick dock (1100); match status menus.
  dropdown.style.zIndex = "10000";

  document.body.appendChild(dropdown);
  const dropdownRect = dropdown.getBoundingClientRect();

  let left;
  let top;

  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
    left = point.x;
    top = point.y;
  } else {
    const rect = anchor.getBoundingClientRect();
    left = rect.right + gap;
    if (left + dropdownRect.width > window.innerWidth - 8) {
      left = rect.left - gap - dropdownRect.width;
    }
    // Light menu sits beside the bulb near the bottom of the vitals column —
    // bottom-align so it grows upward instead of hanging below the HUD.
    top = (type === "light" || type === "rolls")
      ? rect.bottom - dropdownRect.height
      : rect.top;
  }

  if (left + dropdownRect.width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - dropdownRect.width - 8);
  }
  if (top + dropdownRect.height > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - dropdownRect.height - 8);
  }
  top = Math.max(8, top);

  dropdown.style.left = `${Math.round(Math.max(8, left))}px`;
  dropdown.style.top = `${Math.round(top)}px`;
}

async function openDropdown(anchor, type, token, html, point = null) {
  if (!anchor || !token) return false;

  if (activeAnchor === anchor && activeDropdown?.dataset?.type === type) {
    closeUtilDropdown();
    return true;
  }

  closeUtilDropdown();
  const mount = document.createElement("div");
  mount.innerHTML = html;
  const dropdown = mount.firstElementChild;
  if (!dropdown) return false;

  dropdown.dataset.type = type;
  positionDropdown(anchor, dropdown, point, type);

  activeDropdown = dropdown;
  activeAnchor = anchor;
  anchor.classList.add("is-dropdown-open");
  bindOutsideClick();

  dropdown.addEventListener("click", (event) => onDropdownClick(event, type, token));
  if (type === "status") bindStatusSearch(dropdown);
  if (type === "rolls") {
    bindRollsSearch(dropdown);
    bindRollsTabs(dropdown);
  }
  return true;
}

function filterStatusPicker(dropdown, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  for (const btn of dropdown.querySelectorAll("[data-status-id]")) {
    const name = (btn.dataset.statusName || btn.getAttribute("aria-label") || "").toLowerCase();
    const match = !needle || name.includes(needle);
    btn.classList.toggle("is-filtered-out", !match);
    btn.tabIndex = match ? 0 : -1;
  }
}

function bindStatusSearch(dropdown) {
  const input = dropdown.querySelector(".ich-token-status-search-input");
  if (!input) return;

  input.addEventListener("input", () => filterStatusPicker(dropdown, input.value));
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key !== "Escape") return;
    if (input.value) {
      input.value = "";
      filterStatusPicker(dropdown, "");
      event.preventDefault();
      return;
    }
    closeUtilDropdown();
  });

  queueMicrotask(() => input.focus({ preventScroll: true }));
}

function filterRollsPicker(dropdown, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  for (const panel of dropdown.querySelectorAll(".ich-rolls-panel")) {
    let visibleCount = 0;
    for (const btn of panel.querySelectorAll("[data-roll-id]")) {
      const name = (btn.dataset.rollLabel || btn.textContent || "").toLowerCase();
      const match = !needle || name.includes(needle);
      btn.classList.toggle("is-filtered-out", !match);
      btn.tabIndex = match ? 0 : -1;
      if (match) visibleCount += 1;
    }
    panel.classList.toggle("is-empty", visibleCount === 0);
  }
}

function switchRollsTab(dropdown, tabId) {
  if (!dropdown || !tabId) return;
  const tabs = [...dropdown.querySelectorAll("[data-rolls-tab]")];
  const panels = [...dropdown.querySelectorAll(".ich-rolls-panel")];
  if (!tabs.some((tab) => tab.dataset.rollsTab === tabId)) return;

  for (const tab of tabs) {
    const active = tab.dataset.rollsTab === tabId;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of panels) {
    const active = panel.dataset.rollSection === tabId;
    panel.classList.toggle("is-active", active);
    panel.toggleAttribute("hidden", !active);
  }

  if (activeAnchor && activeDropdown === dropdown) {
    positionDropdown(activeAnchor, dropdown, null, "rolls");
  }
}

function bindRollsTabs(dropdown) {
  const tabs = [...dropdown.querySelectorAll("[data-rolls-tab]")];
  if (!tabs.length) return;

  dropdown.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-rolls-tab]");
    if (!tab || !dropdown.contains(tab)) return;
    const idx = tabs.indexOf(tab);
    if (idx < 0) return;

    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (idx + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (idx - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    event.stopPropagation();
    switchRollsTab(dropdown, tabs[next].dataset.rollsTab);
    tabs[next].focus();
  });
}

function bindRollsSearch(dropdown) {
  const input = dropdown.querySelector(".ich-rolls-search-input");
  if (!input) return;

  input.addEventListener("input", () => filterRollsPicker(dropdown, input.value));
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key !== "Escape") return;
    if (input.value) {
      input.value = "";
      filterRollsPicker(dropdown, "");
      event.preventDefault();
      return;
    }
    closeUtilDropdown();
  });

  queueMicrotask(() => input.focus({ preventScroll: true }));
}

function isEconomyTypeSpent(actor, economyType) {
  if (economyType === "standard") return isItemsEconomySpent(actor);
  if (economyType === "legendary") {
    const pips = buildLegendaryPips(actor);
    return Boolean(pips) && !(pips.remaining > 0);
  }
  return getEconomyAvailability(actor)[economyType] === false;
}

async function applyEconomySpentToggle(actor, economyType) {
  if (economyType === "standard") return toggleItemsEconomySpent(actor);
  if (economyType === "legendary") return toggleLegendarySpent(actor);
  if (["action", "bonus", "reaction"].includes(economyType)) {
    return toggleEconomySpent(actor, economyType);
  }
  return false;
}

async function onDropdownClick(event, type, token) {
  if (type === "economy") {
    const item = event.target.closest("[data-economy-spent-action]");
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    const economyType = activeDropdown?.dataset?.economyType;
    if (!economyType) return;
    await applyEconomySpentToggle(token.actor, economyType);
    closeUtilDropdown();
    refreshHud(ICH_RENDER.ACTION_BAR);
    return;
  }

  if (type === "movement") {
    const item = event.target.closest("[data-movement-id]");
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    await token.document.update({ movementAction: item.dataset.movementId });
    closeUtilDropdown();
    refreshHud(ICH_RENDER.ACTION_BAR);
    return;
  }

  if (type === "light") {
    const item = event.target.closest("[data-light-preset]");
    if (!item || item.classList.contains("is-disabled") || item.getAttribute("aria-disabled") === "true") return;
    event.preventDefault();
    event.stopPropagation();
    const presetId = item.dataset.lightPreset;
    closeUtilDropdown();
    await applyLightPreset(token, presetId);
    refreshHud(ICH_RENDER.ACTION_BAR);
    return;
  }

  if (type === "rolls") {
    const tab = event.target.closest("[data-rolls-tab]");
    if (tab) {
      event.preventDefault();
      event.stopPropagation();
      switchRollsTab(activeDropdown, tab.dataset.rollsTab);
      return;
    }
    const item = event.target.closest("[data-roll-id]");
    if (!item || item.classList.contains("is-filtered-out")) return;
    event.preventDefault();
    event.stopPropagation();
    const entry = {
      type: item.dataset.rollType,
      id: item.dataset.rollId
    };
    closeUtilDropdown();
    await rollDrawerEntry(token.actor, entry, event);
    return;
  }

  const statusBtn = event.target.closest("[data-status-id]");
  if (!statusBtn || statusBtn.classList.contains("is-filtered-out")) return;
  event.preventDefault();
  event.stopPropagation();
  const statusId = statusBtn.dataset.statusId;
  await toggleTokenStatusEffect(token, statusId);
  const isActive = Boolean(token.document.hasStatusEffect?.(statusId));
  statusBtn.classList.toggle("is-active", isActive);
  statusBtn.setAttribute("aria-pressed", String(isActive));
  refreshHud(ICH_RENDER.EFFECTS);
}

function ensureControl(token) {
  if (!token?.document) return false;
  if (!canControlToken(token)) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }
  return true;
}

export async function toggleMovementDropdown(anchor, token) {
  if (!ensureControl(token)) return false;

  const choices = collectMovementChoices(token);
  if (!choices.length) {
    ui.notifications.warn(ich.actionBar("noMovementOptions"));
    return false;
  }

  if (choices.length === 1) {
    await token.document.update({ movementAction: choices[0].id });
    refreshHud(ICH_RENDER.ACTION_BAR);
    return true;
  }

  const html = await ichRenderTemplate(
    `${MODULE_PATH}/src/components/action-bar/action-bar-movement-dropdown.hbs`,
    { choices, title: ich.actionBar("movementTitle") }
  );
  return openDropdown(anchor, "movement", token, html);
}

export async function toggleStatusDropdown(anchor, token) {
  if (!ensureControl(token)) return false;

  const effects = await collectStatusChoices(token);
  if (!effects.length) {
    ui.notifications.warn(ich.actionBar("noStatusOptions"));
    return false;
  }

  const html = await ichRenderTemplate(
    `${MODULE_PATH}/src/components/action-bar/action-bar-status-dropdown.hbs`,
    {
      effects,
      title: ich.actionBar("assignStatus"),
      searchPlaceholder: ich.actionBar("searchStatuses")
    }
  );
  return openDropdown(anchor, "status", token, html);
}

export async function toggleLightDropdown(anchor, token) {
  if (!ensureControl(token)) return false;

  const choices = collectLightPresetChoices(token);
  const html = await ichRenderTemplate(
    `${MODULE_PATH}/src/components/action-bar/action-bar-light-dropdown.hbs`,
    {
      choices,
      title: ich.actionBar("toggleLight")
    }
  );
  return openDropdown(anchor, "light", token, html);
}

export async function toggleRollsDropdown(anchor, token) {
  if (!ensureControl(token)) return false;
  if (!token?.actor) return false;

  const entries = buildDrawerEntries(token.actor);
  const sections = [
    {
      id: "checks",
      label: ich.actionBar("tabChecks"),
      entries: entries.checks
    },
    {
      id: "skills",
      label: ich.actionBar("skills"),
      entries: entries.skills
    },
    {
      id: "saves",
      label: ich.actionBar("saves"),
      entries: entries.saves
    }
  ].filter((section) => section.entries.length);

  if (!sections.length) {
    ui.notifications.warn(ich.actionBar("noRollOptions"));
    return false;
  }

  const html = await ichRenderTemplate(
    `${MODULE_PATH}/src/components/action-bar/action-bar-rolls-dropdown.hbs`,
    {
      title: ich.actionBar("rolls"),
      searchPlaceholder: ich.actionBar("searchRolls"),
      sections
    }
  );
  return openDropdown(anchor, "rolls", token, html);
}

export async function toggleEconomySpentDropdown(anchor, token, economyType, point = null) {
  if (!ensureControl(token)) return false;
  if (!token?.actor || !economyType) return false;
  if (economyType === "legendary" && !buildLegendaryPips(token.actor)) return false;

  const spent = isEconomyTypeSpent(token.actor, economyType);
  const html = await ichRenderTemplate(
    `${MODULE_PATH}/src/components/action-bar/action-bar-economy-dropdown.hbs`,
    {
      title: spent ? ich.actionBar("markAsAvailable") : ich.actionBar("markAsSpent"),
      actionLabel: spent ? ich.actionBar("markAsAvailable") : ich.actionBar("markAsSpent")
    }
  );

  const opened = await openDropdown(anchor, "economy", token, html, point);
  if (opened && activeDropdown) activeDropdown.dataset.economyType = economyType;
  return opened;
}
