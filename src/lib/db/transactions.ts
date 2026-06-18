"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncPositionQty } from "@/lib/db/holdings-sync";
import { isUnitPriced, type AssetClass } from "@/lib/engine";

const str = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};
const num = (v: FormDataEntryValue | null) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function fields(formData: FormData) {
  return {
    tx_date: str(formData.get("tx_date")) || new Date().toISOString().slice(0, 10),
    type: (str(formData.get("type")) || "buy") as string,
    cls: (str(formData.get("cls")) as AssetClass | null),
    ticker: str(formData.get("ticker")),
    name: str(formData.get("name")),
    qty: num(formData.get("qty")),
    price: num(formData.get("price")),
    amount: num(formData.get("amount")),
    account: str(formData.get("account")),
    note: str(formData.get("note")),
  };
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("transactions").insert({ user_id: user.id, source: "manual", ...fields(formData) });
  revalidatePath("/history");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  if (!id) return;
  const f = fields(formData);
  await supabase.from("transactions").update(f).eq("id", id).eq("user_id", user.id);

  // keep the linked tax lot in sync (buys)
  const { data: tx } = await supabase.from("transactions").select("lot_id,position_id").eq("id", id).single();
  if (tx?.lot_id) {
    await supabase.from("lots").update({ qty: f.qty, price: f.price, acquired_date: f.tx_date }).eq("id", tx.lot_id).eq("user_id", user.id);
    if (tx.position_id) await syncPositionQty(supabase, tx.position_id, user.id);
  }
  revalidatePath("/dashboard");
  revalidatePath("/history");
  if (tx?.position_id) revalidatePath(`/detail/${tx.position_id}`);
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  if (!id) return;

  const { data: tx } = await supabase.from("transactions").select("lot_id,position_id,type,qty,price,amount,tx_date").eq("id", id).single();
  await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  const pid = tx?.position_id as string | undefined;
  if (!pid) { revalidatePath("/dashboard"); revalidatePath("/history"); return; }

  const { data: pos } = await supabase.from("positions").select("cls,manual_value").eq("id", pid).single();
  const unit = pos ? isUnitPriced(pos.cls as AssetClass) : false;

  if (tx?.lot_id) {
    // buy: drop the lot it added
    await supabase.from("lots").delete().eq("id", tx.lot_id).eq("user_id", user.id);
  } else if (tx?.type === "sell" && unit) {
    // sell: put the sold units back and remove the most recent realized disposal
    await supabase.from("lots").insert({ user_id: user.id, position_id: pid, qty: tx.qty ?? 0, price: tx.price ?? 0, acquired_date: tx.tx_date ?? new Date().toISOString().slice(0, 10) });
    const { data: disp } = await supabase.from("disposals").select("id").eq("position_id", pid).eq("user_id", user.id).order("sold_date", { ascending: false }).limit(1);
    if (disp?.[0]) await supabase.from("disposals").delete().eq("id", disp[0].id).eq("user_id", user.id);
  } else if (!unit && pos) {
    // cash / manual: reverse the balance change this entry made
    if (tx?.type === "withdraw") await supabase.from("positions").update({ manual_value: (pos.manual_value ?? 0) + (tx.amount ?? 0) }).eq("id", pid);
    else if (tx?.type === "deposit") await supabase.from("positions").update({ manual_value: Math.max(0, (pos.manual_value ?? 0) - (tx.amount ?? 0)) }).eq("id", pid);
  }

  if (unit) await syncPositionQty(supabase, pid, user.id);
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/detail/${pid}`);
}
