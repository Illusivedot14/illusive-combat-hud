import { ich } from "../../common/i18n.mjs";

function availableCastLevels(actor, item, activity) {
  if (activity?.requiresSpellSlot === false) return null;

  const baseLevel = activity?.spell?.level ?? item?.system?.level ?? 0;
  const slots = actor?.system?.spells ?? {};
  const levels = [];

  for (let level = Math.max(1, baseLevel); level <= 9; level++) {
    const key = `spell${level}`;
    if ((slots[key]?.value ?? 0) > 0) levels.push(level);
  }

  // Pact casters: treat the pact slot level as the available cast level when
  // no prepared slots are listed (or in addition for multiclass).
  const pact = slots.pact;
  const pactMax = Number(pact?.max) || 0;
  const pactValue = Number(pact?.value) || 0;
  const pactLevel = Number(pact?.level) || 0;
  if (pactMax > 0 && pactValue > 0 && pactLevel >= Math.max(1, baseLevel) && !levels.includes(pactLevel)) {
    levels.push(pactLevel);
    levels.sort((a, b) => a - b);
  }

  return levels.length > 1 ? levels : null;
}

/**
 * @returns {Promise<{ cancelled: boolean, level: number|null }>}
 */
export async function pickCastSlotLevel(actor, item, activity) {
  const levels = availableCastLevels(actor, item, activity);
  if (!levels) return { cancelled: false, level: null };

  const buttons = levels.map((level) => ({
    action: `slot-${level}`,
    label: ich.actionBar("slotLevel", { level }),
    icon: "fas fa-wand-sparkles",
    callback: () => level
  }));

  buttons.push({
    action: "cancel",
    label: ich.ui("cancel"),
    icon: "fas fa-times",
    callback: () => null
  });

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: ich.actionBar("castSlotTitle", { name: item.name }) },
    content: `<p>${ich.actionBar("castSlotPrompt")}</p>`,
    buttons,
    default: `slot-${levels[0]}`
  });

  if (result == null) return { cancelled: true, level: null };
  return { cancelled: false, level: result };
}
