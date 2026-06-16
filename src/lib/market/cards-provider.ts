/**
 * Live trading-card data — SERVER-SIDE ONLY.
 * Pokémon via pokemontcg.io (images + TCGplayer price aggregates), Magic via
 * Scryfall (images + USD). Returns real stock images and an aggregate RAW
 * market price; the graded ladder (PSA/BGS/CGC) is derived from raw as an
 * estimate until a graded-price feed (PSA APR / PriceCharting) is connected.
 */
import type { CardPrices } from "@/lib/engine";

export interface ProviderCard {
  id: string;
  game: string;
  name: string;
  setCode: string;
  setName: string;
  num: string;
  rarity: string;
  image: string | null;
  prices: CardPrices;
  /** true = raw price is a real market aggregate; false = unpriced */
  priced: boolean;
}

/** Derive a grade ladder from a real raw/market price (graded tiers are estimates). */
function ladder(raw: number): CardPrices {
  const r = Math.max(0, Math.round(raw));
  const psa10 = Math.round(r * 5);
  return { raw: r, psa9: Math.round(r * 2.2), psa10, bgs95: Math.round(psa10 * 0.82), cgc10: Math.round(psa10 * 0.9) };
}

async function searchPokemon(q: string): Promise<ProviderCard[]> {
  try {
    const key = process.env.POKEMONTCG_API_KEY;
    const r = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(q)}*"&pageSize=24&orderBy=-set.releaseDate`,
      { headers: key ? { "X-Api-Key": key } : {}, next: { revalidate: 3600 } }
    );
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: PokeCard[] };
    return (j.data ?? []).map(mapPokemon);
  } catch {
    return [];
  }
}

interface PokeCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  set?: { id: string; name: string; ptcgoCode?: string; printedTotal?: number };
  images?: { small?: string; large?: string };
  tcgplayer?: { prices?: Record<string, { market?: number; mid?: number; low?: number }> };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
}

function mapPokemon(c: PokeCard): ProviderCard {
  let raw = 0;
  const tp = c.tcgplayer?.prices;
  if (tp) {
    for (const v of Object.values(tp)) {
      const m = v.market ?? v.mid ?? v.low;
      if (m) { raw = m; break; }
    }
  }
  if (!raw) raw = c.cardmarket?.prices?.averageSellPrice ?? c.cardmarket?.prices?.trendPrice ?? 0;
  return {
    id: c.id,
    game: "pkm",
    name: c.name,
    setCode: c.set?.ptcgoCode || c.set?.id || "",
    setName: c.set?.name || "",
    num: c.number ? `${c.number}${c.set?.printedTotal ? "/" + c.set.printedTotal : ""}` : "",
    rarity: c.rarity || "",
    image: c.images?.large || c.images?.small || null,
    prices: ladder(raw),
    priced: raw > 0,
  };
}

interface ScryCard {
  id: string;
  name: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  image_uris?: { normal?: string; large?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { usd?: string | null; usd_foil?: string | null };
}

async function searchMagic(q: string): Promise<ProviderCard[]> {
  try {
    const r = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=cards`, {
      headers: { "User-Agent": "NexisFolio/1.0", Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: ScryCard[] };
    return (j.data ?? []).slice(0, 24).map((c) => {
      const raw = parseFloat(c.prices?.usd || c.prices?.usd_foil || "0") || 0;
      return {
        id: c.id,
        game: "mtg",
        name: c.name,
        setCode: (c.set || "").toUpperCase(),
        setName: c.set_name || "",
        num: c.collector_number || "",
        rarity: c.rarity || "",
        image: c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal || null,
        prices: ladder(raw),
        priced: raw > 0,
      };
    });
  } catch {
    return [];
  }
}

/** Games with a wired live provider. Others fall back to the static catalog. */
export const LIVE_GAMES = new Set(["pkm", "mtg"]);

export async function searchProviderCards(game: string, q: string): Promise<ProviderCard[]> {
  if (!q.trim()) return [];
  if (game === "pkm") return searchPokemon(q);
  if (game === "mtg") return searchMagic(q);
  return [];
}
