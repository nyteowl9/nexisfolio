"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { priceKey } from "@/lib/db/portfolio";
import { insertPosition } from "@/lib/db/positions";
import { syncPositionQty } from "@/lib/db/holdings-sync";

const today = () => new Date().toISOString().slice(0, 10);

/** One row of the bulk editor — a flattened view of a position. */
export interface BulkEditRow {
  id: string;
  cls: AssetClass;
  ticker: string | null;
  name: string;
  account: string | null;
  subcat: string | null;
  unit: boolean;
  /** unit-priced: sum of lots */
  qty: number;
  /** unit-priced: basis / qty (null when no lots) */
  avgCost: number | null;
  lotCount: number;
  /** trading-card items — value is derived, so it's locked in the editor */
  itemCount: number;
  /** manual classes: stored value */
  value: number;
  costBasis: number | null;
  /** unit-priced: cached live price */
  price: number | null;
}

export interface BulkUpdate {
  id: string;
  name?: string;
  account?: string | null;
  /** unit-priced: new total quantity (<= 0 deletes the position) */
  qty?: number;
  /** unit-priced, single-lot only: new cost per unit */
  costPerUnit?: number;
  /** manual: new current value */
  value?: number;
  /** manual (not cash): new cost basis; null clears it */
  costBasis?: number | null;
}

export interface BulkAdd {
  cls: AssetClass;
  ticker?: string;
  name?: string;
  account?: string;
  subcat?: string;
  qty?: number;
  costPerUnit?: number;
  acquiredDate?: string;
  value?: number;
  costBasis?: number;
}

export interface BulkEditChanges {
  deletes: string[];
  updates: BulkUpdate[];
  adds: BulkAdd[];
}

export interface BulkEditResult {
  deleted: number;
  updated: number;
  added: number;
  errors: string[];
}

async function requireUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

/** Server action: every position flattened for the bulk editor, sorted by class then value. */
export async function loadBulkRows(): Promise<BulkEditRow[]> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [posRes, lotRes, itemRes, priceRes] = await Promise.all([
    supabase.from("positions").select("id,cls,ticker,name,account,subcat,qty,manual_value,cost_basis_manual").eq("user_id", user.id),
    supabase.from("lots").select("position_id,qty,basis").eq("user_id", user.id),
    supabase.from("card_items").select("position_id").eq("user_id", user.id),
    supabase.from("price_cache").select("asset_key,price"),
  ]);

  const lotAgg = new Map<string, { qty: number; basis: number; n: number }>();
  for (const l of lotRes.data ?? []) {
    const a = lotAgg.get(l.position_id) ?? { qty: 0, basis: 0, n: 0 };
    a.qty += Number(l.qty);
    a.basis += Number(l.basis);
    a.n += 1;
    lotAgg.set(l.position_id, a);
  }
  const itemCount = new Map<string, number>();
  for (const it of itemRes.data ?? []) itemCount.set(it.position_id, (itemCount.get(it.position_id) ?? 0) + 1);
  const price = new Map<string, number | null>((priceRes.data ?? []).map((p) => [p.asset_key as string, p.price as number | null]));

  const rows: BulkEditRow[] = (posRes.data ?? []).map((p) => {
    const cls = p.cls as AssetClass;
    const unit = isUnitPriced(cls);
    const agg = lotAgg.get(p.id as string);
    const qty = unit ? (agg ? agg.qty : Number(p.qty ?? 0)) : 0;
    return {
      id: p.id as string,
      cls,
      ticker: (p.ticker as string | null) ?? null,
      name: p.name as string,
      account: (p.account as string | null) ?? null,
      subcat: (p.subcat as string | null) ?? null,
      unit,
      qty,
      avgCost: unit && agg && agg.qty > 0 ? agg.basis / agg.qty : null,
      lotCount: agg?.n ?? 0,
      itemCount: itemCount.get(p.id as string) ?? 0,
      value: unit ? 0 : Number(p.manual_value ?? 0),
      costBasis: p.cost_basis_manual == null ? null : Number(p.cost_basis_manual),
      price: unit ? price.get(priceKey(cls, p.ticker as string | null)) ?? null : null,
    };
  });

  const order: AssetClass[] = ["crypto", "stocks", "metals", "cash", "realest", "private", "loans"];
  const worth = (r: BulkEditRow) => (r.unit ? r.qty * (r.price ?? 0) : r.value);
  rows.sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || worth(b) - worth(a) || a.name.localeCompare(b.name));
  return rows;
}

