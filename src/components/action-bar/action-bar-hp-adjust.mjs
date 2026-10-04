import { ich } from "../../common/i18n.mjs";
import {
  applyDamageDeathRules,
  setActorDefeatedState
} from "../../common/party-combat.mjs";
import { dismissFloatingHudChrome } from "../../common/overlay-guard.mjs";
import { getActionBarToken } from "../../common/reaction-context.mjs";
import { refreshHud } from "../../common/render/core.mjs";
import { ICH_RENDER } from "../../common/render/scopes.mjs";

let activeMenu = null;

function closePortraitHpMenu() {
  activeMenu?.remove();
  activeMenu = null;
}

/** Prefer the selected token's actor (unlinked NPCs), never the world prototype alone. */
function resolveActionBarActor() {
  return getActionBarToken()?.actor ?? null;
}

function canAdjustHp(actor) {
  return Boolean(actor && (game.user.isGM || actor.isOwner));
}

function snapshotHp(actor) {
  const hp = actor?.system?.attributes?.hp;
  return {
    value: Number(hp?.value) || 0,
    max: Number(hp?.max) || 0,
    temp: Number(hp?.temp) || 0
  };
}

function coerceHpAmount(amount) {
  const n = Math.floor(Number(amount));
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function focusInputAtEnd(input) {
  if (!input) return;
  input.focus();
  const len = String(input.value ?? "").length;
  try {
    input.setSelectionRange(len, len);
  } catch {
    /* unsupported input types */
  }
}

async function applyDamageAmount(actor, amount) {
  amount = coerceHpAmount(amount);
  if (amount == null) return;

  if (typeof actor.applyDamage === "function") {
    try {
      await actor.applyDamage([{ value: amount }]);
      return;
    } catch {
      try {
        await actor.applyDamage(amount);
        return;
      } catch {
        /* fall through to direct update */
      }
    }
  }

  const hp = actor.system?.attributes?.hp;
  if (!hp) return;
  let remaining = amount;
  let temp = Number(hp.temp) || 0;
  let value = Number(hp.value) || 0;
  if (temp > 0) {
    const used = Math.min(temp, remaining);
    temp -= used;
    remaining -= used;
  }
  value = Math.max(0, value - remaining);
  await actor.update({
    "system.attributes.hp.value": value,
    "system.attributes.hp.temp": temp
  });
}

async function applyHealAmount(actor, amount) {
  amount = coerceHpAmount(amount);
  if (amount == null) return;

  if (typeof actor.applyDamage === "function") {
    try {
      await actor.applyDamage([{ value: amount, type: "healing" }]);
      return;
    } catch {
      try {
        await actor.applyDamage(-amount);
        return;
      } catch {
        /* fall through */
      }
    }
  }

  if (typeof actor.applyHealing === "function") {
    try {
      await actor.applyHealing(amount);
      return;
    } catch {
      try {
        await actor.applyHealing([{ value: amount }]);
        return;
      } catch {
        /* fall through */
      }
    }
  }

  const hp = actor.system?.attributes?.hp;
  if (!hp) return;
  const max = Number(hp.max) || 0;
  const value = Math.min(max, (Number(hp.value) || 0) + amount);
  await actor.update({ "system.attributes.hp.value": value });
}

/** Apply temp HP using 5e non-stacking rules (keep the higher amount). */
async function applyTempHpAmount(actor, amount) {
  amount = coerceHpAmount(amount);
  if (amount == null) return false;

  const hp = actor.system?.attributes?.hp;
  if (!hp) return false;
  const currentTemp = Number(hp.temp) || 0;
  if (amount <= currentTemp) {
    ui.notifications.warn(ich.actionBar("hpTempNotHigher", { current: currentTemp }));
    return false;
  }

  if (typeof actor.applyTempHP === "function") {
    await actor.applyTempHP(amount);
    return true;
  }

  await actor.update({ "system.attributes.hp.temp": amount });
  return true;
}

/** Clear defeated mark / dead overlay when healing restores HP above 0. */
async function clearDefeatedAfterHeal(actor, token) {
  const value = Number(actor?.system?.attributes?.hp?.value) || 0;
  if (value <= 0) return;

  if (actor.system?.attributes?.death) {
    try {
      await actor.update({
        "system.attributes.death.success": 0,
        "system.attributes.death.failure": 0
      });
    } catch {
      /* ignore */
    }
  }

  await setActorDefeatedState(actor, token, false);
}

const HP_MODE_META = {
  damage: {
    titleKey: "hpDamageTitle",
    labelKey: "hpDamage",
    icon: "fas fa-heart-crack"
  },
  heal: {
    titleKey: "hpHealTitle",
    labelKey: "hpHeal",
    icon: "fas fa-heart"
  },
  temp: {
    titleKey: "hpTempTitle",
    labelKey: "hpTemp",
    icon: "fas fa-shield-heart"
  }
};

async function promptHpAmount(actor, mode) {
  const hp = actor.system?.attributes?.hp;
  const current = Number(hp?.value) || 0;
  const temp = Number(hp?.temp) || 0;
  const max = Number(hp?.max) || 0;
  const meta = HP_MODE_META[mode] ?? HP_MODE_META.heal;
  const title = ich.actionBar(meta.titleKey);
  const status = temp > 0
    ? ich.actionBar("hpStatusWithTemp", { current, temp, max })
    : ich.actionBar("hpStatus", { current, max });

  dismissFloatingHudChrome();

  const result = await foundry.applications.api.DialogV2.input({
    window: {
      title,
      icon: meta.icon
    },
    content: `
      <p class="ich-hp-adjust-status">${status}</p>
      <div class="form-group ich-hp-adjust-form">
        <label>${ich.actionBar("hpAmount")}</label>
        <input type="text" name="amount" value="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="ich-hp-amount-input">
      </div>
    `,
    render: (_event, html) => {
      requestAnimationFrame(() => {
        focusInputAtEnd(html.querySelector(".ich-hp-amount-input"));
      });
    },
    ok: {
      label: ich.actionBar(meta.labelKey),
      icon: meta.icon,
      callback: (_event, button) => {
        const form = button?.form;
        if (!form) return false;
        const amount = coerceHpAmount(new foundry.applications.ux.FormDataExtended(form).object.amount);
        if (amount == null) {
          ui.notifications.error(ich.actionBar("hpAmountInvalid"));
          return false;
        }
        return amount;
      }
    }
  });

  return result ?? null;
}

async function runHpAdjust(actor, mode) {
  const amount = coerceHpAmount(await promptHpAmount(actor, mode));
  if (amount == null) return;

  const token = getActionBarToken();
  if (mode === "damage") {
    const before = snapshotHp(actor);
    await applyDamageAmount(actor, amount);
    await applyDamageDeathRules(actor, token, amount, before);
  } else if (mode === "heal") {
    await applyHealAmount(actor, amount);
    await clearDefeatedAfterHeal(actor, token);
  } else if (mode === "temp") await applyTempHpAmount(actor, amount);

  refreshHud(ICH_RENDER.ACTION_BAR);
  refreshHud(ICH_RENDER.PARTY);
  if (game.combat) refreshHud(ICH_RENDER.TURN);
}

function showPortraitHpMenu(event, actor) {
  closePortraitHpMenu();

  const menu = document.createElement("nav");
  menu.id = "ich-portrait-hp-menu";
  menu.className = "ich-status-context-menu";
  menu.setAttribute("role", "menu");

  const items = [
    {
      name: ich.actionBar("hpDamage"),
      icon: '<i class="fas fa-heart-crack"></i>',
      callback: () => runHpAdjust(actor, "damage")
    },
    {
      name: ich.actionBar("hpHeal"),
      icon: '<i class="fas fa-heart"></i>',
      callback: () => runHpAdjust(actor, "heal")
    },
    {
      name: ich.actionBar("hpTemp"),
      icon: '<i class="fas fa-shield-heart"></i>',
      callback: () => runHpAdjust(actor, "temp")
    }
  ];

  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ich-status-context-item";
    button.setAttribute("role", "menuitem");
    button.innerHTML = `${item.icon}<span>${item.name}</span>`;
    button.addEventListener("click", async (clickEvent) => {
      clickEvent.stopPropagation();
      closePortraitHpMenu();
      await item.callback();
    });
    menu.appendChild(button);
  }

  document.body.appendChild(menu);
  activeMenu = menu;

  const { clientX, clientY } = event;
  const margin = 8;
  const rect = menu.getBoundingClientRect();
  const left = Math.min(clientX, window.innerWidth - rect.width - margin);
  const top = Math.min(clientY, window.innerHeight - rect.height - margin);
  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;

  setTimeout(() => {
    document.addEventListener(
      "click",
      (clickEvent) => {
        if (!menu.contains(clickEvent.target)) closePortraitHpMenu();
      },
      { once: true }
    );
    document.addEventListener(
      "keydown",
      (keyEvent) => {
        if (keyEvent.key === "Escape") closePortraitHpMenu();
      },
      { once: true }
    );
  }, 0);
}

/** Right-click action-bar portrait → Damage / Heal / Temp HP. */
export function handlePortraitHpContextMenu(event) {
  const portrait = event.target.closest("#ich-action-bar .ich-mock-portrait-block");
  if (!portrait) return false;

  event.preventDefault();
  event.stopPropagation();

  const actor = resolveActionBarActor();
  if (!canAdjustHp(actor)) {
    ui.notifications.warn(ich.warning("noOwner"));
    return true;
  }

  showPortraitHpMenu(event, actor);
  return true;
}

/** Exported for unit tests. */
export {
  applyDamageAmount,
  applyHealAmount,
  clearDefeatedAfterHeal,
  coerceHpAmount,
  resolveActionBarActor,
  snapshotHp
};
