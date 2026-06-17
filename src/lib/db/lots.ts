"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncPositionQty } from "@/lib/db/holdings-sync";

const num = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

function done(positionId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/detail/${positionId}`);
}

export async function addLot(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const positionId = str(formData.get("positionId"));
  if (!positionId) return;
  const qty = num(formData.get("qty"));
  const price = num(formData.get("price"));
  const acquired_date = str(formData.get("acquired_date")) || new Date().toISOString().slice(0, 10);
  const account = str(formData.get("account")) || null;

  const { data: lot } = await supabase
    .from("lots")
    .insert({ user_id: user.id, position_id: positionId, qty, price, acquired_date, account })
    .select("id")
    .single();

  // mirror as a linked buy in the ledger
  const { data: pos } = await supabase.from("positions").select("cls,ticker,name").eq("id", positionId).single();
  if (pos && lot) {
    await supabase.from("transactions").insert({
      user_id: user.id, position_id: positionId, lot_id: lot.id, tx_date: acquired_date,
      type: "buy", cls: pos.cls, ticker: pos.ticker, name: pos.name, qty, price, amount: qty * price,
      account, source: "manual", note: "Added lot",
    });
  }
  await syncPositionQty(supabase, positionId, user.id);
  done(positionId);
}

export async function updateLot(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  const positionId = str(formData.get("positionId"));
  if (!id) return;
  const qty = num(formData.get("qty"));
  const price = num(formData.get("price"));
  const acquired_date = str(formData.get("acquired_date")) || new Date().toISOString().slice(0, 10);
  const account = str(formData.get("account")) || null;

  await supabase.from("lots").update({ qty, price, acquired_date, account }).eq("id", id).eq("user_id", user.id);
  // keep the linked ledger transaction in sync
  await supabase.from("transactions").update({ qty, price, amount: qty * price, tx_date: acquired_date }).eq("lot_id", id).eq("user_id", user.id);
  await syncPositionQty(supabase, positionId, user.id);
  done(positionId);
}

export async function deleteLot(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  const positionId = str(formData.get("positionId"));
  if (!id) return;
  // remove the linked ledger transaction first (FK would otherwise null it out)
  await supabase.from("transactions").delete().eq("lot_id", id).eq("user_id", user.id);
  await supabase.from("lots").delete().eq("id", id).eq("user_id", user.id);
  await syncPositionQty(supabase, positionId, user.id);
  done(positionId);
}