/** Remove positions plus their ledger rows (lots / items / loans cascade). */
async function deletePositions(supabase: SupabaseClient, userId: string, ids: string[]) {
  if (!ids.length) return;
  await supabase.from("transactions").delete().in("position_id", ids).eq("user_id", userId);
  await supabase.from("disposals").delete().in("position_id", ids).eq("user_id", userId);
  const { error } = await supabase.from("positions").delete().in("id", ids).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Set a unit-priced position's total quantity. The delta is applied to the
 * newest lot (positive grows it; negative shrinks newest-first and removes
 * lots that hit zero), so older tax lots are left untouched.
 */
async function setPositionQty(supabase: SupabaseClient, userId: string, posId: string, target: number, fallbackPrice: number) {
  const { data: lots } = await supabase
    .from("lots")
    .select("id,qty,price")
    .eq("position_id", posId)
    .eq("user_id", userId)
    .order("acquired_date", { ascending: false })
    .order("created_at", { ascending: false });
  const list = (lots ?? []).map((l) => ({ id: l.id as string, qty: Number(l.qty), price: Number(l.price) }));
  const current = list.reduce((s, l) => s + l.qty, 0);
  let delta = target - current;
  if (Math.abs(delta) < 1e-12) return;

  const touch = async (lot: { id: string; price: number }, qty: number) => {
    await supabase.from("lots").update({ qty }).eq("id", lot.id).eq("user_id", userId);
    await supabase.from("transactions").update({ qty, amount: qty * lot.price }).eq("lot_id", lot.id).eq("user_id", userId);
  };

  if (!list.length) {
    const { data: pos } = await supabase.from("positions").select("cls,ticker,name,account").eq("id", posId).single();
    const { data: lot, error } = await supabase
      .from("lots")
      .insert({ user_id: userId, position_id: posId, qty: target, price: fallbackPrice, acquired_date: today(), account: pos?.account ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("transactions").insert({
      user_id: userId, position_id: posId, lot_id: lot.id, tx_date: today(), type: "buy",
      cls: pos?.cls, ticker: pos?.ticker ?? null, name: pos?.name ?? "", qty: target, price: fallbackPrice,
      amount: target * fallbackPrice, account: pos?.account ?? null, source: "manual", note: "Bulk edit",
    });
    return;
  }

  if (delta > 0) {
    await touch(list[0], list[0].qty + delta);
    return;
  }
  for (const lot of list) {
    if (delta >= -1e-12) break;
    const take = Math.min(lot.qty, -delta);
    const left = lot.qty - take;
    if (left <= 1e-12) {
      await supabase.from("transactions").delete().eq("lot_id", lot.id).eq("user_id", userId);
      await supabase.from("lots").delete().eq("id", lot.id).eq("user_id", userId);
    } else {
      await touch(lot, left);
    }
    delta += take;
  }
}

async function applyUpdate(supabase: SupabaseClient, userId: string, u: BulkUpdate) {
  const { data: pos, error } = await supabase
    .from("positions")
    .select("id,cls,name,account")
    .eq("id", u.id)
    .eq("user_id", userId)
    .single();
  if (error || !pos) throw new Error("position not found");
  const cls = pos.cls as AssetClass;
  const unit = isUnitPriced(cls);

  const patch: Record<string, unknown> = {};
  if (u.name != null && u.name.trim() && u.name.trim() !== pos.name) patch.name = u.name.trim();
  if (u.account !== undefined) patch.account = u.account?.trim() || null;

  if (unit) {
    if (u.qty != null && u.qty <= 0) {
      await deletePositions(supabase, userId, [u.id]);
      return;
    }
    if (u.costPerUnit != null) {
      const { data: lots } = await supabase.from("lots").select("id").eq("position_id", u.id).eq("user_id", userId);
      if ((lots ?? []).length === 1) {
        const lotId = lots![0].id as string;
        const { data: lot } = await supabase.from("lots").update({ price: u.costPerUnit }).eq("id", lotId).eq("user_id", userId).select("qty").single();
        const q = Number(lot?.qty ?? 0);
        await supabase.from("transactions").update({ price: u.costPerUnit, amount: q * u.costPerUnit }).eq("lot_id", lotId).eq("user_id", userId);
      }
    }
    if (u.qty != null) await setPositionQty(supabase, userId, u.id, u.qty, u.costPerUnit ?? 0);
  } else {
    if (u.value != null) {
      patch.manual_value = u.value;
      patch.last_valued_date = today();
    }
    if (cls !== "cash" && u.costBasis !== undefined) patch.cost_basis_manual = u.costBasis;
  }

  if (Object.keys(patch).length) {
    const { error: ue } = await supabase.from("positions").update(patch).eq("id", u.id).eq("user_id", userId);
    if (ue) throw new Error(ue.message);
    // lots carry their own account label; keep them in step with the position
    if (patch.account !== undefined && unit) {
      await supabase.from("lots").update({ account: patch.account }).eq("position_id", u.id).eq("user_id", userId);
    }
  }
  if (unit) await syncPositionQty(supabase, u.id, userId);
}

/**
 * Server action: apply a batch of deletes, edits and adds from the bulk
 * editor. Each item is attempted independently so one bad row doesn't block
 * the rest; failures come back in `errors`.
 */
export async function applyBulkEdit(changes: BulkEditChanges): Promise<BulkEditResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const result: BulkEditResult = { deleted: 0, updated: 0, added: 0, errors: [] };

  const deletes = Array.from(new Set(changes.deletes.filter(Boolean)));
  if (deletes.length) {
    try {
      await deletePositions(supabase, user.id, deletes);
      result.deleted = deletes.length;
    } catch (e) {
      result.errors.push(`Delete failed: ${(e as Error).message}`);
    }
  }

  const gone = new Set(deletes);
  for (const u of changes.updates) {
    if (gone.has(u.id)) continue;
    try {
      await applyUpdate(supabase, user.id, u);
      result.updated++;
    } catch (e) {
      result.errors.push(`${u.name ?? u.id}: ${(e as Error).message}`);
    }
  }

  for (const a of changes.adds) {
    const unit = isUnitPriced(a.cls);
    const ticker = a.ticker?.trim().toUpperCase();
    const name = a.name?.trim() || ticker;
    if (unit && (!ticker || !a.qty || a.qty <= 0)) continue;
    if (!unit && !name) continue;
    try {
      await insertPosition(supabase, user.id, {
        cls: a.cls,
        name: name!,
        ticker: unit ? ticker : undefined,
        account: a.account?.trim() || undefined,
        subcat: a.cls === "private" ? a.subcat?.trim() || "Other" : undefined,
        qty: unit ? a.qty : undefined,
        costPerUnit: unit ? a.costPerUnit : undefined,
        acquiredDate: a.acquiredDate || undefined,
        value: unit ? undefined : a.value ?? 0,
        costBasis: unit || a.cls === "cash" ? undefined : a.costBasis,
      });
      result.added++;
    } catch (e) {
      result.errors.push(`${name}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/tax");
  revalidatePath("/retirement");
  return result;
}
