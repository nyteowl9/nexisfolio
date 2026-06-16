import type { CardItem, CardPrices, Catalog, Grader, ItemMeta } from "./types";

/** Valid grades per grader (for UI ladders). */
export const GRADES: Record<Grader, string[]> = {
  PSA: ["10", "9", "8", "7"],
  BGS: ["10", "9.5", "9", "8.5"],
  CGC: ["10", "9.5", "9"],
};

/**
 * Price for an arbitrary grader+grade, derived from the stored ladder
 * (raw / psa9 / psa10 / bgs95 / cgc10). Other grades derive from those.
 */
export function priceForGrade(
  prices: CardPrices | null | undefined,
  grader: Grader | null | undefined,
  grade: string | null | undefined
): number {
  if (!prices) return 0;
  const g = String(grade);
  if (grader === "PSA")
    return (
      ({ "10": prices.psa10, "9": prices.psa9, "8": Math.round(prices.psa9 * 0.55), "7": Math.round(prices.psa9 * 0.38) } as Record<string, number>)[g] ?? prices.psa9
    );
  if (grader === "BGS")
    return (
      ({ "10": Math.round(prices.psa10 * 1.4), "9.5": prices.bgs95, "9": Math.round(prices.bgs95 * 0.62), "8.5": Math.round(prices.bgs95 * 0.42) } as Record<string, number>)[g] ?? prices.bgs95
    );
  if (grader === "CGC")
    return (
      ({ "10": prices.cgc10, "9.5": Math.round(prices.cgc10 * 0.78), "9": Math.round(prices.cgc10 * 0.5) } as Record<string, number>)[g] ?? prices.cgc10
    );
  return prices.raw;
}

/** Per-item current unit value from catalog + grade. */
export function itemUnitValue(it: CardItem, catalog: Catalog): number {
  if (it.manual) return it.value || 0;
  if (it.type === "sealed") {
    const s = it.catId ? catalog.sealedById[it.catId] : undefined;
    return s ? s.price : 0;
  }
  const c = it.catId ? catalog.cardById[it.catId] : undefined;
  if (!c) return 0;
  if (it.type === "raw") return c.prices.raw;
  return priceForGrade(c.prices, it.grader, it.grade);
}

export const itemValue = (it: CardItem, catalog: Catalog): number =>
  itemUnitValue(it, catalog) * (it.qty || 1);

export const itemBasis = (it: CardItem): number => (it.basis || 0) * (it.qty || 1);

export function itemDaily(it: CardItem, catalog: Catalog): number {
  if (it.manual) return 0;
  const o = it.type === "sealed" ? (it.catId ? catalog.sealedById[it.catId] : undefined) : it.catId ? catalog.cardById[it.catId] : undefined;
  return o ? o.daily : 0;
}

const DEFAULT_GAME = { color: "#8A9099", tint: "#ECEEEF", label: "" };

/** Resolve display metadata (name, set, game colors, image, prices) for an item. */
export function itemMeta(it: CardItem, catalog: Catalog): ItemMeta {
  const gm = (key?: string | null) => (key && catalog.games[key]) || DEFAULT_GAME;
  if (it.manual) {
    const g = gm(it.game);
    return {
      name: it.name || "Custom item",
      set: it.setCode ? { code: it.setCode, name: it.setName || "" } : null,
      game: it.game || null,
      gameColor: g.color,
      gameTint: g.tint,
      gameLabel: g.label,
      num: it.num || "",
      rarity: it.type === "sealed" ? it.kind || "Sealed" : it.type === "raw" ? "Raw / ungraded" : `${it.grader || ""} ${it.grade || ""}`.trim(),
      sealed: it.type === "sealed",
      prices: null,
      custom: true,
      img: it.img || null,
    };
  }
  if (it.type === "sealed") {
    const s = it.catId ? catalog.sealedById[it.catId] : undefined;
    const g = gm(s?.game);
    const set = s ? catalog.sets[s.set] : undefined;
    return { name: s?.name ?? "Sealed", set: set ? { code: set.code, name: set.name } : null, game: s?.game ?? null, gameColor: g.color, gameTint: g.tint, gameLabel: g.label, num: s?.kind ?? "", rarity: s?.kind ?? "", sealed: true, img: s?.img ?? null };
  }
  const c = it.catId ? catalog.cardById[it.catId] : undefined;
  const g = gm(c?.game);
  const set = c ? catalog.sets[c.set] : undefined;
  return { name: c?.name ?? "Card", set: set ? { code: set.code, name: set.name } : null, game: c?.game ?? null, gameColor: g.color, gameTint: g.tint, gameLabel: g.label, num: c?.num ?? "", rarity: c?.rarity ?? "", sealed: false, prices: c?.prices, img: c?.img ?? null };
}

/** Grade tiers for the value ladder (raw → PSA10). */
export const GRADE_TIERS = [
  { key: "raw" as const, label: "Raw", sub: "ungraded" },
  { key: "psa9" as const, label: "PSA 9", sub: "PSA" },
  { key: "bgs95" as const, label: "BGS 9.5", sub: "Beckett" },
  { key: "cgc10" as const, label: "CGC 10", sub: "CGC" },
  { key: "psa10" as const, label: "PSA 10", sub: "PSA" },
];

/** The price-ladder key for an item's own grade (for highlighting). */
export function ownedKey(it: CardItem): string | null {
  if (!it || it.type === "sealed") return null;
  if (it.type === "raw") return "raw";
  return (it.grader === "PSA" ? "psa" : it.grader === "BGS" ? "bgs" : "cgc") + String(it.grade).replace(".", "");
}

export function gradeChipText(it: CardItem): string {
  if (it.type === "sealed") return "SEALED";
  if (it.type === "raw") return "RAW";
  return `${it.grader} ${it.grade}`;
}

export interface CardAggregate {
  value: number;
  basis: number;
  qty: number;
}

/** Recompute the aggregate Trading Cards position from its line-items. */
export function recompute(items: CardItem[], catalog: Catalog): CardAggregate {
  let value = 0;
  let basis = 0;
  let qty = 0;
  for (const it of items) {
    value += itemValue(it, catalog);
    basis += itemBasis(it);
    qty += it.qty || 1;
  }
  return { value: Math.round(value), basis: Math.round(basis), qty };
}
