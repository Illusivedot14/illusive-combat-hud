/**
 * Closed-phone light and aura menus. Same token updates as the table bar.
 */

import { ich } from "../../common/i18n.mjs";
import {
  collectLightPresetChoices,
  applyLightPreset
} from "../action-bar/action-bar-light.mjs";
import {
  addTokenAura,
  applyAuraColor,
  applyAuraFeet,
  buildAuraDropdownContext,
  selectAuraSlot
} from "../token-aura/token-aura-picker.mjs";
import { collectStatusChoices, toggleTokenStatusEffect } from "../action-bar/action-bar-token-hud.mjs";
import { ensureMobileSheetStyles } from "./mobile-sheet-styles.mjs";

const OVERLAY_Z = "100060";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function closeMenus() {
  document.querySelectorAll(".ich-ms-controller-overlay").forEach((el) => el.remove());
}

function mountOverlay(className, html) {
  closeMenus();
  ensureMobileSheetStyles();
  const overlay = document.createElement("div");
  overlay.className = `ich-ms-overlay ich-ms-controller-overlay ${className} visible`;
  overlay.style.zIndex = OVERLAY_Z;
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  overlay.addEventListener("pointerup", (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  return overlay;
}

async function promptCustomLightMobile(token) {
  return new Promise((resolve) => {
    const light = token?.document?.light ?? {};
    const bright = Number(light.bright) || 20;
    const dim = Number(light.dim) || 40;
    const color = typeof light.color === "string" && light.color ? light.color : "#fabb66";
    const overlay = mountOverlay("ich-ms-light-custom-overlay", `
      <div class="ich-ms-settings-dialog">
        <div class="roll-dialog-header">
          <span class="roll-dialog-title">${escapeHtml(ich.actionBar("lightPresetCustom"))}</span>
          <button type="button" class="roll-dialog-close" data-action="cancel" aria-label="${escapeHtml(ich.ui("cancel"))}">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="ich-ms-dsn-form">
          <label class="ich-ms-dsn-field">
            <span>${escapeHtml(ich.actionBar("lightCustomBright"))}</span>
            <input type="number" name="bright" value="${bright}" min="0" step="1" inputmode="numeric">
          </label>
          <label class="ich-ms-dsn-field">
            <span>${escapeHtml(ich.actionBar("lightCustomDim"))}</span>
            <input type="number" name="dim" value="${dim}" min="0" step="1" inputmode="numeric">
          </label>
          <label class="ich-ms-dsn-field">
            <span>${escapeHtml(ich.actionBar("lightCustomColor"))}</span>
            <input type="color" name="color" value="${escapeHtml(color)}">
          </label>
        </div>
        <div class="ich-ms-dsn-actions">
          <button type="button" class="roll-btn is-muted" data-action="cancel">${escapeHtml(ich.ui("cancel"))}</button>
          <button type="button" class="roll-btn" data-action="apply">${escapeHtml(ich.actionBar("lightCustomApply"))}</button>
        </div>
      </div>
    `);
    overlay.addEventListener("pointerup", (ev) => {
      const action = ev.target?.closest?.("[data-action]")?.dataset?.action;
      if (action === "cancel") {
        ev.preventDefault();
        overlay.remove();
        resolve(null);
      }
      if (action === "apply") {
        ev.preventDefault();
        const brightNext = Math.max(0, Math.floor(Number(overlay.querySelector("[name='bright']")?.value) || 0));
        const dimNext = Math.max(0, Math.floor(Number(overlay.querySelector("[name='dim']")?.value) || 0));
        const colorNext = overlay.querySelector("[name='color']")?.value || "#fabb66";
        if (brightNext <= 0 && dimNext <= 0) {
          ui.notifications.warn(ich.actionBar("lightCustomInvalid"));
          return;
        }
        overlay.remove();
        resolve({
          bright: brightNext,
          dim: dimNext,
          color: colorNext,
          alpha: 0.45,
          animation: { type: "torch", speed: 2, intensity: 3, reverse: false }
        });
      }
    });
  });
}

export async function openMobileLightMenu(token) {
  if (!token?.document) return false;
  const choices = collectLightPresetChoices(token);
  const overlay = mountOverlay("ich-ms-light-overlay", `
    <div class="ich-ms-settings-dialog">
      <div class="roll-dialog-header">
        <span class="roll-dialog-title">${escapeHtml(ich.actionBar("toggleLight"))}</span>
        <button type="button" class="roll-dialog-close" data-action="close" aria-label="${escapeHtml(ich.ui("cancel"))}">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="ich-ms-settings-list">
        ${choices.map((choice) => `
          <button type="button" class="ich-ms-settings-item${choice.isActive ? " is-current" : ""}" data-light-preset="${escapeHtml(choice.id)}">
            <span>
              <strong>${escapeHtml(choice.label)}</strong>
              ${choice.meta ? `<small>${escapeHtml(choice.meta)}</small>` : ""}
            </span>
          </button>
        `).join("")}
      </div>
    </div>
  `);

  overlay.addEventListener("pointerup", async (ev) => {
    if (ev.target?.closest?.("[data-action='close']")) {
      ev.preventDefault();
      overlay.remove();
      return;
    }
    const btn = ev.target?.closest?.("[data-light-preset]");
    if (!btn) return;
    ev.preventDefault();
    overlay.remove();
    await applyLightPreset(token, btn.dataset.lightPreset, {
      promptCustom: promptCustomLightMobile
    });
  });
  return true;
}

function auraMenuHtml(token) {
  const ctx = buildAuraDropdownContext(token);
  const swatches = ctx.colors.map((entry) => `
    <button type="button" class="ich-ms-aura-swatch${entry.isActive ? " is-active" : ""}" data-aura-color="${escapeHtml(entry.color)}" style="--ich-aura-swatch:${escapeHtml(entry.color)}" aria-label="${escapeHtml(entry.color)}"></button>
  `).join("");
  const feet = ctx.feet.map((entry) => `
    <button type="button" class="ich-ms-settings-item${entry.isActive ? " is-current" : ""}" data-aura-feet="${entry.feet}">
      <span><strong>${escapeHtml(entry.label)}</strong></span>
    </button>
  `).join("");
  const slots = ctx.slots.map((slot) => `
    <button type="button" class="ich-ms-settings-item${slot.isActive ? " is-current" : ""}" data-aura-slot="${slot.index}">
      <span class="ich-ms-aura-dot" style="--ich-aura-swatch:${escapeHtml(slot.color)}"></span>
      <span><strong>${escapeHtml(slot.label)}</strong></span>
    </button>
  `).join("");

  return `
    <div class="ich-ms-settings-dialog">
      <div class="roll-dialog-header">
        <span class="roll-dialog-title">${escapeHtml(ctx.title)}</span>
        <button type="button" class="roll-dialog-close" data-action="close" aria-label="${escapeHtml(ich.ui("cancel"))}">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="ich-ms-settings-list">
        ${slots}
        ${ctx.canAdd ? `<button type="button" class="ich-ms-settings-item" data-aura-add="true"><span><strong>${escapeHtml(ctx.addLabel)}</strong></span></button>` : ""}
        <button type="button" class="ich-ms-settings-item${ctx.offActive ? " is-current" : ""}" data-aura-feet="0">
          <span><strong>${escapeHtml(ctx.offLabel)}</strong></span>
        </button>
        ${feet}
      </div>
      <div class="ich-ms-aura-swatches">${swatches}</div>
    </div>
  `;
}

async function refillAuraMenu(overlay, token) {
  overlay.innerHTML = auraMenuHtml(token);
}

export async function openMobileAuraMenu(token) {
  if (!token?.document) return false;
  const overlay = mountOverlay("ich-ms-aura-overlay", auraMenuHtml(token));

  overlay.addEventListener("pointerup", async (ev) => {
    if (ev.target?.closest?.("[data-action='close']")) {
      ev.preventDefault();
      overlay.remove();
      return;
    }
    const add = ev.target?.closest?.("[data-aura-add]");
    const slot = ev.target?.closest?.("[data-aura-slot]");
    const color = ev.target?.closest?.("[data-aura-color]");
    const feet = ev.target?.closest?.("[data-aura-feet]");
    if (!add && !slot && !color && !feet) return;
    ev.preventDefault();
    if (add) await addTokenAura(token);
    else if (slot) selectAuraSlot(slot.dataset.auraSlot);
    else if (color) await applyAuraColor(token, color.dataset.auraColor);
    else await applyAuraFeet(token, Number(feet.dataset.auraFeet) || 0);
    await refillAuraMenu(overlay, token);
  });
  return true;
}

function statusMenuHtml(title, effects) {
  const rows = effects.map((effect) => `
    <button type="button" class="ich-ms-settings-item${effect.isActive ? " is-current" : ""}" data-status-id="${escapeHtml(effect.id)}">
      <img src="${escapeHtml(effect.src)}" alt="" width="28" height="28">
      <span><strong>${escapeHtml(effect.title)}</strong></span>
    </button>
  `).join("");
  return `
    <div class="ich-ms-settings-dialog">
      <div class="roll-dialog-header">
        <span class="roll-dialog-title">${escapeHtml(title)}</span>
        <button type="button" class="roll-dialog-close" data-action="close" aria-label="${escapeHtml(ich.ui("cancel"))}">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="ich-ms-settings-list">${rows || `<p>${escapeHtml(ich.actionBar("noStatusOptions"))}</p>`}</div>
    </div>
  `;
}

export async function openMobileStatusMenu(token) {
  if (!token) return false;
  const effects = await collectStatusChoices(token);
  if (!effects.length) {
    ui.notifications.warn(ich.actionBar("noStatusOptions"));
    return false;
  }
  const title = ich.actionBar("assignStatus");
  const overlay = mountOverlay("ich-ms-status-overlay", statusMenuHtml(title, effects));

  overlay.addEventListener("pointerup", async (ev) => {
    if (ev.target?.closest?.("[data-action='close']")) {
      ev.preventDefault();
      overlay.remove();
      return;
    }
    const btn = ev.target?.closest?.("[data-status-id]");
    if (!btn) return;
    ev.preventDefault();
    await toggleTokenStatusEffect(token, btn.dataset.statusId);
    const next = await collectStatusChoices(token);
    overlay.innerHTML = statusMenuHtml(title, next);
  });
  return true;
}
