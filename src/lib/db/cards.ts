"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recompute, type CardItem } from "@/lib/engine";
import { getCatalogFor, upsertProviderCard } from "@/lib/db/catalog";
import type { ProviderCard } from "@/lib/market/cards-provider";

/** Item payload from the catalog browser / manual form. */
export interface NewCardItem {
  catId?: string;
  type: "graded" | "raw" | "sealed";
  grader?: string | null;
  grade?: string | null;
  qty: number;
  basis: number;
  acquired: string;
  manual?: boolean;
  name?: string;
  game?: string | null;
  setCode?: string;
  setName?: string;
  num?: string;
  kind?: string;
  value?: number;
  img?: string | null;
  /** present when the card came from a live provider (Pokémon/Magic) */
  provider?: ProviderCard;
}

function toCardItem(r: Record<string, unknown>): CardItem {
  return {
    id: r.id as string,
    catId: (r.catalog_id as string) ?? undefined,
    type: r.type as CardItem["type"],
    grader: (r.grader as CardItem["grader"]) ?? null,
    grade: (r.grade as string) ?? null,
    qty: r.qty as number,
    basis: r.basis as number,
    acquired: (r.acquired_date as string) ?? "",
    manual: r.is_manual as boolean,
    value: (r.manual_value as number) ?? undefined,
    name: (r.name as string) ?? undefined,
    game: (r.game as string) ?? undefined,
    setCode: (r.set_code as string) ?? undefined,
    setName: (r.set_name as string) ?? undefined,
    num: (r.number as string) ?? undefined,
    img: (r.image_url as string) ?? undefined,
  };
}

/** Recompute the Trading Cards position's stored aggregate from its line-items. */
async function recomputePosition(supabase: SupabaseClient, positionId: string, userId: string) {
  const { data } = await supabase.from("card_items").select("*").eq("position_id", positionId);
  const items = ((data ?? []) as Record<string, unknown>[]).map(toCardItem);
  const catalog = await getCatalogFor(supabase, items.map((i) => i.catId).filter(Boolean) as string[]);
  const agg = recompute(items, catalog);
  await supabase
    .from("positions")
    .update({ manual_value: agg.value, cost_basis_manual: agg.basis, qty: agg.qty })
    .eq("id", positionId)
    .eq("user_id", userId);
}

export async function addCardItem(positionId: string, item: NewCardItem) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Live-provider card: sync it into the shared card_catalog so it prices.
  if (item.provider) {
    await upsertProviderCard(createAdminClient(), item.provider);
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    position_id: positionId,
    catalog_id: item.catId ?? null,
    is_manual: !!item.manual,
    type: item.type,
    grader: item.grader ?? null,
    grade: item.grade ?? null,
    qty: item.qty,
    basis: item.basis,
    acquired_date: item.acquired || null,
    image_url: item.img ?? null,
    name: item.name ?? null,
    game: item.game ?? null,
    set_code: item.setCode ?? null,
    set_name: item.setName ?? null,
    number: item.num ?? null,
  };
  // Only write manual_value for manual items (needs migration 0002).
  if (item.manual) row.manual_value = item.value ?? 0;

  const { error } = await supabase.from("card_items").insert(row);
  if (error) throw new Error(`add card: ${error.message}`);

  await recomputePosition(supabase, positionId, user.id);

  // Ledger entry for the card add.
  await supabase.from("transactions").insert({
    user_id: user.id,
    position_id: positionId,
    tx_date: item.acquired || new Date().toISOString().slice(0, 10),
    type: "buy",
    cls: "private",
    ticker: null,
    name: `${item.name ?? "Card"}${item.type === "graded" ? ` ${item.grader} ${item.grade}` : ""}`,
    qty: item.qty,
    price: item.basis,
    amount: (item.basis || 0) * item.qty,
    account: "Cards",
    source: "manual",
    note: "Added card",
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/detail/${positionId}`);
}

export async function removeCardItem(positionId: string, itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("card_items").delete().eq("id", itemId).eq("user_id", user.id);
  await recomputePosition(supabase, positionId, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/detail/${positionId}`);
}
