import { ich } from "../../common/i18n.mjs";
import { getWeaponSetData, setWeaponSetData } from "./action-bar-prefs.mjs";

function equippedWeapons(actor) {
  return actor.items.filter((item) => item.type === "weapon" && item.system?.equipped);
}

function defaultSets(actor) {
  const weapons = equippedWeapons(actor);
  const main = weapons.find((w) => w.system?.equipped !== false) ?? weapons[0];
  const off = weapons.find((w) => w.id !== main?.id && w.system?.properties?.has?.("lgt")) ?? weapons[1];
  return {
    active: 0,
    sets: [
      { label: "1", main: main?.id ?? "", off: off?.id ?? "" },
      { label: "2", main: "", off: "" }
    ]
  };
}

export function buildWeaponSetContext(actor) {
  const data = getWeaponSetData(actor) ?? defaultSets(actor);
  const sets = (data.sets ?? []).map((set, index) => {
    const main = set.main ? actor.items.get(set.main) : null;
    const off = set.off ? actor.items.get(set.off) : null;
    return {
      index,
      label: set.label || String(index + 1),
      mainName: main?.name ?? ich.actionBar("weaponEmpty"),
      offName: off?.name ?? ich.actionBar("weaponEmpty"),
      isActive: data.active === index
    };
  });

  return {
    sets,
    activeIndex: data.active ?? 0,
    hasSets: sets.some((s) => s.mainName !== ich.actionBar("weaponEmpty") || s.offName !== ich.actionBar("weaponEmpty"))
  };
}

async function setEquipped(actor, itemId, equipped) {
  const item = itemId ? actor.items.get(itemId) : null;
  if (!item || item.type !== "weapon") return;
  await item.update({ "system.equipped": equipped });
}

export async function activateWeaponSet(actor, index) {
  if (!actor?.isOwner) return false;

  let data = getWeaponSetData(actor) ?? defaultSets(actor);
  const set = data.sets?.[index];
  if (!set) return false;

  for (const item of equippedWeapons(actor)) {
    await item.update({ "system.equipped": false });
  }

  await setEquipped(actor, set.main, true);
  if (set.off) await setEquipped(actor, set.off, true);

  data = { ...data, active: index };
  if (!getWeaponSetData(actor)) {
    data.sets = data.sets ?? defaultSets(actor).sets;
  }
  await setWeaponSetData(actor, data);
  return true;
}

export async function snapshotWeaponSet(actor, index) {
  if (!actor?.isOwner) return false;
  const weapons = equippedWeapons(actor);
  const main = weapons[0];
  const off = weapons[1];
  let data = getWeaponSetData(actor) ?? defaultSets(actor);
  const sets = [...(data.sets ?? defaultSets(actor).sets)];
  sets[index] = {
    label: sets[index]?.label ?? String(index + 1),
    main: main?.id ?? "",
    off: off?.id ?? ""
  };
  await setWeaponSetData(actor, { ...data, sets, active: index });
  return true;
}
