"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncPositionQty } from "@/lib/db/holdings-sync";
import { reverseOne, type TxRow } from "@/lib/db/tx-reverse";
import type { AssetClass } from "@/lib/engine";

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

  const { data: tx } = await supabase.from("transactions").select("id,lot_id,position_id,type,qty,price,amount,tx_date,source").eq("id", id).single();
  if (!tx) { revalidatePath("/dashboard"); revalidatePath("/history"); return; }

  // A conversion writes two linked legs sharing a "convert:<token>" source.
  // Deleting either leg undoes the whole conversion (both sides).
  let rows: TxRow[] = [tx as TxRow];
  const src = tx.source as string | null;
  if (src && src.startsWith("convert:")) {
    const { data: grp } = await supabase.from("transactions").select("id,lot_id,position_id,type,qty,price,amount,tx_date").eq("source", src).eq("user_id", user.id);
    if (grp && grp.length) rows = grp as TxRow[];
  }

  const pids = new Set<string>();
  for (const r of rows) {
    await reverseOne(supabase, user.id, r);
    await supabase.from("transactions").delete().eq("id", r.id).eq("user_id", user.id);
    if (r.position_id) pids.add(r.position_id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  for (const pid of pids) revalidatePath(`/detail/${pid}`);
}
