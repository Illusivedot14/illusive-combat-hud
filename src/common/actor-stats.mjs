import { ichCore } from "./i18n.mjs";

export function statPercent(stat) {
  if (!stat?.max || stat.max <= 0) return 0;
  return Math.max(0, Math.min(100, (stat.value / stat.max) * 100));
}

/**
 * Damage-wash stop for portrait CSS (`--ich-hp-pct`).
 * Uses remaining HP percent so the red fill tracks the missing health (party-style).
 * @param {number} hpPercent
 * @returns {number} CSS percent
 */
export function getDamageWashCssPct(hpPercent) {
  return Math.max(0, Math.min(100, Number(hpPercent) || 0));
}

export function getHpBarData(actor) {
  const hp = actor?.system?.attributes?.hp ?? {};
  const value = hp.value ?? 0;
  const max = hp.max ?? 0;
  const temp = hp.temp ?? 0;
  const basePercent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tempPercent = max > 0 ? Math.min(100 - basePercent, (temp / max) * 100) : 0;
  const totalPercent = max > 0 ? Math.min(100, ((value + temp) / max) * 100) : 0;

  let tier = "healthy";
  if (value <= 0 && max > 0) tier = "down";
  else if (totalPercent <= 25) tier = "critical";
  else if (totalPercent <= 50) tier = "warn";

  return {
    value,
    max,
    temp,
    basePercent,
    tempPercent,
    totalPercent,
    tier,
    percent: statPercent({ value, max })
  };
}

export function getTokenCombatStats(actor) {
  if (!actor) return { ac: null, speed: null };
  return {
    ac: actor.system?.attributes?.ac?.value ?? null,
    speed: actor.system?.attributes?.movement?.walk ?? null
  };
}

const PASSIVE_SKILL_KEYS = [
  { id: "prc", skill: "prc", short: "PP" },
  { id: "ins", skill: "ins", short: "INS" },
  { id: "inv", skill: "inv", short: "INV" }
];

function skillLabelKey(skill) {
  const config = globalThis.CONFIG?.DND5E?.skills?.[skill]?.label;
  return config ?? `DND5E.Skill${skill.charAt(0).toUpperCase()}${skill.slice(1)}`;
}

/** Short badge label for a passive skill (localized when possible). */
export function passiveSkillShort(skill, fallback) {
  const key = skillLabelKey(skill);
  const full = ichCore(key);
  if (!full || full === key) return fallback;
  return full.slice(0, 3);
}

/** Passive Perception / Insight / Investigation for the vitals column. */
export function buildPassiveScores(actor) {
  if (!actor) return [];

  const skills = actor.system?.skills ?? {};
  return PASSIVE_SKILL_KEYS.map(({ id, skill, short }) => {
    const value = skills[skill]?.passive;
    if (!Number.isFinite(value)) return null;
    const key = skillLabelKey(skill);
    return {
      id,
      short: passiveSkillShort(skill, short),
      label: ichCore(key),
      value: Math.round(value)
    };
  }).filter(Boolean);
}

function senseDistance(senses, key) {
  const fromRanges = senses?.ranges?.[key];
  if (Number.isFinite(fromRanges) && fromRanges > 0) return fromRanges;
  const flat = senses?.[key];
  if (Number.isFinite(flat) && flat > 0) return flat;
  return null;
}

function formatSenseRange(key, distance, units) {
  const titled = key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
  const configKey = globalThis.CONFIG?.DND5E?.senses?.[key];
  const candidates = [
    configKey,
    `DND5E.Sense${titled}`,
    `DND5E.Sense.${titled}`,
    `DND5E.SENSES.${key}`
  ].filter(Boolean);

  let label = titled;
  for (const candidate of candidates) {
    const text = ichCore(candidate);
    if (text && text !== candidate) {
      label = text;
      break;
    }
  }
  return `${label} ${distance} ${units}`;
}

/** Vision and special senses for Passive Perception tooltips only. */
export function buildVisionSummary(token) {
  const actor = token?.actor;
  if (!actor) return "";

  const senses = actor.system?.attributes?.senses;
  const units = senses?.units ?? "ft";
  const parts = [];
  const senseKeys = Object.keys(globalThis.CONFIG?.DND5E?.senses ?? {
    darkvision: true,
    blindsight: true,
    tremorsense: true,
    truesight: true
  });

  for (const key of senseKeys) {
    const distance = senseDistance(senses, key);
    if (distance != null) parts.push(formatSenseRange(key, distance, units));
  }

  // Catch custom range keys not listed in CONFIG.DND5E.senses.
  for (const [key, distance] of Object.entries(senses?.ranges ?? {})) {
    if (senseKeys.includes(key)) continue;
    if (Number.isFinite(distance) && distance > 0) {
      parts.push(formatSenseRange(key, distance, units));
    }
  }

  if (senses?.special) parts.push(senses.special);

  return parts.filter(Boolean).join("\n");
}
