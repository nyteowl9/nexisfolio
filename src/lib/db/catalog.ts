import type { SupabaseClient } from "@supabase/supabase-js";
import type { Catalog, CatalogCard, CatalogSealed, CatalogSet, CardPrices } from "@/lib/engine";
import { CATALOG as SAMPLE } from "@/lib/sample/sample-data";
import type { ProviderCard } from "@/lib/market/cards-provider";

interface CatalogRow {
  id: string;
  game: string;
  set_id: string | null;
  set_name: string | null;
  set_code: string | null;
  number: string | null;
  name: string;
  rarity: string | null;
  kind: string;
  daily: number | null;
  image_url: string | null;
  prices: Record<string, number> | null;
}

/**
 * Build a Catalog for the given catalog ids, merging the static sample catalog
 * with provider-synced rows from card_catalog. Used to price collections that
 * include live-provider cards (Pokémon/Magic) as well as the sample set.
 */
export async function getCatalogFor(supabase: SupabaseClient, ids: string[]): Promise<Catalog> {
  const cardById: Record<string, CatalogCard> = { ...SAMPLE.cardById };
  const sealedById: Record<string, CatalogSealed> = { ...SAMPLE.sealedById };
  const sets: Record<string, CatalogSet> = { ...SAMPLE.sets };

  const missing = ids.filter((id) => id && !cardById[id] && !sealedById[id]);
  if (missing.length) {
    const { data } = await supabase.from("card_catalog").select("*").in("id", missing);
    for (const r of (data ?? []) as CatalogRow[]) {
      if (r.set_id) sets[r.set_id] = { id: r.set_id, game: r.game, code: r.set_code || "", name: r.set_name || "", year: 0 };
      if (r.kind === "sealed") {
        sealedById[r.id] = { id: r.id, game: r.game, set: r.set_id || "", name: r.name, kind: r.rarity || "Sealed", daily: r.daily ?? 0, price: r.prices?.price ?? 0, img: r.image_url ?? undefined };
      } else {
        cardById[r.id] = { id: r.id, game: r.game, set: r.set_id || "", num: r.number || "", name: r.name, rarity: r.rarity || "", daily: r.daily ?? 0, img: r.image_url ?? undefined, prices: (r.prices as unknown as CardPrices) ?? { raw: 0, psa9: 0, psa10: 0, bgs95: 0, cgc10: 0 } };
      }
    }
  }
  return { cardById, sealedById, sets, games: SAMPLE.games };
}

/** Upsert a provider card into the shared card_catalog (service role). */
export async function upsertProviderCard(admin: SupabaseClient, c: ProviderCard) {
  await admin.from("card_catalog").upsert({
    id: c.id,
    game: c.game,
    set_id: c.setCode ? `${c.game}-${c.setCode}` : null,
    set_name: c.setName,
    set_code: c.setCode,
    number: c.num,
    name: c.name,
    rarity: c.rarity,
    kind: "card",
    image_url: c.image,
    prices: c.prices as unknown as Record<string, number>,
    updated_at: new Date().toISOString(),
  });
}
